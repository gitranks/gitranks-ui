'use cache';

import type { MetadataRoute } from 'next';
import { cacheLife } from 'next/cache';

import type { LearnLessonFixesListed } from '@/lib/learn/course';
import { loadLearnCourses, loadLearnLessons, loadLearnLessonsFixesListed } from '@/lib/learn/course.data';
import { type LearnSitemapContent, learnSitemapEntries } from '@/lib/sitemap/learn-sitemap';

/** The courses and their lessons; null when either cannot be read. */
async function readContent(): Promise<LearnSitemapContent | null> {
  try {
    const [courses, lessons] = await Promise.all([loadLearnCourses(), loadLearnLessons()]);
    return { courses, lessons };
  } catch {
    return null;
  }
}

/** Which lessons have a listed merged fix; null when it cannot be read, and then no view in real projects is listed. */
async function readListed(): Promise<LearnLessonFixesListed[] | null> {
  try {
    return await loadLearnLessonsFixesListed();
  } catch {
    return null;
  }
}

/** Learn's public pages: see `learnSitemapEntries`. A failed read lists the rest, for minutes only. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [content, listed] = await Promise.all([readContent(), readListed()]);
  // Kept for hours once it lists everything; for minutes after a failed read, so the next one comes soon.
  if (content && listed) {
    cacheLife('hours');
  } else {
    cacheLife('minutes');
  }
  return learnSitemapEntries({ content, listed });
}
