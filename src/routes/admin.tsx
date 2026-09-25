import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PhButton, PhInput, PhTextarea, Tile, TileHead } from "@/components/apostle/phosphor";
import { Shell } from "@/components/apostle/shell";
import { getDesk, listGaps, saveDesk, setGap, type GapRow } from "@/lib/apostle/server";

export const Route = createFileRoute("/admin")({ component: Desk });

const LABELS = ["cheap", "default", "strong", "vision"] as const;

function Desk() {
  const [prompt, setPrompt] = useState("");
  const [plugins, setPlugins] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<{ id: string; name: string; blurb: string }[]>([]);
  const [map, setMap] = useState<Record<string, string>>({});
  const [quota, setQuota] = useState(false);
  const [usage, setUsage] = useState<
    { id: string; model: string; label: string; tokens_in: number; tokens_out: number }[]
  >([]);
  const [count, setCount] = useState(0);
  const [gateway, setGateway] = useState("");
  const [note, setNote] = useState("");
  const [gaps, setGaps] = useState<GapRow[]>([]);

  useEffect(() => {
    getDesk()
      .then(async (desk) => {
        setPrompt(desk.settings.system_prompt);
        setPlugins(JSON.parse(desk.settings.plugins) as string[]);
        setMap(JSON.parse(desk.settings.model_map) as Record<string, string>);
        setQuota(desk.settings.enforce_quota);
        setCatalog(desk.catalog);
        setUsage(desk.usage);
        setCount(desk.userMessages);
        setGateway(desk.gateway);
        setGaps(await listGaps());
      })
      .catch(() => setNote("Could not open the desk."));
  }, []);

  async function save() {
    setNote("");
    await saveDesk({
      data: { system_prompt: prompt, plugins, model_map: map, enforce_quota: quota },
    });
    setNote("Saved.");
  }

  function toggle(id: string) {
    setPlugins((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  return (
    <Shell desk>
      <main className="mx-auto flex max-w-2xl flex-col gap-2.5 px-2.5 py-2.5 pb-16 font-mono text-sm">
        <Tile focus>
          <TileHead left="~/ADMIN — DESK" right={gateway === "grok" ? "GATEWAY · GROK" : "GATEWAY · OFF"} />
          <div className="space-y-3 px-4 py-5">
            <h1 className="font-display text-5xl leading-none tracking-tight text-ph-bone">DESK</h1>
            <p className="font-marginalia text-lg text-ph-bone italic">the operator panel.</p>
            <p className="max-w-xl text-ph-dim leading-relaxed">
              Gateway {gateway === "grok" ? "is live on Grok." : "is unavailable."} The router picks
              cheap, default, strong, or vision before each reply. Jev can sit in that slot later;
              this build uses the same four questions locally.
            </p>
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
            <span className="text-[0.7rem] text-ph-dim">{count} messages sent. Cap is 40.</span>
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
      </main>
    </Shell>
  );
}
