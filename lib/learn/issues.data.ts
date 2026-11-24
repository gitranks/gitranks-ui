import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { loadLearnCourse } from './course.data';
import {
  type IssuesList,
  type IssuesListPublic,
  type IssuesNames,
  type IssuesView,
  issuesInputOf,
  issuesListOf,
  issuesListPublicOf,
  issuesPublicInputOf,
  type LearnFixes,
} from './issues';
import { IssuesListDocument, IssuesListPublicDocument, LearnFixesDocument } from './issues.documents';
import { loadLearnLessonPage } from './lesson-page.data';
import { LEARN_FIXES_TAG } from './paths';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { contributeErrorOf } from '@/lib/workspace/errors';

/*
 * Issues in two layers. A visitor's five and the merged fixes are the same for everyone, read with no session and kept
 * for minutes; the person's five are read for them alone, in the browser through their route, and never kept.
 *
 * Each read answers `unavailable` when the API answers none or does not know the read yet (an older API), so the page
 * shows that it is not here yet instead of breaking.
 */

/** A read of Issues: its answer, the API answering none or not knowing it, or a failure. */
export type IssuesRead<T> = { kind: 'ok'; data: T } | { kind: 'unavailable' } | { kind: 'failed' };

/** A failure the API means as "not here": a read or a field it does not know yet. */
const isNotHereYet = (failure: unknown) => contributeErrorOf(failure).error === 'NOT_AVAILABLE_YET';

/** A visitor's five, kept for minutes; null when the API answers none. A failure throws, and nothing is kept. */
async function publicIssuesCached(lesson: string | null, course: string | null, language: string | null) {
  'use cache';
  cacheLife('minutes');
  const { list } = await graphqlDirect(
    IssuesListPublicDocument,
    { input: { lesson, course, language } },
    { source: 'ssr' },
  );
  return issuesListPublicOf(list);
}

/** A visitor's five for the view. */
export async function loadIssuesListPublic(view: IssuesView): Promise<IssuesRead<IssuesListPublic>> {
  const { lesson, course, language } = issuesPublicInputOf(view);
  try {
    const list = await publicIssuesCached(lesson, course, language);
    return list ? { kind: 'ok', data: list } : { kind: 'unavailable' };
  } catch (failure) {
    return isNotHereYet(failure) ? { kind: 'unavailable' } : { kind: 'failed' };
  }
}

/**
 * The person's five by the switches and the view, read as the Issues page reads it (`issuesPage`: they are looking at
 * Issues, which holds back "A new issue for you" for a while). Never kept.
 */
export async function loadIssuesList(githubLogin: string, view: IssuesView): Promise<IssuesRead<IssuesList>> {
  try {
    const answer = await graphqlDirect(
      IssuesListDocument,
      { input: issuesInputOf(view), issuesPage: true },
      { source: 'ssr', githubLogin },
    );
    const list = issuesListOf(answer.list);
    return list ? { kind: 'ok', data: list } : { kind: 'unavailable' };
  } catch (failure) {
    return isNotHereYet(failure) ? { kind: 'unavailable' } : { kind: 'failed' };
  }
}

/** A page of merged fixes, kept for minutes under the fixes' tag, which a new merged fix expires. */
async function fixesCached(
  lesson: string | null,
  course: string | null,
  language: string | null,
  after: string | null,
): Promise<LearnFixes | null> {
  'use cache';
  cacheTag(LEARN_FIXES_TAG);
  cacheLife('minutes');
  const { learnFixes } = await graphqlDirect(
    LearnFixesDocument,
    { input: { lesson, course, language, after } },
    { source: 'ssr' },
  );
  if (!learnFixes || !Array.isArray(learnFixes.rows)) return null;
  return {
    rows: learnFixes.rows,
    total: Math.max(learnFixes.total ?? 0, learnFixes.rows.length),
    next: learnFixes.next ?? null,
  };
}

/** The merged fixes of a view, from `after` (a page's cursor) or from the newest. */
export async function loadLearnFixes(view: IssuesView, after: string | null = null): Promise<IssuesRead<LearnFixes>> {
  const { lesson, course, language } = issuesPublicInputOf(view);
  try {
    const fixes = await fixesCached(lesson, course, language, after);
    return fixes ? { kind: 'ok', data: fixes } : { kind: 'unavailable' };
  } catch (failure) {
    return isNotHereYet(failure) ? { kind: 'unavailable' } : { kind: 'failed' };
  }
}

/** The names the chips show: the lesson's and the course's, from the content; none when they cannot be read. */
export async function issuesNamesOf(view: IssuesView): Promise<IssuesNames> {
  const [lesson, course] = await Promise.all([
    view.lesson ? loadLearnLessonPage(view.lesson).catch(() => null) : null,
    view.course ? loadLearnCourse(view.course).catch(() => null) : null,
  ]);
  return { lesson: lesson?.lesson.title ?? null, course: course?.name ?? null };
}
