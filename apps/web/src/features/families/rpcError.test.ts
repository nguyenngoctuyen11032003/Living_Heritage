import { describe, expect, it } from 'vitest';
import { rpcErrorCode } from './rpcError';

describe('rpcErrorCode (validation codes)', () => {
  it('maps generic validation codes raised by RPCs', () => {
    expect(rpcErrorCode({ message: 'invalid_argument' })).toBe('invalid_argument');
    expect(rpcErrorCode({ message: 'ERROR: invalid_fields' })).toBe('invalid_fields');
  });
  it('does not confuse invite_not_found with not_found', () => {
    expect(rpcErrorCode({ message: 'invite_not_found' })).toBe('invite_not_found');
  });
});
