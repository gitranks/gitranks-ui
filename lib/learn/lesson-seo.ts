import type { Metadata } from 'next';

import type { LessonHead, LessonVisibility } from './learn.types';
import { lessonPath, lessonResultPath } from './learn-path';
import { type LessonPageAnswer, type LessonResultAnswer, resultFiguresOf, stubTextOf } from './lesson-public';
import { clipText } from '@/lib/seo/clip-text';
import { pageMetadata } from '@/lib/seo/page-metadata';

const NO_INDEX = { index: false, follow: false } as const;

/** A closed lesson's link, or one with nothing behind it: its stub's words, never kept by search engines. */
const stubMetadata = (visibility: LessonVisibility | null): Metadata => ({
  title: visibility ? stubTextOf(visibility).title : 'Lesson not found',
  robots: NO_INDEX,
});

/** "the fix for driftwood-js/driftwood issue #871" */
function fixOf(head: Pick<LessonHead, 'subject'>): string {
  const { repo, issue } = head.subject;
  if (repo && issue) return `the fix for ${repo} issue #${issue}`;
  return repo ? `a fix in ${repo}` : 'a fix';
}

/** A shared lesson's title, description and link preview; a stub's title, not indexed. */
export function lessonPageMetadata(answer: LessonPageAnswer): Metadata {
  if (answer?.kind !== 'found') return stubMetadata(answer?.visibility ?? null);
  const { head, steps } = answer.value;
  const description = clipText(
    `A short lesson on ${fixOf(head)}, written by ${head.author.agentName}: ${steps.length} steps with a question each. Read it, then sign in with GitHub to take it. Made with GitRanks Learn.`,
    158,
  );
  const path = lessonPath(head.slug);
  return head.publishedAt
    ? pageMetadata({ title: head.title, description, path, openGraphType: 'article', publishedTime: head.publishedAt })
    : pageMetadata({ title: head.title, description, path });
}

/** A result page's title, description and link preview, at the account's current login; a stub's title, not indexed. */
export function lessonResultMetadata(answer: LessonResultAnswer): Metadata {
  if (answer?.kind !== 'found') return stubMetadata(answer?.visibility ?? null);
  const result = answer.value;
  const figures = resultFiguresOf(result);
  const description = clipText(
    `${result.login} took a short lesson on ${fixOf(result.head)} and passed it: ${figures.passed} of ${figures.total} steps, ${figures.knew} known before, ${figures.firstTry} first try. A record of GitRanks Learn.`,
    158,
  );
  return pageMetadata({
    title: `${result.login} passed “${result.head.title}”`,
    description,
    path: lessonResultPath(result.head.slug, result.login),
    openGraphType: 'article',
    publishedTime: result.passedAt,
  });
}
