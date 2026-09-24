import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/apostle/shell";
import { listMessages, listThreads, sendMessage, type MessageRow, type ThreadRow } from "@/lib/apostle/server";

export const Route = createFileRoute("/")({ component: Chat });

type Trace = { name: string; result: string };
type Meta = { label?: string; reason?: string; model?: string; tools?: Trace[] };

function readMeta(raw: string | null): Meta {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Meta;
  } catch {
    return {};
  }
}

function Chat() {
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [logged, setLogged] = useState("");
  const [openList, setOpenList] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

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
  }

  async function onSend() {
    const text = draft.trim();
    if (!text || busy) return;
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
      await refreshThreads();
    } catch {
      setError("The reply failed. Try again.");
      setMessages((m) => m.filter((x) => x.id !== "pending-user"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="grid h-[calc(100dvh-3.5rem)] lg:grid-cols-[16rem_1fr]">
        <aside
          className={`${openList ? "flex" : "hidden"} absolute inset-x-0 top-14 z-10 max-h-[70dvh] flex-col border-b border-line bg-paper lg:static lg:flex lg:max-h-none lg:border-b-0 lg:border-r`}
        >
          <div className="p-3">
            <button
              type="button"
              onClick={fresh}
              className="h-11 w-full rounded-full bg-ink text-paper"
            >
              New thread
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto px-2 pb-4">
            {threads.length === 0 && (
              <li className="px-2 py-3 text-sm text-mute">No threads yet.</li>
            )}
            {threads.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => openThread(t.id)}
                  className={`w-full truncate rounded-xl px-3 py-3 text-left text-sm ${
                    t.id === active ? "bg-bone" : ""
                  }`}
                >
                  {t.title}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="flex min-h-0 flex-col">
          <div className="flex items-center justify-between border-b border-line px-4 py-2 lg:hidden">
            <button type="button" className="h-11 px-2 text-sm" onClick={() => setOpenList((v) => !v)}>
              Threads
            </button>
          </div>
          <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto flex max-w-2xl flex-col gap-5">
              {messages.length === 0 && !busy && (
                <div className="pt-10">
                  <p className="font-display text-4xl leading-tight">What should this assistant do?</p>
                  <p className="mt-3 max-w-md text-mute">
                    Apostle is the install. The desk is where you change the voice and turn plugins on.
                    Try “what time is it in Aberdeen?”, paste a public https link, or ask it to
                    calculate something. Set the model key on the desk if chat says the gateway is
                    missing.
                  </p>
                </div>
              )}
              {messages.map((m) => {
                const meta = readMeta(m.meta);
                const mine = m.role === "user";
                return (
                  <article key={m.id} className={mine ? "self-end max-w-[85%]" : "max-w-full"}>
                    {!mine && meta.label && (
                      <p className="mb-1 text-xs uppercase tracking-wide text-mute">
                        {meta.label} · {meta.model}
                      </p>
                    )}
                    {meta.tools?.map((tool, i) => (
                      <pre
                        key={`${m.id}-t-${i}`}
                        className="mb-2 overflow-x-auto rounded-xl border border-line bg-bone p-3 text-xs whitespace-pre-wrap"
                      >
                        {tool.name}
                        {"\n"}
                        {tool.result.slice(0, 500)}
                      </pre>
                    ))}
                    <div
                      className={
                        mine
                          ? "rounded-2xl bg-ink px-4 py-3 text-paper"
                          : "text-ink leading-relaxed"
                      }
                    >
                      {m.content}
                    </div>
                  </article>
                );
              })}
              {busy && <p className="text-sm text-mute">Working…</p>}
              {error && <p className="text-sm text-signal">{error}</p>}
              {logged && (
                <p className="text-sm text-mute">
                  Logged on the desk: {logged}. Nothing installed can do that yet.
                </p>
              )}
            </div>
          </div>
          <form
            className="border-t border-line p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void onSend();
            }}
          >
            <div className="mx-auto flex max-w-2xl gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Message Apostle"
                className="h-12 min-w-0 flex-1 rounded-full border border-line bg-bone px-4 outline-none"
              />
              <button
                type="submit"
                disabled={busy || !draft.trim()}
                className="h-12 rounded-full bg-signal px-5 text-signal-ink disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </form>
        </section>
      </div>
    </Shell>
  );
}
