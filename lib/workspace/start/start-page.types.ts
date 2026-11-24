import type { ContributeAttemptState, ContributeMcpToken } from '@/lib/workspace/contribute.types';
import type { LimitCounts } from '@/lib/workspace/limit-words';
import type { MaskedIssue } from '@/lib/workspace/masked-issue.types';
import type { McpClient } from '@/lib/workspace/mcp-setup';

/** The Start page for one issue, as the API answers it: `startPageIssue` and `startPageAttempt`. */

/** Fix it (the default), or with a lesson (`?lesson=1`). */
export type StartMode = 'fix' | 'lesson';

/** Why an issue can't be started now: the first check that refuses it, in the API's order. */
export type StartPageRefusal =
  /** The viewer's own live attempt on it: the page goes on to its pull request's page (in lesson mode, a Fix attempt is worded). */
  | 'YOURS'
  /** Lesson mode: another lesson of the viewer's own is in progress. */
  | 'OWN_IN_PROGRESS'
  /** GitRanks holds the account. */
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

/** An issue as the lists show it: the Start page's card and Learn's issues. */
export type StartIssueRow = {
  issueId: string;
  url: string;
  /** `owner/name`. */
  repo: string;
  number: number;
  title: string;
  /** The repository's GitHub language, as GitHub names it ("TypeScript"). */
  language: string | null;
  /** `S`, `M`, or null. */
  size: string | null;
  /** One line on why it was picked. */
  why: string | null;
  /** The issue with its details hidden, in a list; null for one the person named, absent where it is not read. */
  masked?: MaskedIssue | null;
};

/** The viewer's newest live attempt on the issue, Fix or Learn: not ended or released. */
export type StartPageAttempt = { id: string; mode: 'FIX' | 'LEARN'; state: ContributeAttemptState };

export type StartPageIssue = {
  repo: string;
  number: number;
  /** Null with `UNAVAILABLE`, or when GitHub's title could not be read: the page shows `owner/repo#n`. */
  issue: StartIssueRow | null;
  refusal: StartPageRefusal | null;
  /** With `LIMIT_REACHED`: `attempts_at_a_time` or `open_prs_at_a_time`. */
  limit: string | null;
  /** With `YOURS`. */
  attempt: StartPageAttempt | null;
};

/** The viewer's own lesson in progress, which `OWN_IN_PROGRESS` links. */
export type StartPageCurrent = { attemptId: string; repo: string | null; issueNumber: number; title: string | null };

/** The limits a `LIMIT_REACHED` names, read only then; null when not read. */
export type StartPageLimits = {
  /** Open pull requests: what the limit counts and the limit that holds. */
  openPrs: LimitCounts | null;
  /** Attempts at a time: the limit that holds. */
  attempts: number | null;
};

/** The issue's answer, and what its refusal links or counts, read only for that refusal. */
export type StartPageIssueView = {
  start: StartPageIssue;
  /** `OWN_IN_PROGRESS`: the lesson in progress; null when it could not be read. */
  current: StartPageCurrent | null;
  limits: StartPageLimits;
};

/** Step 1 done: which agent, and when it last called (null for a sign-in that has not called since). */
export type LearnStartConnection = { client: McpClient | null; lastCallAt: string | null };

/** Step 1's connect steps, while no agent has called. */
export type StartPageAgent = {
  /** Onboarded before this page: the agent's first call is then a token's first use. */
  onboarded: boolean;
  tokens: ContributeMcpToken[] | undefined;
  /** Agents sign in with GitHub: the setup leads with the sign-in. */
  signIn: boolean;
};

/** Everything the page read for the body, on the server, once. */
export type StartPageView = {
  issue: StartPageIssueView;
  /** The agent has called already: step 1 is done. Null until it has. */
  connection: LearnStartConnection | null;
  agent: StartPageAgent;
  /** Lesson mode: a connection used lately still has the tool list from before Learn opened for the account. */
  restartHint: boolean;
  /** When the server rendered the page. */
  openedAt: string;
};
