import { afterEach, describe, expect, it, vi } from 'vitest';

import { skillsSitemapEntries } from './skills-sitemap';

describe('skillsSitemapEntries', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('lists each Skills page once, in the order given, leaving out what is not a login', () => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test');
    const entries = skillsSitemapEntries(['octocat', 'Octocat', 'hub-dev', 'a/b', '']);
    expect(entries.map((entry) => entry.url)).toEqual([
      'https://example.test/profile/octocat/skills',
      'https://example.test/profile/hub-dev/skills',
    ]);
    expect(entries[0]).toMatchObject({ changeFrequency: 'weekly', priority: 0.5 });
    expect(skillsSitemapEntries([])).toEqual([]);
  });
});
