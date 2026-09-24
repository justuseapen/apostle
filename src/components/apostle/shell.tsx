import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { SignInGate, UserButton } from "@/lib/auth/gates";
import { EmailAuthForm } from "@/components/apostle/email-auth-form";

function Gate() {
  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-6 text-ink">
      <div className="w-full max-w-sm">
        <p className="font-display text-4xl">Apostle</p>
        <p className="mt-2 text-mute">A chat you install. Plugins you switch on.</p>
        <div className="mt-8 flex flex-col gap-3">
          {GROK_PROVIDERS.map((p) => (
            <button
              key={p.providerId}
              type="button"
              onClick={() => signIn(p.providerId, { callbackURL: "/" })}
              className="h-12 rounded-full border border-line bg-bone px-4"
            >
              Continue with {p.label}
            </button>
          ))}
        </div>
        <EmailAuthForm />
      </div>
    </main>
  );
}

export function Shell({ children, desk }: { children: ReactNode; desk?: boolean }) {
  return (
    <SignInGate fallback={<Gate />}>
      <div className="min-h-dvh bg-paper text-ink">
        <header className="flex h-14 items-center justify-between border-b border-line px-4">
          <Link to="/" className="font-display text-2xl leading-none">
            Apostle
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              to={desk ? "/" : "/admin"}
              className="rounded-full border border-line bg-bone px-3 py-2"
            >
              {desk ? "Chat" : "Desk"}
            </Link>
            <UserButton />
          </nav>
        </header>
        {children}
      </div>
    </SignInGate>
  );
}
