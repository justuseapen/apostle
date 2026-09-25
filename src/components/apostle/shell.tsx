import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { OnboardingGuide, OnboardingHelpLink } from "@/components/apostle/onboarding";
import { SignInPanel } from "@/components/apostle/sign-in-panel";
import { SignInGate, UserButton } from "@/lib/auth/gates";
import { ModeToggle } from "@/lib/theme";

function Gate() {
  return <SignInPanel callbackURL="/" />;
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
            <ModeToggle />
            <OnboardingHelpLink />
            <Link
              to={desk ? "/" : "/admin"}
              className={
                desk
                  ? "border-2 border-ph-border px-3 py-1.5 text-ph-bone hover:border-ph-bone"
                  : "border-2 border-ph-focus bg-ph-focus px-3 py-1.5 text-ph-on"
              }
            >
              {desk ? "CHAT" : "DESK"}
            </Link>
            <UserButton />
          </nav>
        </header>
        {/* Auto-show once per browser; HELP / desk re-open anytime. */}
        <OnboardingGuide auto />
        {children}
      </div>
    </SignInGate>
  );
}
