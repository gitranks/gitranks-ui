'use cache';

import type { MetadataRoute } from 'next';
import { cacheLife } from 'next/cache';

import { learnOpenToEveryone } from '@/lib/learn/learn-everyone';
import { readPublicLessons } from '@/lib/learn/public-lessons.data';
import { learnSitemapEntries } from '@/lib/sitemap/learn-sitemap';

/** Learn's public pages: see `learnSitemapEntries`. A failed read lists the fixed pages alone, for minutes only. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [lessons, frontDoorOpen] = await Promise.all([readPublicLessons(), learnOpenToEveryone()]);
  if (lessons) {
    cacheLife('hours');
  } else {
    cacheLife('minutes');
  }
  return learnSitemapEntries(lessons ?? [], { frontDoorOpen });
}
