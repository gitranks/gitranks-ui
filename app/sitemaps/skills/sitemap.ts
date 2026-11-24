'use cache';

import type { MetadataRoute } from 'next';
import { cacheLife } from 'next/cache';

import { skillsSitemapEntries } from '@/lib/sitemap/skills-sitemap';
import { loadSkillsLogins } from '@/lib/skills/skills.data';

/**
 * The Skills pages search engines may index: those with 5 lessons learned or a merged fix that their owner did not
 * hide, as the API lists them. Empty while there is none, or on a failed read, for minutes only.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const logins = await loadSkillsLogins();
  if (logins?.length) cacheLife('hours');
  else cacheLife('minutes');
  return skillsSitemapEntries(logins ?? []);
}
