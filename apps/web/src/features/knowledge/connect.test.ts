import { describe, expect, it } from 'vitest';
import { composeConnectPageMessage, connectTarget, parseConnectPlan, validateConnectPage } from './connect';

const OK = { name: 'Lan', contact: 'lan@example.com', format: 'question' as const, message: '', consent: true, topic: 'Kho cá' };

describe('connect page', () => {
  it('accepts a minimal valid request (message optional)', () => {
    expect(validateConnectPage(OK)).toEqual({});
  });
  it('flags every missing piece', () => {
    expect(validateConnectPage({ ...OK, name: ' ', contact: 'ab', topic: '', consent: false })).toEqual({
      name: 'required',
      contact: 'contactInvalid',
      topic: 'required',
      consent: 'consentRequired',
    });
  });
  it('routes to connect_requests only with an item and a signed-in user', () => {
    expect(connectTarget({ itemId: 'abc', signedIn: true })).toBe('connect_requests');
    expect(connectTarget({ itemId: 'abc', signedIn: false })).toBe('interest_requests');
    expect(connectTarget({ itemId: '', signedIn: true })).toBe('interest_requests');
  });
  it('parses the plan param strictly', () => {
    expect(parseConnectPlan('year')).toBe('year');
    expect(parseConnectPlan('free')).toBeNull();
    expect(parseConnectPlan(null)).toBeNull();
  });
  it('composes a bounded message that is never empty', () => {
    const m = composeConnectPageMessage({ formatLabel: 'Hỏi', topicLabel: 'Chủ đề', topic: ' Kho cá ', planLabel: 'Gói năm', message: '' });
    expect(m).toBe('[Hỏi] [Gói năm] Chủ đề: Kho cá');
    expect(composeConnectPageMessage({ formatLabel: 'H', topicLabel: 'C', topic: 'x', message: 'a'.repeat(3000) })).toHaveLength(2000);
  });
});
