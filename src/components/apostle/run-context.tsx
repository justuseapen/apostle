import { useCallback, useEffect, useState, type ReactNode } from "react";
import { BROWSER_LIMITS } from "@/lib/apostle/browser/limits.ts";
import { COMPUTER_LIMITS } from "@/lib/apostle/computer/limits.ts";
import {
  detectBrowserFs,
  listOpfsMirror,
  mirrorToOpfs,
  pickDirectoryImport,
} from "@/lib/apostle/computer/browser-fs.ts";
import {
  closeBrowserSession,
  deleteMemoryItem,
  exportUserArchive,
  getBrowserSession,
  importComputerFiles,
  listBrowserTrail,
  listComputerArtifacts,
  listMemoryItems,
  readComputerFile,
  upsertMemoryItem,
  type BrowserTrailItem,
  type ComputerArtifact,
} from "@/lib/apostle/server";

type DrawerId = "artifacts" | "browser" | "memory" | "knowledge" | "run" | "vault";

/**
 * Right-hand run context column — Hero UI fiction → real chrome stubs.
 * Artifacts lists Computer VFS; Browser lists screenshot trail.
 */
export function RunContextPanel({
  toolCount = 0,
  showApprovalDemo = false,
  threadId = null,
  artifactsTick = 0,
}: {
  toolCount?: number;
  showApprovalDemo?: boolean;
  /** Active chat thread — Computer workspace / Browser trail scoped per thread. */
  threadId?: string | null;
  /** Bump after tool turns so Artifacts / Browser refresh. */
  artifactsTick?: number;
}) {
  const [open, setOpen] = useState<DrawerId | null>("artifacts");

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
            ["browser", "Browser"],
            ["memory", "Memory"],
            ["knowledge", "Knowledge"],
            ["vault", "Vault"],
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
          <ArtifactsDrawer threadId={threadId} tick={artifactsTick} />
        )}
        {open === "browser" && (
          <BrowserTrailDrawer threadId={threadId} tick={artifactsTick} />
        )}
        {open === "memory" && <MemoryDrawer />}
        {open === "vault" && <VaultDrawer />}
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

function MemoryDrawer() {
  const [items, setItems] = useState<
    { id: string; scope: string; text: string; updatedAt: string }[]
  >([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await listMemoryItems({ data: {} });
      setItems(
        res.items.map((m) => ({
          id: m.id,
          scope: m.scope,
          text: m.text,
          updatedAt: m.updatedAt,
        })),
      );
    } catch {
      setStatus("Could not load memory.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onAdd() {
    const text = draft.trim();
    if (!text) return;
    setBusy(true);
    setStatus("");
    try {
      const res = await upsertMemoryItem({
        data: { scope: "global", text },
      });
      if (!res.ok) {
        setStatus(res.error);
        return;
      }
      setDraft("");
      await refresh();
    } catch {
      setStatus("Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    setBusy(true);
    try {
      await deleteMemoryItem({ data: { id } });
      await refresh();
    } catch {
      setStatus("Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PanelBlock title="Memory" hint="Per-user · revocable · ≠ RAG">
      <p className="text-ph-dim leading-relaxed">
        Everything Apostle remembers about you, in plain language. Edit or delete any line — it
        travels across models.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="Add a memory…"
          className="w-full border-2 border-ph-border bg-ph-tile px-2 py-1.5 text-ph-bone outline-none focus:border-ph-focus"
        />
        <button
          type="button"
          disabled={busy || !draft.trim()}
          onClick={() => void onAdd()}
          className="self-start border-2 border-ph-focus px-2 py-1 text-[0.65rem] tracking-wide text-ph-focus uppercase hover:bg-ph-focus hover:text-ph-on disabled:opacity-40"
        >
          Add global
        </button>
      </div>
      <ul className="mt-3 space-y-2">
        {items.length === 0 ? (
          <li className="border-2 border-ph-border px-2 py-2 text-ph-dim">— empty —</li>
        ) : (
          items.map((m) => (
            <li
              key={m.id}
              className="flex items-start justify-between gap-2 border-2 border-ph-border px-2 py-2"
            >
              <div className="min-w-0">
                <p className="text-[0.6rem] tracking-wide text-ph-dim uppercase">{m.scope}</p>
                <p className="text-ph-bone leading-relaxed whitespace-pre-wrap">{m.text}</p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onDelete(m.id)}
                className="shrink-0 border-2 border-ph-border px-1.5 py-0.5 text-[0.6rem] tracking-wide text-ph-dim uppercase hover:border-ph-missing hover:text-ph-missing"
              >
                Del
              </button>
            </li>
          ))
        )}
      </ul>
      {status ? <p className="mt-2 text-[0.65rem] text-ph-warn">{status}</p> : null}
    </PanelBlock>
  );
}

function VaultDrawer() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function onExport() {
    setBusy(true);
    setStatus("");
    try {
      const res = await exportUserArchive();
      if (!res.ok) {
        setStatus(res.error);
        return;
      }
      const blob = new Blob([JSON.stringify(res.archive, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `apostle-export-v1-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("Downloaded schema v1 archive.");
    } catch {
      setStatus("Export failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PanelBlock title="Vault" hint="Open export · schema v1">
      <p className="text-ph-dim leading-relaxed">
        Download projects, threads, messages, memory, prompts, skills, and file metadata as one JSON
        archive. Your data stays portable across models.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void onExport()}
        className="mt-3 border-2 border-ph-focus px-2 py-1 text-[0.65rem] tracking-wide text-ph-focus uppercase hover:bg-ph-focus hover:text-ph-on disabled:opacity-40"
      >
        {busy ? "Building…" : "Export archive"}
      </button>
      {status ? <p className="mt-2 text-[0.65rem] text-ph-tool">{status}</p> : null}
    </PanelBlock>
  );
}

function BrowserTrailDrawer({
  threadId,
  tick,
}: {
  threadId?: string | null;
  tick: number;
}) {
  const [items, setItems] = useState<BrowserTrailItem[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<{ open: boolean; url?: string; title?: string }>({
    open: false,
  });

  const refresh = useCallback(async () => {
    if (!threadId) {
      setItems([]);
      setSession({ open: false });
      return;
    }
    setBusy(true);
    try {
      const [res, sess] = await Promise.all([
        listBrowserTrail({ data: { threadId, includeData: true } }),
        getBrowserSession({ data: { threadId } }),
      ]);
      setItems(res.items);
      setSession(sess);
      setStatus("");
    } catch {
      setStatus("Could not load screenshot trail.");
    } finally {
      setBusy(false);
    }
  }, [threadId]);

  useEffect(() => {
    void refresh();
  }, [refresh, tick]);

  return (
    <PanelBlock
      title="Browser"
      hint="Allowlisted Playwright · screenshot trail"
    >
      <p className="text-ph-dim leading-relaxed">
        Screenshots from the <span className="text-ph-tool">browser</span> tool for this
        thread. Only Desk-allowlisted https hosts. Not a desktop computer-use agent.
      </p>
      <details className="mt-2 border-2 border-ph-border bg-ph-void">
        <summary className="cursor-pointer px-2 py-1.5 text-[0.65rem] tracking-wide text-ph-warn uppercase">
          Capabilities + limits
        </summary>
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap px-2 py-2 text-[0.65rem] text-ph-dim leading-relaxed">
          {BROWSER_LIMITS}
        </pre>
      </details>

      <div className="mt-3 flex flex-wrap gap-1">
        <button
          type="button"
          disabled={busy || !threadId}
          onClick={() => void refresh()}
          className="border-2 border-ph-border px-2 py-1 text-[0.65rem] tracking-wide text-ph-bone uppercase hover:border-ph-focus disabled:opacity-40"
        >
          Refresh
        </button>
        <button
          type="button"
          disabled={busy || !threadId || !session.open}
          onClick={() =>
            void closeBrowserSession({ data: { threadId } }).then(() => refresh())
          }
          className="border-2 border-ph-border px-2 py-1 text-[0.65rem] tracking-wide text-ph-dim uppercase hover:border-ph-missing disabled:opacity-40"
        >
          Close session
        </button>
      </div>

      {session.open && (
        <p className="mt-2 truncate text-[0.65rem] text-ph-tool">
          Live · {session.title || "(no title)"} · {session.url}
        </p>
      )}

      {!threadId && (
        <p className="mt-3 text-ph-dim">Send a message to open a thread trail.</p>
      )}

      {items.length === 0 && threadId ? (
        <div className="mt-3 border-2 border-dashed border-ph-border px-3 py-5 text-center text-ph-dim">
          No screenshots yet. Try <span className="text-ph-tool">/browse</span> then open
          https://example.com via the browser tool.
        </div>
      ) : (
        <ul className="mt-3 max-h-[28rem] space-y-3 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="border-2 border-ph-border bg-ph-void">
              <div className="border-b-2 border-ph-border px-2 py-1.5">
                <p className="truncate text-ph-bone">{item.title || "(no title)"}</p>
                <p className="truncate text-[0.65rem] text-ph-dim">
                  {item.action} · {item.url}
                </p>
              </div>
              {item.dataUrl ? (
                <img
                  src={item.dataUrl}
                  alt={item.title || item.url}
                  className="max-h-40 w-full object-contain object-top"
                />
              ) : (
                <p className="px-2 py-3 text-ph-dim">No preview</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {status && <p className="mt-2 text-[0.65rem] text-ph-warn leading-relaxed">{status}</p>}
    </PanelBlock>
  );
}

function ArtifactsDrawer({
  threadId,
  tick,
}: {
  threadId?: string | null;
  tick: number;
}) {
  const [files, setFiles] = useState<ComputerArtifact[]>([]);
  const [preview, setPreview] = useState<{ path: string; content: string } | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const caps = detectBrowserFs();

  const refresh = useCallback(async () => {
    if (!threadId) {
      setFiles([]);
      return;
    }
    try {
      const res = await listComputerArtifacts({ data: { threadId } });
      setFiles(res.files);
    } catch {
      setStatus("Could not load workspace files.");
    }
  }, [threadId]);

  useEffect(() => {
    void refresh();
  }, [refresh, tick]);

  async function onImportFolder() {
    setBusy(true);
    setStatus("");
    try {
      const picked = await pickDirectoryImport();
      if (picked.error && !picked.files.length) {
        setStatus(picked.error);
        return;
      }
      if (!threadId) {
        setStatus("Start a chat thread first, then import.");
        return;
      }
      const res = await importComputerFiles({
        data: { threadId, files: picked.files },
      });
      for (const f of picked.files) {
        await mirrorToOpfs(threadId, f.path, f.content);
      }
      setStatus(`Imported ${res.count} file(s) into the browser sandbox workspace.`);
      await refresh();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onPreview(path: string) {
    if (!threadId) return;
    setBusy(true);
    try {
      const res = await readComputerFile({ data: { threadId, path } });
      setPreview(res);
      await mirrorToOpfs(threadId, path, res.content);
    } catch {
      setStatus("Could not read that file.");
    } finally {
      setBusy(false);
    }
  }

  async function onShowOpfs() {
    if (!threadId) return;
    const names = await listOpfsMirror(threadId);
    setStatus(
      names.length
        ? `OPFS mirror (${names.length}): ${names.slice(0, 8).join(", ")}${names.length > 8 ? "…" : ""}`
        : "OPFS mirror empty — open a file or import a folder to populate it.",
    );
  }

  return (
    <PanelBlock
      title="Artifacts"
      hint="Computer VFS · browser sandbox · at your own risk"
    >
      <p className="text-ph-dim leading-relaxed">
        Workspace files for this thread ({files.length}). Not your Mac disk unless you grant a
        folder. Shell builtins include ls/cat/cp/mv/grep — no host processes. Try{" "}
        <span className="text-ph-tool">/computer</span> then{" "}
        <span className="text-ph-bone">run: ls</span>.
      </p>
      <details className="mt-2 border-2 border-ph-border bg-ph-void">
        <summary className="cursor-pointer px-2 py-1.5 text-[0.65rem] tracking-wide text-ph-warn uppercase">
          Capabilities + limits
        </summary>
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap px-2 py-2 text-[0.65rem] text-ph-dim leading-relaxed">
          {COMPUTER_LIMITS}
        </pre>
      </details>

      <div className="mt-3 flex flex-wrap gap-1">
        <button
          type="button"
          disabled={busy || !threadId}
          onClick={() => void refresh()}
          className="border-2 border-ph-border px-2 py-1 text-[0.65rem] tracking-wide text-ph-bone uppercase hover:border-ph-focus disabled:opacity-40"
        >
          Refresh
        </button>
        <button
          type="button"
          disabled={busy || !caps.directoryPicker}
          onClick={() => void onImportFolder()}
          className="border-2 border-ph-border px-2 py-1 text-[0.65rem] tracking-wide text-ph-bone uppercase hover:border-ph-focus disabled:opacity-40"
          title={
            caps.directoryPicker
              ? "Grant a folder (File System Access API) — imports text into the VFS"
              : "File System Access API unavailable in this browser"
          }
        >
          Grant folder
        </button>
        <button
          type="button"
          disabled={busy || !caps.opfs || !threadId}
          onClick={() => void onShowOpfs()}
          className="border-2 border-ph-border px-2 py-1 text-[0.65rem] tracking-wide text-ph-dim uppercase hover:border-ph-bone disabled:opacity-40"
        >
          OPFS
        </button>
      </div>

      {!threadId && (
        <p className="mt-3 text-ph-dim">Send a message to open a thread workspace.</p>
      )}

      {files.length === 0 && threadId ? (
        <div className="mt-3 border-2 border-dashed border-ph-border px-3 py-5 text-center text-ph-dim">
          No files yet. Try <span className="text-ph-tool">/computer</span> or ask the
          model to write a README via the computer tool.
        </div>
      ) : (
        <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto">
          {files.map((f) => (
            <li key={f.path}>
              <button
                type="button"
                onClick={() => void onPreview(f.path)}
                className="flex w-full items-center justify-between border-2 border-ph-border px-2 py-1.5 text-left hover:border-ph-focus"
              >
                <span className="truncate text-ph-bone">{f.path}</span>
                <span className="shrink-0 text-ph-dim">{f.bytes}b</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {preview && (
        <div className="mt-3 border-2 border-ph-border bg-ph-void">
          <div className="flex items-center justify-between border-b-2 border-ph-border px-2 py-1">
            <span className="truncate text-ph-tool">{preview.path}</span>
            <button
              type="button"
              className="text-ph-dim uppercase hover:text-ph-bone"
              onClick={() => setPreview(null)}
            >
              Close
            </button>
          </div>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap px-2 py-2 text-[0.65rem] text-ph-bone">
            {preview.content.slice(0, 4000)}
            {preview.content.length > 4000 ? "\n…" : ""}
          </pre>
        </div>
      )}

      {status && <p className="mt-2 text-[0.65rem] text-ph-warn leading-relaxed">{status}</p>}
    </PanelBlock>
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
