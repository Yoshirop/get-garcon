export function GarconLogo({ size = 30 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="garconRing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="oklch(0.74 0.16 48)" />
            <stop offset="1" stopColor="oklch(0.58 0.19 38)" />
          </linearGradient>
        </defs>
        <ellipse cx="32" cy="42" rx="20" ry="8" stroke="url(#garconRing)" strokeWidth="4.5" />
        <path d="M18 24l19 19" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <path d="M13 18v6c0 3 2 5 5 5h1M17 16v7M21 16v7" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M46 24L27 43" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="48" cy="21" rx="5.5" ry="7" transform="rotate(45 48 21)" fill="currentColor" />
        <path
          d="M24 26h16v6a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 24 32z"
          fill="var(--color-card)"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          d="M24 26c-4 0-7-3-7-6.5s3-6.5 7-6.5c.8 0 1.6.1 2.3.4C27.5 10.5 29.6 9 32 9s4.5 1.5 5.7 4.4c.7-.3 1.5-.4 2.3-.4 4 0 7 3 7 6.5S44 26 40 26H24z"
          fill="var(--color-card)"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[1.35rem] font-black tracking-tight text-ink">
        garçon<span className="text-primary">!</span>
      </span>
    </span>
  );
}
