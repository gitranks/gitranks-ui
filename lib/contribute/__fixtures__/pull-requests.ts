import type {
  ContributeNeedsYouAnswer,
  ContributeNeedsYouFacts,
  ContributeNeedsYouItem,
  ContributeNeedsYouProgress,
  ContributePullRequestsPage,
} from '@/lib/workspace/contribute.types';

/**
 * The Pull requests tab as the API answers it (made-up repos, accounts and words): what waits on the user
 * (`contributeNeedsYou`) and a page of their pull requests (`contributeContributions`), as the boards draw them.
 */

/** Every fact empty: each item fills in the ones its kind reads. */
export const facts = (over: Partial<ContributeNeedsYouFacts> = {}): ContributeNeedsYouFacts => ({
  noRun: false,
  byHand: false,
  repoSaidNo: false,
  round: null,
  nextRound: null,
  drafts: 0,
  draftsTo: null,
  fixed: 0,
  skipped: 0,
  checkStatus: null,
  checks: [],
  agreement: null,
  ruleIssues: [],
  ruleSources: [],
  templateCheck: null,
  runOutcome: null,
  proofStage: null,
  proofBot: null,
  proofAsks: null,
  outReason: null,
  replyTrouble: null,
  replyRest: null,
  waitEndsAt: null,
  lastFour: null,
  fix: null,
  submitError: null,
  ...over,
});

export const progress = (over: Partial<ContributeNeedsYouProgress> = {}): ContributeNeedsYouProgress => ({
  startedAt: '2026-10-28T09:00:00.000Z',
  costUsd: 0.4,
  budgetUsd: 5,
  submitStep: null,
  waitUntil: null,
  leaseUntil: null,
  changesRequested: false,
  agentName: null,
  pushedSha: null,
  runStep: null,
  ...over,
});

/** One item: a Contribute pull request with changes requested, unless named otherwise. */
export const needsYouItem = (over: Partial<ContributeNeedsYouItem> = {}): ContributeNeedsYouItem => ({
  key: 'A_KELP',
  kind: 'CHANGES',
  side: 'CONTRIBUTE',
  working: false,
  more: 0,
  since: '2026-10-28T11:30:00.000Z',
  orderAt: '2026-10-28T11:30:00.000Z',
  attemptId: 'A_KELP',
  sessionAttemptId: null,
  repo: 'kelp-db/kelp',
  issueNumber: 1400,
  title: 'Add a --json flag to kelp status',
  pullRequest: { id: 'PR_1419', number: 1419, url: 'https://github.com/kelp-db/kelp/pull/1419' },
  runner: 'MANAGED_AGENTS',
  autosubmitAt: null,
  detail: null,
  action: { kind: 'PAGE', view: 'NEXT', move: null, url: null, copy: null, target: null },
  secondary: null,
  facts: facts({ nextRound: 2 }),
  progress: null,
  ...over,
});

/** The board's three: changes on a Contribute pull request, changes on a Learn one, a lesson ready. */
export const boardItems = (): ContributeNeedsYouItem[] => [
  needsYouItem(),
  needsYouItem({
    key: 'A_DRIFT',
    side: 'LEARN',
    attemptId: 'A_DRIFT',
    repo: 'driftwood-js/driftwood',
    issueNumber: 934,
    title: 'Route params lose their type after a redirect',
    pullRequest: { id: 'PR_961', number: 961, url: 'https://github.com/driftwood-js/driftwood/pull/961' },
    runner: 'MCP',
  }),
  needsYouItem({
    key: 'A_TIDE',
    kind: 'LESSON_READY',
    side: 'LEARN',
    attemptId: 'A_TIDE',
    repo: 'tidewave/tide',
    issueNumber: 958,
    title: 'Dark mode toggle flashes on first load',
    pullRequest: null,
    runner: 'MCP',
    action: { kind: 'PAGE', view: 'LESSON', move: null, url: null, copy: null, target: null },
    facts: facts(),
  }),
];

/** The board's one in progress: a hosted agent at work on a first attempt. */
export const boardInProgress = (): ContributeNeedsYouItem[] => [
  needsYouItem({
    key: 'A_871',
    kind: 'ATTEMPT_WORKING',
    working: true,
    attemptId: 'A_871',
    repo: 'driftwood-js/driftwood',
    issueNumber: 871,
    title: 'Nested layouts re-render on every navigation',
    pullRequest: null,
    action: { kind: 'PAGE', view: 'PAGE', move: null, url: null, copy: null, target: null },
    facts: facts(),
    progress: progress(),
  }),
];

export const needsYouAnswer = (over: Partial<ContributeNeedsYouAnswer> = {}): ContributeNeedsYouAnswer => {
  const items = over.items ?? boardItems();
  return { count: items.length, items, inProgress: boardInProgress(), complete: true, ...over };
};

type Row = ContributePullRequestsPage['items'][number];

const row = (over: Partial<Row> & Pick<Row, 'attemptId'>): Row => ({
  nameWithOwner: 'kelp-db/kelp',
  issueNumber: 1400,
  title: 'Add a --json flag to kelp status',
  costUsd: 3.12,
  runner: 'MANAGED_AGENTS',
  agent: null,
  openedBy: 'SUBMIT',
  mode: 'FIX',
  lesson: null,
  pullRequest: {
    prId: `PR_${over.attemptId}`,
    number: 1419,
    url: 'https://github.com/kelp-db/kelp/pull/1419',
    state: 'OPEN',
    openedAt: '2026-10-28T10:00:00.000Z',
    mergedAt: null,
    closedAt: null,
    reviewDecision: 'CHANGES_REQUESTED',
    checks: 'SUCCESS',
    syncedAt: '2026-10-28T11:30:00.000Z',
  },
  ...over,
});

const pr = (number: number, repo: string, state: 'OPEN' | 'MERGED' | 'CLOSED', opened: string, ended?: string) => ({
  prId: `PR_${number}`,
  number,
  url: `https://github.com/${repo}/pull/${number}`,
  state,
  openedAt: opened,
  mergedAt: state === 'MERGED' ? (ended ?? null) : null,
  closedAt: state === 'CLOSED' ? (ended ?? null) : null,
  reviewDecision: null,
  checks: 'SUCCESS' as const,
  syncedAt: '2026-10-28T09:00:00.000Z',
});

const lesson = (steps: number) => ({ slug: null, steps, stepsPassed: steps, visibility: 'public' });

/** The board's page: both sides, newest first, 46 in all. */
export const pullRequestsPage = (over: Partial<ContributePullRequestsPage> = {}): ContributePullRequestsPage => ({
  items: [
    row({ attemptId: 'A_KELP' }),
    row({
      attemptId: 'A_DRIFT',
      nameWithOwner: 'driftwood-js/driftwood',
      issueNumber: 934,
      title: 'Route params lose their type after a redirect',
      runner: 'MCP',
      costUsd: 0,
      mode: 'LEARN',
      lesson: lesson(5),
      pullRequest: {
        ...pr(961, 'driftwood-js/driftwood', 'OPEN', '2026-10-27T10:00:00.000Z'),
        reviewDecision: 'CHANGES_REQUESTED',
      },
    }),
    row({
      attemptId: 'A_NIMBUS',
      nameWithOwner: 'nimbus-ci/nimbus',
      issueNumber: 633,
      title: 'Retry a flaky artifact upload',
      runner: 'MCP',
      agent: { name: 'CLAUDE_CODE', model: null },
      costUsd: 0,
      pullRequest: pr(640, 'nimbus-ci/nimbus', 'OPEN', '2026-10-25T10:00:00.000Z'),
    }),
    row({
      attemptId: 'A_TIDE931',
      nameWithOwner: 'tidewave/tide',
      issueNumber: 931,
      title: 'Sidebar forgets its width after a reload',
      runner: 'MCP',
      costUsd: 0,
      mode: 'LEARN',
      lesson: lesson(6),
      pullRequest: pr(947, 'tidewave/tide', 'MERGED', '2026-10-21T10:00:00.000Z', '2026-10-23T10:00:00.000Z'),
    }),
    row({
      attemptId: 'A_FERN',
      nameWithOwner: 'fern-lang/fern',
      issueNumber: 2481,
      title: 'Keep trailing comments when formatting match arms',
      costUsd: 1.84,
      pullRequest: pr(2490, 'fern-lang/fern', 'MERGED', '2026-10-20T10:00:00.000Z', '2026-10-26T10:00:00.000Z'),
    }),
    row({
      attemptId: 'A_TERN',
      nameWithOwner: 'tern-lang/tern-fmt',
      issueNumber: 91,
      title: 'Format nested where clauses',
      costUsd: 2.9,
      pullRequest: pr(92, 'tern-lang/tern-fmt', 'CLOSED', '2026-10-10T10:00:00.000Z', '2026-10-19T10:00:00.000Z'),
    }),
  ],
  totals: {
    open: 3,
    merged: 31,
    closed: 12,
    byMode: {
      fix: { open: 2, merged: 29, closed: 11, reposHelped: 18 },
      learn: { open: 1, merged: 2, closed: 1, reposHelped: 2 },
    },
  },
  total: 46,
  ...over,
});

/** A learner's page: Learn pull requests alone. */
export const learnerPage = (): ContributePullRequestsPage => {
  const all = pullRequestsPage().items.filter(({ mode }) => mode === 'LEARN');
  return {
    items: all,
    totals: { open: 1, merged: 1, closed: 0, byMode: null },
    total: all.length,
  };
};

/** Nothing yet. */
export const emptyPage = (): ContributePullRequestsPage => ({
  items: [],
  totals: { open: 0, merged: 0, closed: 0, byMode: null },
  total: 0,
});
