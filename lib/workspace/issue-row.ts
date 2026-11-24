import type { Route } from 'next';

import type { ContributeIssue, ContributeIssueRepoRules, ContributeIssueSize } from './contribute.types';
import { type ContributeActionResult, contributeErrorMessage } from './errors';
import { GOOD_FIRST_LABEL, LANGUAGES, SIZES } from './format';
import type { MaskedIssue } from './masked-issue.types';
import { startPath } from './paths';

/**
 * One issue row, the same on both front tabs: what it shows of the issue, and what its Start does. A Contribute row
 * starts a fix (on the hosted agent, or on the Start page); a Learn row starts a lesson, always on the person's own
 * agent.
 */

/** Which list a row is in. */
export type IssueRowSide = 'contribute' | 'learn';

/** The issue as a row shows it, whichever list read it. */
export type IssueRowIssue = {
  issueId: string;
  /** `owner/name`. */
  repo: string;
  number: number;
  title: string | null;
  /** The language's name, as people write it ("TypeScript"). */
  language: string | null;
  size: ContributeIssueSize | null;
  /** One line on why it was picked. */
  why: string | null;
  labels: string[];
  /** Contribute's rows: kept for first-time contributors, and its repo's rules (null: not known). */
  forNewcomers?: boolean;
  repoRules?: ContributeIssueRepoRules | null;
  /** The issue masked, when the list sends it so: the row then shows this alone. */
  masked?: MaskedIssue | null;
};

/** A Contribute issue as a row shows it. */
export const issueRowOfContribute = (issue: ContributeIssue): IssueRowIssue => ({
  issueId: issue.issueId,
  repo: issue.nameWithOwner,
  number: issue.number,
  title: issue.title,
  language: issue.language ? LANGUAGES[issue.language] : null,
  size: issue.size,
  why: issue.why,
  labels: issue.labels,
  forNewcomers: issue.forNewcomers,
  repoRules: issue.repoRules,
});

/** "Size small", "Size medium", "Size large"; null where not known. */
export const sizeTextOf = (size: ContributeIssueSize | null) => (size ? `Size ${SIZES[size].toLowerCase()}` : null);

/** The one GitHub label shown: a beginner-friendly one where there is one, else the first. */
export const labelOf = (labels: readonly string[]) => labels.find((label) => GOOD_FIRST_LABEL.test(label)) ?? labels[0];

/** The agents connected now, as the workspace's gate reads them. */
export type ConnectedAgents = { hosted: boolean; own: boolean };

/**
 * What a row's Start is:
 * - `hosted`: a button that starts the hosted agent now;
 * - `link`: a link to the Start page (Fix it, or a lesson);
 * - `menu`: Start with a chevron, the hosted agent and the person's own agent (both connected).
 * A Contribute row with nothing connected now links the Start page, whose first step connects the own agent. A Learn
 * row is always a link: Learn runs on the person's own agent only.
 */
export type StartControlKind =
  | { kind: 'hosted'; label: 'Start' }
  | { kind: 'link'; label: 'Start' | 'Start a lesson'; href: Route }
  | { kind: 'menu'; label: 'Start'; ownHref: Route };

export function startControlOf(
  side: IssueRowSide,
  ref: { repo: string; issue: number },
  agents: ConnectedAgents,
  startHref?: Route,
): StartControlKind {
  if (side === 'learn')
    return { kind: 'link', label: 'Start a lesson', href: startHref ?? startPath(ref, { lesson: true }) };
  const own = startPath(ref);
  if (agents.hosted && agents.own) return { kind: 'menu', label: 'Start', ownHref: own };
  if (agents.hosted) return { kind: 'hosted', label: 'Start' };
  return { kind: 'link', label: 'Start', href: own };
}

/**
 * What a Skip's answer does to its row: skipped; taken meanwhile (no error to show, the row turns taken and leaves);
 * or failed, with the message its dialog shows.
 */
export function skipOutcomeOf(
  result: ContributeActionResult<boolean>,
): { kind: 'skipped' } | { kind: 'taken' } | { kind: 'failed'; message: string } {
  if (result.ok) return { kind: 'skipped' };
  if (result.error === 'ISSUE_TAKEN') return { kind: 'taken' };
  return { kind: 'failed', message: contributeErrorMessage(result.error, result.message) };
}
