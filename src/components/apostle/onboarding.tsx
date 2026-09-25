import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PhButton, Tile, TileHead } from "@/components/apostle/phosphor";

const STORAGE_KEY = "apostle.onboarding.seen";
export const ONBOARDING_OPEN_EVENT = "apostle:onboarding-open";

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* private mode — dismiss still works for this session */
  }
}

/** Re-open the guide from DESK or the shell HELP link. */
export function openOnboarding(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ONBOARDING_OPEN_EVENT));
}

/**
 * Short first-run guide — not a marketing wizard.
 * Auto-opens once for signed-in users; dismiss persists in localStorage.
 */
export function OnboardingGuide({ auto }: { auto?: boolean }) {
  const [open, setOpen] = useState(false);

  const dismiss = useCallback(() => {
    markOnboardingSeen();
    setOpen(false);
  }, []);

  useEffect(() => {
    if (auto && !hasSeenOnboarding()) setOpen(true);
    const onOpen = () => setOpen(true);
    window.addEventListener(ONBOARDING_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(ONBOARDING_OPEN_EVENT, onOpen);
  }, [auto]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ph-void/80 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <Tile focus className="w-full max-w-lg shadow-none">
        <TileHead left="FIRST RUN" right="NOT A WIZARD" />
        <div className="space-y-4 px-4 py-5 font-mono text-sm">
          <h2
            id="onboarding-title"
            className="font-display text-4xl leading-none tracking-tight text-ph-bone"
          >
            Before chat works
          </h2>
          <p className="text-ph-dim leading-relaxed">
            Signed in with a dead gateway feels broken. Three moves, then you&apos;re done.
          </p>

          <ol className="space-y-3 text-ph-bone">
            <li className="border-2 border-ph-border bg-ph-void px-3 py-3">
              <span className="block text-[0.65rem] tracking-wide text-ph-dim uppercase">
                1 · Gateway on DESK
              </span>
              <span className="mt-1 block leading-relaxed">
                Open{" "}
                <Link to="/admin" className="text-ph-tool underline-offset-2 hover:underline" onClick={dismiss}>
                  DESK
                </Link>
                , set Base URL + key (or local Ollama — no key), then Save.
              </span>
            </li>
            <li className="border-2 border-ph-border bg-ph-void px-3 py-3">
              <span className="block text-[0.65rem] tracking-wide text-ph-dim uppercase">
                2 · Optional · Ollama
              </span>
              <span className="mt-1 block leading-relaxed text-ph-dim">
                Base{" "}
                <code className="text-ph-bone">http://localhost:11434/v1</code>
                {" · "}
                map cheap/default to a tool-capable model (e.g.{" "}
                <code className="text-ph-bone">qwen3:0.6b</code>
                ). Leave API key blank.
              </span>
            </li>
            <li className="border-2 border-ph-border bg-ph-void px-3 py-3">
              <span className="block text-[0.65rem] tracking-wide text-ph-dim uppercase">
                3 · First plugin tip
              </span>
              <span className="mt-1 block leading-relaxed">
                Clock is on by default. Ask{" "}
                <span className="text-ph-tool">“what time is it in Aberdeen?”</span> — you should see
                a tool trace, not a guess.
              </span>
            </li>
          </ol>

          <div className="flex flex-wrap gap-2 pt-1">
            <PhButton tone="focus" className="h-10" onClick={dismiss}>
              Got it
            </PhButton>
            <Link to="/admin" onClick={dismiss}>
              <PhButton tone="tool" className="h-10">
                Open desk
              </PhButton>
            </Link>
          </div>
          <p className="text-[0.7rem] text-ph-dim">
            Won&apos;t nag again. Re-open anytime via HELP in the header or Setup guide on DESK.
          </p>
        </div>
      </Tile>
    </div>
  );
}

/** Compact header / desk control to re-open the guide. */
export function OnboardingHelpLink({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => openOnboarding()}
      className={`border-2 border-ph-border px-2.5 py-1.5 font-mono text-xs tracking-wide text-ph-dim uppercase hover:border-ph-bone hover:text-ph-bone ${className}`}
    >
      HELP
    </button>
  );
}
