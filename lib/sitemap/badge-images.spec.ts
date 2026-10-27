import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  escapeImageLoc,
  listOrgBadgeImageUrls,
  listProfileBadgeImageUrls,
  listRepoBadgeImageUrls,
  sitemapImageLoc,
} from './badge-images';
import { SITEMAP_OLD_BADGE_IMAGES_UNTIL } from './sitemap.consts';

const before = new Date('2026-11-26T23:59:59.999Z');
const after = SITEMAP_OLD_BADGE_IMAGES_UNTIL;
const paths = (urls: string[]) => urls.map((url) => url.replace('https://example.test', ''));

describe('sitemap badge images', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test/');
  });

  it('switches from old and new profile images to the new ones alone a month after badges v3', () => {
    expect(SITEMAP_OLD_BADGE_IMAGES_UNTIL.toISOString()).toBe('2026-11-27T00:00:00.000Z');
  });

  it("lists a profile's new images, then its old PNGs, before the cut-over", () => {
    expect(paths(listProfileBadgeImageUrls('Octo-Cat', { s: 10, c: 10, f: 10 }, before))).toEqual([
      '/badge/user/Octo-Cat/profile-card.png',
      '/badge/user/Octo-Cat/rank.png',
      '/badge/user/Octo-Cat/rank.png?by=contributions',
      '/badge/user/Octo-Cat/rank.png?by=followers',
      '/badges/Octo-Cat/stars-rank.png',
      '/badges/Octo-Cat/contributions-rank.png',
      '/badges/Octo-Cat/followers-rank.png',
      '/badges/Octo-Cat/stars-score.png',
      '/badges/Octo-Cat/contributions-score.png',
      '/badges/Octo-Cat/followers-score.png',
    ]);
  });

  it('lists only the new images from the cut-over on', () => {
    expect(paths(listProfileBadgeImageUrls('Octo-Cat', { s: 10, c: 10, f: 10 }, after))).toEqual([
      '/badge/user/Octo-Cat/profile-card.png',
      '/badge/user/Octo-Cat/rank.png',
      '/badge/user/Octo-Cat/rank.png?by=contributions',
      '/badge/user/Octo-Cat/rank.png?by=followers',
    ]);
  });

  it('leaves out the images of rankings the profile is not in, old and new alike', () => {
    expect(paths(listProfileBadgeImageUrls('octocat', { s: 4, c: 6, f: null }, before))).toEqual([
      '/badge/user/octocat/profile-card.png',
      '/badge/user/octocat/rank.png?by=contributions',
      '/badges/octocat/contributions-rank.png',
      '/badges/octocat/contributions-score.png',
    ]);
  });

  it('lists no profile card for a profile in the followers ranking alone', () => {
    expect(paths(listProfileBadgeImageUrls('octocat', { s: 0, c: 0, f: 50 }, after))).toEqual([
      '/badge/user/octocat/rank.png?by=followers',
    ]);
    expect(listProfileBadgeImageUrls('octocat', {}, before)).toEqual([]);
  });

  it('writes no character the sitemap would have to escape', () => {
    const urls = listProfileBadgeImageUrls('octocat', { s: 10, c: 10, f: 10 }, before);

    expect(urls.every((url) => !/[&<>"']/.test(url))).toBe(true);
  });

  it('escapes the characters XML reserves, so a query with two keys stays valid XML', () => {
    expect(sitemapImageLoc('/badge/user/octocat/rank.png?by=followers&scope=country')).toBe(
      'https://example.test/badge/user/octocat/rank.png?by=followers&amp;scope=country',
    );
    expect(escapeImageLoc(`https://example.test/a?b=<c>&d="e'`)).toBe(
      'https://example.test/a?b=&lt;c&gt;&amp;d=&quot;e&apos;',
    );
  });

  it('escapes the site origin too, in new and old images alike', () => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test/x?a=1&b=2');

    const urls = listProfileBadgeImageUrls('octocat', { s: 10 }, before);

    expect(urls).toHaveLength(4);
    expect(urls.every((url) => url.startsWith('https://example.test/x?a=1&amp;b=2/'))).toBe(true);
    expect(listRepoBadgeImageUrls('vercel/next.js')[0]).toContain('&amp;');
    expect(listOrgBadgeImageUrls('vercel')[0]).toContain('&amp;');
  });

  it("lists a repository's and an organization's card", () => {
    expect(listRepoBadgeImageUrls('vercel/next.js')).toEqual([
      'https://example.test/badge/repo/vercel/next.js/rank-card.png',
    ]);
    expect(listOrgBadgeImageUrls('vercel')).toEqual(['https://example.test/badge/org/vercel/org-card.png']);
  });
});
