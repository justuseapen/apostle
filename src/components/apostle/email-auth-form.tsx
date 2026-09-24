import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";

/** Local email/password — documented fallback when Google/X redirect is refused. */
export function EmailAuthForm({ onDone }: { onDone?: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "signup") {
        const res = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || email.trim().split("@")[0] || "Operator",
        });
        if (res.error) {
          setError(res.error.message || "Could not create the account.");
          return;
        }
      } else {
        const res = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (res.error) {
          setError(res.error.message || "Could not sign in.");
          return;
        }
      }
      onDone?.();
      window.location.assign("/");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="mt-6 flex flex-col gap-3">
      <p className="text-sm text-mute">
        Or use email — for local installs when Google / X is unavailable.
      </p>
      {mode === "signup" && (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="h-12 rounded-full border border-line bg-bone px-4 outline-none"
          autoComplete="name"
        />
      )}
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="h-12 rounded-full border border-line bg-bone px-4 outline-none"
        autoComplete="email"
      />
      <input
        type="password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password (8+ characters)"
        className="h-12 rounded-full border border-line bg-bone px-4 outline-none"
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
      />
      <button
        type="submit"
        disabled={busy}
        className="h-12 rounded-full bg-ink text-paper disabled:opacity-40"
      >
        {busy ? "Working…" : mode === "signup" ? "Create account" : "Sign in with email"}
      </button>
      <button
        type="button"
        className="text-sm text-mute"
        onClick={() => {
          setMode((m) => (m === "signin" ? "signup" : "signin"));
          setError("");
        }}
      >
        {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
      </button>
      {error && <p className="text-sm text-signal">{error}</p>}
    </form>
  );
}
