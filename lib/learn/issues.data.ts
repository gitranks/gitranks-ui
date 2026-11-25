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

/*
 * A kept read decides "not here yet" inside itself: an error that leaves a kept read reaches its caller with a new,
 * plain message in production, so the caller could no longer tell it apart. It answers null for it (kept for minutes,
 * as the API answering none is), and throws anything else, which nothing keeps.
 */

/**
 * A visitor's five, kept for minutes; null when the API answers none or does not know the read yet. A project's view
 * names its repository or its organisation (`repo`, `org`).
 */
export async function publicIssuesCached(
  lesson: string | null,
  course: string | null,
  language: string | null,
  repo: string | null = null,
  org: string | null = null,
): Promise<IssuesListPublic | null> {
  'use cache';
  cacheLife('minutes');
  try {
    const { list } = await graphqlDirect(
      IssuesListPublicDocument,
      { input: { lesson, course, language, repo, org } },
      { source: 'ssr' },
    );
    return issuesListPublicOf(list);
  } catch (failure) {
    if (!isNotHereYet(failure)) throw failure;
    return null;
  }
}

/** A visitor's five for the view; any failure that leaves the kept read is a real one. */
export async function loadIssuesListPublic(view: IssuesView): Promise<IssuesRead<IssuesListPublic>> {
  const { lesson, course, language, repo, org } = issuesPublicInputOf(view);
  try {
    const list = await publicIssuesCached(lesson, course, language, repo, org);
    return list ? { kind: 'ok', data: list } : { kind: 'unavailable' };
  } catch {
    return { kind: 'failed' };
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

/**
 * A page of merged fixes, kept for minutes under the fixes' tag, which a new merged fix expires; null when the API
 * answers none or does not know the read yet. A project's view names its repository or its organisation.
 */
export async function fixesCached(
  lesson: string | null,
  course: string | null,
  language: string | null,
  after: string | null,
  repo: string | null = null,
  org: string | null = null,
): Promise<LearnFixes | null> {
  'use cache';
  cacheTag(LEARN_FIXES_TAG);
  cacheLife('minutes');
  let learnFixes: LearnFixes | null | undefined;
  try {
    ({ learnFixes } = await graphqlDirect(
      LearnFixesDocument,
      { input: { lesson, course, language, repo, org, after } },
      { source: 'ssr' },
    ));
  } catch (failure) {
    if (!isNotHereYet(failure)) throw failure;
    return null;
  }
  if (!learnFixes || !Array.isArray(learnFixes.rows)) return null;
  return {
    rows: learnFixes.rows,
    total: Math.max(learnFixes.total ?? 0, learnFixes.rows.length),
    next: learnFixes.next ?? null,
  };
}

/**
 * The merged fixes of a view, from `after` (a page's cursor) or from the newest; any failure that leaves the kept read
 * is a real one.
 */
export async function loadLearnFixes(view: IssuesView, after: string | null = null): Promise<IssuesRead<LearnFixes>> {
  const { lesson, course, language, repo, org } = issuesPublicInputOf(view);
  try {
    const fixes = await fixesCached(lesson, course, language, after, repo, org);
    return fixes ? { kind: 'ok', data: fixes } : { kind: 'unavailable' };
  } catch {
    return { kind: 'failed' };
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

/**
 * Whether a lesson or a course has a listed merged fix: what indexes its view. Read as `loadLearnFixes` reads the
 * first ten of its bare view, with the same six arguments, so the page and its metadata share one kept read. Null
 * when it could not be read.
 */
export async function hasMergedFixOf(at: 'lesson' | 'course', slug: string): Promise<boolean | null> {
  const lesson = at === 'lesson' ? slug : null;
  const course = at === 'course' ? slug : null;
  try {
    const fixes = await fixesCached(lesson, course, null, null, null, null);
    return fixes ? fixes.total > 0 : null;
  } catch {
    return null;
  }
}
