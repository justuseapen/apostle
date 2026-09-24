import { createFileRoute } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { EmailAuthForm } from "@/components/apostle/email-auth-form";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-6">
      <div className="w-full max-w-sm">
        <p className="font-display text-4xl text-ink">Apostle</p>
        <p className="mt-2 text-mute">A chat you install. Plugins you switch on.</p>
        <div className="mt-8 flex flex-col gap-3">
          {authEnabled ? (
            GROK_PROVIDERS.map((p) => (
              <button
                key={p.providerId}
                type="button"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                className="h-12 rounded-full border border-line bg-bone px-4 text-ink"
              >
                Continue with {p.label}
              </button>
            ))
          ) : (
            <p className="text-sm text-mute">Sign-in is off.</p>
          )}
        </div>
        {authEnabled && <EmailAuthForm />}
      </div>
    </main>
  );
}
