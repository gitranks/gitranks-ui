import { parse } from 'graphql';

import type { LearnHistory, LearnMyProgress } from './my-progress';
import type DocumentNode from '@/types/typed-document-node';

/*
 * My progress's two reads, each the signed-in person's own: the page (the boxes and the courses), and a page of History.
 */

const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

const LINK = 'slug title';
const CARD = 'slug name kind covers languages lessons numbers { learners goodShare }';
const DAY = `day lessons reviews learned { ${LINK} } repeated { ${LINK} }`;

/** My progress: lessons by depth, the days of the last 26 weeks, every day counted, the courses started. */
export const LearnMyProgressDocument = doc<{ learnMyProgress: LearnMyProgress | null }>(
  `query LearnMyProgress {
    learnMyProgress {
      learned practised mastered known
      days { ${DAY} }
      activeDays
      courses { course { ${CARD} } learned practised mastered known due next { ${LINK} } finishedAt }
    }
  }`,
);

/** A page of History: the days with something done before `before` (a local date), newest first. */
export const LearnHistoryDocument = doc<{ learnHistory: LearnHistory | null }, { before: string | null }>(
  `query LearnHistory($before: String) { learnHistory(before: $before) { days { ${DAY} } more } }`,
);

/*
 * The reads of real fixes, each its own operation, apart from the two above: an API that does not know one yet fails
 * that read alone, and the page draws without it.
 */

const LESSON = 'lesson { slug title course courseName }';
const DAY_FIXES = `day
  fixesMerged { repo issueNumber number title ${LESSON} }
  walkthroughs { repo issueNumber number title fixer ${LESSON} mine }`;

/** What each day of the last 26 weeks gains from real fixes: the person's fixes merged, the walkthroughs passed. */
export const LearnMyProgressFixesDocument = doc<{ learnMyProgress: { days?: unknown } | null }>(
  `query LearnMyProgressFixes { learnMyProgress { days { ${DAY_FIXES} } } }`,
);

/** The same for a page of History. */
export const LearnHistoryFixesDocument = doc<{ learnHistory: { days?: unknown } | null }, { before: string | null }>(
  `query LearnHistoryFixes($before: String) { learnHistory(before: $before) { days { ${DAY_FIXES} } } }`,
);

/** "Your fixes": every fix of the person's made with Learn, newest first. */
export const LearnMyFixesDocument = doc<{ learnMyFixes: unknown }>(
  `query LearnMyFixes { learnMyFixes { repo issueNumber number title state ${LESSON} mastered readers at } }`,
);

/** "Walkthroughs": the walkthroughs of other people's fixes the person passed. */
export const LearnMyWalkthroughsDocument = doc<{ learnMyWalkthroughs: unknown }>(
  `query LearnMyWalkthroughs {
    learnMyWalkthroughs { fix { repo issueNumber number title fixer ${LESSON} } passedAt }
  }`,
);

/** "Your fixes" with nothing in it: the open issues that fit the person, and their list's email. */
export const LearnProgressIssuesDocument = doc<{
  learnHome: {
    thirdBox?: { openIssues?: unknown } | null;
    issues?: { emailOn?: unknown; emailTo?: unknown } | null;
  } | null;
}>('query LearnProgressIssues { learnHome { thirdBox { openIssues } issues { emailOn emailTo } } }');
