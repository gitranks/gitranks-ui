import type {
  LearnIssue,
  LearnIssues,
  MyLearnAttempt,
  MyLearnAttempts,
  PracticeLesson,
  PracticeLessons,
  PracticeNext,
} from '../learn.types';

const issue = (repo: string, number: number, title: string, size: string, why: string): LearnIssue => ({
  issueId: `I_${repo.replace(/\W/g, '_')}_${number}`,
  url: `https://github.com/${repo}/issues/${number}`,
  repo,
  number,
  title,
  language: 'TypeScript',
  size,
  why,
});

/** Four open TypeScript issues, as Learn home lists them for the goal. */
export const ISSUES: LearnIssue[] = [
  issue(
    'driftwood-js/driftwood',
    934,
    'Route params lose their type after a redirect',
    'S',
    'you want to learn TypeScript, and it has a clear reproduction',
  ),
  issue(
    'tidewave/tide',
    958,
    'Dark mode toggle flashes on first load',
    'S',
    'a small fix in one component, and the maintainers welcome first pull requests',
  ),
  issue(
    'calendarist/cal',
    102,
    'Week starts on Sunday for en-GB',
    'M',
    'the fix stays in one module, and a test shows the bug',
  ),
  issue(
    'hearth/hearth-api',
    341,
    'Pagination skips a row after a delete',
    'M',
    'you want to learn TypeScript, and the issue says where the bug is',
  ),
];

/** The issues for a TypeScript goal at level Some. */
export const learnIssues = (patch: Partial<LearnIssues> = {}): LearnIssues => ({
  goal: { kind: 'language', value: 'TypeScript', level: 'Some' },
  items: ISSUES,
  total: ISSUES.length,
  empty: null,
  capReached: false,
  room: null,
  ...patch,
});

/** Each way the list can be empty, and no room for a new lesson. */
export const emptyIssues = {
  noneToday: learnIssues({ items: [], total: 0, empty: 'NONE_TODAY' }),
  unsupported: learnIssues({
    goal: { kind: 'language', value: 'C++', level: 'Some' },
    items: [],
    total: 0,
    empty: 'GOAL_UNSUPPORTED',
  }),
  cap: learnIssues({ items: [], total: 6, empty: 'CAP', capReached: true }),
  unread: learnIssues({ items: [], total: 6, empty: 'UNREAD' }),
  noRoom: learnIssues({ room: { limit: 'open_prs_at_a_time', value: 2 } }),
};

const practice = (patch: Partial<PracticeLesson> & Pick<PracticeLesson, 'slug' | 'title'>): PracticeLesson => ({
  repo: 'driftwood-js/driftwood',
  issue: 871,
  issueTitle: 'Nested layouts re-render on every navigation',
  language: 'TypeScript',
  author: { login: 'octocat', agentName: 'Claude Code', agentFamily: 'Opus' },
  writtenFor: { kind: 'language', value: 'TypeScript', level: 'Some' },
  publishedAt: '2026-10-14T10:00:00.000Z',
  passes: 14,
  topics: ['Cache keys', 'Path normalisation'],
  steps: 5,
  minutes: 10,
  ...patch,
});

/** Three of seven practice lessons for TypeScript, as Learn home shows them first. */
export const PRACTICE: PracticeLesson[] = [
  practice({ slug: 'route-cache-miss-8f3k', title: 'Why nested layouts rebuilt on every navigation' }),
  practice({
    slug: 'sydney-dates-7qp2',
    title: 'Why event dates moved by a day in Sydney',
    repo: 'calendarist/cal',
    issue: 77,
    issueTitle: 'Event dates off by one in UTC+10',
    author: { login: 'ana-r', agentName: 'Claude Code', agentFamily: 'Opus' },
    writtenFor: { kind: 'language', value: 'TypeScript', level: 'Comfortable' },
    publishedAt: '2026-10-09T10:00:00.000Z',
    passes: 21,
    topics: ['Time zones', 'Date parsing'],
    steps: 6,
    minutes: 13,
  }),
  practice({
    slug: 'form-reset-errors-5hn8',
    title: 'Why the form kept its old errors after a reset',
    repo: 'formwise/formwise',
    issue: 56,
    issueTitle: 'Errors persist after reset()',
    author: { login: 'kai-l', agentName: 'Claude Code', agentFamily: 'Sonnet' },
    writtenFor: { kind: 'language', value: 'TypeScript', level: 'New to it' },
    publishedAt: '2026-10-11T10:00:00.000Z',
    passes: 5,
    topics: ['State resets', 'Object identity'],
    steps: 4,
    minutes: 8,
  }),
];

export const practiceLessons = (patch: Partial<PracticeLessons> = {}): PracticeLessons => ({
  items: PRACTICE,
  total: 7,
  ...patch,
});

/** The viewer's own Learn attempt on driftwood-js/driftwood#934, at a stage. */
export const myAttempt = (patch: Partial<MyLearnAttempt> = {}): MyLearnAttempt => ({
  attemptId: 'A_1',
  stage: 'AGENT_WORKING',
  state: 'RUNNING',
  repo: 'driftwood-js/driftwood',
  issueNumber: 934,
  issueUrl: 'https://github.com/driftwood-js/driftwood/issues/934',
  title: 'Route params lose their type after a redirect',
  latestEvent: { state: 'RUNNING', detail: 'claimed', at: '2026-10-28T11:56:00.000Z' },
  prUrl: null,
  prOpenedAt: null,
  prState: null,
  resultUrl: null,
  ...patch,
});

const opened = (patch: Partial<MyLearnAttempt>): MyLearnAttempt =>
  myAttempt({
    stage: 'PR_OPEN',
    state: 'PR_OPEN',
    prUrl: 'https://github.com/driftwood-js/driftwood/pull/961',
    prOpenedAt: '2026-10-27T15:00:00.000Z',
    prState: 'OPEN',
    resultUrl: 'https://gitranks.com/learn/lessons/route-params-redirect-k2p9/passes/octocat',
    ...patch,
  });

/** The viewer's own lesson in each state Learn home words apart. */
export const myLearnAttempts: Record<
  'none' | 'working' | 'noTitle' | 'ready' | 'blocked' | 'approve' | 'submitting' | 'prOpen' | 'merged' | 'closed',
  MyLearnAttempts
> = {
  none: { current: null, lastPullRequest: null },
  working: { current: myAttempt(), lastPullRequest: null },
  noTitle: { current: myAttempt({ title: null, latestEvent: null }), lastPullRequest: null },
  ready: { current: myAttempt({ stage: 'WARMUP', state: 'REVIEW' }), lastPullRequest: null },
  blocked: { current: myAttempt({ stage: 'BLOCKED', state: 'REVIEW' }), lastPullRequest: null },
  approve: { current: myAttempt({ stage: 'READY_TO_APPROVE', state: 'REVIEW' }), lastPullRequest: null },
  submitting: { current: myAttempt({ stage: 'READY_TO_APPROVE', state: 'SUBMITTING' }), lastPullRequest: null },
  prOpen: { current: null, lastPullRequest: opened({}) },
  merged: { current: null, lastPullRequest: opened({ state: 'MERGED', prState: 'MERGED' }) },
  closed: { current: null, lastPullRequest: opened({ state: 'CLOSED', prState: 'CLOSED' }) },
};

/** What a passed practice lesson, and Goal and level once saved, offer next. */
export const practiceNext: Record<'own' | 'back' | 'noGoal' | 'unsupported' | 'unread', PracticeNext> = {
  own: { current: null, issues: learnIssues({ items: ISSUES.slice(0, 2) }) },
  back: { current: myAttempt(), issues: null },
  noGoal: { current: null, issues: learnIssues({ goal: null, items: [], total: 0 }) },
  unsupported: { current: null, issues: emptyIssues.unsupported },
  unread: { current: null, issues: null },
};
