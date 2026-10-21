import { cn } from '@/lib/cn';

/** Decorative line motif per topic (uses currentColor). Always aria-hidden. */
export function TopicMotif({ slug, className }: { slug: string | null | undefined; className?: string }) {
  return (
    <svg viewBox="0 0 240 120" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn('block', className)}>
      {motif(slug)}
    </svg>
  );
}

function motif(slug: string | null | undefined) {
  switch (slug) {
    case 'lam-vuon':
      // Sprouting seedlings in furrows.
      return (
        <g>
          {[30, 90, 150, 210].map((x, i) => (
            <g key={x} transform={`translate(${x} ${i % 2 ? 70 : 62})`}>
              <path d="M0 40 V6" />
              <path d="M0 18 C-14 14 -20 2 -22 -8 C-8 -6 0 4 0 18Z" />
              <path d="M0 10 C12 6 18 -6 20 -16 C6 -14 -1 -4 0 10Z" />
            </g>
          ))}
          <path d="M0 108 Q60 98 120 108 T240 108" />
          <path d="M0 118 Q60 108 120 118 T240 118" opacity=".6" />
        </g>
      );
    case 'mon-an':
      // Bowl with rising steam and chopsticks.
      return (
        <g>
          <path d="M70 78 H190 C186 104 160 116 130 116 C100 116 74 104 70 78Z" />
          <path d="M84 78 C96 72 164 72 176 78" opacity=".6" />
          <path d="M108 60 C100 48 116 40 108 26" />
          <path d="M130 58 C122 44 140 36 130 18" />
          <path d="M152 60 C144 48 160 40 152 28" />
          <path d="M172 16 L214 70" />
          <path d="M184 12 L222 64" />
          <circle cx="30" cy="40" r="10" opacity=".5" />
          <circle cx="30" cy="40" r="18" opacity=".3" />
        </g>
      );
    case 'nghe-nghiep':
      // Woven basket grid.
      return (
        <g>
          {Array.from({ length: 9 }, (_, i) => (
            <path key={`v${i}`} d={`M${40 + i * 20} 20 Q${46 + i * 20} 70 ${40 + i * 20} 118`} />
          ))}
          {Array.from({ length: 5 }, (_, i) => (
            <path key={`h${i}`} d={`M30 ${30 + i * 20} Q125 ${22 + i * 20} 220 ${30 + i * 20}`} opacity=".7" />
          ))}
        </g>
      );
    case 'que-huong':
      // Rice terraces and a distant hill.
      return (
        <g>
          <path d="M120 54 C150 18 196 14 240 40" />
          <path d="M0 62 C40 50 80 50 120 62 S200 74 240 62" />
          <path d="M0 80 C40 68 80 68 120 80 S200 92 240 80" />
          <path d="M0 98 C40 86 80 86 120 98 S200 110 240 98" />
          <path d="M0 116 C40 104 80 104 120 116 S200 128 240 116" />
          <circle cx="60" cy="26" r="9" />
        </g>
      );
    case 'gia-dinh':
      // Roof line and hanging lanterns.
      return (
        <g>
          <path d="M20 44 C70 30 170 30 220 44" />
          <path d="M14 50 L40 38 M226 50 L200 38" />
          {[60, 120, 180].map((x) => (
            <g key={x}>
              <path d={`M${x} 38 V54`} />
              <ellipse cx={x} cy="72" rx="13" ry="17" />
              <path d={`M${x - 13} 72 H${x + 13}`} opacity=".6" />
              <path d={`M${x} 89 V100`} />
            </g>
          ))}
        </g>
      );
    case 'tuoi-tho':
      // Kite on a string and a sun.
      return (
        <g>
          <path d="M150 14 L182 40 L150 74 L118 40Z" />
          <path d="M150 14 V74 M118 40 H182" opacity=".6" />
          <path d="M150 74 C140 90 160 98 146 110 C136 118 120 112 110 120" />
          <circle cx="52" cy="46" r="16" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            return <path key={i} d={`M${52 + Math.cos(a) * 24} ${46 + Math.sin(a) * 24} L${52 + Math.cos(a) * 32} ${46 + Math.sin(a) * 32}`} />;
          })}
        </g>
      );
    default:
      return (
        <g>
          <path d="M0 80 Q60 60 120 80 T240 80" />
          <path d="M0 100 Q60 80 120 100 T240 100" opacity=".6" />
          <circle cx="190" cy="36" r="14" />
        </g>
      );
  }
}
