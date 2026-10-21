import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Rounded-full (avatars, pills). */
  circle?: boolean;
}

/** Loading placeholder block. Size it with className (e.g. "h-6 w-40"). Decorative: mark the surrounding area aria-busy. */
export function Skeleton({ circle, className, ...rest }: SkeletonProps) {
  return <div aria-hidden="true" className={cn('animate-pulse bg-[#ece5d6]', circle ? 'rounded-full' : 'rounded-xl', className)} {...rest} />;
}
