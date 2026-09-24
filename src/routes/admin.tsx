import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/apostle/shell";
import { getDesk, listGaps, saveDesk, setGap, type GapRow } from "@/lib/apostle/server";

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
  const [note, setNote] = useState("");
  const [gaps, setGaps] = useState<GapRow[]>([]);

  async function reload() {
    const desk = await getDesk();
    setPrompt(desk.settings.system_prompt);
    setPlugins(JSON.parse(desk.settings.plugins) as string[]);
    setMap(JSON.parse(desk.settings.model_map) as Record<string, string>);
    setQuota(desk.settings.enforce_quota);
    setBaseUrl(desk.settings.gateway_base_url);
    setCatalog(desk.catalog);
    setUsage(desk.usage);
    setCount(desk.userMessages);
    setGateway(desk.gateway);
    setGaps(await listGaps());
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
        : `Gateway live · env XAI_API_KEY · ${gateway.baseUrl}`
      : "Gateway unavailable — paste a key below, or set XAI_API_KEY.";

  return (
    <Shell desk>
      <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8">
        <div>
          <h1 className="font-display text-4xl">Desk</h1>
          <p className="mt-2 text-mute">
            {gatewayLine} The router picks cheap, default, strong, or vision before each reply.
          </p>
        </div>

        <section>
          <h2 className="font-display text-2xl">Gateway</h2>
          <p className="mt-1 text-sm text-mute">
            Any OpenAI-compatible endpoint: Grok, OpenRouter, Ollama, and the rest. Leave the key
            blank on save to keep the current one.
          </p>
          <label className="mt-3 flex flex-col gap-1 text-sm">
            <span>Base URL</span>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.x.ai/v1"
              className="h-12 rounded-full border border-line bg-bone px-4 outline-none"
            />
          </label>
          <label className="mt-3 flex flex-col gap-1 text-sm">
            <span>API key</span>
            <input
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
              className="h-12 rounded-full border border-line bg-bone px-4 outline-none"
              autoComplete="off"
            />
          </label>
          {gateway?.source === "desk" && (
            <button
              type="button"
              onClick={() => {
                setClearKey(true);
                setApiKeyDraft("");
              }}
              className="mt-2 h-10 self-start rounded-full border border-line px-4 text-sm"
            >
              {clearKey ? "Key will clear on save" : "Clear desk key"}
            </button>
          )}
        </section>

        <label className="flex flex-col gap-2">
          <span className="text-sm">Voice</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            placeholder="Leave blank for the default Apostle voice."
            className="rounded-2xl border border-line bg-bone p-3 outline-none"
          />
        </label>

        <section>
          <h2 className="font-display text-2xl">Plugins</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {catalog.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => toggle(p.id)}
                  className="flex min-h-14 w-full items-center justify-between rounded-2xl border border-line px-4 py-3 text-left"
                >
                  <span>
                    <span className="block">{p.name}</span>
                    <span className="text-sm text-mute">{p.blurb}</span>
                  </span>
                  <span className={plugins.includes(p.id) ? "text-ok" : "text-mute"}>
                    {plugins.includes(p.id) ? "On" : "Off"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl">Model map</h2>
          <div className="mt-3 grid gap-3">
            {LABELS.map((label) => (
              <label key={label} className="flex flex-col gap-1 text-sm">
                <span className="capitalize">{label}</span>
                <input
                  value={map[label] ?? ""}
                  onChange={(e) => setMap({ ...map, [label]: e.target.value })}
                  className="h-12 rounded-full border border-line bg-bone px-4 outline-none"
                />
              </label>
            ))}
          </div>
        </section>

        <button
          type="button"
          onClick={() => setQuota((v) => !v)}
          className="flex min-h-14 items-center justify-between rounded-2xl border border-line px-4 text-left"
        >
          <span>
            <span className="block">Free-plan cap</span>
            <span className="text-sm text-mute">{count} messages sent. Cap is 40.</span>
          </span>
          <span className={quota ? "text-signal" : "text-mute"}>{quota ? "Enforced" : "Off"}</span>
        </button>

        <button type="button" onClick={() => void save()} className="h-12 rounded-full bg-ink text-paper">
          Save desk
        </button>
        {note && <p className="text-sm text-mute">{note}</p>}

        <section>
          <h2 className="font-display text-2xl">Missing</h2>
          <p className="mt-1 text-sm text-mute">
            Asks the installed tools could not cover. Start one when you are ready to add it.
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {gaps.length === 0 && <li className="text-sm text-mute">None yet.</li>}
            {gaps.map((gap) => (
              <li key={gap.id} className="rounded-2xl border border-line p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{gap.title}</span>
                  <span className="text-xs uppercase tracking-wide text-mute">
                    {gap.status} · {gap.hits}
                  </span>
                </div>
                <p className="mt-1 text-sm text-mute">{gap.example}</p>
                <input
                  value={gap.note}
                  onChange={(e) =>
                    setGaps((rows) => rows.map((row) => (row.id === gap.id ? { ...row, note: e.target.value } : row)))
                  }
                  placeholder="What you will add"
                  className="mt-3 h-11 w-full rounded-full border border-line bg-bone px-4 text-sm outline-none"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {gap.status !== "building" && (
                    <button
                      type="button"
                      className="h-10 rounded-full bg-ink px-4 text-sm text-paper"
                      onClick={() =>
                        void setGap({
                          data: { id: gap.id, status: "building", note: gap.note || "Add a plugin for this." },
                        }).then(() => listGaps().then(setGaps))
                      }
                    >
                      Start
                    </button>
                  )}
                  {gap.status === "building" && (
                    <button
                      type="button"
                      className="h-10 rounded-full bg-ink px-4 text-sm text-paper"
                      onClick={() =>
                        void setGap({ data: { id: gap.id, status: "done", note: gap.note } }).then(() =>
                          listGaps().then(setGaps),
                        )
                      }
                    >
                      Mark done
                    </button>
                  )}
                  <button
                    type="button"
                    className="h-10 rounded-full border border-line px-4 text-sm"
                    onClick={() =>
                      void setGap({ data: { id: gap.id, status: "dismissed", note: gap.note } }).then(() =>
                        listGaps().then(setGaps),
                      )
                    }
                  >
                    Dismiss
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl">Recent runs</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {usage.length === 0 && <li className="text-mute">No runs yet.</li>}
            {usage.map((u) => (
              <li key={u.id} className="flex justify-between gap-3 border-b border-line py-2">
                <span>
                  {u.label} · {u.model}
                </span>
                <span className="text-mute">
                  {u.tokens_in} in / {u.tokens_out} out
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </Shell>
  );
}
