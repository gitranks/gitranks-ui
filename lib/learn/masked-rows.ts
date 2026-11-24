import type {
  LearnIssue,
  LearnIssueAnswer,
  LearnIssues,
  LearnIssuesAnswer,
  LearnPublicIssue,
  LearnPublicIssueAnswer,
  LearnPublicIssues,
  LearnPublicIssuesAnswer,
} from './learn.types';
import { maskKeyOf } from '@/lib/workspace/masked-answer';
import type { MaskedIssue } from '@/lib/workspace/masked-issue.types';

/**
 * Learn's rows as the read hands them on: a masked one keeps nothing that names its issue, whatever the API sent (no
 * link, project, number or reason), its title is the rewritten one, and it is keyed by its mask id.
 */

/** A visitor's row: stripped when masked. */
export function learnPublicIssueOf(row: LearnPublicIssueAnswer): LearnPublicIssue {
  if (!row.masked?.id) return row as LearnPublicIssue;
  return { ...row, url: '', repo: '', number: 0, title: row.masked.title, why: null };
}

/** A row for the viewer's goal: stripped and keyed by its mask id when masked. */
export function learnIssueOf(row: LearnIssueAnswer): LearnIssue {
  if (!row.masked?.id) return row as LearnIssue;
  return { ...learnPublicIssueOf(row), issueId: maskKeyOf(row.masked.id) };
}

/** The issues for the viewer's goal, each row as `learnIssueOf` hands it on. */
export const learnIssuesOf = (issues: LearnIssuesAnswer): LearnIssues => ({
  ...issues,
  items: issues.items.map(learnIssueOf),
});

/** A visitor's day list, each row as `learnPublicIssueOf` hands it on. */
export const learnPublicIssuesOf = (issues: LearnPublicIssuesAnswer | null): LearnPublicIssues | null =>
  issues ? { ...issues, items: issues.items.map(learnPublicIssueOf) } : null;

/** The row a skip's next issue takes: its masked form alone. */
export const learnIssueOfMasked = (masked: MaskedIssue): LearnIssue => ({
  issueId: maskKeyOf(masked.id),
  url: '',
  repo: '',
  number: 0,
  title: masked.title,
  language: masked.language,
  size: masked.size,
  why: null,
  masked,
});
