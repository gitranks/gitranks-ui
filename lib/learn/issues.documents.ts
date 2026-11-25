import { parse } from 'graphql';

import type { IssuesEmailCover, LearnFixes, LearnIssuesEmail } from './issues';
import type { LearnLessonIssuesEmail } from './lesson-issues-email';
import { MASKED_ISSUE_FIELDS } from '@/lib/workspace/masked-issue.fields';
import type DocumentNode from '@/types/typed-document-node';

/*
 * Issues: a visitor's five, the signed-in person's five with the switches, the merged fixes, and the switches of "A new
 * issue for you" and "Email me issues for my lessons". Each is its own operation, so an API that does not know one yet
 * fails that read alone.
 */

const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

/** A lesson line's fields, and a row's: the masked issue, the full one where named, its lesson and why. */
export const ISSUES_LESSON_FIELDS = 'lesson { slug title course courseName }';
const LESSON = ISSUES_LESSON_FIELDS;
export const ISSUES_ROW_FIELDS = `issue { ${MASKED_ISSUE_FIELDS} }
  full { id repo number url title labels stars agreementToSign }
  ${LESSON}
  why
  learnOnly`;

type View = {
  lesson: string | null;
  course: string | null;
  language: string | null;
  repo?: string | null;
  org?: string | null;
};

/** A visitor's five for a view, the same for everyone. */
export const IssuesListPublicDocument = doc<{ list: unknown }, { input: View }>(
  `query IssuesListPublic($input: LearnQueuePublicInput!) { list: learnQueuePublic(input: $input) { rows { ${ISSUES_ROW_FIELDS} } } }`,
);

/**
 * The person's five by the switches and the view, with the counts, the empty end and both emails' switches (on a
 * lesson's view, whether the lessons' email covers that lesson); null when Learn is not open to them. `issuesPage` is true from the Issues page alone: the read notes that they are looking.
 */
export const IssuesListDocument = doc<
  { list: unknown },
  { input: View & { forYou: boolean; learned: boolean }; issuesPage: boolean }
>(
  `query IssuesList($input: LearnQueueInput!, $issuesPage: Boolean) {
  list: learnQueue(input: $input, issuesPage: $issuesPage) {
    rows { ${ISSUES_ROW_FIELDS} }
    forYouCount learnedCount emptyEnd outsideForYou emailOn emailTo lessonIssues lessonIssuesCovered
  }
}`,
);

/** Merged fixes made with Learn for a view, newest first, ten a page. */
export const LearnFixesDocument = doc<{ learnFixes: LearnFixes | null }, { input: View & { after: string | null } }>(
  `query LearnFixes($input: LearnFixesInput!) {
  learnFixes(input: $input) {
    rows { repo issueNumber number title issueUrl url fixer ${LESSON} mergedAt language }
    total next
  }
}`,
);

/** Turns "A new issue for you" on or off; turned on, it covers the list the switches name. */
export const SetLearnIssuesEmailDocument = doc<
  { setLearnIssuesEmail: LearnIssuesEmail | null },
  { on: boolean; cover: IssuesEmailCover | null }
>(
  `mutation SetLearnIssuesEmail($on: Boolean!, $cover: LearnQueueCover) {
  setLearnIssuesEmail(on: $on, cover: $cover) { newIssues newIssuesCover }
}`,
);

/** Turns "Email me issues for my lessons" on or off; turned on with a lesson, it also adds that lesson. */
export const SetLearnLessonIssuesEmailDocument = doc<
  { setLearnLessonIssuesEmail: LearnLessonIssuesEmail | null },
  { on: boolean; lesson: string | null }
>(
  `mutation SetLearnLessonIssuesEmail($on: Boolean!, $lesson: String) {
  setLearnLessonIssuesEmail(on: $on, lesson: $lesson) { lessonIssues lessonIssuesAsked }
}`,
);
