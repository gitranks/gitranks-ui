import { parse } from 'graphql';

import { ISSUES_LESSON_FIELDS, ISSUES_ROW_FIELDS } from './issues.documents';
import type { FixRefInput } from './walkthrough.documents';
import type DocumentNode from '@/types/typed-document-node';

/*
 * The public page of a fix: what "Learn from it" needs beside the timeline, the person's marks with their similar
 * issues, and the proxy's one question about the page's address. Each is its own operation, apart from the reads
 * already in use, so an API that does not know one yet fails that read alone.
 */

const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

/** What "Learn from it" needs beside the timeline, the same for everyone; null for a pull request with no public page. */
export const LearnFixPageDocument = doc<{ learnFix: unknown }, { ref: FixRefInput }>(
  `query LearnFixPage($ref: LearnFixRef!) {
    learnFix(ref: $ref) {
      repo issueNumber number state made fixer questions passes ${ISSUES_LESSON_FIELDS} answersShared title agent mergedAt
    }
  }`,
);

/** The person's marks on a fix and up to three similar issues of their list, masked; null when signed out. */
export const LearnFixMarksDocument = doc<{ learnFixMine: unknown }, { ref: FixRefInput }>(
  `query LearnFixMarks($ref: LearnFixRef!) {
    learnFixMine(ref: $ref) {
      fixer walkthroughHeld answered passedAt lesson lessonAt
      similar { issue { ${ISSUES_ROW_FIELDS} } because }
    }
  }`,
);

/**
 * Where a fix page's address leads, asked by the proxy: the address's state and spelling, how the pull request was
 * made and stands, which says whether it has a "Learn from it" view at all, and whether its public page is shown (a
 * fixer who hides it hides both views).
 */
export const LearnFixViewGateDocument = doc<
  {
    learnFixAddress: unknown;
    learnFix: { repo: string; number: number; made: string; state: string } | null;
    contributePrTimeline: { timeline: { number: number } | null } | null;
  },
  { ref: FixRefInput; owner: string; repo: string; number: number }
>(
  `query LearnFixViewGate($ref: LearnFixRef!, $owner: String!, $repo: String!, $number: Int!) {
    learnFixAddress(ref: $ref) { state owner repo number login }
    learnFix(ref: $ref) { repo number made state }
    contributePrTimeline(owner: $owner, repo: $repo, number: $number) { timeline { number } }
  }`,
);
