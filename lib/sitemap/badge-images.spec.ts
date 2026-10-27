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

  it("lists a profile's promoted images as the page draws them, then its old PNGs, before the cut-over", () => {
    expect(paths(listProfileBadgeImageUrls('Octo-Cat', { s: 150, c: 10, f: 10 }, before))).toEqual([
      '/badge/user/Octo-Cat/rank.svg?theme=light',
      '/badge/user/Octo-Cat/profile-card.svg?theme=light',
      '/badges/Octo-Cat/stars-rank.png',
      '/badges/Octo-Cat/contributions-rank.png',
      '/badges/Octo-Cat/followers-rank.png',
      '/badges/Octo-Cat/stars-score.png',
      '/badges/Octo-Cat/contributions-score.png',
      '/badges/Octo-Cat/followers-score.png',
    ]);
  });

  it('lists only the promoted images from the cut-over on', () => {
    expect(paths(listProfileBadgeImageUrls('Octo-Cat', { s: 150, c: 10, f: 10 }, after))).toEqual([
      '/badge/user/Octo-Cat/rank.svg?theme=light',
      '/badge/user/Octo-Cat/profile-card.svg?theme=light',
    ]);
  });

  it("follows the profile's size: a small profile's page promotes its contribution rank and no card", () => {
    expect(paths(listProfileBadgeImageUrls('octocat', { s: 40, c: 10, f: 10 }, after))).toEqual([
      '/badge/user/octocat/rank.svg?by=contributions&amp;theme=light',
    ]);
    expect(paths(listProfileBadgeImageUrls('octocat', { s: 40, c: 4, f: 10 }, after))).toEqual([]);
  });

  it('leaves out what the scores cannot decide or the page never shows', () => {
    const urls = paths(listProfileBadgeImageUrls('octocat', { s: 5_000, c: 10, f: 10 }, after));

    expect(urls).toEqual([
      '/badge/user/octocat/rank.svg?theme=light',
      '/badge/user/octocat/profile-card.svg?theme=light',
    ]);
    expect(urls.join()).not.toMatch(/scope=country|count-chart|month|followers/);
  });

  it('lists nothing for a profile in no promoted ranking', () => {
    expect(listProfileBadgeImageUrls('octocat', { s: 0, c: 0, f: 50 }, after)).toEqual([]);
    expect(listProfileBadgeImageUrls('octocat', {}, before)).toEqual([]);
  });

  it('escapes the query of a promoted image with two keys', () => {
    const urls = listProfileBadgeImageUrls('octocat', { s: 40, c: 10, f: 10 }, after);

    expect(urls.every((url) => !/&(?!amp;)/.test(url))).toBe(true);
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

    expect(urls).toHaveLength(2);
    expect(urls.every((url) => url.startsWith('https://example.test/x?a=1&amp;b=2/'))).toBe(true);
    expect(listRepoBadgeImageUrls('vercel/next.js')[0]).toContain('&amp;');
    expect(listOrgBadgeImageUrls('vercel')[0]).toContain('&amp;');
  });

  it("lists what a listed repository's and organization's pages show", () => {
    expect(listRepoBadgeImageUrls('vercel/next.js')).toEqual([
      'https://example.test/badge/repo/vercel/next.js/rank.svg?theme=light',
      'https://example.test/badge/repo/vercel/next.js/star-history.svg?theme=light',
    ]);
    expect(listOrgBadgeImageUrls('vercel')).toEqual([
      'https://example.test/badge/org/vercel/rank.svg?theme=light',
      'https://example.test/badge/org/vercel/org-card.svg?theme=light',
    ]);
  });
});
