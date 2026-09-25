import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { PhButton } from "@/components/apostle/phosphor";
import { GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { SignInGate, UserButton } from "@/lib/auth/gates";

function Gate() {
  return (
    <main className="phosphor grid min-h-dvh place-items-center bg-ph-void px-6 text-ph-bone">
      <div className="w-full max-w-sm border-2 border-ph-focus bg-ph-tile">
        <div className="border-b-2 border-ph-border px-3 py-2 font-mono text-[0.68rem] tracking-wide text-ph-dim uppercase">
          ~/APOSTLE — SIGN IN
        </div>
        <div className="space-y-5 px-4 py-5">
          <p className="font-display text-5xl leading-none tracking-tight">APOSTLE</p>
          <p className="font-marginalia text-lg text-ph-bone italic">
            A chat you install. Plugins you switch on.
          </p>
          <div className="flex flex-col gap-2.5">
            {GROK_PROVIDERS.map((p) => (
              <PhButton
                key={p.providerId}
                tone="focus"
                className="h-11 w-full"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
              >
                Continue with {p.label}
              </PhButton>
            ))}
            <Link
              to="/"
              className="text-center font-mono text-xs tracking-wide text-ph-dim uppercase hover:text-ph-bone"
            >
              ← Back to landing
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export function Shell({ children, desk }: { children: ReactNode; desk?: boolean }) {
  return (
    <SignInGate fallback={<Gate />}>
      <div className="phosphor min-h-dvh bg-ph-void text-ph-bone">
        <header className="flex h-14 items-center justify-between border-b-2 border-ph-border bg-ph-void px-3">
          <Link
            to="/"
            className="font-mono text-[0.7rem] tracking-wide text-ph-bone uppercase"
          >
            <span className="text-ph-missing">◆</span> APOSTLE
          </Link>
          <nav className="flex items-center gap-2 font-mono text-xs">
            <Link
              to={desk ? "/" : "/admin"}
              className={
                desk
                  ? "border-2 border-ph-border px-3 py-1.5 text-ph-bone hover:border-ph-bone"
                  : "border-2 border-ph-focus bg-ph-focus px-3 py-1.5 text-ph-void"
              }
            >
              {desk ? "CHAT" : "DESK"}
            </Link>
            <UserButton />
          </nav>
        </header>
        {children}
      </div>
    </SignInGate>
  );
}
