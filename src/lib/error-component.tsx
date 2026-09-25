import type { ErrorComponentProps } from "@tanstack/react-router";

const FALLBACK_MESSAGE = "An unexpected error occurred. Try reloading the page.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="phosphor flex min-h-dvh flex-col items-center justify-center gap-4 bg-ph-void px-6 text-center text-ph-bone">
      <div className="w-full max-w-md border-2 border-ph-missing bg-ph-tile">
        <div className="border-b-2 border-ph-border px-3 py-2 font-mono text-[0.68rem] tracking-wide text-ph-dim uppercase">
          ERROR
        </div>
        <div className="space-y-3 px-4 py-5">
          <h1 className="font-display text-4xl leading-none text-ph-missing">
            Something went wrong
          </h1>
          <p className="font-mono text-sm break-words text-ph-dim">{errorMessage(error)}</p>
        </div>
      </div>
    </main>
  );
}
