import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";

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
  "You are Apostle, a chat assistant the operator installed and themed. Be concise, concrete, and useful. When a tool is available and it would make the answer true, use it.";

const PLUGINS = [
  {
    id: "get_time",
    name: "Clock",
    blurb: "Current time in a timezone.",
    tool: {
      type: "function" as const,
      function: {
        name: "get_time",
        description: "Return the current time in an IANA timezone. Default America/New_York.",
        parameters: {
          type: "object",
          properties: { timezone: { type: "string" } },
        },
      },
    },
  },
  {
    id: "fetch_page",
    name: "Page fetch",
    blurb: "Read a public https page as text.",
    tool: {
      type: "function" as const,
      function: {
        name: "fetch_page",
        description: "Fetch a public https URL and return readable text. No logins, no localhost.",
        parameters: {
          type: "object",
          properties: { url: { type: "string" } },
          required: ["url"],
        },
      },
    },
  },
] as const;

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

async function ensureSettings(userId: string) {
  const sql = await getSql();
  await sql`
    insert into settings (user_id) values (${userId})
    on conflict (user_id) do nothing
  `;
  const rows = await sql<SettingsRow>`
    select system_prompt, plugins, model_map, enforce_quota
    from settings where user_id = ${userId}
  `;
  return rows[0];
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
    return {
      settings,
      usage,
      userMessages: counts[0]?.n ?? 0,
      catalog: PLUGINS.map((p) => ({ id: p.id, name: p.name, blurb: p.blurb })),
      gateway: process.env.XAI_API_KEY ? "grok" : "missing",
    };
  });

export const saveDesk = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    system_prompt: string;
    plugins: string[];
    model_map: Record<string, string>;
    enforce_quota: boolean;
  }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const allowed = new Set(PLUGINS.map((p) => p.id));
    const plugins = data.plugins.filter((id) => allowed.has(id as (typeof PLUGINS)[number]["id"]));
    const map = parseMap(JSON.stringify(data.model_map));
    await sql`
      insert into settings (user_id, system_prompt, plugins, model_map, enforce_quota)
      values (
        ${context.userId},
        ${data.system_prompt.slice(0, 4000)},
        ${JSON.stringify(plugins)},
        ${JSON.stringify(map)},
        ${data.enforce_quota}
      )
      on conflict (user_id) do update set
        system_prompt = excluded.system_prompt,
        plugins = excluded.plugins,
        model_map = excluded.model_map,
        enforce_quota = excluded.enforce_quota
    `;
    return { ok: true as const };
  });

type ToolTrace = { name: string; args: string; result: string };

function blockedHost(hostname: string) {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h.endsWith(".local") ||
    h === "0.0.0.0" ||
    h.startsWith("127.") ||
    h.startsWith("10.") ||
    h.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(h)
  );
}

async function runTool(name: string, rawArgs: string): Promise<string> {
  let args: Record<string, string> = {};
  try {
    args = JSON.parse(rawArgs || "{}") as Record<string, string>;
  } catch {
    args = {};
  }
  if (name === "get_time") {
    const tz = args.timezone || "America/New_York";
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        dateStyle: "full",
        timeStyle: "long",
      }).format(new Date());
    } catch {
      return `Unknown timezone: ${tz}`;
    }
  }
  if (name === "fetch_page") {
    let url: URL;
    try {
      url = new URL(args.url || "");
    } catch {
      return "That is not a URL.";
    }
    if (url.protocol !== "https:" || blockedHost(url.hostname)) {
      return "Only public https pages are allowed.";
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { "User-Agent": "Apostle/0.1" },
        redirect: "follow",
      });
      const text = await res.text();
      const stripped = text
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 3500);
      return `HTTP ${res.status}\n${stripped || "(empty)"}`;
    } catch {
      return "Could not fetch that page.";
    } finally {
      clearTimeout(timer);
    }
  }
  return "Unknown tool.";
}

type ChatMsg = { role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; tool_calls?: unknown };

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { threadId: string | null; text: string }) => ({
    threadId: input.threadId,
    text: input.text.trim().slice(0, 8000),
  }))
  .handler(async ({ context, data }) => {
    if (!data.text) return { ok: false as const, error: "Write something first." };
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "The model gateway is not available in this environment." };

    const sql = await getSql();
    const settings = await ensureSettings(context.userId);
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
    const tools = PLUGINS.filter((p) => enabled.includes(p.id)).map((p) => p.tool);

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
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          tools: tools.length ? tools : undefined,
          max_tokens: BUDGET[decision.label],
          temperature: 0.4,
        }),
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
        const result = await runTool(call.function.name, call.function.arguments);
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

    const gap = await noteGap(apiKey, context.userId, data.text, answer, traces.map((t) => t.name));

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

function slugify(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return slug || "ask";
}

async function noteGap(
  apiKey: string,
  userId: string,
  ask: string,
  answer: string,
  toolsUsed: string[],
): Promise<string | null> {
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        temperature: 0,
        max_tokens: 80,
        messages: [
          {
            role: "system",
            content:
              'Installed tools: clock (get_time), public https page text (fetch_page). Reply JSON only: {"gap":null} or {"gap":"short capability name"}. Set gap only when the user wanted data or an action those tools cannot do. Greetings, opinions, and ordinary questions are null.',
          },
          {
            role: "user",
            content: `User: ${ask.slice(0, 500)}\nTools used: ${toolsUsed.join(", ") || "none"}\nAssistant: ${answer.slice(0, 400)}`,
          },
        ],
      }),
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
    const slug = slugify(title);
    const sql = await getSql();
    const existing = await sql<{ id: string; status: string }>`
      select id, status from gaps where user_id = ${userId} and slug = ${slug}
    `;
    if (existing[0]?.status === "dismissed") return null;
    if (existing[0]) {
      await sql`
        update gaps
        set hits = hits + 1, example = ${ask.slice(0, 280)}, title = ${title}, updated_at = now()
        where id = ${existing[0].id} and user_id = ${userId}
      `;
    } else {
      await sql`
        insert into gaps (id, user_id, slug, title, example)
        values (${crypto.randomUUID()}, ${userId}, ${slug}, ${title}, ${ask.slice(0, 280)})
      `;
    }
    return title;
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

