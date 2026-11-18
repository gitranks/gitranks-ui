import 'server-only';

import { PublicLessonsDocument } from './learn.documents';
import type { PublicLesson } from './learn.types';
import { lessonSlugOf } from './learn-path';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/**
 * Every public lesson whose page is open, newest published first, as anyone reads it (no viewer is sent); null when the
 * API did not answer, so a caller can keep its answer short-lived. A row whose slug is not a slug is left out.
 */
export async function readPublicLessons(): Promise<PublicLesson[] | null> {
  try {
    const { publicLessons } = await graphqlDirect(PublicLessonsDocument, {}, { source: 'ssr' });
    return publicLessons.filter((lesson) => lessonSlugOf(lesson.slug) !== null);
  } catch {
    return null;
  }
}
