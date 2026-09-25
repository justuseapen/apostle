import { useProductTheme } from "@/lib/theme";

/** SI monogram — Brand Board route C (Signal square + Pulse corner). */
export function SiMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  const dot = Math.max(4, Math.round(size * 0.18));
  return (
    <span
      className={`relative inline-flex items-center justify-center bg-ph-focus font-display font-bold text-white ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.26),
        fontSize: Math.round(size * 0.42),
        letterSpacing: "-0.03em",
      }}
      aria-hidden
    >
      SI
      <span
        className="si-pulse-dot absolute bg-ph-tool"
        style={{
          right: Math.round(size * 0.1),
          bottom: Math.round(size * 0.1),
          width: dot,
          height: dot,
          borderRadius: Math.max(2, Math.round(dot * 0.35)),
        }}
      />
    </span>
  );
}

/** Header / landing wordmark that follows the active product theme. */
export function BrandLockup({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const { isSi } = useProductTheme();

  if (isSi) {
    return (
      <span className={`inline-flex items-center gap-2 ${className}`}>
        <SiMark size={compact ? 22 : 28} />
        <span className="leading-tight">
          <span className="block font-display text-[0.95rem] font-bold tracking-tight text-ph-bone">
            {compact ? (
              <>
                SUPER<span className="font-medium text-ph-dim">·SI</span>
              </>
            ) : (
              <>
                SUPER <span className="font-medium text-ph-dim">INTELLIGENCE</span>
              </>
            )}
          </span>
          {!compact ? (
            <span className="block font-mono text-[0.58rem] tracking-[0.18em] text-ph-dim uppercase">
              A TMTG product
            </span>
          ) : null}
        </span>
      </span>
    );
  }

  return (
    <span className={`font-mono text-[0.7rem] tracking-wide text-ph-bone uppercase ${className}`}>
      <span className="text-ph-missing">◆</span> APOSTLE
    </span>
  );
}

export function BrandTitle({ className = "" }: { className?: string }) {
  const { isSi } = useProductTheme();
  if (isSi) {
    return (
      <div className={className}>
        <p className="font-display text-4xl font-bold leading-none tracking-tight text-ph-bone sm:text-5xl">
          SUPER <span className="font-medium text-ph-dim">INTELLIGENCE</span>
          <span
            className="si-pulse-dot ml-2 inline-block bg-ph-tool align-middle"
            style={{ width: 12, height: 12, borderRadius: 3 }}
            aria-hidden
          />
        </p>
        <p className="mt-2 font-mono text-[0.65rem] tracking-[0.2em] text-ph-dim uppercase">
          A TMTG product
        </p>
      </div>
    );
  }
  return <p className={`font-display text-5xl leading-none tracking-tight ${className}`}>APOSTLE</p>;
}

export function BrandTagline({ className = "" }: { className?: string }) {
  const { isSi } = useProductTheme();
  if (isSi) {
    return (
      <p className={`text-base leading-relaxed text-ph-dim ${className}`}>
        A computer that works for you. A company that owns the computer.
      </p>
    );
  }
  return (
    <p className={`font-marginalia text-lg text-ph-bone italic ${className}`}>
      A chat you install. Plugins you switch on.
    </p>
  );
}
