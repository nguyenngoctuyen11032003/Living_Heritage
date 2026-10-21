// Which sharing choices are available (DỰ ÁN.md B12). Pure, so the dialog and tests agree.
import type { EditStatus, PublishStatus, Visibility } from '@lh/shared';

export type ShareChoice = 'private' | 'family' | 'request_publish';
export const SHARE_CHOICES: readonly ShareChoice[] = ['private', 'family', 'request_publish'];

export type ShareReason = 'noWrite' | 'isPublic' | 'notApproved' | 'noPublishRight';

export interface ShareContext {
  editStatus: EditStatus;
  visibility: Visibility;
  /** can_write_story: editors and the narrator user. */
  canWrite: boolean;
  /** owner/manager or the narrator user (request_publish / withdraw_public). */
  canPublish: boolean;
  /** Status of the latest publish request, if any. */
  requestStatus: PublishStatus | null;
}

export interface OptionState {
  enabled: boolean;
  reason: ShareReason | null;
}

/** The radio that reflects the current state: a public story or a pending request shows "Đề nghị công bố". */
export function currentChoice(ctx: Pick<ShareContext, 'visibility' | 'requestStatus'>): ShareChoice {
  if (ctx.visibility === 'public' || ctx.requestStatus === 'pending') return 'request_publish';
  return ctx.visibility;
}

export function shareOptions(ctx: ShareContext): Record<ShareChoice, OptionState> {
  const ok: OptionState = { enabled: true, reason: null };
  const no = (reason: ShareReason): OptionState => ({ enabled: false, reason });
  if (!ctx.canWrite && !ctx.canPublish) return { private: no('noWrite'), family: no('noWrite'), request_publish: no('noWrite') };

  // Direct visibility updates are blocked by RLS while public; the story must be withdrawn first.
  const scope = !ctx.canWrite ? no('noWrite') : ctx.visibility === 'public' ? no('isPublic') : ok;
  const publish = !ctx.canPublish ? no('noPublishRight') : ctx.editStatus !== 'approved' ? no('notApproved') : ok;
  return { private: scope, family: scope, request_publish: publish };
}

/** Withdraw is offered when something is public or waiting for review, to those allowed to call withdraw_public. */
export function canWithdraw(ctx: ShareContext): boolean {
  return ctx.canPublish && (ctx.visibility === 'public' || ctx.requestStatus === 'pending');
}

/** A new request can be sent when publishing is allowed and nothing is already pending. */
export function canSubmitRequest(ctx: ShareContext): boolean {
  return shareOptions(ctx).request_publish.enabled && ctx.requestStatus !== 'pending';
}

export interface ShareToggles {
  show_audio: boolean;
  show_real_name: boolean;
  show_region: boolean;
  show_photos: boolean;
}

/** DB defaults (story_share_settings / lh_public_snapshot when no row exists). */
export const DEFAULT_TOGGLES: ShareToggles = { show_audio: false, show_real_name: false, show_region: true, show_photos: false };

/** Switching a part ON while the story is public only applies after a new request (the server tightens OFF at once). */
export function toggleNeedsNewRequest(visibility: Visibility, before: boolean, after: boolean): boolean {
  return visibility === 'public' && !before && after;
}
