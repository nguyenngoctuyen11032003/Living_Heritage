import { initialOf } from '@/features/media/tree';
import { cn } from '@/lib/cn';

// Warm, dark tones (cream initial on top passes AA). Picked per narrator so each person keeps one colour.
const TONES = ['#214E43', '#A84832', '#7C3A12', '#3B3360', '#2F5122', '#6B2E22', '#1F4A3D', '#8C5A2B'] as const;

function avatarTone(key: string): string {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length]!;
}

const SIZES = { sm: 'size-7 text-[0.8rem]', md: 'size-10 text-[1.05rem]', lg: 'size-12 text-[1.3rem]' } as const;

/** Illustrated initial avatar for a storyteller (no portraits are stored yet). Decorative: the name sits next to it. */
export function NarratorAvatar({ id, name, size = 'md', className }: { id: string; name: string; size?: keyof typeof SIZES; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-serif font-semibold text-cream',
        SIZES[size],
        className,
      )}
      style={{ background: avatarTone(id) }}
    >
      <span aria-hidden="true" className="absolute -bottom-1/3 -right-1/4 size-3/4 rounded-full bg-white/12" />
      <span className="relative">{initialOf(name)}</span>
    </span>
  );
}
