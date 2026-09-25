import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { PhButton, PhInput } from "@/components/apostle/phosphor";
import {
  GROK_PROVIDERS,
  authClient,
  authEnabled,
  signIn,
} from "@/lib/auth/client";
import { emailAndPasswordEnabled } from "@/lib/auth/email-password";
import { ModeToggle } from "@/lib/theme";

/**
 * Broker Google/X OAuth only works when the callback host is allowed
 * (preview `*.grok-sandbox.com`, or a deployed app with registered redirect
 * URIs). Localhost is not registered — hide those buttons so they don't 400.
 */
export function oauthSignInAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1" && host !== "[::1]";
}

export function SignInPanel({
  callbackURL = "/",
  showBack = true,
}: {
  callbackURL?: string;
  showBack?: boolean;
}) {
  const [showOauth, setShowOauth] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setShowOauth(oauthSignInAvailable());
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "signup") {
        const { error: signUpError } = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || email.split("@")[0] || "Apostle",
          callbackURL,
        });
        if (signUpError) throw new Error(signUpError.message ?? "Sign-up failed");
      } else {
        const { error: signInError } = await authClient.signIn.email({
          email,
          password,
          callbackURL,
        });
        if (signInError) throw new Error(signInError.message ?? "Sign-in failed");
      }
      window.location.assign(callbackURL);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setBusy(false);
    }
  }

  const passwordOn = authEnabled && emailAndPasswordEnabled;
  const oauthOn = authEnabled && showOauth;
  const nothingOn = !passwordOn && !oauthOn;

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

          {passwordOn ? (
            <form className="flex flex-col gap-2.5" onSubmit={onSubmit}>
              {mode === "signup" ? (
                <PhInput
                  autoComplete="name"
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              ) : null}
              <PhInput
                required
                type="email"
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <PhInput
                required
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder="Password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error ? (
                <p className="font-mono text-xs text-ph-missing" role="alert">
                  {error}
                </p>
              ) : null}
              <PhButton
                type="submit"
                tone="focus"
                className="h-11 w-full"
                disabled={busy}
              >
                {busy
                  ? "…"
                  : mode === "signup"
                    ? "Create account"
                    : "Sign in"}
              </PhButton>
              <button
                type="button"
                className="text-center font-mono text-xs tracking-wide text-ph-dim uppercase hover:text-ph-bone"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setError("");
                }}
              >
                {mode === "signin"
                  ? "Need an account? Sign up"
                  : "Have an account? Sign in"}
              </button>
            </form>
          ) : null}

          {oauthOn ? (
            <div className="flex flex-col gap-2.5">
              {passwordOn ? (
                <p className="text-center font-mono text-[0.65rem] tracking-wide text-ph-dim uppercase">
                  or continue with
                </p>
              ) : null}
              {GROK_PROVIDERS.map((p) => (
                <PhButton
                  key={p.providerId}
                  tone={passwordOn ? "ghost" : "focus"}
                  className="h-11 w-full"
                  onClick={() => signIn(p.providerId, { callbackURL })}
                >
                  Continue with {p.label}
                </PhButton>
              ))}
            </div>
          ) : null}

          {nothingOn ? (
            <p className="font-mono text-sm text-ph-dim">Sign-in is off.</p>
          ) : null}

          {showBack ? (
            <Link
              to="/"
              className="block text-center font-mono text-xs tracking-wide text-ph-dim uppercase hover:text-ph-bone"
            >
              ← Back to landing
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
