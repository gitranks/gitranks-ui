import { afterEach, describe, expect, it, vi } from 'vitest';

import { prTimelineSitemapEntries } from './pr-timeline-sitemap';

describe('prTimelineSitemapEntries', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('lists each shown timeline at its last change', () => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test');
    const [entry] = prTimelineSitemapEntries([
      { nameWithOwner: 'acme/widgets', number: 42, modifiedAt: '2026-11-18T10:00:00.000Z' },
    ]);
    expect(entry.url).toMatch(/\/contribute\/pr\/acme\/widgets\/42$/);
    expect(entry.lastModified).toBe('2026-11-18T10:00:00.000Z');
    expect(prTimelineSitemapEntries([])).toEqual([]);
  });
});
