import { useState, type ReactNode } from "react";

type DrawerId = "artifacts" | "memory" | "knowledge" | "run";

/**
 * Right-hand run context column — Hero UI fiction → real chrome stubs.
 * Artifacts / Memory / Knowledge are shells; Computer + Browser still Missing.
 */
export function RunContextPanel({
  toolCount = 0,
  showApprovalDemo = false,
}: {
  toolCount?: number;
  showApprovalDemo?: boolean;
}) {
  const [open, setOpen] = useState<DrawerId | null>("run");

  return (
    <aside className="hidden min-h-0 flex-col border-l-2 border-ph-border bg-ph-void xl:flex">
      <div className="border-b-2 border-ph-border px-3 py-2 font-mono text-[0.68rem] tracking-wide text-ph-dim uppercase">
        Context · run
      </div>
      <nav className="flex flex-wrap gap-1 border-b-2 border-ph-border p-2">
        {(
          [
            ["run", "Run"],
            ["artifacts", "Artifacts"],
            ["memory", "Memory"],
            ["knowledge", "Knowledge"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setOpen((cur) => (cur === id ? null : id))}
            className={`border-2 px-2 py-1 font-mono text-[0.65rem] tracking-wide uppercase ${
              open === id
                ? "border-ph-focus bg-ph-focus text-ph-on"
                : "border-ph-border text-ph-dim hover:border-ph-bone hover:text-ph-bone"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto p-2.5 font-mono text-xs">
        {open === "run" && (
          <PanelBlock title="This run" hint="Stub — checkpoints land with harness">
            <ul className="space-y-2 text-ph-dim">
              <li>
                Tools this turn:{" "}
                <span className="text-ph-tool">{toolCount}</span>
              </li>
              <li>Budget: not metered yet</li>
              <li>Router label: see chat meta</li>
            </ul>
            {showApprovalDemo ? (
              <p className="mt-3 text-ph-warn">Approval demo visible in chat stream.</p>
            ) : (
              <p className="mt-3 text-ph-dim">
                Approvals appear in-chat when a plugin declares{" "}
                <span className="text-ph-warn">needs.approval</span>.
              </p>
            )}
          </PanelBlock>
        )}
        {open === "artifacts" && (
          <PanelBlock title="Artifacts" hint="TODO: workspace FS + download">
            <p className="text-ph-dim leading-relaxed">
              No files yet. Sandbox computer will drop shells, diffs, and exports here.
            </p>
            <div className="mt-3 border-2 border-dashed border-ph-border px-3 py-6 text-center text-ph-dim">
              Drop zone stub
            </div>
          </PanelBlock>
        )}
        {open === "memory" && (
          <PanelBlock title="Memory" hint="Per-user · revocable · ≠ RAG">
            <p className="text-ph-dim leading-relaxed">
              Drawer shell only. Memories will be listed, editable, and deletable here.
            </p>
            <ul className="mt-3 space-y-2 text-ph-dim">
              <li className="border-2 border-ph-border px-2 py-2">— empty —</li>
            </ul>
          </PanelBlock>
        )}
        {open === "knowledge" && (
          <PanelBlock title="Knowledge" hint="RAG + citations · separate from Memory">
            <p className="text-ph-dim leading-relaxed">
              Corpus search and citation chips land here. Not wired.
            </p>
            <div className="mt-3 border-2 border-ph-border px-2 py-2 text-ph-dim">
              Search stub…
            </div>
          </PanelBlock>
        )}
        {!open && (
          <p className="px-1 py-2 text-ph-dim">Select a drawer above.</p>
        )}
      </div>
    </aside>
  );
}

function PanelBlock({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="border-2 border-ph-border bg-ph-tile">
      <div className="border-b-2 border-ph-border px-3 py-2">
        <p className="text-[0.68rem] tracking-wide text-ph-bone uppercase">{title}</p>
        <p className="mt-0.5 text-[0.65rem] text-ph-dim">{hint}</p>
      </div>
      <div className="px-3 py-3">{children}</div>
    </section>
  );
}
