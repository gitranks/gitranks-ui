import { describe, expect, it } from 'vitest';

import { invalidAnswer, learnErrorOf } from './learn-action';

const apiError = (...codes: string[]) =>
  new Error(JSON.stringify(codes.map((code) => ({ message: 'no', extensions: { code } }))));

describe('why a Learn answer was not taken', () => {
  it('reads the API’s code, a conflict first', () => {
    expect(learnErrorOf(apiError('CONFLICT'))).toBe('CONFLICT');
    expect(learnErrorOf(apiError('NOT_FOUND', 'CONFLICT'))).toBe('CONFLICT');
    expect(learnErrorOf(apiError('NOT_FOUND'))).toBe('NOT_FOUND');
    expect(learnErrorOf(apiError('UNAUTHENTICATED'))).toBe('SIGNED_OUT');
    expect(learnErrorOf(apiError('BAD_USER_INPUT'))).toBe('INVALID');
    expect(learnErrorOf(apiError('BAD_REQUEST'))).toBe('INVALID');
  });

  it('says anything else failed', () => {
    for (const error of [apiError('INTERNAL_SERVER_ERROR'), new Error('socket hang up'), null, 'down', {}]) {
      expect(learnErrorOf(error)).toBe('FAILED');
    }
  });

  it('refuses an answer before the API is asked', () => {
    expect(invalidAnswer()).toEqual({ ok: false, error: 'INVALID' });
  });
});
