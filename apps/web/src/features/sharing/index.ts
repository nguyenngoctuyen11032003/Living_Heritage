// Public surface of the sharing feature (used by /ban-nhap/:id and /cau-chuyen/:id).
export { ShareDialog } from './ShareDialog';
export type { ShareDialogProps } from './ShareDialog';
export { StoryStatusBadge } from './StoryStatusBadge';
export type { StoryStatusBadgeProps } from './StoryStatusBadge';
export { shareOptions, currentChoice, canWithdraw, canSubmitRequest } from './rules';
export type { ShareChoice, ShareContext, ShareReason } from './rules';
