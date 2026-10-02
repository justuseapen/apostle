/** Header / landing wordmark — public Apostle chrome only. */

export function BrandLockup({
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={`font-mono text-[0.7rem] tracking-wide text-ph-bone uppercase ${className}`}>
      <span className="text-ph-missing">◆</span> APOSTLE
    </span>
  );
}

export function BrandTitle({ className = "" }: { className?: string }) {
  return <p className={`font-display text-5xl leading-none tracking-tight ${className}`}>APOSTLE</p>;
}

export function BrandTagline({ className = "" }: { className?: string }) {
  return (
    <p className={`font-marginalia text-lg text-ph-bone italic ${className}`}>
      Install your own AI assistant. Own the desk.
    </p>
  );
}
