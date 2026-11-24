import type { MetadataRoute } from 'next';

import { sitemapEntry } from '@/lib/sitemap/sitemap-url';
import { skillsPath } from '@/lib/skills/paths';

/**
 * The Skills pages search engines may index: each login once, in the order the API lists them. A login that is not
 * GitHub's shape is left out.
 */
export function skillsSitemapEntries(logins: readonly string[]): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  return logins.flatMap((login) => {
    const key = login.toLowerCase();
    if (!/^[a-z0-9-]{1,39}$/.test(key) || seen.has(key)) return [];
    seen.add(key);
    return [sitemapEntry(skillsPath(login), { changeFrequency: 'weekly', priority: 0.5 })];
  });
}
