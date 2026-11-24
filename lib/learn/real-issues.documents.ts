import { parse } from 'graphql';

import { ISSUES_LESSON_FIELDS, ISSUES_ROW_FIELDS } from './issues.documents';
import type DocumentNode from '@/types/typed-document-node';

/*
 * The reads of real issues on Learn's pages. Each is its own operation, apart from the page's own read: an API that
 * does not know a field yet fails that read alone, and the page draws what it drew before.
 */

const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

const MY_FIX = `repo issueNumber number title state ${ISSUES_LESSON_FIELDS} at`;
const PR_ROW = `attemptId made repo issueNumber issueUrl number url title group box round mark agent costUsd
  ${ISSUES_LESSON_FIELDS} pageRemoved since`;

/** A lesson's personal side, its real issues: the person's fix that uses it, and the first issue of their list for it. */
export const LessonRealDocument = doc<{ learnLessonMine: unknown }, { slug: string }>(
  `query LessonReal($slug: String!) {
    learnLessonMine(slug: $slug) { fix { ${MY_FIX} } fixAnIssue { ${ISSUES_ROW_FIELDS} } }
  }`,
);

/** The person's list for one lesson or one course, "For you" on, as Issues shows it; null when Learn is not open to them. */
export const RealIssuesListDocument = doc<{ learnQueue: unknown }, { lesson: string | null; course: string | null }>(
  `query RealIssuesList($lesson: String, $course: String) {
    learnQueue(input: { forYou: true, learned: false, lesson: $lesson, course: $course }) { rows { ${ISSUES_ROW_FIELDS} } }
  }`,
);

/** Learn home's open issues: the count that fits the person, and the five of their list. */
export const HomeIssuesDocument = doc<{ learnHome: unknown }>(
  `query HomeIssues { learnHome { thirdBox { openIssues } issues { rows { ${ISSUES_ROW_FIELDS} } } } }`,
);

/** Learn home's fixes: the one that needs the person, and their fixes not ended. */
export const HomeFixesDocument = doc<{ learnHome: unknown }>(
  `query HomeFixes { learnHome { thirdBox { needsYou fix { ${PR_ROW} } } fixes { ${PR_ROW} } } }`,
);

/** A course's open issues of the person's list, for lessons of the course. */
export const CourseOpenIssuesDocument = doc<{ learnCourseMine: { openIssues?: unknown } | null }, { slug: string }>(
  'query CourseOpenIssues($slug: String!) { learnCourseMine(slug: $slug) { openIssues } }',
);
