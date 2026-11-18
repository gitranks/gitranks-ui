import type { MetadataRoute } from 'next';

import type { PublicLesson } from '@/lib/learn/learn.types';
import { LEARN_MAINTAINERS_PATH, LEARN_PATH, lessonPath } from '@/lib/learn/learn-path';
import { sitemapEntry } from '@/lib/sitemap/sitemap-url';

/**
 * GitRanks Learn's pages for search engines: the front door once it is open to visitors, the page for maintainers, and
 * every public lesson at its last change. A lesson's result pages are left out: they name a person and repeat the
 * lesson, so they are not indexed.
 */
export function learnSitemapEntries(
  lessons: readonly PublicLesson[],
  { frontDoorOpen }: { frontDoorOpen: boolean },
): MetadataRoute.Sitemap {
  return [
    ...(frontDoorOpen ? [sitemapEntry(LEARN_PATH, { priority: 0.7 })] : []),
    sitemapEntry(LEARN_MAINTAINERS_PATH, { priority: 0.4 }),
    ...lessons.map((lesson) =>
      sitemapEntry(lessonPath(lesson.slug), {
        lastModified: lesson.modifiedAt,
        changeFrequency: 'yearly',
        priority: 0.6,
      }),
    ),
  ];
}
