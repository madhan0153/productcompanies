// Reusable ProdMatch logo mark — the P with circuit node.
// Used in the sidebar, mobile header, and PWA install prompt.
// Mirrors the brand identity from the app icon.

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="pm-violet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>
      </defs>

      {/* Vertical stem */}
      <rect x="5" y="3" width="5.5" height="26" rx="2.5" fill="url(#pm-violet)" />

      {/* Top horizontal bar */}
      <rect x="5" y="3" width="15" height="5.5" rx="2.5" fill="url(#pm-violet)" />

      {/* Bowl — outer arc */}
      <path
        d="M20 3 Q28.5 3 28.5 11 Q28.5 19 20 19"
        stroke="url(#pm-violet)"
        strokeWidth="5.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Middle horizontal bar */}
      <rect x="5" y="13.5" width="15" height="5.5" rx="2.5" fill="url(#pm-violet)" />

      {/* Circuit connector line */}
      <line x1="10.5" y1="19" x2="22" y2="19" stroke="#06B6D4" strokeWidth="1.8" strokeLinecap="round" />

      {/* Cyan AI node */}
      <circle cx="25.5" cy="19" r="3.5" fill="#06B6D4" />
      {/* Soft glow ring */}
      <circle cx="25.5" cy="19" r="5.5" fill="#06B6D4" fillOpacity="0.18" />
    </svg>
  );
}
