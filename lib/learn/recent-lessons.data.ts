import 'server-only';

import { cacheLife } from 'next/cache';

import type { PublicLesson } from './learn.types';
import { readPublicLessons } from './public-lessons.data';

/** How many of the newest public lessons Learn's front door lists. */
export const LEARN_RECENT_LESSONS = 6;

/**
 * The newest public lessons whose page is open, for Learn's front door: cached for an hour, or for minutes when the API
 * did not answer (then none, and the front door leaves the list out).
 */
export async function readRecentLessons(): Promise<PublicLesson[]> {
  'use cache';
  const lessons = await readPublicLessons();
  if (lessons) {
    cacheLife('hours');
  } else {
    cacheLife('minutes');
  }
  return (lessons ?? []).slice(0, LEARN_RECENT_LESSONS);
}
