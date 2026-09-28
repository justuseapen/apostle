import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Landing } from "@/components/apostle/landing/landing";
import { Markdown } from "@/components/apostle/markdown";
import { PhButton, PhInput } from "@/components/apostle/phosphor";
import { RunContextPanel } from "@/components/apostle/run-context";
import { Shell } from "@/components/apostle/shell";
import { SlashMenu } from "@/components/apostle/slash-menu";
import { ApprovalCard, ToolCard } from "@/components/apostle/tool-card";
import { openOnboarding } from "@/components/apostle/onboarding";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listMessages, listThreads, sendMessage, importComputerFiles, renameThread, deleteThread, reorderThreads, searchThreads, type MessageRow, type ThreadRow } from "@/lib/apostle/server";
import {
  filterSlashSkills,
  listSlashSkills,
  slashQuery,
  type SlashSkill,
} from "@/lib/apostle/slash-skills";

export const Route = createFileRoute("/")({ component: Home });

type Trace = { name: string; args?: string; result: string };
type Meta = { label?: string; reason?: string; model?: string; tools?: Trace[] };

function readMeta(raw: string | null): Meta {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Meta;
  } catch {
    return {};
  }
}

function Home() {
  const { user, isPending } = useCurrentUserState();
  // Pending: show the public Phosphor landing (not a blank void) so hard-reload
  // and signed-out visitors never land on an empty frame. Signed-in swaps to chat.
  if (isPending || !user) {
    return <Landing />;
  }
  return <Chat />;
}

function Chat() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [logged, setLogged] = useState("");
  const [openList, setOpenList] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const [showApprovalDemo, setShowApprovalDemo] = useState(false);
  const [artifactsTick, setArtifactsTick] = useState(0);
  const [threadQuery, setThreadQuery] = useState("");
  const [searchHits, setSearchHits] = useState<(ThreadRow & { snippet?: string | null })[] | null>(
    null,
  );
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const allSkills = useMemo(() => listSlashSkills(), []);

  const query = slashQuery(draft);
  const slashOpen = query !== null;
  const filtered = useMemo(
    () => (query === null ? [] : filterSlashSkills(query, allSkills)),
    [query, allSkills],
  );

  const toolCount = useMemo(() => {
    let n = 0;
    for (const m of messages) {
      n += readMeta(m.meta).tools?.length ?? 0;
    }
    return n;
  }, [messages]);

  useEffect(() => {
    setSlashIndex(0);
  }, [query]);

  useEffect(() => {
    if (slashIndex >= filtered.length) setSlashIndex(Math.max(0, filtered.length - 1));
  }, [filtered.length, slashIndex]);

  async function refreshThreads() {
    const rows = await listThreads();
    setThreads(rows);
    return rows;
  }

  useEffect(() => {
    refreshThreads()
      .then((rows) => {
        if (rows[0]) {
          setActive(rows[0].id);
          return listMessages({ data: rows[0].id }).then(setMessages);
        }
      })
      .catch(() => setError("Could not load your threads."));
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages, busy]);

  // Screenshot / smoke helper: window.dispatchEvent(new CustomEvent("apostle:demo-message", { detail: { content, tools?, approval?, threadId? } }))
  useEffect(() => {
    const onDemo = (e: Event) => {
      const detail = (
        e as CustomEvent<{
          content?: string;
          tools?: Trace[];
          approval?: boolean;
          threadId?: string;
        }>
      ).detail;
      if (!detail?.content) return;
      if (detail.approval) setShowApprovalDemo(true);
      if (detail.threadId) {
        setActive(detail.threadId);
        setArtifactsTick((n) => n + 1);
      }
      setMessages((m) => [
        ...m,
        {
          id: `demo-${Date.now()}`,
          role: "assistant",
          content: detail.content!,
          meta: JSON.stringify({
            label: "demo",
            model: "local",
            tools: detail.tools,
          }),
          created_at: new Date().toISOString(),
        },
      ]);
    };
    const onComputerSeed = (e: Event) => {
      const detail = (
        e as CustomEvent<{ threadId?: string; files?: { path: string; content: string }[] }>
      ).detail;
      const files = detail?.files;
      if (!files?.length) return;
      void (async () => {
        const threadId = detail?.threadId || null;
        if (!threadId) return;
        setActive(threadId);
        await importComputerFiles({ data: { threadId, files } });
        setArtifactsTick((n) => n + 1);
      })();
    };    window.addEventListener("apostle:demo-message", onDemo);
    window.addEventListener("apostle:computer-seed", onComputerSeed);
    return () => {
      window.removeEventListener("apostle:demo-message", onDemo);
      window.removeEventListener("apostle:computer-seed", onComputerSeed);
    };
  }, []);

  async function openThread(id: string) {
    setActive(id);
    setOpenList(false);
    setMessages(await listMessages({ data: id }));
  }

  function fresh() {
    setActive(null);
    setMessages([]);
    setOpenList(false);
    setError("");
    setLogged("");
    setShowApprovalDemo(false);
  }

  async function onSearchThreads(q: string) {
    setThreadQuery(q);
    if (!q.trim()) {
      setSearchHits(null);
      return;
    }
    try {
      const res = await searchThreads({ data: { query: q } });
      setSearchHits(res.threads);
    } catch {
      setSearchHits([]);
    }
  }

  async function onRenameThread(id: string) {
    const title = renameDraft.trim();
    if (!title) return;
    await renameThread({ data: { id, title } });
    setRenamingId(null);
    await refreshThreads();
  }

  async function onDeleteThread(id: string) {
    if (!window.confirm("Delete this thread and its messages?")) return;
    await deleteThread({ data: { id } });
    if (active === id) {
      setActive(null);
      setMessages([]);
    }
    await refreshThreads();
  }

  async function moveThread(id: string, dir: -1 | 1) {
    const ids = threads.map((t) => t.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    const next = [...ids];
    const tmp = next[i]!;
    next[i] = next[j]!;
    next[j] = tmp;
    await reorderThreads({ data: { ids: next } });
    await refreshThreads();
  }

  const visibleThreads: (ThreadRow & { snippet?: string | null })[] = searchHits ?? threads;

  function applySkill(skill: SlashSkill) {
    if (skill.kind === "desk") {
      setDraft("");
      void navigate({ to: "/admin" });
      return;
    }
    if (skill.kind === "help") {
      setDraft("");
      openOnboarding();
      return;
    }
    setDraft(skill.prompt);
  }

  function onComposerKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!slashOpen) return;
    if (e.key === "Escape") {
      e.preventDefault();
      setDraft("");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!filtered.length) return;
      setSlashIndex((i) => (i + 1) % filtered.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!filtered.length) return;
      setSlashIndex((i) => (i - 1 + filtered.length) % filtered.length);
      return;
    }
    if (e.key === "Enter" && filtered[slashIndex]) {
      e.preventDefault();
      applySkill(filtered[slashIndex]!);
    }
  }

  async function onSend() {
    const text = draft.trim();
    if (!text || busy) return;
    if (slashOpen) return; // Enter while menu open is handled by keydown select
    setDraft("");
    setBusy(true);
    setError("");
    setLogged("");
    const optimistic: MessageRow = {
      id: "pending-user",
      role: "user",
      content: text,
      meta: null,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    try {
      const result = await sendMessage({ data: { threadId: active, text } });
      if (!result.ok) {
        setError(result.error);
        setMessages((m) => m.filter((x) => x.id !== "pending-user"));
        return;
      }
      if (result.gap) setLogged(result.gap);
      setActive(result.threadId);
      setMessages(await listMessages({ data: result.threadId }));
      setArtifactsTick((n) => n + 1);
      await refreshThreads();
    } catch {
      setError("The reply failed. Try again.");
      setMessages((m) => m.filter((x) => x.id !== "pending-user"));
    } finally {
      setBusy(false);
    }
  }

  // Three-column Hero shell: threads | chat | context (xl+)
  return (
    <Shell>
      <div className="grid h-[calc(100dvh-3.5rem)] lg:grid-cols-[14rem_minmax(0,1fr)] xl:grid-cols-[14rem_minmax(0,1fr)_18rem]">
        <aside
          className={`${openList ? "flex" : "hidden"} absolute inset-x-0 top-14 z-10 max-h-[70dvh] flex-col border-b-2 border-ph-border bg-ph-void lg:static lg:flex lg:max-h-none lg:border-b-0 lg:border-r-2`}
        >
          <div className="border-b-2 border-ph-border p-2.5 space-y-2">
            <PhButton tone="focus" className="h-10 w-full" onClick={fresh}>
              New thread
            </PhButton>
            <PhInput
              value={threadQuery}
              onChange={(e) => void onSearchThreads(e.target.value)}
              placeholder="Search threads…"
              className="h-9 w-full text-xs"
              aria-label="Search threads"
            />
          </div>
          <ul className="flex-1 overflow-y-auto px-1.5 py-2">
            {visibleThreads.length === 0 && (
              <li className="px-2 py-3 font-mono text-sm text-ph-dim">
                {threadQuery.trim() ? "No matches." : "No threads yet."}
              </li>
            )}
            {visibleThreads.map((t, idx) => (
              <li key={t.id} className="mb-1">
                {renamingId === t.id ? (
                  <div className="flex gap-1 px-1">
                    <PhInput
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      className="h-9 flex-1 text-xs"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void onRenameThread(t.id);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                    />
                    <button
                      type="button"
                      className="border-2 border-ph-focus px-2 text-[0.6rem] text-ph-focus uppercase"
                      onClick={() => void onRenameThread(t.id)}
                    >
                      Ok
                    </button>
                  </div>
                ) : (
                  <div
                    className={`border-2 ${
                      t.id === active
                        ? "border-ph-focus bg-ph-tile"
                        : "border-transparent hover:border-ph-border"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => openThread(t.id)}
                      className={`w-full truncate px-3 py-2 text-left font-mono text-sm ${
                        t.id === active ? "text-ph-bone" : "text-ph-dim hover:text-ph-bone"
                      }`}
                    >
                      {t.title}
                    </button>
                    {t.snippet ? (
                      <p className="truncate px-3 pb-1 text-[0.6rem] text-ph-dim">{t.snippet}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-1 border-t-2 border-ph-border px-2 py-1">
                      <button
                        type="button"
                        className="text-[0.6rem] tracking-wide text-ph-dim uppercase hover:text-ph-bone"
                        onClick={() => {
                          setRenamingId(t.id);
                          setRenameDraft(t.title);
                        }}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        className="text-[0.6rem] tracking-wide text-ph-dim uppercase hover:text-ph-missing"
                        onClick={() => void onDeleteThread(t.id)}
                      >
                        Delete
                      </button>
                      {!searchHits && (
                        <>
                          <button
                            type="button"
                            disabled={idx === 0}
                            className="text-[0.6rem] tracking-wide text-ph-dim uppercase hover:text-ph-bone disabled:opacity-30"
                            onClick={() => void moveThread(t.id, -1)}
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            disabled={idx === threads.length - 1}
                            className="text-[0.6rem] tracking-wide text-ph-dim uppercase hover:text-ph-bone disabled:opacity-30"
                            onClick={() => void moveThread(t.id, 1)}
                          >
                            Down
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </aside>

        <section className="flex min-h-0 flex-col bg-ph-void">
          <div className="flex items-center justify-between border-b-2 border-ph-border px-3 py-2 lg:hidden">
            <button
              type="button"
              className="font-mono text-xs tracking-wide text-ph-bone uppercase"
              onClick={() => setOpenList((v) => !v)}
            >
              Threads
            </button>
          </div>
          <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-4">
            <div className="mx-auto flex max-w-2xl flex-col gap-4 font-mono text-sm">
              {messages.length === 0 && !busy && (
                <div className="border-2 border-ph-border bg-ph-tile px-4 py-5">
                  <p className="font-display text-4xl leading-none tracking-tight text-ph-bone">
                    What should this assistant do?
                  </p>
                  <p className="mt-3 max-w-md font-mono text-sm leading-relaxed text-ph-dim">
                    Apostle is the install. The desk is where you change the voice and turn plugins
                    on. Type <span className="text-ph-tool">/</span> for skills — try{" "}
                    <span className="text-ph-tool">/missing</span> to file a Desk ask, or “what time
                    is it in Aberdeen?”
                  </p>
                </div>
              )}
              {messages.map((m) => {
                const meta = readMeta(m.meta);
                const mine = m.role === "user";
                return (
                  <article key={m.id} className={mine ? "self-end max-w-[85%]" : "max-w-full"}>
                    {!mine && meta.label && (
                      <p className="mb-1 text-[0.65rem] tracking-wide text-ph-dim uppercase">
                        {meta.label} · {meta.model}
                      </p>
                    )}
                    {meta.tools?.map((tool, i) => (
                      <ToolCard key={`${m.id}-t-${i}`} tool={tool} />
                    ))}
                    {!mine && showApprovalDemo && m.id.startsWith("demo-") && <ApprovalCard />}
                    <div
                      className={
                        mine
                          ? "border-2 border-ph-border bg-ph-void px-3 py-2 text-ph-bone whitespace-pre-wrap"
                          : "leading-relaxed text-ph-bone"
                      }
                    >
                      {mine ? m.content : <Markdown source={m.content} />}
                    </div>
                  </article>
                );
              })}
              {busy && <p className="text-sm text-ph-tool">Working…</p>}
              {error && (
                <div className="space-y-2 border-2 border-ph-missing bg-ph-tile px-3 py-3 text-sm text-ph-missing">
                  <p>{error}</p>
                  {/DESK|model key|gateway/i.test(error) && (
                    <p>
                      <Link
                        to="/admin"
                        className="font-mono tracking-wide text-ph-tool uppercase underline-offset-2 hover:underline"
                      >
                        Set gateway on DESK →
                      </Link>
                    </p>
                  )}
                </div>
              )}
              {logged && (
                <p className="border-2 border-ph-missing bg-ph-tile px-3 py-2 text-sm text-ph-missing">
                  Logged on the desk: {logged}. Nothing installed can do that yet.
                </p>
              )}
            </div>
          </div>
          <form
            className="border-t-2 border-ph-border bg-ph-void p-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (slashOpen) return;
              void onSend();
            }}
          >
            <div className="relative mx-auto max-w-2xl">
              <SlashMenu
                open={slashOpen}
                skills={filtered}
                activeIndex={slashIndex}
                onActiveIndex={setSlashIndex}
                onSelect={applySkill}
              />
              <div className="flex gap-2">
                <PhInput
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onComposerKeyDown}
                  placeholder="› ask anything — / for skills"
                  className="h-11 flex-1"
                  autoComplete="off"
                  aria-autocomplete="list"
                  aria-expanded={slashOpen}
                />
                <PhButton
                  tone="focus"
                  type="submit"
                  disabled={busy || !draft.trim() || slashOpen}
                  className="h-11 px-5"
                >
                  Send
                </PhButton>
              </div>
            </div>
          </form>
        </section>

        <RunContextPanel
          toolCount={toolCount}
          showApprovalDemo={showApprovalDemo}
          threadId={active}
          artifactsTick={artifactsTick}
        />
      </div>
    </Shell>
  );
}
