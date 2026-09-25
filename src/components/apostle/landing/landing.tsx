import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Tile, TileHead } from "@/components/apostle/phosphor";
import { oauthSignInAvailable } from "@/components/apostle/sign-in-panel";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { emailAndPasswordEnabled } from "@/lib/auth/email-password";
import { ModeToggle } from "@/lib/theme";

const GITHUB = "https://github.com/justuseapen/apostle";
const INSTALL = `$ npm install
$ XAI_API_KEY=your-key npm run dev`;

const NAV = [
  { key: "1", id: "chat", label: "chat" },
  { key: "2", id: "desk", label: "desk" },
  { key: "3", id: "law", label: "law" },
  { key: "4", id: "ships", label: "ships" },
  { key: "5", id: "roadmap", label: "roadmap" },
  { key: "6", id: "run", label: "run" },
  { key: "7", id: "lang", label: "lang" },
] as const;

const GAPS = [
  { n: 13, ask: "book me a flight" },
  { n: 9, ask: "run this python" },
  { n: 7, ask: "read my calendar" },
  { n: 4, ask: "remember my name" },
  { n: 3, ask: "look at this screenshot" },
] as const;

const MODELS: { label: string; model: string; hot?: boolean }[] = [
  { label: "cheap", model: "grok-mini", hot: true },
  { label: "default", model: "grok" },
  { label: "strong", model: "grok-heavy" },
  { label: "vision", model: "grok-vision" },
];

const PLUGINS: {
  on: boolean;
  name: string;
  meta: string;
  next?: boolean;
}[] = [
  {
    on: true,
    name: "clock",
    meta: "network: none · secrets: none · approvals: none",
  },
  {
    on: true,
    name: "fetch",
    meta: "network: public https · secrets: none · approvals: none",
  },
  {
    on: false,
    name: "computer",
    next: true,
    meta: "network: deny · jailed shell + files",
  },
];

const SHIPPED = [
  "threads, streaming-style replies, per-user history",
  "sign-in — threads and desk settings belong to the operator",
  "plugins: clock, fetch of a public https page",
  "model map + token log",
  "optional free-plan cap — 40 messages, so a paid plan has something to lift",
] as const;

const TREE = [
  { path: "src/routes/index.tsx", note: "chat" },
  { path: "src/routes/admin.tsx", note: "desk" },
  { path: "src/lib/apostle/server.ts", note: "gateway, plugins, router, missing-ask log" },
  { path: "migrations/", note: "add the next number. do not edit an applied file." },
] as const;

const COLORS = [
  { name: "void", swatch: "bg-ph-void border-ph-border" },
  { name: "tile", swatch: "bg-ph-tile border-ph-border" },
  { name: "border", swatch: "bg-ph-border border-ph-dim" },
  { name: "dim", swatch: "bg-ph-dim border-ph-border" },
  { name: "bone", swatch: "bg-ph-bone border-ph-border" },
  { name: "focus", swatch: "bg-ph-focus border-ph-focus" },
  { name: "missing", swatch: "bg-ph-missing border-ph-missing" },
  { name: "tool", swatch: "bg-ph-tool border-ph-tool" },
] as const;

function GlitchTitle({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  return (
    <span className={`ph-glitch relative inline-block ${className}`} data-text={text}>
      <span className="relative z-[2] text-ph-bone">{text}</span>
    </span>
  );
}

function enterApp() {
  if (!authEnabled) {
    window.location.assign("/");
    return;
  }
  // Local: email/password on /login. Broker OAuth only when redirect_uris work.
  if (emailAndPasswordEnabled || !oauthSignInAvailable()) {
    window.location.assign("/login");
    return;
  }
  const first = GROK_PROVIDERS[0];
  if (first) {
    void signIn(first.providerId, { callbackURL: "/" });
    return;
  }
  window.location.assign("/login");
}

export function Landing() {
  const [active, setActive] = useState<(typeof NAV)[number]["id"]>("chat");
  const [copied, setCopied] = useState(false);
  const [clock, setClock] = useState("00:00:00");

  const scrollTo = useCallback((id: (typeof NAV)[number]["id"]) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(
        [d.getHours(), d.getMinutes(), d.getSeconds()]
          .map((n) => String(n).padStart(2, "0"))
          .join(":"),
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
        return;
      }
      const hit = NAV.find((n) => n.key === e.key);
      if (hit) {
        e.preventDefault();
        scrollTo(hit.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scrollTo]);

  const ticker = useMemo(
    () =>
      'SOMEONE ASKED "FILE MY TAXES" — NOT BUILT YET — LOGGED ✕ SOMEONE ASKED "BOOK ME A FLIGHT" — NOT BUILT YET — LOGGED ✕ SOMEONE ASKED "RUN THIS PYTHON" — NOT BUILT YET — LOGGED ✕',
    [],
  );

  async function copyInstall() {
    try {
      await navigator.clipboard.writeText(INSTALL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="phosphor min-h-dvh bg-ph-void text-ph-bone">
      <div className="ph-scanlines pointer-events-none fixed inset-0 z-50" aria-hidden />

      <header className="sticky top-0 z-40 border-b-2 border-ph-border bg-ph-void/95 backdrop-blur-0">
        <div className="mx-auto flex max-w-[72rem] flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 font-mono text-[0.7rem]">
          <span className="text-ph-bone">
            <span className="text-ph-missing">◆</span> APOSTLE
          </span>
          <nav className="flex flex-wrap items-center gap-1" aria-label="Workspaces">
            {NAV.map((n) => {
              const on = active === n.id;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => scrollTo(n.id)}
                  className={`px-2 py-1 ${
                    on
                      ? "bg-ph-focus text-ph-on"
                      : "text-ph-dim hover:text-ph-bone"
                  }`}
                >
                  {n.key} {n.label}
                </button>
              );
            })}
          </nav>
          <div className="ml-auto flex flex-wrap items-center gap-3 text-ph-dim">
            <span>
              gateway <span className="text-ph-tool">grok</span>
            </span>
            <span>
              router <span className="text-ph-missing">cheap</span>
            </span>
            <span className="text-ph-bone tabular-nums">{clock}</span>
            <ModeToggle />
            <Link
              to="/login"
              className="border-2 border-ph-focus bg-ph-focus px-2 py-1 text-ph-on"
            >
              SIGN IN
            </Link>
          </div>
        </div>
        <div className="overflow-hidden border-t-2 border-ph-focus bg-ph-focus text-ph-on">
          <p className="ph-marquee whitespace-nowrap py-1.5 font-mono text-[0.7rem] font-medium tracking-wide">
            {ticker}&nbsp;&nbsp;&nbsp;{ticker}
          </p>
        </div>
      </header>

      <main className="mx-auto flex max-w-[72rem] flex-col gap-2.5 px-2.5 py-2.5 pb-16">
        {/* ── 1 CHAT ───────────────────────────────────────── */}
        <Tile focus className="scroll-mt-24">
          <div id="chat" className="scroll-mt-24">
            <TileHead left="~/APOSTLE — README.MD" right="NODE 22 · 2 COMMITS · OPEN SOURCE" />
            <div className="space-y-5 px-4 py-5 sm:px-6">
              <p className="font-mono text-[0.7rem] tracking-widest text-ph-tool">
                [ W O R K S P A C E 1 ] — T H E C H A T L I V E S A T /
              </p>
              <h1 className="font-display text-[clamp(3.5rem,14vw,7rem)] leading-none tracking-tight">
                <GlitchTitle text="APOSTLE" />
              </h1>
              <p className="font-marginalia text-2xl text-ph-bone italic sm:text-3xl">
                WordPress for a chat assistant.
              </p>
              <p className="max-w-xl font-mono text-sm leading-relaxed text-ph-mute">
                Install it, paste a model key, and you have a product people can talk to. The look
                is a theme. What it can do is a plugin. When someone asks for something you have not
                built yet, the desk records it so you can add it.
              </p>

              <div className="relative border-2 border-ph-border bg-ph-void px-4 py-3 font-mono text-sm">
                <pre className="text-ph-bone">
                  <span className="text-ph-missing">$</span> npm install{"\n"}
                  <span className="text-ph-missing">$</span> XAI_API_KEY=
                  <span className="text-ph-tool">your-key</span> npm run dev
                </pre>
                <button
                  type="button"
                  onClick={() => void copyInstall()}
                  className="absolute top-2 right-2 border-2 border-ph-border px-2 py-1 text-[0.65rem] tracking-wider text-ph-bone uppercase hover:border-ph-bone"
                >
                  {copied ? "COPIED" : "COPY"}
                </button>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => scrollTo("law")}
                  className="border-2 border-ph-focus bg-ph-focus px-4 py-2.5 font-mono text-xs tracking-wide text-ph-on uppercase"
                >
                  READ THE LAW →
                </button>
                <a
                  href={GITHUB}
                  target="_blank"
                  rel="noreferrer"
                  className="border-2 border-ph-bone px-4 py-2.5 font-mono text-xs tracking-wide text-ph-bone uppercase"
                >
                  GITHUB ↗
                </a>
                <button
                  type="button"
                  onClick={enterApp}
                  className="border-2 border-ph-tool px-4 py-2.5 font-mono text-xs tracking-wide text-ph-tool uppercase"
                >
                  OPEN / →
                </button>
              </div>

              <div className="flex flex-wrap items-end justify-between gap-4 border-t border-dashed border-ph-border pt-4">
                <p className="font-mono text-xs text-ph-dim">
                  <span className="text-ph-bone">/</span> is the chat{" "}
                  <span className="text-ph-bone">/admin</span> is the desk
                  <span className="ml-3">two URLs, one product.</span>
                </p>
                <p className="max-w-[14rem] text-right font-marginalia text-sm text-ph-missing italic">
                  it writes down what it can&apos;t do yet. and counts. ↘
                </p>
              </div>
            </div>
          </div>
        </Tile>

        {/* live chat vignette */}
        <Tile>
          <TileHead left="/ — CHAT — THREAD 0041" right="● LIVE" />
          <div className="space-y-3 px-4 py-5 font-mono text-sm">
            <div className="ml-auto max-w-md border-2 border-ph-border bg-ph-void px-3 py-2 text-ph-bone">
              what time is it in lagos?
            </div>
            <p className="text-ph-missing">── ROUTER → CHEAP</p>
            <p className="flex items-start gap-2 text-ph-tool">
              <span className="mt-0.5 inline-block h-4 w-0.5 bg-ph-tool" aria-hidden />
              clock() → 14:32 WAT
            </p>
            <button
              type="button"
              onClick={enterApp}
              className="flex w-full items-center justify-between border-t-2 border-ph-border pt-3 text-left text-ph-dim"
            >
              <span>
                <span className="text-ph-bone">›</span> ask anything
              </span>
              <span>13 / 40 free</span>
            </button>
          </div>
        </Tile>

        {/* ── 2 DESK ───────────────────────────────────────── */}
        <div id="desk" className="scroll-mt-24 space-y-2.5">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-1 px-1">
            <h2 className="font-display text-5xl leading-none text-ph-bone sm:text-6xl">
              /admin
            </h2>
            <p className="pb-1 font-marginalia text-xl text-ph-bone italic">the desk.</p>
            <p className="max-w-md pb-1 font-mono text-xs text-ph-dim sm:ml-auto">
              Voice, plugins, which model runs, spend, and the list of asks you cannot fulfill yet.
            </p>
          </div>

          <div className="grid gap-2.5 lg:grid-cols-[1.15fr_0.85fr]">
            <Tile missing>
              <TileHead left="MISSING — ASKS YOU HAVE NOT BUILT" right="SORTED BY COUNT" />
              <ul className="divide-y-2 divide-ph-border">
                {GAPS.map((g) => (
                  <li
                    key={g.ask}
                    className="flex flex-wrap items-center gap-3 px-3 py-3 font-mono text-sm"
                  >
                    <span className="font-display text-2xl text-ph-missing">×{g.n}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-ph-bone">&ldquo;{g.ask}&rdquo;</p>
                      <p className="text-[0.65rem] tracking-wide text-ph-dim uppercase">OPEN</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={enterApp}
                        className="border-2 border-ph-border px-2 py-1 text-[0.65rem] tracking-wide text-ph-bone uppercase hover:border-ph-bone"
                      >
                        START
                      </button>
                      <button
                        type="button"
                        className="border-2 border-ph-border px-2 py-1 text-[0.65rem] tracking-wide text-ph-dim uppercase"
                      >
                        DISMISS
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="border-t-2 border-ph-border px-3 py-3 text-center font-marginalia text-sm text-ph-bone italic">
                this list is your roadmap. they told you.
              </p>
            </Tile>

            <div className="flex flex-col gap-2.5">
              <Tile>
                <TileHead left="MODEL MAP" right="ONE GATEWAY OBJECT" />
                <div className="space-y-2 px-3 py-3 font-mono text-sm">
                  {MODELS.map((m) => (
                    <div key={m.label} className="flex items-center gap-3">
                      <span
                        className={`min-w-[4.5rem] px-1.5 py-0.5 ${
                          m.hot ? "bg-ph-missing text-ph-on" : "text-ph-missing"
                        }`}
                      >
                        {m.label}
                      </span>
                      <span className="text-ph-dim">→</span>
                      <span className="text-ph-bone">{m.model}</span>
                    </div>
                  ))}
                  <p className="border-t border-ph-border pt-2 text-[0.7rem] leading-relaxed text-ph-dim">
                    OpenAI-compatible. Grok today; OpenRouter, Ollama, anything with the same shape
                    tomorrow.
                  </p>
                </div>
              </Tile>

              <Tile>
                <TileHead left="PLUGINS" right="DEFAULT: DENY" />
                <ul className="space-y-3 px-3 py-3 font-mono text-sm">
                  {PLUGINS.map((p) => (
                    <li key={p.name}>
                      <p>
                        <span className={p.on ? "text-ph-tool" : "text-ph-dim"}>
                          [{p.on ? "on" : "--"}]
                        </span>{" "}
                        <span className={p.on ? "text-ph-bone" : "text-ph-dim"}>{p.name}</span>
                        {p.next ? <span className="text-ph-dim"> (next)</span> : null}
                      </p>
                      <p className="text-[0.65rem] text-ph-dim">{p.meta}</p>
                    </li>
                  ))}
                </ul>
              </Tile>
            </div>
          </div>
        </div>

        {/* ── 3 LAW ────────────────────────────────────────── */}
        <Tile className="scroll-mt-24">
          <div id="law" className="scroll-mt-24">
            <TileHead left="LAW.MD" right="SIX RULES · CORE REFUSES THE REST" />
            <div className="space-y-5 px-4 py-5 sm:px-6">
              <div className="flex flex-wrap items-end gap-4">
                <h2 className="font-display text-[clamp(2.5rem,10vw,4.5rem)] leading-none">
                  <GlitchTitle text="THE LAW" />
                </h2>
                <p className="max-w-md font-marginalia text-lg text-ph-bone italic">
                  Core stays small. A theme never owns the harness. A plugin declares what it needs.
                </p>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <LawCard
                  numeral="I"
                  cite="LAW 1:1"
                  body="Core chats with no plugins."
                  note="zero plugins. still talks. ←"
                />
                <LawCard
                  numeral="II"
                  cite="LAW 2:1"
                  body="Themes do not register tools."
                  note="a theme is clothes, not hands."
                />
                <LawCard
                  numeral="III"
                  cite="LAW 3:1"
                  body="Plugins declare network, secrets, and approvals."
                  emph="DEFAULT IS DENY."
                  filled
                />
                <LawCard
                  numeral="IV"
                  cite="LAW 4:1"
                  body="One gateway object. The harness does not import five vendor SDKs."
                  note="ONE. count them. one."
                  strike="five vendor SDKs"
                />
                <LawCard
                  numeral="V"
                  cite="LAW 5:1"
                  body="User content — threads, plugins, themes — survives a core update."
                />
                <LawCard
                  numeral="VI"
                  cite="LAW 6:1"
                  body={'"Full access to the host" is never a default.'}
                  neverWord
                  missing
                  redacted
                />
              </div>
            </div>
          </div>
        </Tile>

        {/* ── 4 SHIPS ──────────────────────────────────────── */}
        <div id="ships" className="scroll-mt-24 space-y-2.5">
          <Tile>
            <TileHead left="TERM — WHAT SHIPS NOW" right="ZSH" />
            <div className="space-y-1 px-4 py-4 font-mono text-sm">
              <p>
                <span className="text-ph-missing">$</span>{" "}
                <span className="text-ph-bone">apostle --shipped</span>
              </p>
              {SHIPPED.map((line) => (
                <p key={line}>
                  <span className="text-ph-tool">[ ok ]</span> {line}
                </p>
              ))}
              <p>
                <span className="text-ph-missing">[ ok ]</span>{" "}
                <span className="text-ph-bone">MISSING.</span> asks the tools can&apos;t do get
                logged with a count
              </p>
              <p className="pt-2 text-ph-dim">6 shipped · 0 vendor SDKs · 1 gateway</p>
            </div>
          </Tile>

          <Tile>
            <TileHead left="TERM — WHERE THE CODE IS" right="TREE" />
            <div className="space-y-1 px-4 py-4 font-mono text-sm">
              <p>
                <span className="text-ph-missing">$</span> tree -L 3 --what
              </p>
              {TREE.map((row) => (
                <div
                  key={row.path}
                  className="grid gap-1 sm:grid-cols-[minmax(0,18rem)_1fr] sm:gap-6"
                >
                  <span className="text-ph-bone">{row.path}</span>
                  <span className="text-ph-mute">{row.note}</span>
                </div>
              ))}
            </div>
          </Tile>
        </div>

        {/* ── 5 ROADMAP ────────────────────────────────────── */}
        <Tile>
          <div id="roadmap" className="scroll-mt-24">
            <TileHead left="ROADMAP.MD" right="NOW → NEXT → LATER" />
            <div className="space-y-5 px-4 py-5 sm:px-6">
              <h2 className="font-display text-[clamp(1.75rem,6vw,3.25rem)] leading-none text-ph-bone">
                What it&apos;s naked without
              </h2>

              <div className="grid gap-2.5 lg:grid-cols-2">
                <div className="border-2 border-ph-focus bg-ph-void p-4 font-mono text-sm leading-relaxed">
                  <p className="mb-3 text-[0.7rem] tracking-[0.2em] text-ph-bone">N O W</p>
                  <p className="mb-3 text-ph-bone">
                    Make the gateway a setting — OpenRouter key, base URL, model map — instead of a
                    hardcoded host.
                  </p>
                  <p className="text-ph-bone">
                    Freeze the plugin contract so a third plugin does not require editing the
                    harness.
                  </p>
                </div>

                <div className="border-2 border-dashed border-ph-tool bg-ph-void p-4 font-mono text-sm leading-relaxed">
                  <p className="mb-3 text-[0.7rem] tracking-[0.2em] text-ph-tool">N E X T</p>
                  <ol className="space-y-3 text-ph-mute">
                    <li>
                      <span className="text-ph-tool">1.</span>{" "}
                      <span className="text-ph-bone">Billing.</span> Plans, a Stripe plugin, usage
                      against the plan, margin on the desk.
                    </li>
                    <li>
                      <span className="text-ph-tool">2.</span>{" "}
                      <span className="text-ph-bone">Users.</span> Not the operator. Invite link,
                      quota, their own threads.
                    </li>
                    <li>
                      <span className="text-ph-tool">3.</span>{" "}
                      <span className="text-ph-bone">Computer.</span> A jailed shell and files, as a
                      plugin. Default deny on the network.
                      <p className="mt-1 font-marginalia text-xs text-ph-missing italic">
                        ↳ cf. missing: “run this python” ×9
                      </p>
                    </li>
                    <li>
                      <span className="text-ph-tool">4.</span>{" "}
                      <span className="text-ph-bone">Knowledge.</span> Upload a corpus, retrieve it,
                      cite it.
                    </li>
                    <li>
                      <span className="text-ph-tool">5.</span>{" "}
                      <span className="text-ph-bone">Memory.</span> Facts about a person, separate
                      from the corpus.
                      <p className="mt-1 font-marginalia text-xs text-ph-missing italic">
                        ↳ cf. missing: “remember my name” ×4
                      </p>
                    </li>
                    <li>
                      <span className="text-ph-tool">6.</span>{" "}
                      <span className="text-ph-bone">Browser.</span> A page inside the same cage,
                      with an allowlist.
                    </li>
                    <li>
                      <span className="text-ph-tool">7.</span>{" "}
                      <span className="text-ph-bone">Jev.</span> A decision model as the router:
                      which model, and whether a tool needs a person to approve it.
                      <p className="mt-1 font-marginalia text-xs text-ph-missing italic">
                        ↳ this is where it gets interesting
                      </p>
                    </li>
                  </ol>
                </div>

                <div className="border-2 border-dashed border-ph-border bg-ph-void p-4 font-mono text-sm leading-relaxed text-ph-mute">
                  <p className="mb-3 text-[0.7rem] tracking-[0.2em] text-ph-dim">L A T E R</p>
                  <p>
                    A theme you can swap without forking core. A catalog of plugins. Background runs
                    that finish after the tab closes. Channels besides the web.
                  </p>
                </div>

                <div className="border-2 border-ph-missing bg-ph-void p-4 font-mono text-sm">
                  <p className="mb-3 text-[0.7rem] tracking-[0.12em] text-ph-missing">
                    N O T U N T I L T H E A B O V E I S D U L L
                  </p>
                  <p className="space-x-4 text-ph-dim line-through decoration-ph-missing">
                    <span>desktop control</span>
                    <span>whatsapp</span>
                  </p>
                  <p className="mt-1 space-x-4 text-ph-dim line-through decoration-ph-missing">
                    <span>a workflow canvas</span>
                    <span>a new model</span>
                  </p>
                </div>
              </div>

              <p className="font-marginalia text-xl text-ph-bone italic sm:text-2xl">
                boring is the feature.
                <br />
                boring is how you charge for it.
              </p>
            </div>
          </div>
        </Tile>

        {/* ── 6 RUN ────────────────────────────────────────── */}
        <div id="run" className="scroll-mt-24 grid gap-2.5 lg:grid-cols-[1.2fr_0.8fr]">
          <Tile tool>
            <TileHead left="TERM — RUN IT" right="NODE 22" />
            <div className="space-y-1 px-4 py-4 font-mono text-sm leading-relaxed">
              <p>
                <span className="text-ph-missing">$</span> git clone{" "}
                <span className="text-ph-bone">https://github.com/justuseapen/apostle</span>
              </p>
              <p>
                <span className="text-ph-missing">$</span> npm install
              </p>
              <p>
                <span className="text-ph-missing">$</span> XAI_API_KEY=
                <span className="text-ph-tool">your-key</span> npm run dev
              </p>
              <p className="text-ph-dim">
                → listening on <span className="text-ph-bone">http://localhost:8080</span>
              </p>
              <p className="pt-2 text-ph-dim">
                # no DATABASE_URL? embedded postgres. it resets when the process stops.
              </p>
              <p className="text-ph-dim"># set DATABASE_URL for anything you want to keep.</p>
              <p className="text-ph-dim">
                # sign-in: google or x via hosted broker. email + password is the local fallback.
              </p>
            </div>
          </Tile>

          <Tile>
            <div className="flex h-full flex-col justify-between gap-6 px-4 py-5">
              <p className="font-marginalia text-xl leading-snug text-ph-bone italic sm:text-2xl">
                A solo developer should be able to point this at their own audience, charge for it,
                and{" "}
                <span className="text-ph-focus">not maintain an agent framework.</span>
              </p>
              <a
                href={GITHUB}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit border-2 border-ph-tool bg-ph-tool px-4 py-2.5 font-mono text-xs tracking-wide text-ph-on uppercase"
              >
                FORK IT ↗
              </a>
            </div>
          </Tile>
        </div>

        {/* ── 7 LANG ───────────────────────────────────────── */}
        <Tile>
          <div id="lang" className="scroll-mt-24">
            <TileHead left="DESIGN.LANG — THE LOOK IS A THEME" right="THEME: PHOSPHOR" />
            <div className="grid gap-6 px-4 py-5 sm:grid-cols-2 sm:px-6">
              <div>
                <p className="mb-3 font-mono text-[0.7rem] tracking-[0.25em] text-ph-dim">
                  C O L O R
                </p>
                <div className="grid grid-cols-4 gap-2.5">
                  {COLORS.map((c) => (
                    <div key={c.name} className="space-y-1">
                      <div className={`ph-swatch h-9 border-2 ${c.swatch}`} />
                      <p className="font-mono text-[0.65rem] text-ph-bone">{c.name}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3 font-mono">
                <p className="text-[0.7rem] tracking-[0.25em] text-ph-dim">T Y P E</p>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-display text-4xl text-ph-bone">DISPLAY</span>
                  <span className="text-[0.7rem] text-ph-dim">VT323 · shouts</span>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-lg text-ph-bone">Body / UI</span>
                  <span className="text-[0.7rem] text-ph-dim">JetBrains Mono · works</span>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-marginalia text-2xl text-ph-missing italic">marginalia</span>
                  <span className="text-[0.7rem] text-ph-dim">Instrument Serif · mutters</span>
                </div>
              </div>
              <div className="sm:col-span-2">
                <p className="mb-3 font-mono text-[0.7rem] tracking-[0.25em] text-ph-dim">
                  R U L E S
                </p>
                <ol className="space-y-1.5 font-mono text-sm text-ph-mute">
                  <li>
                    <span className="text-ph-bone">01</span> everything is a tile. 2px borders, 10px
                    gaps, zero radius.
                  </li>
                  <li>
                    <span className="text-ph-bone">02</span> one focused tile per view wears the
                    focus color.
                  </li>
                  <li>
                    <span className="text-ph-bone">03</span> color means state: focus, missing, tool.
                    never decoration.
                  </li>
                  <li>
                    <span className="text-ph-bone">04</span> display type only for names and laws.
                  </li>
                  <li>
                    <span className="text-ph-bone">05</span> the margins talk back. sparingly.
                  </li>
                  <li>
                    <span className="text-ph-bone">06</span> no gradients, no shadows, no glass.
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </Tile>
      </main>

      <footer className="border-t-2 border-ph-border bg-ph-void">
        <div className="mx-auto flex max-w-[72rem] flex-col gap-2 px-3 py-3 font-mono text-[0.65rem] tracking-wide text-ph-dim uppercase sm:flex-row sm:items-center sm:justify-between">
          <span>APOSTLE — WORDPRESS FOR A CHAT ASSISTANT</span>
          <span>KEYS 1–7 SWITCH WORKSPACE</span>
          <a href={GITHUB} target="_blank" rel="noreferrer" className="text-ph-bone hover:text-ph-focus">
            GITHUB.COM/JUSTUSEAPEN/APOSTLE
          </a>
        </div>
      </footer>
    </div>
  );
}

function LawCard({
  numeral,
  cite,
  body,
  note,
  emph,
  filled,
  missing,
  neverWord,
  strike,
  redacted,
}: {
  numeral: string;
  cite: string;
  body: string;
  note?: string;
  emph?: string;
  filled?: boolean;
  missing?: boolean;
  neverWord?: boolean;
  strike?: string;
  redacted?: boolean;
}) {
  let bodyNode: ReactNode = body;
  if (strike && body.includes(strike)) {
    const [pre, post] = body.split(strike);
    bodyNode = (
      <>
        {pre}
        <span className="text-ph-missing line-through decoration-ph-missing">{strike}</span>
        {post}
      </>
    );
  } else if (neverWord) {
    bodyNode = (
      <>
        &ldquo;Full access to the host&rdquo; is{" "}
        <span className="text-ph-missing">never</span> a default.
      </>
    );
  }

  return (
    <article
      className={`relative border-2 p-4 ${
        filled
          ? "border-ph-focus bg-ph-focus text-ph-on ph-scan-fill"
          : missing
            ? "border-ph-missing bg-ph-void text-ph-bone"
            : "border-ph-border bg-ph-void text-ph-bone"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <span
          className={`font-display text-5xl leading-none ${
            filled ? "text-ph-on" : missing ? "text-ph-missing" : "text-ph-bone"
          }`}
        >
          {numeral}
        </span>
        <span
          className={`font-mono text-[0.65rem] tracking-wide ${
            filled ? "text-ph-on/70" : "text-ph-dim"
          }`}
        >
          {cite}
        </span>
      </div>
      <p className={`font-mono text-sm leading-relaxed ${filled ? "text-ph-on" : ""}`}>
        {bodyNode}
      </p>
      {emph ? (
        <p className="mt-3 font-display text-2xl leading-none tracking-wide text-ph-on">
          {emph}
        </p>
      ) : null}
      {note ? (
        <p
          className={`mt-4 font-marginalia text-sm italic ${
            filled ? "text-ph-on/80" : "text-ph-missing"
          }`}
        >
          {note}
        </p>
      ) : null}
      {redacted ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="h-2 w-16 bg-ph-bone/80" />
          <span className="h-2 w-8 bg-ph-bone/40" />
          <span className="font-mono text-[0.65rem] text-ph-dim">[redacted by core]</span>
        </div>
      ) : null}
    </article>
  );
}
