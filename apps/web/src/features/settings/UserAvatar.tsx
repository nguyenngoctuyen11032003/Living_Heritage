import { useState } from 'react';
import { HeritageAvatar } from '@/features/families/HeritageAvatar';
import { cn } from '@/lib/cn';

const sizes = { sm: 'size-9', xl: 'size-24' } as const;

/** The user's photo in a circle, or the illustrated initial when there is none (or it fails to load). Decorative. */
export function UserAvatar({ src, name, seed, size = 'sm', className }: { src: string | null; name: string | null | undefined; seed: string; size?: keyof typeof sizes; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src) return <HeritageAvatar name={name} seed={seed} size={size} className={className} />;
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      onError={() => setFailed(src)}
      className={cn('shrink-0 rounded-full object-cover ring-1 ring-line', sizes[size], className)}
    />
  );
}
