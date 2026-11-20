import { describe, expect, it } from 'vitest';

import { FOLLOW_TOKEN } from './__fixtures__/follow-links';
import { HERO_TOKEN } from './__fixtures__/hero-links';
import {
  isInvalidLinkQuery,
  isLinkPagePath,
  isLinkToken,
  LINK_PAGE_SOURCES,
  LINK_PAGES,
  linkCookie,
  linkKindOf,
  linkLandingOf,
} from './link-token';

describe('link kinds and tokens', () => {
  it('knows each kind of link and its page, and nothing else', () => {
    expect(LINK_PAGES).toEqual({
      unfollow: '/follow/unfollow',
      settings: '/following',
      'hero-preview': '/hero-link/preview',
      'hero-opt-out': '/hero-link/opt-out',
    });
    expect(linkKindOf('hero-opt-out')).toBe('hero-opt-out');
    expect(linkKindOf('settings')).toBe('settings');
    for (const value of ['', 'toString', '__proto__', 'Confirm', undefined, 1]) expect(linkKindOf(value)).toBeNull();
  });

  it("takes only a stored token's shape", () => {
    expect(isLinkToken(FOLLOW_TOKEN)).toBe(true);
    for (const value of ['short', `${FOLLOW_TOKEN}=`, 'a b'.repeat(20), 'x'.repeat(257), null, 42]) {
      expect(isLinkToken(value)).toBe(false);
    }
  });

  it("names each kind's cookie, HttpOnly, Lax and for the whole site; __Host- and Secure in production", () => {
    expect(linkCookie('unfollow', true)).toEqual({
      name: '__Host-gitranks-link-unfollow',
      options: { httpOnly: true, secure: true, sameSite: 'lax', path: '/' },
    });
    expect(linkCookie('settings', false).name).toBe('gitranks-link-settings');
  });

  it('lands a link on its clean page, keeping a good token and no other', () => {
    expect(linkLandingOf('unfollow', FOLLOW_TOKEN)).toEqual({
      location: '/follow/unfollow',
      kind: 'unfollow',
      token: FOLLOW_TOKEN,
    });
    expect(linkLandingOf('elsewhere', FOLLOW_TOKEN)).toBeNull();
  });

  it('sends a link without a usable token to its page with ?e=invalid, holding nothing of what it carried', () => {
    for (const value of ['not a token', null, '', `${FOLLOW_TOKEN}=`, FOLLOW_TOKEN.slice(0, 20)]) {
      const landing = linkLandingOf('unfollow', value);
      expect(landing).toEqual({ location: '/follow/unfollow?e=invalid', kind: 'unfollow', token: null });
    }
  });

  it('lands the Unsung hero links on their pages, each kind in its own cookie', () => {
    expect(linkLandingOf('hero-preview', HERO_TOKEN)).toEqual({
      location: '/hero-link/preview',
      kind: 'hero-preview',
      token: HERO_TOKEN,
    });
    expect(linkLandingOf('hero-opt-out', 'nope')).toEqual({
      location: '/hero-link/opt-out?e=invalid',
      kind: 'hero-opt-out',
      token: null,
    });
    expect(linkCookie('hero-preview', true).name).toBe('__Host-gitranks-link-hero-preview');
    expect(linkCookie('hero-opt-out', false).name).toBe('gitranks-link-hero-opt-out');
  });

  it('counts the Unsung hero pages among the pages a link opens, and nothing that only starts like them', () => {
    for (const path of ['/hero-link/preview', '/hero-link/opt-out', '/hero-link/opt-out/', '/l/hero-opt-out']) {
      expect(isLinkPagePath(path), path).toBe(true);
    }
    for (const path of ['/hero-linkx', '/unsung-heroes', '/hero']) expect(isLinkPagePath(path), path).toBe(false);
    expect(LINK_PAGE_SOURCES).toContain('/hero-link/:path*');
  });

  it('reads ?e=invalid, and nothing else, as a link that held no usable token', () => {
    expect(isInvalidLinkQuery('invalid')).toBe(true);
    expect(isInvalidLinkQuery(['x', 'invalid'])).toBe(true);
    for (const value of [undefined, '', 'expired', 'INVALID', ['x']]) expect(isInvalidLinkQuery(value)).toBe(false);
  });
});
