import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  escapeImageLoc,
  listOrgImageUrls,
  listProfileImageUrls,
  listRepoImageUrls,
  sitemapImageLoc,
} from './badge-images';

const paths = (urls: string[]) => urls.map((url) => url.replace('https://example.test', ''));

describe('sitemap images', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test/');
  });

  it("lists a profile's avatar, then its promoted images as the page draws them", () => {
    expect(paths(listProfileImageUrls('Octo-Cat', { s: 150, c: 10, f: 10 }))).toEqual([
      '/api/avatar/Octo-Cat',
      '/badge/user/Octo-Cat/rank.svg?theme=light',
      '/badge/user/Octo-Cat/profile-card.svg?theme=light',
    ]);
  });

  it('lists no old badge PNG: the page no longer draws them', () => {
    expect(listProfileImageUrls('octocat', { s: 5_000, c: 5_000, f: 5_000 }).join()).not.toContain('/badges/');
  });

  it("follows the profile's size: a small profile's page promotes its contribution rank and no card", () => {
    expect(paths(listProfileImageUrls('octocat', { s: 40, c: 10, f: 10 }))).toEqual([
      '/api/avatar/octocat',
      '/badge/user/octocat/rank.svg?by=contributions&amp;theme=light',
    ]);
    expect(paths(listProfileImageUrls('octocat', { s: 40, c: 4, f: 10 }))).toEqual(['/api/avatar/octocat']);
  });

  it('leaves out what the scores cannot decide or the page never shows', () => {
    const urls = paths(listProfileImageUrls('octocat', { s: 5_000, c: 10, f: 10 }));

    expect(urls).toEqual([
      '/api/avatar/octocat',
      '/badge/user/octocat/rank.svg?theme=light',
      '/badge/user/octocat/profile-card.svg?theme=light',
    ]);
    expect(urls.join()).not.toMatch(/scope=country|count-chart|month|followers/);
  });

  it('lists only the avatar for a profile in no promoted ranking', () => {
    expect(paths(listProfileImageUrls('octocat', { s: 0, c: 0, f: 50 }))).toEqual(['/api/avatar/octocat']);
    expect(paths(listProfileImageUrls('octocat', {}))).toEqual(['/api/avatar/octocat']);
  });

  it('escapes the query of a promoted image with two keys', () => {
    const urls = listProfileImageUrls('octocat', { s: 40, c: 10, f: 10 });

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

  it('escapes the site origin too', () => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test/x?a=1&b=2');

    const urls = [...listProfileImageUrls('octocat', { s: 10 }), ...listRepoImageUrls('vercel/next.js')];

    expect(urls.every((url) => url.startsWith('https://example.test/x?a=1&amp;b=2/'))).toBe(true);
    expect(listOrgImageUrls('vercel')[0]).toContain('&amp;');
  });

  it("lists what every listed repository's and organization's page shows", () => {
    expect(listRepoImageUrls('vercel/next.js')).toEqual([
      'https://example.test/api/avatar/vercel',
      'https://example.test/badge/repo/vercel/next.js/rank.svg?theme=light',
    ]);
    expect(listOrgImageUrls('vercel')).toEqual([
      'https://example.test/api/avatar/vercel',
      'https://example.test/badge/org/vercel/rank.svg?theme=light',
      'https://example.test/badge/org/vercel/org-card.svg?theme=light',
    ]);
  });

  it("leaves out a repository's star history: its page draws it only once the history is read", () => {
    expect(listRepoImageUrls('vercel/next.js').join()).not.toContain('star-history');
  });
});
