import type { Session } from 'next-auth';
import { describe, expect, it } from 'vitest';

import { refreshModeOf } from './refresh-mode';

const session = (user: Partial<Session['user']>) => ({ user, expires: '' }) as Session;

describe('refreshModeOf', () => {
  it('is signed-out without a session', () => {
    expect(refreshModeOf(null, 'octo', 'unauthenticated')).toBe('signed-out');
    expect(refreshModeOf(undefined, 'octo')).toBe('signed-out');
  });

  it('waits while the session loads, so a token user is never offered the light sign-in', () => {
    expect(refreshModeOf(undefined, 'octo', 'loading')).toBe('loading');
  });

  it('refreshes any profile on the visitor token', () => {
    expect(refreshModeOf(session({ githubLogin: 'octo', authMode: 'token' }), 'someone')).toBe('token');
  });

  it('offers the daily refresh on the visitor own profile, whatever the letter case', () => {
    expect(refreshModeOf(session({ githubLogin: 'Octo', authMode: 'identity' }), 'octo')).toBe('daily');
  });

  it('asks for a token on someone else profile', () => {
    expect(refreshModeOf(session({ githubLogin: 'octo', authMode: 'identity' }), 'someone')).toBe('other');
  });
});
