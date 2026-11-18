import type { LearnStartConnection } from '../learn-start';
import type { LearnStartAttempt, LearnStartIssue, LearnStartIssueRow, LearnStartView } from '../learn-start.types';

/** The issue the start page's fixtures are for. */
export const START_REPO = 'driftwood-js/driftwood';
export const START_NUMBER = 934;
export const START_PATH = `/learn/start/${START_REPO}/${START_NUMBER}`;

export const startIssue: LearnStartIssueRow = {
  issueId: 'I_kwDOdrift934',
  url: `https://github.com/${START_REPO}/issues/${START_NUMBER}`,
  repo: START_REPO,
  number: START_NUMBER,
  title: 'Route params lose their type after a redirect',
  language: 'TypeScript',
  size: 'S',
  why: 'A small fix in the router your goal is about',
};

/** The API's answer, an issue that can be started unless `patch` says otherwise. */
export const startViewOf = (
  patch: Partial<LearnStartIssue> = {},
  extra: Partial<Omit<LearnStartView, 'start'>> = {},
): LearnStartView => ({
  start: {
    repo: START_REPO,
    number: START_NUMBER,
    issue: startIssue,
    refusal: null,
    limit: null,
    attempt: null,
    ...patch,
  },
  current: null,
  openPrs: null,
  ...extra,
});

/** The viewer's own attempt on the issue, taken as a regular fix. */
export const fixAttemptOf = (state: LearnStartAttempt['state'] = 'RUNNING'): LearnStartAttempt => ({
  id: 'A_9',
  mode: 'FIX',
  state,
});

export const startViews = {
  open: startViewOf(),
  /** GitHub's title could not be read: the page goes on with `owner/repo#n`. */
  untitled: startViewOf({ issue: null }),
  unavailable: startViewOf({ issue: null, refusal: 'UNAVAILABLE' }),
  taken: startViewOf({ refusal: 'TAKEN' }),
  closed: startViewOf({ refusal: 'CLOSED' }),
  limitPrs: startViewOf({ refusal: 'LIMIT_REACHED', limit: 'open_prs_at_a_time' }, { openPrs: 2 }),
  limitAttempts: startViewOf({ refusal: 'LIMIT_REACHED', limit: 'attempts_at_a_time' }),
  ownInProgress: startViewOf(
    { refusal: 'OWN_IN_PROGRESS' },
    {
      current: {
        attemptId: 'A_3',
        repo: 'fern-lang/fern',
        issueNumber: 212,
        title: 'Keep trailing comments when formatting match arms',
      },
    },
  ),
  paused: startViewOf({ refusal: 'ACCOUNT_PAUSED' }),
  daily: startViewOf({ refusal: 'DAILY_LIMIT' }),
  repoUnavailable: startViewOf({ refusal: 'REPO_UNAVAILABLE' }),
  yoursFix: startViewOf({ refusal: 'YOURS', attempt: fixAttemptOf('RUNNING') }),
  yoursLesson: startViewOf({ refusal: 'YOURS', attempt: { id: 'A_7', mode: 'LEARN', state: 'RUNNING' } }),
} satisfies Record<string, LearnStartView>;

/** Claude Code, which last called a minute before the catalogue's clock. */
export const startConnection: LearnStartConnection = { client: 'claude-code', lastCallAt: '2026-10-28T11:59:00.000Z' };

/** What the page's lesson is written for, as `learnGoalLabelOf` words the saved TypeScript goal. */
export const START_GOAL = 'TypeScript, Some';
