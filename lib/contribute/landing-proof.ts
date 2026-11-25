import type { ContributeLanguage } from '@/lib/workspace/contribute.types';
import { LANGUAGES } from '@/lib/workspace/format';
import { ISSUE_KINDS, issueKindOf } from '@/lib/workspace/masked-issue';

/*
 * The landing's proof: the newest pull requests sent through GitRanks that have a public page, each with its issue.
 * The top card shows the first; "Merged through GitRanks" lists three. Live data: never in the Markdown copy.
 */

/** A pull request that has a public page, as the landing reads it; `mergedAt` null for an open one. */
export type LandingProofPr = {
  nameWithOwner: string;
  number: number;
  url: string;
  title: string;
  openedAt: string;
  mergedAt: string | null;
  contributorLogin: string;
  /** The agent as the footer names it: "Claude Code", "GitRanks' hosted agent", "an AI agent". */
  agent: string;
  issue: {
    number: number;
    url: string;
    /** The issue's title as it was taken; null when not known (the card leaves it out). */
    title: string | null;
    /** The kind triage gave it; null when it gave none. */
    kind: string | null;
    language: ContributeLanguage | null;
  };
  change: { files: number; added: number; removed: number } | null;
};

/** A row as the API answers it (`contributeNewestMerged`): the pull request's title and its sender may be missing. */
export type ContributeMergedPrRead = Omit<LandingProofPr, 'title' | 'contributorLogin'> & {
  title: string | null;
  contributorLogin: string | null;
};

/**
 * The API's rows as the landing draws them, in its order (newest first); null when the read failed. A row without the
 * pull request's title or its sender is dropped: the card says a person reviewed it and sent it, and names them.
 */
export function landingProofPrsOf(rows: readonly ContributeMergedPrRead[] | null | undefined): LandingProofPr[] | null {
  if (!rows) return null;
  return rows.flatMap(({ title, contributorLogin, ...row }) =>
    title && contributorLogin ? [{ ...row, title, contributorLogin }] : [],
  );
}

/** What the landing draws of the proof: the top card's pull request, and the three rows. Null leaves a part out. */
export type LandingProof = { card: LandingProofPr | null; rows: LandingProofPr[] | null };

/** How many rows "Merged through GitRanks" shows, and the fewest it is drawn with. */
export const PROOF_ROWS = 3;

/**
 * The parts by what the read answered: three merged give the card and the rows; one or two give the card alone; an open
 * pull request alone (none merged) gives the card as open; none, or a failed read, gives neither.
 */
export function landingProofOf(read: readonly LandingProofPr[] | null | undefined): LandingProof {
  const prs = read ?? [];
  const merged = prs.filter((pr) => pr.mergedAt);
  if (merged.length) {
    return { card: merged[0], rows: merged.length >= PROOF_ROWS ? merged.slice(0, PROOF_ROWS) : null };
  }
  return { card: prs[0] ?? null, rows: null };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from `from` to `to`; null when either is not a time. */
function wholeDaysOf(from: string, to: string): number | null {
  const span = new Date(to).getTime() - new Date(from).getTime();
  return Number.isFinite(span) ? Math.max(0, Math.floor(span / DAY_MS)) : null;
}

/**
 * The card's line beside "Merged": "3 days after it was sent", "1 day after it was sent", "the day it was sent" (under
 * a day). Null for an open pull request, or when a time is not known.
 */
export function mergedAfterOf(pr: Pick<LandingProofPr, 'openedAt' | 'mergedAt'>): string | null {
  if (!pr.mergedAt) return null;
  const days = wholeDaysOf(pr.openedAt, pr.mergedAt);
  if (days === null) return null;
  if (days === 0) return 'the day it was sent';
  return `${days} ${days === 1 ? 'day' : 'days'} after it was sent`;
}

/** "by mira-dev with Claude Code". */
export const proofByOf = (pr: Pick<LandingProofPr, 'contributorLogin' | 'agent'>): string =>
  `by ${pr.contributorLogin} with ${pr.agent}`;

/** "30 Oct", in UTC. */
export const dayMonthOf = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** A row's last line: "Merged 30 Oct · by mira-dev with Claude Code". */
export const proofRowLineOf = (pr: LandingProofPr): string =>
  `${pr.mergedAt ? `Merged ${dayMonthOf(pr.mergedAt)}` : 'Open'} · ${proofByOf(pr)}`;

/** The issue's marks on the card, those known: its kind ("bug") and its language ("JavaScript / TypeScript"). */
export function proofIssueMarksOf(issue: LandingProofPr['issue']): string[] {
  const kind = issueKindOf(issue.kind);
  return [kind ? ISSUE_KINDS[kind].toLowerCase() : null, issue.language ? LANGUAGES[issue.language] : null].filter(
    (mark): mark is string => !!mark,
  );
}

/** "2 files", "1 file". */
export const filesOf = (files: number): string => `${files} ${files === 1 ? 'file' : 'files'}`;
