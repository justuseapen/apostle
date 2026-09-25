import { createFileRoute, Link } from "@tanstack/react-router";
import { PhButton } from "@/components/apostle/phosphor";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { ModeToggle } from "@/lib/theme";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="phosphor grid min-h-dvh place-items-center bg-ph-void px-6 text-ph-bone">
      <div className="ph-scanlines pointer-events-none fixed inset-0 z-50" aria-hidden />
      <div className="absolute top-3 right-3 z-10">
        <ModeToggle />
      </div>
      <div className="relative z-10 w-full max-w-sm border-2 border-ph-focus bg-ph-tile">
        <div className="border-b-2 border-ph-border px-3 py-2 font-mono text-[0.68rem] tracking-wide text-ph-dim uppercase">
          ~/APOSTLE — SIGN IN
        </div>
        <div className="space-y-5 px-4 py-5">
          <p className="font-display text-5xl leading-none tracking-tight">APOSTLE</p>
          <p className="font-marginalia text-lg text-ph-bone italic">
            A chat you install. Plugins you switch on.
          </p>
          <div className="flex flex-col gap-2.5">
            {authEnabled ? (
              GROK_PROVIDERS.map((p) => (
                <PhButton
                  key={p.providerId}
                  tone="focus"
                  className="h-11 w-full"
                  onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                >
                  Continue with {p.label}
                </PhButton>
              ))
            ) : (
              <p className="font-mono text-sm text-ph-dim">Sign-in is off.</p>
            )}
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
