import { beforeEach, describe, expect, it, vi } from 'vitest';

import { learnSitemapEntries } from './learn-sitemap';

const LESSON = {
  slug: 'route-cache-miss-8f3kab',
  title: 'Route cache miss',
  language: 'TypeScript',
  repo: 'o/n',
  publishedAt: '2026-11-14T10:00:00.000Z',
  modifiedAt: '2026-11-15T10:00:00.000Z',
};

describe('the Learn sitemap', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test');
  });

  it('lists the page for maintainers and every public lesson at its last change, never a result page', () => {
    const entries = learnSitemapEntries([LESSON], { frontDoorOpen: false });
    expect(entries.map((entry) => entry.url)).toEqual([
      'https://example.test/learn/maintainers',
      'https://example.test/learn/lessons/route-cache-miss-8f3kab',
    ]);
    expect(entries[1]).toMatchObject({ lastModified: LESSON.modifiedAt, priority: 0.6 });
  });

  it('lists the front door once it is open to visitors', () => {
    expect(learnSitemapEntries([], { frontDoorOpen: true }).map((entry) => entry.url)).toEqual([
      'https://example.test/learn',
      'https://example.test/learn/maintainers',
    ]);
  });
});
