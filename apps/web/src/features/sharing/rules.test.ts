import { describe, expect, it } from 'vitest';
import { canSubmitRequest, canWithdraw, currentChoice, shareOptions, toggleNeedsNewRequest, togglePublishable, type ShareContext } from './rules';

const ctx: ShareContext = { editStatus: 'approved', visibility: 'private', canWrite: true, canPublish: true, requestStatus: null };

describe('shareOptions', () => {
  it('enables everything for an approved private story and an owner', () => {
    const o = shareOptions(ctx);
    expect(o.private.enabled && o.family.enabled && o.request_publish.enabled).toBe(true);
  });

  it('disables "Đề nghị công bố" until the narrator approves', () => {
    for (const editStatus of ['draft', 'pending_review'] as const) {
      expect(shareOptions({ ...ctx, editStatus }).request_publish).toEqual({ enabled: false, reason: 'notApproved' });
    }
  });

  it('requires owner/manager or the narrator user to publish', () => {
    expect(shareOptions({ ...ctx, canPublish: false }).request_publish).toEqual({ enabled: false, reason: 'noPublishRight' });
    expect(shareOptions({ ...ctx, canPublish: false }).family.enabled).toBe(true);
  });

  it('blocks scope changes while public and everything for read-only viewers', () => {
    expect(shareOptions({ ...ctx, visibility: 'public' }).family).toEqual({ enabled: false, reason: 'isPublic' });
    const ro = shareOptions({ ...ctx, canWrite: false, canPublish: false });
    expect(Object.values(ro).every((o) => !o.enabled && o.reason === 'noWrite')).toBe(true);
  });
});

describe('current choice, submit and withdraw', () => {
  it('maps public or pending to "request_publish"', () => {
    expect(currentChoice({ visibility: 'family', requestStatus: null })).toBe('family');
    expect(currentChoice({ visibility: 'family', requestStatus: 'pending' })).toBe('request_publish');
    expect(currentChoice({ visibility: 'public', requestStatus: 'approved' })).toBe('request_publish');
    expect(currentChoice({ visibility: 'private', requestStatus: 'rejected' })).toBe('private');
  });

  it('allows one pending request at a time', () => {
    expect(canSubmitRequest(ctx)).toBe(true);
    expect(canSubmitRequest({ ...ctx, requestStatus: 'pending' })).toBe(false);
    expect(canSubmitRequest({ ...ctx, requestStatus: 'rejected' })).toBe(true);
  });

  it('offers withdraw for public or pending stories to publishers', () => {
    expect(canWithdraw(ctx)).toBe(false);
    expect(canWithdraw({ ...ctx, visibility: 'public' })).toBe(true);
    expect(canWithdraw({ ...ctx, requestStatus: 'pending' })).toBe(true);
    expect(canWithdraw({ ...ctx, visibility: 'public', canPublish: false })).toBe(false);
  });

  it('flags toggles switched ON on a public story', () => {
    expect(toggleNeedsNewRequest('public', false, true)).toBe(true);
    expect(toggleNeedsNewRequest('public', true, false)).toBe(false);
    expect(toggleNeedsNewRequest('family', false, true)).toBe(false);
  });
});

describe('togglePublishable', () => {
  it('locks only the photos toggle (public pages carry no photos)', () => {
    expect(togglePublishable('show_photos')).toBe(false);
    expect(togglePublishable('show_audio')).toBe(true);
    expect(togglePublishable('show_real_name')).toBe(true);
    expect(togglePublishable('show_region')).toBe(true);
  });
});
