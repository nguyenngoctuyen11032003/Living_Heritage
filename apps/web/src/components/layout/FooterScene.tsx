/** Decorative landscape behind the footer: sky, hills, a golden field with a track, one big tree and a small house. */
export function FooterScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1440 720" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false" className={className}>
      <defs>
        <linearGradient id="fs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7ea3d6" />
          <stop offset="0.55" stopColor="#c9d3e6" />
          <stop offset="1" stopColor="#f4d8b8" />
        </linearGradient>
        <linearGradient id="fs-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9a86b8" />
          <stop offset="1" stopColor="#c9a9b8" />
        </linearGradient>
        <linearGradient id="fs-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7d6a9c" />
          <stop offset="1" stopColor="#b98e8a" />
        </linearGradient>
        <linearGradient id="fs-field" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9a24a" />
          <stop offset="0.6" stopColor="#c07d28" />
          <stop offset="1" stopColor="#6d5a22" />
        </linearGradient>
        <radialGradient id="fs-sun" cx="0.72" cy="0.55" r="0.5">
          <stop offset="0" stopColor="#fff1d0" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff1d0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1440" height="720" fill="url(#fs-sky)" />
      <rect width="1440" height="720" fill="url(#fs-sun)" />
      {/* hills */}
      <path d="M0 470 L120 430 L240 468 L420 400 L560 455 L760 330 L900 300 L1040 380 L1200 420 L1330 380 L1440 410 V560 H0Z" fill="url(#fs-far)" />
      <path d="M0 520 L200 470 L380 505 L640 430 L860 410 L1060 470 L1260 440 L1440 470 V600 H0Z" fill="url(#fs-mid)" />
      {/* field */}
      <path d="M0 540 C300 520 520 535 760 528 C1000 520 1200 530 1440 524 V720 H0Z" fill="url(#fs-field)" />
      {/* track */}
      <path d="M560 720 C640 640 700 590 780 540 L800 540 C760 600 730 650 760 720Z" fill="#4a5a2c" opacity="0.75" />
      <path d="M690 720 C720 650 770 600 850 545 L865 546 C820 610 790 660 840 720Z" fill="#4a5a2c" opacity="0.55" />
      {/* tree */}
      <g transform="translate(880 400)">
        <rect x="-5" y="70" width="10" height="64" rx="4" fill="#4a3a22" />
        <ellipse cx="0" cy="48" rx="78" ry="62" fill="#4f6b2a" />
        <ellipse cx="-26" cy="30" rx="44" ry="36" fill="#6b8a35" />
        <ellipse cx="30" cy="62" rx="40" ry="30" fill="#3e5a22" />
      </g>
      {/* small house */}
      <g transform="translate(1110 500)">
        <rect x="0" y="22" width="52" height="30" fill="#f3e9d6" />
        <path d="M-8 24 L26 0 L60 24Z" fill="#8a4b2c" />
        <rect x="21" y="32" width="10" height="20" fill="#7a5a3a" />
      </g>
      {/* rocks */}
      <g fill="#cfc3b0" opacity="0.9">
        <ellipse cx="120" cy="640" rx="34" ry="14" />
        <ellipse cx="190" cy="660" rx="22" ry="9" />
        <ellipse cx="1260" cy="650" rx="36" ry="14" />
        <ellipse cx="1340" cy="676" rx="24" ry="10" />
        <ellipse cx="420" cy="600" rx="18" ry="7" />
      </g>
    </svg>
  );
}
