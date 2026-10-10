/** Marchio di Carico: un disco da bilanciere aperto, a formare una "C". */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="var(--c-accent)" />
      <path
        d="M45.5 21.5A16 16 0 1 0 45.5 42.5"
        fill="none"
        stroke="var(--c-accent-ink)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle cx="32" cy="32" r="4.5" fill="var(--c-accent-ink)" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={34} />
      <span className="text-xl font-black tracking-tight">Carico</span>
    </span>
  );
}
