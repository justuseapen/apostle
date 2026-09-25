import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { openOnboarding } from "@/components/apostle/onboarding";
import { PhButton, PhInput, PhTextarea, Tile, TileHead } from "@/components/apostle/phosphor";
import { Shell } from "@/components/apostle/shell";
import { allowlistToLines } from "@/lib/apostle/browser/allowlist.ts";
import {
  closeBrowserSession,
  getDesk,
  listBrowserSessions,
  listGaps,
  listThreads,
  saveDesk,
  seedEnterpriseGaps,
  setGap,
  type GapRow,
  type ThreadRow,
} from "@/lib/apostle/server";
import { ThemeSelect } from "@/lib/theme";

export const Route = createFileRoute("/admin")({ component: Desk });

const LABELS = ["cheap", "default", "strong", "vision"] as const;

type DeskSection =
  | "overview"
  | "gateway"
  | "plugins"
  | "browser"
  | "threads"
  | "missing"
  | "usage"
  | "theme";

type GatewayInfo = {
  live: boolean;
  source: "desk" | "env" | "none";
  baseUrl: string;
  keyHint: string;
};

const NAV: { id: DeskSection; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "gateway", label: "Gateway" },
  { id: "plugins", label: "Plugins" },
  { id: "browser", label: "Browser" },
  { id: "threads", label: "Threads" },
  { id: "missing", label: "Missing" },
  { id: "usage", label: "Usage" },
  { id: "theme", label: "Theme" },
];

function Desk() {
  const [section, setSection] = useState<DeskSection>("overview");
  const [prompt, setPrompt] = useState("");
  const [plugins, setPlugins] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<
    { id: string; name: string; blurb: string; needs?: { network: string[]; secrets: string[]; approval: boolean } }[]
  >([]);
  const [map, setMap] = useState<Record<string, string>>({});
  const [quota, setQuota] = useState(false);
  const [usage, setUsage] = useState<
    { id: string; model: string; label: string; tokens_in: number; tokens_out: number }[]
  >([]);
  const [count, setCount] = useState(0);
  const [gateway, setGateway] = useState<GatewayInfo | null>(null);
  const [baseUrl, setBaseUrl] = useState("https://api.x.ai/v1");
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [clearKey, setClearKey] = useState(false);
  const [allowlistText, setAllowlistText] = useState("");
  const [note, setNote] = useState("");
  const [gaps, setGaps] = useState<GapRow[]>([]);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [sessions, setSessions] = useState<{ threadId: string; url: string; title: string }[]>([]);

  const allowlistCount = useMemo(
    () => allowlistText.split(/[\n,]+/).map((h) => h.trim()).filter(Boolean).length,
    [allowlistText],
  );

  const statusChips = useMemo(() => {
    const gw = !gateway
      ? "Gateway · …"
      : gateway.live
        ? gateway.source === "desk"
          ? "Gateway · desk"
          : "Gateway · env"
        : "Gateway · off";
    const on = catalog.filter((p) => plugins.includes(p.id)).length;
    return [
      gw,
      `Plugins · ${on}/${catalog.length || "…"}`,
      plugins.includes("computer") ? "Computer · on" : "Computer · off",
      plugins.includes("browser") ? "Browser · on" : "Browser · off",
      `Missing · ${gaps.filter((g) => g.status !== "dismissed" && g.status !== "done").length}`,
      `Threads · ${threads.length}`,
      sessions.length ? `Sessions · ${sessions.length}` : "Sessions · none",
    ];
  }, [gateway, catalog, plugins, gaps, threads.length, sessions.length]);

  async function reload() {
    const desk = await getDesk();
    setPrompt(desk.settings.system_prompt);
    setPlugins(JSON.parse(desk.settings.plugins) as string[]);
    setMap(JSON.parse(desk.settings.model_map) as Record<string, string>);
    setQuota(desk.settings.enforce_quota);
    setBaseUrl(desk.settings.gateway_base_url);
    setAllowlistText(allowlistToLines(desk.settings.browser_allowlist));
    setCatalog(desk.catalog);
    setUsage(desk.usage);
    setCount(desk.userMessages);
    setGateway(desk.gateway);
    let nextGaps = await listGaps();
    if (nextGaps.length === 0) {
      await seedEnterpriseGaps().catch(() => null);
      nextGaps = await listGaps();
    }
    setGaps(nextGaps);
    setThreads(await listThreads().catch(() => []));
    setSessions((await listBrowserSessions().catch(() => ({ sessions: [] }))).sessions);
    setApiKeyDraft("");
    setClearKey(false);
  }

  useEffect(() => {
    reload().catch(() => setNote("Could not open the desk."));
  }, []);

  async function save() {
    setNote("");
    let gateway_api_key = "";
    if (clearKey) gateway_api_key = "__clear__";
    else if (apiKeyDraft.trim()) gateway_api_key = apiKeyDraft.trim();
    await saveDesk({
      data: {
        system_prompt: prompt,
        plugins,
        model_map: map,
        enforce_quota: quota,
        gateway_base_url: baseUrl,
        gateway_api_key,
        browser_allowlist: allowlistText,
      },
    });
    await reload();
    setNote("Saved.");
  }

  function toggle(id: string) {
    setPlugins((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  const gatewayLine = !gateway
    ? "Loading gateway…"
    : gateway.live
      ? gateway.source === "desk"
        ? `Gateway live · desk key ${gateway.keyHint} · ${gateway.baseUrl}`
        : `Gateway live · env key · ${gateway.baseUrl}`
      : "Gateway unavailable — paste a key, point at local Ollama, or set XAI_API_KEY / OPENROUTER_API_KEY.";

  return (
    <Shell desk>
      <div className="mx-auto grid max-w-5xl gap-2.5 px-2.5 py-2.5 pb-16 font-mono text-sm lg:grid-cols-[11rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-2 lg:sticky lg:top-16 lg:self-start">
          <Tile focus>
            <TileHead left="~/ADMIN" right="DESK" />
            <div className="space-y-2 px-3 py-3">
              <h1 className="font-display text-3xl leading-none tracking-tight text-ph-bone">DESK</h1>
              <p className="font-marginalia text-base text-ph-bone italic">operator panel</p>
              <PhButton tone="ghost" className="h-8 w-full" onClick={() => openOnboarding()}>
                Setup guide
              </PhButton>
            </div>
          </Tile>
          <nav className="border-2 border-ph-border bg-ph-tile">
            <ul className="divide-y-2 divide-ph-border">
              {NAV.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSection(item.id)}
                    className={`flex min-h-10 w-full items-center justify-between px-3 text-left text-xs tracking-wide uppercase ${
                      section === item.id
                        ? "bg-ph-focus text-ph-on"
                        : "text-ph-dim hover:bg-ph-raise hover:text-ph-bone"
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <p className="px-1 text-[0.65rem] text-ph-dim">
            <Link to="/" className="text-ph-tool underline-offset-2 hover:underline">
              ← Back to chat
            </Link>
          </p>
        </aside>

        <main className="flex min-w-0 flex-col gap-2.5">
          <Tile>
            <TileHead left="STATUS" right="LIVE · NOT A SETTINGS DUMP" />
            <div className="flex flex-wrap gap-1.5 px-3 py-3">
              {statusChips.map((chip) => (
                <span
                  key={chip}
                  className="border-2 border-ph-border px-2 py-1 text-[0.65rem] tracking-wide text-ph-bone uppercase"
                >
                  {chip}
                </span>
              ))}
            </div>
            <p className="border-t-2 border-ph-border px-3 py-2 text-[0.7rem] text-ph-dim leading-relaxed">
              {gatewayLine} Computer is browser VFS (not host FS). Browser is allowlisted Playwright
              (not Firecracker). SI theme stays private.
            </p>
          </Tile>

          {section === "overview" && (
            <Tile>
              <TileHead left="OVERVIEW" right="DAY-2 OPERATOR" />
              <div className="space-y-3 px-3 py-3 text-ph-dim leading-relaxed">
                <p>
                  Use the nav for Gateway, Plugins, Browser sessions, Threads (counts — manage in
                  chat sidebar), Missing roadmap, Usage, and Theme. Save once after edits.
                </p>
                <ul className="list-inside list-disc space-y-1 text-[0.75rem]">
                  <li>
                    Author a plugin:{" "}
                    <span className="text-ph-tool">docs/plugins.md</span> (Hash is the example).
                  </li>
                  <li>
                    Author a theme:{" "}
                    <span className="text-ph-tool">docs/themes.md</span> (Ink is the second public
                    skin).
                  </li>
                  <li>
                    Chat sidebar: search, rename, delete, reorder threads.
                  </li>
                </ul>
                <PhButton tone="focus" className="h-10 w-full sm:w-fit" onClick={() => void save()}>
                  Save desk
                </PhButton>
                {note ? <p className="text-ph-tool">{note}</p> : null}
              </div>
            </Tile>
          )}

          {section === "theme" && (
            <Tile>
              <TileHead left="THEME" right="LOOK · NOT HARNESS" />
              <div className="space-y-3 px-3 py-3">
                <p className="text-ph-dim leading-relaxed">
                  Phosphor and Ink are public catalog themes. Super Intelligence is a private
                  customer skin (enable-only — not a public catalog entry). Themes never register
                  tools. See <span className="text-ph-tool">docs/themes.md</span>.
                </p>
                <ThemeSelect />
              </div>
            </Tile>
          )}

          {section === "gateway" && (
            <>
              <Tile>
                <TileHead left="GATEWAY" right="OPENAI-COMPATIBLE" />
                <div className="grid gap-3 px-3 py-3">
                  <p className="text-ph-dim leading-relaxed">
                    Any OpenAI-compatible endpoint: Grok, OpenRouter, Ollama. Leave the key blank on
                    save to keep the current one. Local Ollama:{" "}
                    <span className="text-ph-bone">http://localhost:11434/v1</span>
                  </p>
                  <label className="flex flex-col gap-1 text-[0.7rem] tracking-wide text-ph-dim uppercase">
                    <span>Base URL</span>
                    <PhInput
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="https://api.x.ai/v1"
                      autoComplete="off"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[0.7rem] tracking-wide text-ph-dim uppercase">
                    <span>API key</span>
                    <PhInput
                      type="password"
                      value={apiKeyDraft}
                      onChange={(e) => {
                        setApiKeyDraft(e.target.value);
                        setClearKey(false);
                      }}
                      placeholder={
                        gateway?.keyHint
                          ? `Saved ${gateway.keyHint} — paste to replace`
                          : gateway?.source === "env"
                            ? "Using env — paste a desk key to override"
                            : "Paste your model key"
                      }
                      autoComplete="off"
                    />
                  </label>
                  {gateway?.source === "desk" && (
                    <PhButton
                      tone="ghost"
                      className="h-10 w-fit"
                      onClick={() => {
                        setClearKey(true);
                        setApiKeyDraft("");
                      }}
                    >
                      {clearKey ? "Key will clear on save" : "Clear desk key"}
                    </PhButton>
                  )}
                </div>
              </Tile>
              <Tile>
                <TileHead left="VOICE" />
                <div className="px-3 py-3">
                  <PhTextarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={5}
                    placeholder="Leave blank for the default Apostle voice."
                  />
                </div>
              </Tile>
              <Tile>
                <TileHead left="MODEL MAP" right="ONE GATEWAY OBJECT" />
                <div className="grid gap-3 px-3 py-3">
                  {LABELS.map((label) => (
                    <label
                      key={label}
                      className="flex flex-col gap-1 text-[0.7rem] tracking-wide text-ph-dim uppercase"
                    >
                      <span>{label}</span>
                      <PhInput
                        value={map[label] ?? ""}
                        onChange={(e) => setMap({ ...map, [label]: e.target.value })}
                      />
                    </label>
                  ))}
                </div>
              </Tile>
              <button
                type="button"
                onClick={() => setQuota((v) => !v)}
                className="flex min-h-14 items-center justify-between border-2 border-ph-border bg-ph-tile px-4 text-left"
              >
                <span>
                  <span className="block text-ph-bone">Free-plan cap</span>
                  <span className="text-[0.7rem] text-ph-dim">
                    {count} messages sent. Cap is 40. Desk control only — billing / Stripe is out for
                    OSS.
                  </span>
                </span>
                <span className={quota ? "text-ph-focus" : "text-ph-dim"}>
                  {quota ? "ENFORCED" : "OFF"}
                </span>
              </button>
              <PhButton tone="focus" className="h-11 w-full" onClick={() => void save()}>
                Save desk
              </PhButton>
              {note ? <p className="text-ph-tool">{note}</p> : null}
            </>
          )}

          {section === "plugins" && (
            <>
              <Tile>
                <TileHead left="PLUGINS" right="DEFAULT: DENY" />
                <div className="space-y-2 px-3 pt-3">
                  <p className="text-[0.7rem] text-ph-dim leading-relaxed">
                    Plugins declare network / secrets / approvals. Hash is the third-party-style
                    example — see <span className="text-ph-tool">docs/plugins.md</span>. Computer is
                    browser VFS — <span className="text-ph-bone">not host FS</span>. Browser is
                    allowlisted Playwright — <span className="text-ph-bone">not Firecracker</span>.
                  </p>
                </div>
                <ul className="divide-y-2 divide-ph-border">
                  {catalog.map((p) => {
                    const on = plugins.includes(p.id);
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => toggle(p.id)}
                          className="flex min-h-14 w-full items-center justify-between px-3 py-3 text-left"
                        >
                          <span>
                            <span className={`block ${on ? "text-ph-bone" : "text-ph-dim"}`}>
                              {p.name}
                            </span>
                            <span className="text-[0.7rem] text-ph-dim">{p.blurb}</span>
                          </span>
                          <span className={on ? "text-ph-tool" : "text-ph-dim"}>
                            [{on ? "on" : "--"}]
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Tile>
              <PhButton tone="focus" className="h-11 w-full" onClick={() => void save()}>
                Save desk
              </PhButton>
              {note ? <p className="text-ph-tool">{note}</p> : null}
            </>
          )}

          {section === "browser" && (
            <>
              <Tile>
                <TileHead left="BROWSER ALLOWLIST" right={`${allowlistCount} HOSTS · HTTPS`} />
                <div className="space-y-2 px-3 py-3">
                  <p className="text-[0.7rem] text-ph-dim leading-relaxed">
                    One host per line. Use <span className="text-ph-tool">*.example.com</span> for
                    suffix match. Localhost and private IPs are always blocked. URLs you open are at
                    your own risk.
                  </p>
                  <PhTextarea
                    value={allowlistText}
                    onChange={(e) => setAllowlistText(e.target.value)}
                    rows={6}
                    placeholder={"example.com\n*.wikipedia.org\ngithub.com"}
                    className="font-mono text-xs"
                  />
                  <p className="text-[0.65rem] text-ph-dim">
                    Parsed hosts on save: ~{allowlistCount}. Toggle Browser under Plugins to enable
                    tool calls.
                  </p>
                </div>
              </Tile>
              <Tile>
                <TileHead left="LIVE SESSIONS" right="IN-MEMORY · DIES ON RESTART" />
                <div className="space-y-2 px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    <PhButton
                      tone="ghost"
                      className="h-9"
                      onClick={() =>
                        void listBrowserSessions()
                          .then((r) => setSessions(r.sessions))
                          .catch(() => setNote("Could not refresh sessions."))
                      }
                    >
                      Refresh sessions
                    </PhButton>
                  </div>
                  {sessions.length === 0 ? (
                    <p className="text-ph-dim">No open Playwright sessions.</p>
                  ) : (
                    <ul className="divide-y-2 divide-ph-border border-2 border-ph-border">
                      {sessions.map((s) => (
                        <li
                          key={s.threadId}
                          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-ph-bone">
                              {s.title || "(no title)"}
                            </span>
                            <span className="block truncate text-[0.65rem] text-ph-dim">
                              {s.url} · thread {s.threadId.slice(0, 8)}…
                            </span>
                          </span>
                          <PhButton
                            tone="ghost"
                            className="h-8 shrink-0"
                            onClick={() =>
                              void closeBrowserSession({ data: { threadId: s.threadId } }).then(
                                () => listBrowserSessions().then((r) => setSessions(r.sessions)),
                              )
                            }
                          >
                            Close
                          </PhButton>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Tile>
              <PhButton tone="focus" className="h-11 w-full" onClick={() => void save()}>
                Save desk
              </PhButton>
              {note ? <p className="text-ph-tool">{note}</p> : null}
            </>
          )}

          {section === "threads" && (
            <Tile>
              <TileHead left="THREADS" right="MANAGE IN CHAT SIDEBAR" />
              <div className="space-y-3 px-3 py-3">
                <p className="text-ph-dim leading-relaxed">
                  {threads.length} thread(s). Rename, delete, search, and reorder live in the chat
                  sidebar — Desk shows visibility + count here so the admin chrome stays cohesive.
                </p>
                <ul className="max-h-80 divide-y-2 divide-ph-border overflow-y-auto border-2 border-ph-border">
                  {threads.length === 0 && (
                    <li className="px-3 py-3 text-ph-dim">No threads yet.</li>
                  )}
                  {threads.map((t) => (
                    <li key={t.id} className="flex justify-between gap-2 px-3 py-2">
                      <span className="truncate text-ph-bone">{t.title}</span>
                      <span className="shrink-0 text-[0.65rem] text-ph-dim">
                        {t.id.slice(0, 8)}…
                      </span>
                    </li>
                  ))}
                </ul>
                <Link to="/" className="text-ph-tool underline-offset-2 hover:underline">
                  Open chat sidebar →
                </Link>
              </div>
            </Tile>
          )}

          {section === "missing" && (
            <Tile missing>
              <TileHead left="MISSING — ASKS YOU HAVE NOT BUILT" right="SORTED BY COUNT" />
              <div className="flex flex-wrap gap-2 border-b-2 border-ph-border px-3 py-3">
                <PhButton
                  tone="missing"
                  onClick={() =>
                    void seedEnterpriseGaps()
                      .then((r) => {
                        setNote(
                          r.ok
                            ? `Seeded buy-in gaps · filed ${r.filed}, skipped ${r.skipped}.`
                            : "Seed failed.",
                        );
                        return listGaps().then(setGaps);
                      })
                      .catch(() => setNote("Seed failed."))
                  }
                >
                  Seed enterprise gaps
                </PhButton>
                <p className="w-full text-[0.7rem] text-ph-dim leading-relaxed">
                  Chat can also file rows via <span className="text-ph-tool">create_missing</span>{" "}
                  (/missing).
                </p>
              </div>
              <ul className="divide-y-2 divide-ph-border">
                {gaps.length === 0 && <li className="px-3 py-4 text-ph-dim">None yet.</li>}
                {gaps.map((gap) => (
                  <li key={gap.id} className="space-y-3 px-3 py-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-ph-bone">{gap.title}</span>
                      <span className="text-[0.65rem] tracking-wide text-ph-dim uppercase">
                        {gap.status} · ×{gap.hits}
                      </span>
                    </div>
                    <p className="text-ph-dim">{gap.example}</p>
                    <PhInput
                      value={gap.note}
                      onChange={(e) =>
                        setGaps((rows) =>
                          rows.map((row) =>
                            row.id === gap.id ? { ...row, note: e.target.value } : row,
                          ),
                        )
                      }
                      placeholder="What you will add"
                    />
                    <div className="flex flex-wrap gap-2">
                      {gap.status !== "building" && (
                        <PhButton
                          tone="ghost"
                          onClick={() =>
                            void setGap({
                              data: {
                                id: gap.id,
                                status: "building",
                                note: gap.note || "Add a plugin for this.",
                              },
                            }).then(() => listGaps().then(setGaps))
                          }
                        >
                          Start
                        </PhButton>
                      )}
                      {gap.status === "building" && (
                        <PhButton
                          tone="tool"
                          onClick={() =>
                            void setGap({
                              data: { id: gap.id, status: "done", note: gap.note },
                            }).then(() => listGaps().then(setGaps))
                          }
                        >
                          Mark done
                        </PhButton>
                      )}
                      <PhButton
                        tone="ghost"
                        className="text-ph-dim"
                        onClick={() =>
                          void setGap({
                            data: { id: gap.id, status: "dismissed", note: gap.note },
                          }).then(() => listGaps().then(setGaps))
                        }
                      >
                        Dismiss
                      </PhButton>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="border-t-2 border-ph-border px-3 py-3 text-center font-marginalia text-sm text-ph-bone italic">
                this list is your roadmap. they told you.
              </p>
            </Tile>
          )}

          {section === "usage" && (
            <Tile>
              <TileHead left="RECENT RUNS" />
              <ul className="divide-y-2 divide-ph-border">
                {usage.length === 0 && <li className="px-3 py-3 text-ph-dim">No runs yet.</li>}
                {usage.map((u) => (
                  <li key={u.id} className="flex justify-between gap-3 px-3 py-2 text-sm">
                    <span className="text-ph-bone">
                      {u.label} · {u.model}
                    </span>
                    <span className="text-ph-dim">
                      {u.tokens_in} in / {u.tokens_out} out
                    </span>
                  </li>
                ))}
              </ul>
            </Tile>
          )}
        </main>
      </div>
    </Shell>
  );
}
