import type { ContributeAttemptMode } from './learn.types';
import type { ContributeAttemptState } from '@/lib/workspace/contribute.types';

/** The start page of a lesson for one issue, as the API answers it. */

/** Why an issue can't be started now: the first check that refuses it, in the API's order. */
export type LearnStartRefusal =
  /** The viewer's own live attempt on it: a Learn attempt goes on to its lesson page, a Fix attempt is worded. */
  | 'YOURS'
  /** Another lesson of the viewer's own is in progress. */
  | 'OWN_IN_PROGRESS'
  /** The account is paused or suspended. */
  | 'ACCOUNT_PAUSED'
  /** No room for a new claim: `limit` names which. */
  | 'LIMIT_REACHED'
  /** The day's claims are taken. */
  | 'DAILY_LIMIT'
  /** Not an issue this viewer can start here; the answer says nothing more. */
  | 'UNAVAILABLE'
  /** Someone else's agent took it. */
  | 'TAKEN'
  /** Closed on GitHub meanwhile. */
  | 'CLOSED'
  /** The project can't take a pull request from us right now. */
  | 'REPO_UNAVAILABLE';

/** The limit a `LIMIT_REACHED` hit. */
export type LearnStartLimit = 'attempts_at_a_time' | 'open_prs_at_a_time';

/** An issue as Learn's lists show it. */
export type LearnStartIssueRow = {
  issueId: string;
  url: string;
  /** `owner/name`. */
  repo: string;
  number: number;
  title: string;
  /** The repository's GitHub language. */
  language: string | null;
  /** `S`, `M` or null. */
  size: string | null;
  /** One "why it was picked" line. */
  why: string | null;
};

/** The viewer's newest live attempt on the issue: not stopped, discarded, done, merged or closed. */
export type LearnStartAttempt = { id: string; mode: ContributeAttemptMode; state: ContributeAttemptState };

export type LearnStartIssue = {
  repo: string;
  number: number;
  /** Null with `UNAVAILABLE`, or when GitHub's title could not be read: the page shows `owner/repo#n`. */
  issue: LearnStartIssueRow | null;
  refusal: LearnStartRefusal | null;
  /** With `LIMIT_REACHED`; any other value is worded as the attempts' limit. */
  limit: string | null;
  /** With `YOURS`. */
  attempt: LearnStartAttempt | null;
};

/** The viewer's own lesson in progress, which `OWN_IN_PROGRESS` links. */
export type LearnStartCurrent = { attemptId: string; repo: string | null; issueNumber: number; title: string | null };

/** What the start page shows: the API's answer, and what its refusal links or counts, read only for that refusal. */
export type LearnStartView = {
  start: LearnStartIssue;
  /** `OWN_IN_PROGRESS`: the lesson in progress; null when it could not be read. */
  current: LearnStartCurrent | null;
  /** `LIMIT_REACHED` on open pull requests: how many may be open at a time; null when it could not be read. */
  openPrs: number | null;
};
