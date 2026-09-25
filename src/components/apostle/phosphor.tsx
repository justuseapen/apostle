import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

/** Shared Phosphor tile — 2px borders, zero radius, tile fill. */
export function Tile({
  children,
  className = "",
  focus,
  tool,
  missing,
}: {
  children: ReactNode;
  className?: string;
  focus?: boolean;
  tool?: boolean;
  missing?: boolean;
}) {
  const ring = focus
    ? "border-ph-focus"
    : tool
      ? "border-ph-tool"
      : missing
        ? "border-ph-missing"
        : "border-ph-border";
  return (
    <section className={`border-2 bg-ph-tile ${ring} ${className}`}>{children}</section>
  );
}

export function TileHead({ left, right }: { left: string; right?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b-2 border-ph-border px-3 py-2 font-mono text-[0.68rem] tracking-wide text-ph-dim uppercase">
      <span>{left}</span>
      {right ? <span>{right}</span> : null}
    </div>
  );
}

type Tone = "focus" | "tool" | "bone" | "ghost" | "missing";

const BTN: Record<Tone, string> = {
  focus: "border-2 border-ph-focus bg-ph-focus text-ph-on",
  tool: "border-2 border-ph-tool bg-transparent text-ph-tool hover:bg-ph-tool hover:text-ph-on",
  bone: "border-2 border-ph-bone bg-transparent text-ph-bone",
  ghost: "border-2 border-ph-border bg-transparent text-ph-bone hover:border-ph-bone",
  missing: "border-2 border-ph-missing bg-transparent text-ph-missing",
};

export function PhButton({
  tone = "ghost",
  className = "",
  type = "button",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return (
    <button
      type={type}
      className={`px-3 py-2 font-mono text-xs tracking-wide uppercase disabled:opacity-40 ${BTN[tone]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function PhInput({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-11 w-full border-2 border-ph-border bg-ph-void px-3 font-mono text-sm text-ph-bone outline-none placeholder:text-ph-dim focus:border-ph-focus ${className}`}
      {...rest}
    />
  );
}

export function PhTextarea({
  className = "",
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full border-2 border-ph-border bg-ph-void p-3 font-mono text-sm text-ph-bone outline-none placeholder:text-ph-dim focus:border-ph-focus ${className}`}
      {...rest}
    />
  );
}
