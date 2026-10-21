// Single adapter for components owned by other workstreams, so vault/books pages import them from one place.
// - FamilyGate: workstream E1 (features/families/FamilyGate.tsx).
// - ShareDialog / StoryStatusBadge: workstream F1 (features/sharing).
export { FamilyGate } from '@/features/families/FamilyGate';
export { ShareDialog, StoryStatusBadge } from '@/features/sharing';
