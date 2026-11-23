import 'server-only';

import { loadLearnCourse, loadLearnCourses } from './course.data';
import {
  type LearnSetupRead,
  NO_SETUP_STARTS,
  type SetupLanguage,
  type SetupStart,
  type SetupStarts,
  setupCoursesOf,
  setupReadOf,
  setupStartOf,
} from './setup';
import { LearnSetupOfMineDocument } from './setup.documents';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/*
 * Set up Learn in two layers. Where each language starts is the same for everyone, read from the cached courses. The
 * person's setup is read for them alone, in the browser through its route, and never kept.
 */

/** The person's setup: null when Learn is not open to them, and on any failure. */
export async function loadLearnSetup(githubLogin: string): Promise<LearnSetupRead | null> {
  try {
    const { learnSetupOfMine } = await graphqlDirect(LearnSetupOfMineDocument, {}, { source: 'ssr', githubLogin });
    return setupReadOf(learnSetupOfMine);
  } catch {
    return null;
  }
}

/** One course's start, from the cached course; none when it cannot be read. */
const startOf = async (slug: string): Promise<SetupStart | null> => {
  const course = await loadLearnCourse(slug).catch(() => null);
  return course ? setupStartOf(course) : null;
};

/**
 * Where each language starts, and where everyone else does: from the cached courses, the same for everyone. None on
 * failure: the save then sends the person to all courses.
 */
export async function loadSetupStarts(): Promise<SetupStarts> {
  const courses = await loadLearnCourses().catch(() => null);
  if (!courses) return NO_SETUP_STARTS;
  const { byLanguage, fallback } = setupCoursesOf(courses);
  const entries = await Promise.all(
    Object.entries(byLanguage).map(async ([language, slug]) => [language, await startOf(slug)] as const),
  );
  const starts: SetupStarts = { byLanguage: {}, fallback: fallback ? await startOf(fallback) : null };
  for (const [language, start] of entries) {
    if (start) starts.byLanguage[language as SetupLanguage] = start;
  }
  return starts;
}
