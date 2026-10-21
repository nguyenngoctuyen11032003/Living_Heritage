// Illustrated avatar: the initial in a warm topic-coloured circle with a faint bronze-drum (trống đồng) motif.
import { cn } from '@/lib/cn';
import { avatarInitial, avatarPalette } from './avatar';

const sizes = {
  sm: 'size-9 text-[0.95rem]',
  md: 'size-12 text-[1.25rem]',
  lg: 'size-16 text-[1.7rem]',
  xl: 'size-24 text-[2.4rem]',
} as const;

export function HeritageAvatar({ name, seed, size = 'md', className }: { name: string | null | undefined; seed: string; size?: keyof typeof sizes; className?: string }) {
  const { bg, ink } = avatarPalette(seed);
  return (
    <span
      aria-hidden="true"
      className={cn('relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-serif font-semibold leading-none shadow-[inset_0_0_0_1px_rgba(22,58,49,0.08)]', sizes[size], className)}
      style={{ backgroundColor: bg, color: ink }}
    >
      <svg viewBox="0 0 64 64" className="absolute inset-0 size-full" fill="none" stroke="currentColor">
        <g opacity="0.16" strokeWidth="1.2">
          <circle cx="32" cy="32" r="29" />
          <circle cx="32" cy="32" r="23" strokeDasharray="2 3" />
        </g>
        <g opacity="0.14" strokeWidth="1.4" strokeLinecap="round">
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * Math.PI) / 6;
            const p = (r: number) => `${(32 + r * Math.cos(a)).toFixed(2)} ${(32 + r * Math.sin(a)).toFixed(2)}`;
            return <path key={i} d={`M${p(25.5)} L${p(27.5)}`} />;
          })}
        </g>
        <path d="M14 50 q 18 -10 36 0" opacity="0.12" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <span className="relative">{avatarInitial(name)}</span>
    </span>
  );
}
