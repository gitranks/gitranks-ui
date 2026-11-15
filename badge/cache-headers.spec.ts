import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  BADGE_CACHE_MODES,
  type BadgeCacheMode,
  badgeCacheHeaders,
  badgeCacheModeOf,
  cacheHeadersOf,
  isCacheProbe,
} from './cache-headers';

/** Every `Cache-Control` a long-kept badge answer is written with. */
const LONG = {
  /** A drawn badge or chart, and the redirect to its stored spelling. */
  badge: 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=604800',
  /** A profile's badge image. */
  profileBadge: 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800',
  /** A miss or a bad query. */
  miss: 'public, max-age=300, s-maxage=86400',
} as const;

describe('badgeCacheModeOf', () => {
  it.each(BADGE_CACHE_MODES)('reads %s', (mode) => {
    expect(badgeCacheModeOf({ BADGE_CACHE_SPLIT: mode })).toBe(mode);
  });

  it('is off when the switch is unset, empty or unknown', () => {
    expect(badgeCacheModeOf({})).toBe('off');
    expect(badgeCacheModeOf({ BADGE_CACHE_SPLIT: '' })).toBe('off');
    expect(badgeCacheModeOf({ BADGE_CACHE_SPLIT: 'ON' })).toBe('off');
    expect(badgeCacheModeOf({ BADGE_CACHE_SPLIT: 'true' })).toBe('off');
    expect(badgeCacheModeOf({ BADGE_CACHE_SPLIT: 'toString' })).toBe('off');
  });

  it('takes a value with spaces around it', () => {
    expect(badgeCacheModeOf({ BADGE_CACHE_SPLIT: ' on \n' })).toBe('on');
  });
});

describe('isCacheProbe', () => {
  it('is true for probe=1 only', () => {
    expect(isCacheProbe(new URLSearchParams('probe=1'))).toBe(true);
    expect(isCacheProbe(new URLSearchParams('scheme=night&probe=1'))).toBe(true);
    expect(isCacheProbe(new URLSearchParams(''))).toBe(false);
    expect(isCacheProbe(new URLSearchParams('probe=0'))).toBe(false);
    expect(isCacheProbe(new URLSearchParams('probe=true'))).toBe(false);
    expect(isCacheProbe(new URLSearchParams('probe'))).toBe(false);
  });
});

describe('cacheHeadersOf', () => {
  it.each(Object.entries(LONG))('off sends %s as it is, with or without the probe', (_name, value) => {
    expect(cacheHeadersOf(value, 'off', false)).toEqual({ 'Cache-Control': value });
    expect(cacheHeadersOf(value, 'off', true)).toEqual({ 'Cache-Control': value });
  });

  it.each(Object.entries(LONG))('probe sends %s as it is without the probe', (_name, value) => {
    expect(cacheHeadersOf(value, 'probe', false)).toEqual({ 'Cache-Control': value });
  });

  it.each(['on', 'probe'] as const)('%s splits a drawn badge into a short and a long header', (mode) => {
    expect(cacheHeadersOf(LONG.badge, mode, true)).toEqual({
      'Cache-Control': 'public, max-age=300',
      'Cloudflare-CDN-Cache-Control': 'max-age=86400, stale-while-revalidate=604800, stale-if-error=604800',
    });
  });

  it.each(['on', 'probe'] as const)("%s splits a profile's badge image and a miss", (mode) => {
    expect(cacheHeadersOf(LONG.profileBadge, mode, true)).toEqual({
      'Cache-Control': 'public, max-age=300',
      'Cloudflare-CDN-Cache-Control': 'max-age=86400, stale-while-revalidate=604800',
    });
    expect(cacheHeadersOf(LONG.miss, mode, true)).toEqual({
      'Cache-Control': 'public, max-age=300',
      'Cloudflare-CDN-Cache-Control': 'max-age=86400',
    });
  });

  it('on splits without the probe too', () => {
    expect(cacheHeadersOf(LONG.badge, 'on', false)).toEqual(cacheHeadersOf(LONG.badge, 'on', true));
  });

  it('on-no-swr leaves stale-while-revalidate out and keeps stale-if-error', () => {
    expect(cacheHeadersOf(LONG.badge, 'on-no-swr', false)).toEqual({
      'Cache-Control': 'public, max-age=300',
      'Cloudflare-CDN-Cache-Control': 'max-age=86400, stale-if-error=604800',
    });
    expect(cacheHeadersOf(LONG.profileBadge, 'on-no-swr', false)).toEqual({
      'Cache-Control': 'public, max-age=300',
      'Cloudflare-CDN-Cache-Control': 'max-age=86400',
    });
    expect(cacheHeadersOf(LONG.miss, 'on-no-swr', false)).toEqual({
      'Cache-Control': 'public, max-age=300',
      'Cloudflare-CDN-Cache-Control': 'max-age=86400',
    });
  });

  it.each(Object.entries(LONG))('short sends the browser lifetime of %s alone', (_name, value) => {
    expect(cacheHeadersOf(value, 'short', false)).toEqual({ 'Cache-Control': 'public, max-age=300' });
  });

  it.each(['on', 'on-no-swr', 'short'] as const)(
    '%s never puts s-maxage or a stale directive in the browser header',
    (mode) => {
      for (const value of Object.values(LONG)) {
        expect(cacheHeadersOf(value, mode, false)['Cache-Control']).toBe('public, max-age=300');
      }
    },
  );

  it.each<BadgeCacheMode>(['probe', 'on', 'on-no-swr', 'short'])(
    '%s sends a value without both lifetimes as it is',
    (mode) => {
      for (const value of ['private, no-store', 'public, max-age=300', 'public, s-maxage=86400']) {
        expect(cacheHeadersOf(value, mode, true)).toEqual({ 'Cache-Control': value });
      }
    },
  );
});

describe('badgeCacheHeaders', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sends the value as it is while the switch is unset', () => {
    vi.stubEnv('BADGE_CACHE_SPLIT', undefined);
    expect(badgeCacheHeaders(LONG.badge, new URLSearchParams('probe=1'))).toEqual({ 'Cache-Control': LONG.badge });
  });

  it('reads the switch and the probe at each call', () => {
    vi.stubEnv('BADGE_CACHE_SPLIT', 'probe');
    expect(badgeCacheHeaders(LONG.miss, new URLSearchParams())).toEqual({ 'Cache-Control': LONG.miss });
    expect(badgeCacheHeaders(LONG.miss, new URLSearchParams('probe=1'))).toEqual({
      'Cache-Control': 'public, max-age=300',
      'Cloudflare-CDN-Cache-Control': 'max-age=86400',
    });

    vi.stubEnv('BADGE_CACHE_SPLIT', 'short');
    expect(badgeCacheHeaders(LONG.miss, new URLSearchParams())).toEqual({ 'Cache-Control': 'public, max-age=300' });
  });
});
