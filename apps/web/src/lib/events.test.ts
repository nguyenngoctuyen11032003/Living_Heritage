import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
const fake = { configured: true };
vi.mock('./supabase', () => ({ getSupabase: () => (fake.configured ? { rpc } : null) }));

import { APP_VERSION, PARTICIPANT_KEY, participantCode, resetEventsForTests, track, type EventCode } from './events';

function setSearch(search: string) {
  window.history.replaceState(null, '', `/ke-chuyen${search}`);
}

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ error: null });
  fake.configured = true;
  sessionStorage.clear();
  resetEventsForTests();
  setSearch('');
});

afterEach(() => setSearch(''));

describe('track', () => {
  it('calls log_event with the code, participant and version', () => {
    setSearch('?ma=P-07');
    track('record_start');
    expect(rpc).toHaveBeenCalledWith('log_event', { p_code: 'record_start', p_participant: 'P-07', p_version: APP_VERSION });
    expect(APP_VERSION).toMatch(/\S/);
  });

  it('sends a null participant when there is none', () => {
    track('search');
    expect(rpc).toHaveBeenCalledWith('log_event', { p_code: 'search', p_participant: null, p_version: APP_VERSION });
  });

  it('never throws: rejected promise, throwing client, missing client, unknown code', async () => {
    rpc.mockRejectedValueOnce(new Error('offline'));
    expect(() => track('approve')).not.toThrow();
    rpc.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    expect(() => track('approve')).not.toThrow();
    fake.configured = false;
    expect(() => track('approve')).not.toThrow();
    fake.configured = true;
    rpc.mockClear();
    track('free text from a user' as EventCode);
    expect(rpc).not.toHaveBeenCalled();
    await Promise.resolve();
  });
});

describe('participantCode', () => {
  it('reads ?ma= once, keeps it for the tab and survives navigation', () => {
    setSearch('?ma=abc123');
    expect(participantCode()).toBe('abc123');
    expect(sessionStorage.getItem(PARTICIPANT_KEY)).toBe('abc123');
    resetEventsForTests();
    setSearch('');
    expect(participantCode()).toBe('abc123');
  });

  it('rejects anything that is not a short code', () => {
    setSearch(`?ma=${encodeURIComponent('Bà Lan <script>')}`);
    expect(participantCode()).toBeNull();
    resetEventsForTests();
    setSearch(`?ma=${'x'.repeat(33)}`);
    expect(participantCode()).toBeNull();
    resetEventsForTests();
    sessionStorage.setItem(PARTICIPANT_KEY, 'bad value');
    setSearch('');
    expect(participantCode()).toBeNull();
  });
});
