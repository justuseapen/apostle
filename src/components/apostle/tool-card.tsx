import { useState } from "react";

type Trace = { name: string; args?: string; result: string };

function trunc(s: string, n: number) {
  if (s.length <= n) return s;
  return `${s.slice(0, n)}…`;
}

function prettyArgs(raw?: string) {
  if (!raw) return "";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

/**
 * Richer tool card in chat — status chrome + args/result.
 * Not a streaming AG-UI event bus yet (TODO).
 */
export function ToolCard({ tool }: { tool: Trace }) {
  const [open, setOpen] = useState(true);
  const args = prettyArgs(tool.args);
  return (
    <div className="mb-2 border-2 border-ph-tool bg-ph-tile">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left font-mono text-[0.68rem] tracking-wide text-ph-tool uppercase"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 bg-ph-tool" aria-hidden />
          Tool · {tool.name}
        </span>
        <span className="text-ph-dim">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="space-y-2 border-t-2 border-ph-border px-3 py-2 font-mono text-xs">
          {args ? (
            <pre className="overflow-x-auto whitespace-pre-wrap text-ph-dim">
              <span className="text-ph-tool">args</span>
              {"\n"}
              {trunc(args, 800)}
            </pre>
          ) : null}
          <pre className="overflow-x-auto whitespace-pre-wrap text-ph-bone">
            <span className="text-ph-tool">result</span>
            {"\n"}
            {trunc(tool.result, 1200)}
          </pre>
        </div>
      )}
    </div>
  );
}

/**
 * Approval card shell — protocol is stubbed; Approve/Deny are local UI only.
 * TODO: wire to harness halt + audited protocol events.
 */
export function ApprovalCard({
  toolName = "sandbox.exec",
  reason = "Plugin declared needs.approval — human must decide.",
}: {
  toolName?: string;
  reason?: string;
}) {
  const [state, setState] = useState<"pending" | "once" | "run" | "denied">("pending");
  return (
    <div className="mb-2 border-2 border-ph-warn bg-ph-tile">
      <div className="flex items-center justify-between gap-2 border-b-2 border-ph-border px-3 py-2 font-mono text-[0.68rem] tracking-wide text-ph-warn uppercase">
        <span>Approval needed · {toolName}</span>
        <span>{state === "pending" ? "Pending" : state}</span>
      </div>
      <div className="space-y-3 px-3 py-3 font-mono text-sm">
        <p className="text-ph-dim leading-relaxed">{reason}</p>
        <p className="text-[0.65rem] tracking-wide text-ph-dim uppercase">
          Stub UI — protocol halt not wired yet
        </p>
        {state === "pending" ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="border-2 border-ph-tool px-3 py-1.5 text-xs tracking-wide text-ph-tool uppercase"
              onClick={() => setState("once")}
            >
              Approve once
            </button>
            <button
              type="button"
              className="border-2 border-ph-focus px-3 py-1.5 text-xs tracking-wide text-ph-focus uppercase"
              onClick={() => setState("run")}
            >
              For this run
            </button>
            <button
              type="button"
              className="border-2 border-ph-missing px-3 py-1.5 text-xs tracking-wide text-ph-missing uppercase"
              onClick={() => setState("denied")}
            >
              Deny
            </button>
          </div>
        ) : (
          <p className="text-ph-bone">
            Recorded locally as <span className="text-ph-warn">{state}</span>. Not audited yet.
          </p>
        )}
      </div>
    </div>
  );
}
