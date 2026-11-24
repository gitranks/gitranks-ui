import type { MaskedIssue } from '@/lib/workspace/masked-issue.types';

/**
 * The top of a learner's own list of issues ("For you" on), as the owner's box on their profile shows it. A row is
 * masked, with "See the full issue", unless the learner named its project: then it is named, with its link and title.
 */

/** How many rows the owner's box shows. */
export const LEARN_QUEUE_TOP = 3;

/** A row of the list as the API answers it: the masked issue, and the full one only where the learner named it. */
export type LearnQueueTopAnswer = {
  issue: MaskedIssue;
  full: { repo: string; number: number; url: string; title: string } | null;
};

/** A row as the browser gets it: masked, or named with what names it. */
export type LearnQueueTopRow =
  | { kind: 'masked'; masked: MaskedIssue }
  | { kind: 'named'; repo: string; number: number; url: string; title: string; language: string | null };

/** A row as the route hands it on: a masked one carries only its masked form. */
export function learnQueueTopRowOf(row: LearnQueueTopAnswer): LearnQueueTopRow {
  if (!row.full) return { kind: 'masked', masked: row.issue };
  const { repo, number, url, title } = row.full;
  return { kind: 'named', repo, number, url, title, language: row.issue.language };
}

/** The first rows of the list, each as `learnQueueTopRowOf` hands it on. */
export const learnQueueTopOf = (rows: readonly LearnQueueTopAnswer[]): LearnQueueTopRow[] =>
  rows.slice(0, LEARN_QUEUE_TOP).map(learnQueueTopRowOf);
