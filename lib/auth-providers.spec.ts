import { describe, expect, it } from 'vitest';

import { authModeOf } from './auth-providers';

describe('authModeOf', () => {
  it('reads the mode the sign-in stored', () => {
    expect(authModeOf({ authMode: 'identity' })).toBe('identity');
    expect(authModeOf({ authMode: 'token', access_token: 'x' })).toBe('token');
  });

  it('keeps a session from before the identity sign-in on its token', () => {
    expect(authModeOf({ access_token: 'x', githubLogin: 'octo' })).toBe('token');
  });

  it('treats a session without a token as identity only', () => {
    expect(authModeOf({ githubLogin: 'octo' })).toBe('identity');
  });
});
