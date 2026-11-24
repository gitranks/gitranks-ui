'use cache';

import type { MetadataRoute } from 'next';
import { cacheLife } from 'next/cache';

import { loadLearnCourses, loadLearnLessons } from '@/lib/learn/course.data';
import { learnOpenToEveryone } from '@/lib/learn/learn-everyone';
import { readPublicLessons } from '@/lib/learn/public-lessons.data';
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

/**
 * Learn's public pages: see `learnSitemapEntries`. The courses and their lessons are read only while the switch that
 * opens Learn to everyone is open. A failed read lists the rest, for minutes only.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [lessons, frontDoorOpen] = await Promise.all([readPublicLessons(), learnOpenToEveryone(Date.now())]);
  const content = frontDoorOpen ? await readContent() : null;
  // Kept for hours once it lists everything and Learn is open; before that, for minutes, so opening it reaches the
  // sitemap within minutes.
  if (lessons && frontDoorOpen && content) {
    cacheLife('hours');
  } else {
    cacheLife('minutes');
  }
  return learnSitemapEntries(lessons ?? [], { frontDoorOpen, content });
}
