import type { ContributeAttemptState } from './contribute.types';

/** A hosted start of one issue the person chose (`startContributeIssue`), as the API answers it. */

/** Why the hosted agent can't start the issue now: the first check that refuses it, in the API's order. */
export type IssueStartRefusal =
  | 'ACCOUNT_PAUSED'
  | 'NO_KEY'
  | 'KEY_INVALID'
  | 'KEY_WAITING'
  | 'AGENT_BUSY'
  | 'CLAIM_PENDING'
  | 'LIMIT_REACHED'
  | 'BUDGET'
  | 'PLATFORM_FULL'
  | 'TRY_LATER'
  | 'DAILY_LIMIT'
  | 'UNAVAILABLE'
  | 'REPO_UNAVAILABLE'
  | 'TAKEN'
  | 'CLOSED';

/** A run and its issue: `repo` is `owner/name`. */
export type IssueStartRun = { id: string; repo: string; number: number };

export type IssueStart = {
  /** The run: the one this call started, or the viewer's live one on the issue (then `started` is false). */
  attempt: (IssueStartRun & { state: ContributeAttemptState }) | null;
  started: boolean;
  refusal: IssueStartRefusal | null;
  /** With `LIMIT_REACHED` and `AGENT_BUSY`: the limit. */
  value: number | null;
  /** With `AGENT_BUSY`, when one run holds every place: that run. */
  holder: IssueStartRun | null;
  /** With `KEY_WAITING`, `BUDGET`, `DAILY_LIMIT`, `PLATFORM_FULL`: when to try again (ISO); null: not known. */
  until: string | null;
};
