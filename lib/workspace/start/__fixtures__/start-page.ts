import type {
  LearnStartConnection,
  StartIssueRow,
  StartPageAttempt,
  StartPageIssue,
  StartPageIssueView,
  StartPageView,
} from '../start-page.types';

/** The issue the Start page's fixtures are for. */
export const START_REPO = 'driftwood-js/driftwood';
export const START_NUMBER = 934;
export const START_REF = { repo: START_REPO, issue: START_NUMBER };
export const START_PATH = `/my/start/${START_REPO}/${START_NUMBER}`;
export const LEARN_START_PATH = `/learn/start/${START_REPO}/${START_NUMBER}`;

export const startIssue: StartIssueRow = {
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
  patch: Partial<StartPageIssue> = {},
  extra: Partial<Omit<StartPageIssueView, 'start'>> = {},
): StartPageIssueView => ({
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
  limits: { openPrs: null, attempts: null },
  ...extra,
});

/** The viewer's own attempt on the issue, taken as a regular fix. */
export const fixAttemptOf = (state: StartPageAttempt['state'] = 'RUNNING'): StartPageAttempt => ({
  id: 'A_9',
  mode: 'FIX',
  state,
});

/** The viewer's own attempt on the issue, taken as a lesson. */
export const lessonAttempt: StartPageAttempt = { id: 'A_7', mode: 'LEARN', state: 'RUNNING' };

export const startViews = {
  open: startViewOf(),
  /** GitHub's title could not be read: the page goes on with `owner/repo#n`. */
  untitled: startViewOf({ issue: null }),
  unavailable: startViewOf({ issue: null, refusal: 'UNAVAILABLE' }),
  taken: startViewOf({ refusal: 'TAKEN' }),
  closed: startViewOf({ refusal: 'CLOSED' }),
  limitPrs: startViewOf(
    { refusal: 'LIMIT_REACHED', limit: 'open_prs_at_a_time' },
    { limits: { openPrs: { count: 2, limit: 2 }, attempts: null } },
  ),
  limitAttempts: startViewOf(
    { refusal: 'LIMIT_REACHED', limit: 'attempts_at_a_time' },
    { limits: { openPrs: null, attempts: 2 } },
  ),
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
  accountPaused: startViewOf({ refusal: 'ACCOUNT_PAUSED' }),
  pausedByYou: startViewOf({ refusal: 'PAUSED_BY_YOU' }),
  daily: startViewOf({ refusal: 'DAILY_LIMIT' }),
  repoUnavailable: startViewOf({ refusal: 'REPO_UNAVAILABLE' }),
  yoursFix: startViewOf({ refusal: 'YOURS', attempt: fixAttemptOf('RUNNING') }),
  yoursLesson: startViewOf({ refusal: 'YOURS', attempt: lessonAttempt }),
} satisfies Record<string, StartPageIssueView>;

/** Claude Code, which last called a minute before the catalogue's clock. */
export const startConnection: LearnStartConnection = { client: 'claude-code', lastCallAt: '2026-10-28T11:59:00.000Z' };

/** What the lesson is written for, as `learnGoalLabelOf` words the saved TypeScript goal. */
export const START_GOAL = 'TypeScript, Some';

/** The page's whole read: connected, the issue open to start, unless `patch` says otherwise. */
export const startPageViewOf = (patch: Partial<StartPageView> = {}): StartPageView => ({
  issue: startViews.open,
  connection: startConnection,
  agent: { onboarded: true, tokens: [], signIn: false },
  goal: START_GOAL,
  restartHint: false,
  openedAt: '2026-10-28T12:00:00.000Z',
  ...patch,
});
