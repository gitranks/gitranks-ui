import { describe, expect, it } from 'vitest';

import { hasSessionHint, SESSION_COOKIE, sessionClearsOf } from './session-hint';

describe('hasSessionHint', () => {
  it.each(['has-session=1', 'theme=dark; has-session=1', 'has-session=1;theme=dark'])(
    'finds the hint in %j',
    (cookie) => {
      expect(hasSessionHint(cookie)).toBe(true);
    },
  );

  it.each(['', 'theme=dark', 'not-has-session=1', 'has-session-old=1'])('finds no hint in %j', (cookie) => {
    expect(hasSessionHint(cookie)).toBe(false);
  });
});

describe('the session cookie', () => {
  it('is known in every name Auth.js gives it, and nothing else', () => {
    for (const name of ['authjs.session-token', '__Secure-authjs.session-token', 'authjs.session-token.0']) {
      expect(SESSION_COOKIE.test(name), name).toBe(true);
    }
    for (const name of ['has-session', 'authjs.csrf-token', 'xauthjs.session-token']) {
      expect(SESSION_COOKIE.test(name), name).toBe(false);
    }
  });

  it('is dropped by name, a secure one as secure, and nothing else with it', () => {
    expect(sessionClearsOf(['authjs.session-token', '__Secure-authjs.session-token.1', 'has-session'])).toEqual([
      'authjs.session-token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax',
      '__Secure-authjs.session-token.1=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure',
    ]);
  });
});
