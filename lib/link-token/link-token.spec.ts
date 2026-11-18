import { describe, expect, it } from 'vitest';

import { CONFIRM_TOKEN } from './__fixtures__/follow-links';
import { isInvalidLinkQuery, isLinkToken, LINK_PAGES, linkCookie, linkKindOf, linkLandingOf } from './link-token';

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
      location: '/follow/confirm',
      kind: 'confirm',
      token: CONFIRM_TOKEN,
    });
    expect(linkLandingOf('elsewhere', CONFIRM_TOKEN)).toBeNull();
  });

  it('sends a link without a usable token to its page with ?e=invalid, holding nothing of what it carried', () => {
    for (const value of ['not a token', null, '', `${CONFIRM_TOKEN}=`, CONFIRM_TOKEN.slice(0, 20)]) {
      const landing = linkLandingOf('unfollow', value);
      expect(landing).toEqual({ location: '/follow/unfollow?e=invalid', kind: 'unfollow', token: null });
    }
  });

  it('reads ?e=invalid, and nothing else, as a link that held no usable token', () => {
    expect(isInvalidLinkQuery('invalid')).toBe(true);
    expect(isInvalidLinkQuery(['x', 'invalid'])).toBe(true);
    for (const value of [undefined, '', 'expired', 'INVALID', ['x']]) expect(isInvalidLinkQuery(value)).toBe(false);
  });
});
