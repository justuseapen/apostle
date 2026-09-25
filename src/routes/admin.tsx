import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { openOnboarding } from "@/components/apostle/onboarding";
import { PhButton, PhInput, PhTextarea, Tile, TileHead } from "@/components/apostle/phosphor";
import { Shell } from "@/components/apostle/shell";
import { allowlistToLines } from "@/lib/apostle/browser/allowlist.ts";
import { getDesk, listGaps, saveDesk, seedEnterpriseGaps, setGap, type GapRow } from "@/lib/apostle/server";
import { ThemeSelect } from "@/lib/theme";

export const Route = createFileRoute("/admin")({ component: Desk });

const LABELS = ["cheap", "default", "strong", "vision"] as const;

type GatewayInfo = {
  live: boolean;
  source: "desk" | "env" | "none";
  baseUrl: string;
  keyHint: string;
};

function Desk() {
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
    // Pitch desk: never leave Missing empty — soft-seed buy-in matrix once.
    if (nextGaps.length === 0) {
      await seedEnterpriseGaps().catch(() => null);
      nextGaps = await listGaps();
    }
    setGaps(nextGaps);
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

  const gatewayRight = !gateway
    ? "…"
    : gateway.live
      ? gateway.source === "desk"
        ? "GATEWAY · DESK"
        : "GATEWAY · ENV"
      : "GATEWAY · OFF";

  const gatewayLine = !gateway
    ? "Loading gateway…"
    : gateway.live
      ? gateway.source === "desk"
        ? `Gateway live · desk key ${gateway.keyHint} · ${gateway.baseUrl}`
        : `Gateway live · env key · ${gateway.baseUrl}`
      : "Gateway unavailable — paste a key, point at local Ollama, or set XAI_API_KEY / OPENROUTER_API_KEY.";

  return (
    <Shell desk>
      <main className="mx-auto flex max-w-2xl flex-col gap-2.5 px-2.5 py-2.5 pb-16 font-mono text-sm">
        <Tile focus>
          <TileHead left="~/ADMIN — DESK" right={gatewayRight} />
          <div className="space-y-3 px-4 py-5">
            <h1 className="font-display text-5xl leading-none tracking-tight text-ph-bone">DESK</h1>
            <p className="font-marginalia text-lg text-ph-bone italic">the operator panel.</p>
            <p className="max-w-xl text-ph-dim leading-relaxed">
              {gatewayLine} The router picks cheap, default, strong, or vision before each reply.
            </p>
            <PhButton tone="ghost" className="h-9 w-fit" onClick={() => openOnboarding()}>
              Setup guide
            </PhButton>
          </div>
        </Tile>

        <Tile>
          <TileHead left="THEME" right="LOOK · NOT HARNESS" />
          <div className="space-y-3 px-3 py-3">
            <p className="text-ph-dim leading-relaxed">
              Phosphor is the public default everywhere OSS is marketed. Super Intelligence is a
              private customer skin (enable-only — not a public catalog entry). Themes never
              register tools. Private pitch link:{" "}
              <span className="text-ph-bone">?theme=si</span>
            </p>
            <ThemeSelect />
          </div>
        </Tile>

        <Tile>
          <TileHead left="GATEWAY" right="OPENAI-COMPATIBLE" />
          <div className="grid gap-3 px-3 py-3">
            <p className="text-ph-dim leading-relaxed">
              Any OpenAI-compatible endpoint: Grok, OpenRouter, Ollama. Leave the key blank on save
              to keep the current one. Local Ollama needs no key — set base{" "}
              <span className="text-ph-bone">http://localhost:11434/v1</span> and map models (e.g.{" "}
              <span className="text-ph-bone">qwen3:0.6b</span>). Cloud example:{" "}
              <span className="text-ph-bone">https://openrouter.ai/api/v1</span>
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
          <TileHead left="PLUGINS" right="DEFAULT: DENY" />
          <div className="space-y-2 px-3 pt-3">
            <p className="text-[0.7rem] text-ph-dim leading-relaxed">
              Plugins declare network / secrets / approvals. Computer is a browser VFS + constrained
              builtins — <span className="text-ph-bone">not host FS</span>, network default deny.
              Browser is Desk-allowlisted Playwright + screenshot trail —{" "}
              <span className="text-ph-bone">not Firecracker</span>, not desktop computer-use.
              Better VM is the honest Next deepen. Neither plugin is “done.”
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
                      <span className={`block ${on ? "text-ph-bone" : "text-ph-dim"}`}>{p.name}</span>
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

        <Tile>
          <TileHead left="BROWSER ALLOWLIST" right="HTTPS HOSTS ONLY" />
          <div className="space-y-2 px-3 py-3">
            <p className="text-[0.7rem] text-ph-dim leading-relaxed">
              One host per line. Use <span className="text-ph-tool">*.example.com</span> for
              suffix match. Localhost and private IPs are always blocked. Toggle the Browser
              plugin above to enable tool calls. URLs you open are at your own risk.
            </p>
            <PhTextarea
              value={allowlistText}
              onChange={(e) => setAllowlistText(e.target.value)}
              rows={6}
              placeholder={"example.com\n*.wikipedia.org\ngithub.com"}
              className="font-mono text-xs"
            />
          </div>
        </Tile>

        <Tile>
          <TileHead left="MODEL MAP" right="ONE GATEWAY OBJECT" />
          <div className="grid gap-3 px-3 py-3">
            {LABELS.map((label) => (
              <label key={label} className="flex flex-col gap-1 text-[0.7rem] tracking-wide text-ph-dim uppercase">
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
              {count} messages sent. Cap is 40. Desk control only — billing / Stripe is out for OSS.
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
              Chat can also file rows via the <span className="text-ph-tool">create_missing</span>{" "}
              tool (/missing). Seed fills the TMTG buy-in matrix so the pitch desk is never empty.
            </p>
          </div>
          <ul className="divide-y-2 divide-ph-border">
            {gaps.length === 0 && (
              <li className="px-3 py-4 text-ph-dim">None yet.</li>
            )}
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
                      rows.map((row) => (row.id === gap.id ? { ...row, note: e.target.value } : row)),
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
                        void setGap({ data: { id: gap.id, status: "done", note: gap.note } }).then(
                          () => listGaps().then(setGaps),
                        )
                      }
                    >
                      Mark done
                    </PhButton>
                  )}
                  <PhButton
                    tone="ghost"
                    className="text-ph-dim"
                    onClick={() =>
                      void setGap({ data: { id: gap.id, status: "dismissed", note: gap.note } }).then(
                        () => listGaps().then(setGaps),
                      )
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

        <p className="px-1 text-center text-ph-dim">
          <Link to="/" className="text-ph-tool underline-offset-2 hover:underline">
            Back to chat
          </Link>
        </p>
      </main>
    </Shell>
  );
}
