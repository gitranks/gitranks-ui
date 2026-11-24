import 'server-only';

import type { LearnFixes } from './issues';
import { fixesCached } from './issues.data';
import { isContentSlug } from './paths';
import {
  type HomeReal,
  homeIssuesEmailOf,
  homeRealOf,
  type LessonRealMine,
  lessonRealOf,
  NO_LESSON_REAL,
  realRowsOf,
} from './real-issues';
import {
  CourseOpenIssuesDocument,
  HomeFixesDocument,
  HomeIssuesDocument,
  HomeMergedDocument,
  LessonRealDocument,
  RealIssuesListDocument,
} from './real-issues.documents';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { loadMaskedListReads } from '@/lib/workspace/masked-issue.data';

/*
 * Real issues on Learn's pages, read apart from each page's own read. The merged fixes are the same for everyone and
 * kept for minutes (`fixesCached`, which decides "not here yet" inside itself); the person's parts are read for them
 * alone and never kept. Every read here answers null (or nothing) on any failure, an API that does not know it yet
 * among them, so the page draws what it drew before.
 */

/** Merged fixes made with Learn, newest first, for a lesson, a course or all; null when there are none to read. */
export async function loadMergedFixes(
  scope: { lesson?: string | null; course?: string | null } = {},
): Promise<LearnFixes | null> {
  const lesson = scope.lesson ?? null;
  const course = scope.course ?? null;
  if ((lesson && !isContentSlug(lesson)) || (course && !isContentSlug(course))) return null;
  try {
    return await fixesCached(lesson, course, null, null);
  } catch {
    return null;
  }
}

const quietly = <T>(read: Promise<T>): Promise<T | null> => read.catch(() => null);

/**
 * What "In the real world" adds for a signed-in person: the lesson's personal side (their fix, the first issue of their
 * list for it), the masked rows of their list for the lesson with what the rows need, and the lesson's merged fixes,
 * handed on only once one of the person's reads says Learn is open to them.
 */
export async function loadLessonRealMine(slug: string, githubLogin: string): Promise<LessonRealMine> {
  if (!isContentSlug(slug)) return NO_LESSON_REAL;
  const as = { source: 'ssr' as const, githubLogin };
  const [mine, list] = await Promise.all([
    quietly(graphqlDirect(LessonRealDocument, { slug }, as)),
    quietly(graphqlDirect(RealIssuesListDocument, { lesson: slug, course: null }, as)),
  ]);
  const real = lessonRealOf(mine?.learnLessonMine);
  const rows = realRowsOf(list?.learnQueue);
  if (!real && !rows) return NO_LESSON_REAL;
  const [reads, fixes] = await Promise.all([
    rows?.length ? loadMaskedListReads().catch(() => null) : null,
    loadMergedFixes({ lesson: slug }),
  ]);
  return { real, rows, reads, fixes };
}

/**
 * What Learn home adds: its third box and its "Real issues" rows; nothing when no read answers. The merged fix is a
 * read of its own: an API without it (or any failure of it) leaves the box as the other two reads make it.
 */
export async function loadHomeReal(githubLogin: string): Promise<HomeReal> {
  const as = { source: 'ssr' as const, githubLogin };
  const [issues, fixes, merged] = await Promise.all([
    quietly(graphqlDirect(HomeIssuesDocument, undefined, as)),
    quietly(graphqlDirect(HomeFixesDocument, undefined, as)),
    quietly(graphqlDirect(HomeMergedDocument, undefined, as)),
  ]);
  return homeRealOf(issues?.learnHome, fixes?.learnHome, merged?.learnHome);
}

/** Learn home's list email, read again while the person has no address; null on any failure. */
export async function loadHomeIssuesEmail(
  githubLogin: string,
): Promise<{ emailOn: boolean; emailTo: string | null } | null> {
  const read = await quietly(graphqlDirect(HomeIssuesDocument, undefined, { source: 'ssr', githubLogin }));
  return homeIssuesEmailOf(read?.learnHome);
}

/** A course's open issues of the person's list, for lessons of the course; null for none, and on any failure. */
export async function loadCourseOpenIssues(slug: string, githubLogin: string): Promise<number | null> {
  if (!isContentSlug(slug)) return null;
  try {
    const { learnCourseMine } = await graphqlDirect(CourseOpenIssuesDocument, { slug }, { source: 'ssr', githubLogin });
    const count = learnCourseMine?.openIssues;
    return typeof count === 'number' && Number.isFinite(count) && count > 0 ? Math.floor(count) : null;
  } catch {
    return null;
  }
}
