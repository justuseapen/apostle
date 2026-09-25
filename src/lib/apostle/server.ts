import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  catalogPlugins,
  installedCapabilityBlurb,
  isKnownPluginId,
  runPluginTool,
  toolsFor,
} from "@/lib/apostle/plugins";
import {
  GATEWAY_MISSING_ERROR,
  envGatewayKey,
  maskKey,
  normalizeBaseUrl,
  resolveGateway as resolveGatewayConfig,
  type GatewayResolved,
} from "@/lib/apostle/gateway";
import { seedEnterpriseGaps as seedGapsRows, upsertGap } from "@/lib/apostle/gaps";

export type ThreadRow = { id: string; title: string; created_at: string };
export type MessageRow = {
  id: string;
  role: string;
  content: string;
  meta: string | null;
  created_at: string;
};
export type SettingsRow = {
  system_prompt: string;
  plugins: string;
  model_map: string;
  enforce_quota: boolean;
  gateway_base_url: string;
  gateway_api_key: string;
  browser_allowlist: string;
};
export type UsageRow = {
  id: string;
  model: string;
  label: string;
  tokens_in: number;
  tokens_out: number;
  created_at: string;
};

const DEFAULT_PROMPT =
  "You are Apostle, a chat assistant the operator installed and themed. Be concise, concrete, and useful. When a tool is available and it would make the answer true, use it. When the user asks to file, log, or add a Missing feature/ask to the Desk roadmap, call create_missing with a short title (and optional detail). When the user wants files, a workspace, or a simple shell, use the computer tool (actions: list, read, write, run, info). Computer is a browser sandbox VFS — not the host Mac disk, not real bash. When the user wants to open a public page and see screenshots, use the browser tool (actions: open, snapshot, click, type, close, trail, info) — only Desk-allowlisted https hosts.";

type Label = "cheap" | "default" | "strong" | "vision";

function routeLabel(text: string): { label: Label; reason: string } {
  const t = text.toLowerCase();
  if (/\b(image|photo|screenshot|picture|diagram)\b/.test(t)) {
    return { label: "vision", reason: "Looks like a visual ask." };
  }
  if (t.length > 700 || /\b(architect|compare|analyze|analyse|tradeoff|design)\b/.test(t)) {
    return { label: "strong", reason: "Long or analytical." };
  }
  if (t.length < 48 && !/\b(why|how|explain)\b/.test(t)) {
    return { label: "cheap", reason: "Short turn." };
  }
  return { label: "default", reason: "Ordinary chat." };
}

const BUDGET: Record<Label, number> = {
  cheap: 280,
  default: 700,
  strong: 1400,
  vision: 900,
};

function parseList(raw: string | null): string[] {
  try {
    const v = JSON.parse(raw ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function parseMap(raw: string | null): Record<Label, string> {
  const fallback = {
    cheap: "grok-4.5",
    default: "grok-4.5",
    strong: "grok-4.5",
    vision: "grok-4.5",
  };
  try {
    const v = JSON.parse(raw ?? "{}") as Partial<Record<Label, string>>;
    return {
      cheap: v.cheap || fallback.cheap,
      default: v.default || fallback.default,
      strong: v.strong || fallback.strong,
      vision: v.vision || fallback.vision,
    };
  } catch {
    return fallback;
  }
}

function resolveGateway(settings: SettingsRow): GatewayResolved {
  const fromEnv = envGatewayKey();
  return resolveGatewayConfig({
    gateway_base_url: settings.gateway_base_url,
    gateway_api_key: settings.gateway_api_key,
    envKey: fromEnv.apiKey,
    envPreferredBase: fromEnv.preferredBase,
  });
}

/** Soft-enable a known plugin id for existing operators (idempotent). */
async function ensurePluginEnabled(userId: string, pluginsRaw: string, pluginId: string) {
  const list = parseList(pluginsRaw);
  if (list.includes(pluginId) || !isKnownPluginId(pluginId)) {
    return pluginsRaw;
  }
  list.push(pluginId);
  const next = JSON.stringify(list);
  const sql = await getSql();
  await sql`update settings set plugins = ${next} where user_id = ${userId}`;
  return next;
}

async function ensureSettings(userId: string) {
  const sql = await getSql();
  await sql`
    insert into settings (user_id) values (${userId})
    on conflict (user_id) do nothing
  `;
  const rows = await sql<SettingsRow>`
    select system_prompt, plugins, model_map, enforce_quota,
           gateway_base_url, gateway_api_key, browser_allowlist
    from settings where user_id = ${userId}
  `;
  const row = rows[0];
  if (!row) return row;
  // Soft-enable create_missing so Qwen can file Desk asks.
  row.plugins = await ensurePluginEnabled(userId, row.plugins, "create_missing");
  // Soft-enable browser Computer spike for existing operators.
  row.plugins = await ensurePluginEnabled(userId, row.plugins, "computer");
  // Soft-enable allowlisted Browser for local ops / seeded desks.
  row.plugins = await ensurePluginEnabled(userId, row.plugins, "browser");
  return row;
}

async function chatCompletions(
  gateway: GatewayResolved,
  body: Record<string, unknown>,
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  // Ollama ignores auth; still send Bearer so OpenAI-compat clients stay uniform.
  if (gateway.apiKey) {
    headers.Authorization = `Bearer ${gateway.apiKey}`;
  }
  return fetch(`${gateway.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

export const listThreads = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql<ThreadRow>`
      select id, title, created_at::text as created_at
      from threads where user_id = ${context.userId}
      order by created_at desc
    `;
  });

/** Create an empty chat thread (verify scripts / UI helpers). */
export const createThread = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { title?: string } = {}) => ({
    title: (input.title || "New thread").trim().slice(0, 80) || "New thread",
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = crypto.randomUUID();
    await sql`
      insert into threads (id, user_id, title)
      values (${id}, ${context.userId}, ${data.title})
    `;
    return { id, title: data.title };
  });

export const listMessages = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((threadId: string) => threadId)
  .handler(async ({ context, data: threadId }) => {
    const sql = await getSql();
    return sql<MessageRow>`
      select id, role, content, meta, created_at::text as created_at
      from messages
      where thread_id = ${threadId} and user_id = ${context.userId}
      order by created_at asc
    `;
  });

export const getDesk = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const settings = await ensureSettings(context.userId);
    const sql = await getSql();
    const usage = await sql<UsageRow>`
      select id, model, label, tokens_in, tokens_out, created_at::text as created_at
      from usage_events where user_id = ${context.userId}
      order by created_at desc limit 24
    `;
    const counts = await sql<{ n: number }>`
      select count(*)::int as n from messages
      where user_id = ${context.userId} and role = 'user'
    `;
    const gateway = resolveGateway(settings);
    return {
      settings: {
        system_prompt: settings.system_prompt,
        plugins: settings.plugins,
        model_map: settings.model_map,
        enforce_quota: settings.enforce_quota,
        gateway_base_url: normalizeBaseUrl(settings.gateway_base_url),
        browser_allowlist: settings.browser_allowlist,
      },
      usage,
      userMessages: counts[0]?.n ?? 0,
      catalog: catalogPlugins(),
      gateway: {
        live: gateway.source !== "none",
        source: gateway.source,
        baseUrl: gateway.baseUrl,
        keyHint: gateway.source === "desk" ? maskKey(gateway.apiKey) : "",
      },
    };
  });

export const saveDesk = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    system_prompt: string;
    plugins: string[];
    model_map: Record<string, string>;
    enforce_quota: boolean;
    gateway_base_url: string;
    /** Non-empty replaces desk key. Empty keeps existing. "__clear__" removes desk key. */
    gateway_api_key: string;
    /** Optional Desk Browser allowlist (JSON array string or newline hosts). */
    browser_allowlist?: string;
  }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const plugins = data.plugins.filter((id) => isKnownPluginId(id));
    const map = parseMap(JSON.stringify(data.model_map));
    const baseUrl = normalizeBaseUrl(data.gateway_base_url);
    const keyInput = (data.gateway_api_key ?? "").trim();

    const current = await ensureSettings(context.userId);
    let nextKey = current.gateway_api_key ?? "";
    if (keyInput === "__clear__") nextKey = "";
    else if (keyInput) nextKey = keyInput.slice(0, 512);

    const { allowlistFromLines, parseAllowlist } = await import("./browser/allowlist.ts");
    let nextAllowlist = current.browser_allowlist;
    if (typeof data.browser_allowlist === "string") {
      const raw = data.browser_allowlist.trim();
      if (raw.startsWith("[")) {
        nextAllowlist = JSON.stringify(parseAllowlist(raw));
      } else {
        nextAllowlist = allowlistFromLines(raw);
      }
    }

    await sql`
      insert into settings (
        user_id, system_prompt, plugins, model_map, enforce_quota,
        gateway_base_url, gateway_api_key, browser_allowlist
      )
      values (
        ${context.userId},
        ${data.system_prompt.slice(0, 4000)},
        ${JSON.stringify(plugins)},
        ${JSON.stringify(map)},
        ${data.enforce_quota},
        ${baseUrl},
        ${nextKey},
        ${nextAllowlist}
      )
      on conflict (user_id) do update set
        system_prompt = excluded.system_prompt,
        plugins = excluded.plugins,
        model_map = excluded.model_map,
        enforce_quota = excluded.enforce_quota,
        gateway_base_url = excluded.gateway_base_url,
        gateway_api_key = excluded.gateway_api_key,
        browser_allowlist = excluded.browser_allowlist
    `;
    return { ok: true as const };
  });

type ToolTrace = { name: string; args: string; result: string };

type ChatMsg = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: unknown;
};

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { threadId: string | null; text: string }) => ({
    threadId: input.threadId,
    text: input.text.trim().slice(0, 8000),
  }))
  .handler(async ({ context, data }) => {
    if (!data.text) return { ok: false as const, error: "Write something first." };

    const sql = await getSql();
    const settings = await ensureSettings(context.userId);
    const gateway = resolveGateway(settings);
    if (gateway.source === "none" || !gateway.apiKey) {
      return {
        ok: false as const,
        error: GATEWAY_MISSING_ERROR,
      };
    }

    if (settings.enforce_quota) {
      const counts = await sql<{ n: number }>`
        select count(*)::int as n from messages
        where user_id = ${context.userId} and role = 'user'
      `;
      if ((counts[0]?.n ?? 0) >= 40) {
        return {
          ok: false as const,
          error: "Free plan is capped at 40 messages. Turn the cap off in the desk, or raise the plan.",
        };
      }
    }

    let threadId = data.threadId;
    if (threadId) {
      const owned = await sql<{ id: string }>`
        select id from threads where id = ${threadId} and user_id = ${context.userId}
      `;
      if (!owned[0]) threadId = null;
    }
    if (!threadId) {
      threadId = crypto.randomUUID();
      const title = data.text.slice(0, 72);
      await sql`
        insert into threads (id, user_id, title) values (${threadId}, ${context.userId}, ${title})
      `;
    }

    const userMsgId = crypto.randomUUID();
    await sql`
      insert into messages (id, thread_id, user_id, role, content)
      values (${userMsgId}, ${threadId}, ${context.userId}, 'user', ${data.text})
    `;

    const history = await sql<{ role: string; content: string }>`
      select role, content from messages
      where thread_id = ${threadId} and user_id = ${context.userId}
      order by created_at asc
      limit 24
    `;

    const decision = routeLabel(data.text);
    const map = parseMap(settings.model_map);
    const model = map[decision.label] || "grok-4.5";
    const enabled = parseList(settings.plugins);
    const tools = toolsFor(enabled);

    const messages: ChatMsg[] = [
      {
        role: "system",
        content: settings.system_prompt?.trim() || DEFAULT_PROMPT,
      },
      ...history
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    const traces: ToolTrace[] = [];
    let tokensIn = 0;
    let tokensOut = 0;
    let answer = "";

    for (let round = 0; round < 3; round++) {
      const res = await chatCompletions(gateway, {
        model,
        messages,
        tools: tools.length ? tools : undefined,
        max_tokens: BUDGET[decision.label],
        temperature: 0.4,
      });
      if (!res.ok) {
        const errText = await res.text();
        return { ok: false as const, error: `Gateway ${res.status}: ${errText.slice(0, 180)}`, threadId };
      }
      const body = (await res.json()) as {
        usage?: { prompt_tokens?: number; completion_tokens?: number };
        choices?: {
          message?: {
            content?: string | null;
            tool_calls?: { id: string; function: { name: string; arguments: string } }[];
          };
        }[];
      };
      tokensIn += body.usage?.prompt_tokens ?? 0;
      tokensOut += body.usage?.completion_tokens ?? 0;
      const msg = body.choices?.[0]?.message;
      const calls = msg?.tool_calls ?? [];
      if (!calls.length) {
        answer = msg?.content?.trim() || "I didn't get a reply.";
        break;
      }
      messages.push({
        role: "assistant",
        content: msg?.content || "",
        tool_calls: calls,
      });
      for (const call of calls) {
        const result = await runPluginTool(call.function.name, call.function.arguments, {
          userId: context.userId,
          threadId: threadId ?? undefined,
        });
        traces.push({ name: call.function.name, args: call.function.arguments, result });
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: result,
        });
      }
    }

    const meta = JSON.stringify({
      label: decision.label,
      reason: decision.reason,
      model,
      tools: traces,
    });
    const assistantId = crypto.randomUUID();
    await sql`
      insert into messages (id, thread_id, user_id, role, content, meta)
      values (${assistantId}, ${threadId}, ${context.userId}, 'assistant', ${answer}, ${meta})
    `;
    await sql`
      insert into usage_events (id, user_id, thread_id, model, label, tokens_in, tokens_out)
      values (${crypto.randomUUID()}, ${context.userId}, ${threadId}, ${model}, ${decision.label}, ${tokensIn}, ${tokensOut})
    `;

    const gap = await noteGap(
      gateway,
      model,
      context.userId,
      data.text,
      answer,
      traces.map((t) => t.name),
    );

    return {
      ok: true as const,
      threadId,
      gap,
      message: {
        id: assistantId,
        role: "assistant",
        content: answer,
        meta,
      },
      userMessageId: userMsgId,
    };
  });

async function noteGap(
  gateway: GatewayResolved,
  model: string,
  userId: string,
  ask: string,
  answer: string,
  toolsUsed: string[],
): Promise<string | null> {
  // Explicit create_missing already filed the ask — skip classifier noise.
  if (toolsUsed.includes("create_missing")) return null;
  try {
    const res = await chatCompletions(gateway, {
      model,
      temperature: 0,
      max_tokens: 80,
      messages: [
        {
          role: "system",
          content: `Installed tools: ${installedCapabilityBlurb()}. Reply JSON only: {"gap":null} or {"gap":"short capability name"}. Set gap only when the user wanted data or an action those tools cannot do. Greetings, opinions, and ordinary questions are null. If create_missing was (or should be) used to file the ask, return null.`,
        },
        {
          role: "user",
          content: `User: ${ask.slice(0, 500)}\nTools used: ${toolsUsed.join(", ") || "none"}\nAssistant: ${answer.slice(0, 400)}`,
        },
      ],
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = body.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as { gap?: unknown };
    if (typeof parsed.gap !== "string") return null;
    const title = parsed.gap.trim().slice(0, 80);
    if (title.length < 2 || title.toLowerCase() === "null") return null;
    const row = await upsertGap({ userId, title, example: ask.slice(0, 280) });
    return row?.title ?? null;
  } catch {
    return null;
  }
}

export type GapRow = {
  id: string;
  title: string;
  example: string;
  hits: number;
  status: string;
  note: string;
};

export const listGaps = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql<GapRow>`
      select id, title, example, hits, status, note
      from gaps
      where user_id = ${context.userId} and status <> 'dismissed'
      order by updated_at desc
      limit 20
    `;
  });

export const setGap = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; status: string; note: string }) => ({
    id: input.id,
    status: ["new", "building", "done", "dismissed"].includes(input.status) ? input.status : "new",
    note: (input.note ?? "").slice(0, 500),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      update gaps
      set status = ${data.status}, note = ${data.note}, updated_at = now()
      where id = ${data.id} and user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

/** One-shot seed of enterprise buy-in Missing rows (idempotent by slug). */
export const seedEnterpriseGaps = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const result = await seedGapsRows(context.userId);
    return { ok: true as const, ...result };
  });

/** Explicit file from Desk UI (same upsert path as create_missing tool). */
export const fileGapAsk = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { title: string; detail?: string; note?: string }) => ({
    title: (input.title ?? "").trim().slice(0, 80),
    detail: (input.detail ?? "").trim().slice(0, 280),
    note: (input.note ?? "").trim().slice(0, 500),
  }))
  .handler(async ({ context, data }) => {
    if (data.title.length < 2) return { ok: false as const, error: "Title too short." };
    const row = await upsertGap({
      userId: context.userId,
      title: data.title,
      example: data.detail || data.title,
      note: data.note,
    });
    if (!row) return { ok: false as const, error: "Ask was dismissed or empty." };
    return { ok: true as const, title: row.title, created: row.created };
  });

export type ComputerArtifact = {
  path: string;
  bytes: number;
  updated_at: string;
};

/** List Computer VFS files for the Artifacts drawer (per thread). */
export const listComputerArtifacts = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { threadId?: string | null }) => ({
    threadId: (input.threadId || "default").slice(0, 80),
  }))
  .handler(async ({ context, data }) => {
    const { listFileRows, workspaceRef } = await import("./computer/vfs.ts");
    const rows = await listFileRows(workspaceRef(context.userId, data.threadId));
    const files: ComputerArtifact[] = rows.map((r) => ({
      path: r.path,
      bytes: r.content.length,
      updated_at: r.updated_at,
    }));
    return { files, threadId: data.threadId };
  });

/** Import text files from a browser folder grant into the Computer VFS. */
export const importComputerFiles = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { threadId?: string | null; files: { path: string; content: string }[] }) => ({
    threadId: (input.threadId || "default").slice(0, 80),
    files: (input.files || [])
      .slice(0, 40)
      .map((f) => ({
        path: String(f.path || "").slice(0, 240),
        content: String(f.content || "").slice(0, 80_000),
      })),
  }))
  .handler(async ({ context, data }) => {
    const { writeFile, workspaceRef } = await import("./computer/vfs.ts");
    const ws = workspaceRef(context.userId, data.threadId);
    const results: string[] = [];
    for (const f of data.files) {
      results.push(await writeFile(ws, f.path, f.content));
    }
    return { ok: true as const, results, count: results.length };
  });

/** Read one Computer VFS file (Artifacts preview). */
export const readComputerFile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { threadId?: string | null; path: string }) => ({
    threadId: (input.threadId || "default").slice(0, 80),
    path: (input.path || "").slice(0, 240),
  }))
  .handler(async ({ context, data }) => {
    const { readFile, workspaceRef } = await import("./computer/vfs.ts");
    const content = await readFile(workspaceRef(context.userId, data.threadId), data.path);
    return { path: data.path, content };
  });

export type BrowserTrailItem = {
  id: string;
  url: string;
  title: string;
  action: string;
  mime: string;
  created_at: string;
  /** Present when includeData is true. */
  dataUrl?: string;
};

/** List Browser screenshot trail for Context → Browser drawer. */
export const listBrowserTrail = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { threadId?: string | null; includeData?: boolean }) => ({
    threadId: (input.threadId || "default").slice(0, 80),
    includeData: Boolean(input.includeData),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const { listScreenshots, getScreenshot, dataUrl } = await import("./browser/trail.ts");
    const rows = await listScreenshots(sql, context.userId, data.threadId, 20);
    const items: BrowserTrailItem[] = [];
    for (const r of rows) {
      const item: BrowserTrailItem = {
        id: r.id,
        url: r.url,
        title: r.title,
        action: r.action,
        mime: r.mime,
        created_at: r.created_at,
      };
      if (data.includeData) {
        const full = await getScreenshot(sql, context.userId, r.id);
        if (full) item.dataUrl = dataUrl(full.mime, full.data_base64);
      }
      items.push(item);
    }
    return { items, threadId: data.threadId };
  });

/** Fetch one screenshot as a data URL (tool card / drawer). */
export const getBrowserScreenshot = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => ({
    id: (input.id || "").slice(0, 80),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const { getScreenshot, dataUrl } = await import("./browser/trail.ts");
    const row = await getScreenshot(sql, context.userId, data.id);
    if (!row) return { ok: false as const, error: "Not found." };
    return {
      ok: true as const,
      id: row.id,
      url: row.url,
      title: row.title,
      action: row.action,
      dataUrl: dataUrl(row.mime, row.data_base64),
      created_at: row.created_at,
    };
  });

/**
 * Run the browser plugin with the operator session (Desk / verify scripts).
 * Does not bypass the allowlist — same path as chat tool calls.
 */
export const runBrowserTool = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { threadId?: string | null; args: Record<string, string> }) => ({
    threadId: (input.threadId || "default").slice(0, 80),
    args: input.args || {},
  }))
  .handler(async ({ context, data }) => {
    const enabled = parseList((await ensureSettings(context.userId)).plugins);
    if (!enabled.includes("browser")) {
      return { ok: false as const, error: "Browser plugin is off. Enable it on the Desk." };
    }
    const result = await runPluginTool("browser", JSON.stringify(data.args), {
      userId: context.userId,
      threadId: data.threadId,
    });
    return { ok: true as const, result, threadId: data.threadId };
  });
