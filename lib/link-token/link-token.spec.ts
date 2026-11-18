import { describe, expect, it } from 'vitest';

import { CONFIRM_TOKEN } from './__fixtures__/follow-links';
import { isLinkToken, LINK_PAGES, linkCookie, linkKindOf, linkLandingOf } from './link-token';

describe('link kinds and tokens', () => {
  it('knows each kind of link and its page, and nothing else', () => {
    expect(LINK_PAGES).toEqual({ confirm: '/follow/confirm', unfollow: '/follow/unfollow', settings: '/following' });
    expect(linkKindOf('settings')).toBe('settings');
    for (const value of ['', 'toString', '__proto__', 'Confirm', undefined, 1]) expect(linkKindOf(value)).toBeNull();
  });

  it("takes only a stored token's shape", () => {
    expect(isLinkToken(CONFIRM_TOKEN)).toBe(true);
    for (const value of ['short', `${CONFIRM_TOKEN}=`, 'a b'.repeat(20), 'x'.repeat(257), null, 42]) {
      expect(isLinkToken(value)).toBe(false);
    }
  });

  it("names each kind's cookie, HttpOnly, Lax and for the whole site; __Host- and Secure in production", () => {
    expect(linkCookie('confirm', true)).toEqual({
      name: '__Host-gitranks-link-confirm',
      options: { httpOnly: true, secure: true, sameSite: 'lax', path: '/' },
    });
    expect(linkCookie('settings', false).name).toBe('gitranks-link-settings');
  });

  it('lands a link on its clean page, keeping a good token and no other', () => {
    expect(linkLandingOf('confirm', CONFIRM_TOKEN)).toEqual({
      page: '/follow/confirm',
      kind: 'confirm',
      token: CONFIRM_TOKEN,
    });
    expect(linkLandingOf('unfollow', 'not a token')).toEqual({
      page: '/follow/unfollow',
      kind: 'unfollow',
      token: null,
    });
    expect(linkLandingOf('unfollow', null)?.token).toBeNull();
    expect(linkLandingOf('elsewhere', CONFIRM_TOKEN)).toBeNull();
  });
});
