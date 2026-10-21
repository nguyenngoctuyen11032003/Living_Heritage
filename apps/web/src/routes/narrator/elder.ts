// Shared bits for the narrator (elder) pages: large-type overrides and the localized document title hook.
export { usePageTitle as useNarratorTitle } from '@/lib/usePageTitle';

/** Button label size for elders (≥ 20px); pair with size="lg" (56px) or "xl" (64px). `!` because cn() does not merge classes. */
export const elderButton = 'text-[1.25rem]!';

/** EmptyState overrides: body ≥ 20px, a larger serif title. */
export const elderEmpty = 'py-14! text-[1.25rem] [&_h3]:text-[clamp(1.6rem,5vw,1.9rem)] [&_h3]:leading-snug';
