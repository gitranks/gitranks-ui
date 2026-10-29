import type {
  ContributeAttempt,
  ContributeAttemptDetail,
  ContributeAttemptPullRequest,
  ContributeContributions,
  ContributeFollowUpOf,
  ContributeFollowUps,
  ContributeNeedsYou,
  ContributeReplyDraft,
} from '../contribute.types';

/** A two-commit format-patch: a changed file, a new one, and the mail headers and signature around them. */
export const PATCH = `From 3f1c2a9d0b7e Mon Sep 17 00:00:00 2001
From: Octo Cat <octocat@users.noreply.github.com>
Date: Tue, 28 Oct 2026 10:41:00 +0000
Subject: [PATCH 1/2] Normalize route paths before the layout cache lookup

---
 src/router/layout-cache.ts   | 5 +++--
 src/router/normalize-path.ts | 4 ++++
 2 files changed, 7 insertions(+), 2 deletions(-)

diff --git a/src/router/layout-cache.ts b/src/router/layout-cache.ts
index 1111111..2222222 100644
--- a/src/router/layout-cache.ts
+++ b/src/router/layout-cache.ts
@@ -40,5 +40,6 @@ export function resolveLayouts(route: Route) {
   const cache = getLayoutCache()
-  const key = route.path
-- a removed line that looks like a signature
+  const key = normalizePath(route.path)
+  const hit = cache.get(key)
+  if (hit) return hit
   return build(key)
 }
diff --git a/src/router/normalize-path.ts b/src/router/normalize-path.ts
new file mode 100644
index 0000000..3333333
--- /dev/null
+++ b/src/router/normalize-path.ts
@@ -0,0 +1,4 @@
+/** <script>alert("x")</script> & friends */
+export function normalizePath(path: string): string {
+  return path.replace(/\\/$/, '')
+}
\\ No newline at end of file
--
2.47.0

From 4a2b3c4d5e6f Mon Sep 17 00:00:00 2001
From: Octo Cat <octocat@users.noreply.github.com>
Subject: [PATCH 2/2] Add a test

---
diff --git a/test/layout-cache.spec.ts b/test/layout-cache.spec.ts
index 4444444..5555555 100644
--- a/test/layout-cache.spec.ts
+++ b/test/layout-cache.spec.ts
@@ -58,2 +58,3 @@ describe('resolveLayouts', () => {
   it('resolves', () => {
+    expect(resolveLayouts(route('/docs/'))).toBe(resolveLayouts(route('/docs')))
   })
--
2.47.0
`;

export const pullRequest = (patch: Partial<ContributeAttemptPullRequest> = {}): ContributeAttemptPullRequest => ({
  prId: 'PR_1',
  number: 1419,
  url: 'https://github.com/driftwood-js/driftwood/pull/1419',
  state: 'OPEN',
  openedAt: '2026-10-28T11:30:00.000Z',
  mergedAt: null,
  closedAt: null,
  reviewDecision: 'REVIEW_REQUIRED',
  checks: 'SUCCESS',
  syncedAt: '2026-10-28T11:45:00.000Z',
  ...patch,
});

export const attempt = (patch: Partial<ContributeAttempt> = {}): ContributeAttempt => ({
  attemptId: 'A_1',
  issueId: 'I_1',
  repositoryId: 'R_1',
  nameWithOwner: 'driftwood-js/driftwood',
  number: 871,
  title: 'Nested layouts re-render on every navigation',
  url: 'https://github.com/driftwood-js/driftwood/issues/871',
  kind: 'FIRST',
  state: 'REVIEW',
  model: 'CLAUDE_SONNET_5_5',
  budgetUsd: 5,
  costUsd: 2.36,
  endReason: null,
  endDetail: null,
  checksPassed: true,
  approvedAt: null,
  submit: null,
  pullRequest: null,
  createdAt: '2026-10-28T09:12:00.000Z',
  updatedAt: '2026-10-28T11:04:00.000Z',
  ...patch,
});

export const detail = (patch: Partial<ContributeAttemptDetail> = {}): ContributeAttemptDetail => ({
  ...attempt(),
  patch: PATCH,
  result: {
    verdict: 'DONE',
    summary: 'Layout lookups used the raw route path as the cache key. It now normalizes the path first.',
    tests: [
      { command: 'pnpm vitest run test/layout-cache.spec.ts', passed: true, output: 'Tests 14 passed (14)' },
      { command: 'pnpm lint', passed: false, output: '1 warning <b>here</b>' },
    ],
    filesChanged: ['src/router/layout-cache.ts', 'src/router/normalize-path.ts', 'test/layout-cache.spec.ts'],
    risk: 'LOW',
    riskNotes: 'normalizePath keeps the case of the path as it is.',
    prBody:
      'Fixes #871\n\n## What changed\nNormalize the route path.\n\n🤖 Made with Claude via [gitranks.com](https://gitranks.com) · reviewed by @someone',
  },
  readiness: { install: 'pnpm install', build: null, test: 'pnpm test', toolchain: 'Node 22', notes: null },
  checks: [
    { name: 'PATCH_PARSED', passed: true, detail: null },
    { name: 'MAX_CHANGED_LINES', passed: true, detail: null },
    { name: 'SECRETS', passed: true, detail: null },
    { name: 'TEST_TOUCHED', passed: true, detail: null },
  ],
  cost: { totalUsd: 2.36, goNoGoUsd: 0.31, workUsd: 1.9, runtimeUsd: 0.15 },
  approval: null,
  events: [
    { state: 'QUEUED', detail: 'recommendation', at: '2026-10-28T09:10:00.000Z' },
    { state: 'RUNNING', detail: 'claimed', at: '2026-10-28T09:12:00.000Z' },
    { state: 'CHECKS', detail: null, at: '2026-10-28T11:03:00.000Z' },
    { state: 'REVIEW', detail: null, at: '2026-10-28T11:04:00.000Z' },
  ],
  ...patch,
});

const submitting = (step: NonNullable<ContributeAttempt['submit']>['step']) =>
  detail({
    state: 'SUBMITTING',
    approvedAt: '2026-10-28T11:20:00.000Z',
    approval: { title: 'Normalize route paths', body: 'Fixes #871', dco: false, at: '2026-10-28T11:20:00.000Z' },
    submit: {
      step,
      waitUntil: null,
      fork: 'octocat/driftwood',
      branch: 'gitranks/871-nested-layouts',
      lastError: null,
    },
  });

/** One attempt for each state the review screen renders. */
export const attempts = {
  queued: detail({ state: 'QUEUED', patch: null, result: null, checks: [], checksPassed: null, costUsd: 0 }),
  running: detail({ state: 'RUNNING', patch: null, result: null, checks: [], checksPassed: null, costUsd: 0.4 }),
  checks: detail({ state: 'CHECKS', checks: [], checksPassed: null }),
  review: detail(),
  /** Back in review after a submission that could not go on. */
  bounced: detail({
    submit: {
      step: 'FORK',
      waitUntil: null,
      fork: null,
      branch: null,
      lastError: {
        reason: 'fork_timeout',
        note: 'GitHub is still making your fork. Approve again in a few minutes.',
        at: '2026-10-28T11:30:00.000Z',
      },
    },
    approval: {
      title: 'Normalize route paths',
      body: 'Fixes #871\n\nEdited.',
      dco: true,
      at: '2026-10-28T11:20:00.000Z',
    },
  }),
  submittingQueued: submitting('QUEUED'),
  submittingFork: submitting('FORK'),
  submittingSync: submitting('SYNC'),
  submittingPush: submitting('PUSH'),
  submittingPr: submitting('PULL_REQUEST'),
  waitingCap: detail({
    ...submitting('WAITING_CAP'),
    submit: {
      step: 'WAITING_CAP',
      waitUntil: '2026-10-29T00:00:00.000Z',
      fork: null,
      branch: null,
      lastError: null,
    },
  }),
  pendingAutosubmit: detail({ state: 'PENDING_AUTOSUBMIT' }),
  prOpen: detail({ ...submitting('PULL_REQUEST'), state: 'PR_OPEN', pullRequest: pullRequest() }),
  followUp: detail({
    ...submitting('PULL_REQUEST'),
    state: 'FOLLOW_UP',
    kind: 'FOLLOW_UP',
    pullRequest: pullRequest({ reviewDecision: 'CHANGES_REQUESTED' }),
  }),
  merged: detail({
    ...submitting('PULL_REQUEST'),
    state: 'MERGED',
    pullRequest: pullRequest({ state: 'MERGED', mergedAt: '2026-10-28T11:55:00.000Z', reviewDecision: 'APPROVED' }),
  }),
  closed: detail({
    ...submitting('PULL_REQUEST'),
    state: 'CLOSED',
    pullRequest: pullRequest({ state: 'CLOSED', closedAt: '2026-10-28T11:55:00.000Z', checks: 'FAILURE' }),
  }),
  discarded: detail({ state: 'DISCARDED', endReason: 'USER' }),
  expired: detail({ state: 'DISCARDED', endReason: 'REVIEW_EXPIRED' }),
  /** An attempt the API answered with every optional part missing. */
  bare: detail({
    state: 'REVIEW',
    nameWithOwner: null,
    title: null,
    url: null,
    patch: null,
    result: null,
    readiness: null,
    checks: [],
    events: [],
    checksPassed: null,
  }),
} satisfies Record<string, ContributeAttemptDetail>;

export const stopped = (endReason: NonNullable<ContributeAttempt['endReason']>, endDetail: string | null = null) =>
  detail({ state: 'STOPPED', endReason, endDetail, patch: null, result: null, checks: [], checksPassed: null });

export const contributions: ContributeContributions = {
  items: [
    {
      attemptId: 'A_9',
      issueId: 'I_9',
      repositoryId: 'R_9',
      nameWithOwner: 'fern-lang/fern',
      issueNumber: 2481,
      title: 'Keep trailing comments when formatting match arms',
      pullRequest: pullRequest({
        number: 2490,
        url: 'https://github.com/fern-lang/fern/pull/2490',
        state: 'MERGED',
        openedAt: '2026-10-20T10:00:00.000Z',
        mergedAt: '2026-10-26T10:00:00.000Z',
        reviewDecision: 'APPROVED',
      }),
      costUsd: 1.84,
    },
    {
      attemptId: 'A_8',
      issueId: 'I_8',
      repositoryId: 'R_8',
      nameWithOwner: 'kelp-db/kelp',
      issueNumber: 1400,
      title: 'Add a --json flag to kelp status',
      pullRequest: pullRequest({
        number: 1419,
        url: 'https://github.com/kelp-db/kelp/pull/1419',
        reviewDecision: 'CHANGES_REQUESTED',
      }),
      costUsd: 3.12,
    },
    {
      attemptId: 'A_7',
      issueId: 'I_7',
      repositoryId: 'R_7',
      nameWithOwner: null,
      issueNumber: 91,
      title: null,
      pullRequest: pullRequest({
        number: 92,
        url: 'https://github.com/tern-lang/tern-fmt/pull/92',
        state: 'CLOSED',
        openedAt: '2026-10-10T10:00:00.000Z',
        closedAt: '2026-10-19T10:00:00.000Z',
        reviewDecision: null,
      }),
      costUsd: 2.9,
    },
  ],
  totals: { open: 1, merged: 1, closed: 1, costUsd: 7.86 },
};

/** What the last read of an open pull request found: changes requested, then a comment, then a failing check. */
export const needsYou = (patch: Partial<ContributeNeedsYou> = {}): ContributeNeedsYou => ({
  since: '2026-10-28T09:00:00.000Z',
  signals: [
    { kind: 'CHANGES_REQUESTED', at: '2026-10-28T09:00:00.000Z', detail: null },
    { kind: 'COMMENT', at: '2026-10-28T10:00:00.000Z', detail: null },
    { kind: 'CHECK_FAILED', at: '2026-10-28T11:00:00.000Z', detail: 'lint, test (ubuntu)' },
  ],
  ...patch,
});

export const followUps = (patch: Partial<ContributeFollowUps> = {}): ContributeFollowUps => ({
  used: 0,
  left: 2,
  max: 2,
  handedOff: false,
  handedOffAt: null,
  currentAttemptId: null,
  ...patch,
});

export const followUpOf: ContributeFollowUpOf = {
  attemptId: 'A_1',
  prId: 'PR_1',
  number: 1419,
  url: 'https://github.com/driftwood-js/driftwood/pull/1419',
};

/** A follow-up's commit: one more change on the pull request's branch. */
export const FOLLOW_UP_PATCH = `From 7a7a7a7a7a7a Mon Sep 17 00:00:00 2001
From: Octo Cat <octocat@users.noreply.github.com>
Subject: [PATCH] Use the existing encoder

---
diff --git a/src/router/normalize-path.ts b/src/router/normalize-path.ts
index 3333333..6666666 100644
--- a/src/router/normalize-path.ts
+++ b/src/router/normalize-path.ts
@@ -1,4 +1,4 @@
 /** Normalizes a route path. */
 export function normalizePath(path: string): string {
-  return path.replace(/\\/$/, '')
+  return path.length > 1 ? path.replace(/\\/$/, '') : path
 }
--
2.47.0
`;

export const replyDraft = (patch: Partial<ContributeReplyDraft> = {}): ContributeReplyDraft => ({
  draftId: 'D_1',
  prId: 'PR_1',
  attemptId: 'A_F1',
  comment: {
    commentId: 'RC_1',
    author: 'maintainer-mo',
    path: 'src/router/normalize-path.ts',
    line: 3,
    excerpt: 'Should the root path "/" keep its slash?',
  },
  text: 'Good catch: the root path keeps its slash now, and a test covers it.',
  state: 'DRAFT',
  posted: false,
  postedAt: null,
  url: null,
  lastError: null,
  createdAt: '2026-10-28T11:40:00.000Z',
  updatedAt: '2026-10-28T11:40:00.000Z',
  ...patch,
});

/** The follow-up fields an API that answers them gives a first attempt with no pull request yet. */
const noFollowUps = { needsYou: null, followUps: null, followUpOf: null, autosubmitAt: null, autopilot: false };

/** A follow-up on pull request #1419, in review with one new commit and two drafted replies. */
export const followUp = (patch: Partial<ContributeAttemptDetail> = {}): ContributeAttemptDetail =>
  detail({
    ...noFollowUps,
    attemptId: 'A_F1',
    kind: 'FOLLOW_UP',
    state: 'REVIEW',
    followUpOf,
    patch: FOLLOW_UP_PATCH,
    checks: [
      { name: 'PATCH_PARSED', passed: true, detail: null },
      { name: 'SECRETS', passed: true, detail: null },
    ],
    cost: { totalUsd: 1.12, goNoGoUsd: 0, workUsd: 1.02, runtimeUsd: 0.1 },
    costUsd: 1.12,
    replyDrafts: [
      replyDraft(),
      replyDraft({ draftId: 'D_2', comment: null, text: 'Pushed a fix for the failing lint check.' }),
    ],
    ...patch,
  });

/** First attempts and follow-ups in each state the follow-up views render. */
export const followUpAttempts = {
  /** A first attempt whose open pull request needs the user, with both rounds left. */
  prNeedsYou: detail({
    ...noFollowUps,
    state: 'PR_OPEN',
    pullRequest: pullRequest({ reviewDecision: 'CHANGES_REQUESTED', checks: 'FAILURE' }),
    needsYou: needsYou(),
    followUps: followUps(),
    replyDrafts: [],
  }),
  /** Both rounds used: the pull request is the user's. */
  handedOff: detail({
    ...noFollowUps,
    state: 'PR_OPEN',
    pullRequest: pullRequest(),
    needsYou: needsYou({ signals: [{ kind: 'COMMENT', at: '2026-10-28T11:30:00.000Z', detail: null }] }),
    followUps: followUps({ used: 2, left: 0, handedOff: true, handedOffAt: '2026-10-27T10:00:00.000Z' }),
    replyDrafts: [],
  }),
  /** A follow-up under way: its first attempt waits in `FOLLOW_UP`. */
  underWay: detail({
    ...noFollowUps,
    state: 'FOLLOW_UP',
    pullRequest: pullRequest(),
    followUps: followUps({ used: 1, left: 1, currentAttemptId: 'A_F1' }),
    replyDrafts: [],
  }),
  review: followUp(),
  /** A follow-up with replies only, no commits. */
  repliesOnly: followUp({ patch: null }),
  submitting: followUp({
    state: 'SUBMITTING',
    approvedAt: '2026-10-28T11:50:00.000Z',
    submit: { step: 'PUSH', waitUntil: null, fork: 'octocat/driftwood', branch: 'gitranks/871', lastError: null },
  }),
  done: followUp({
    state: 'DONE',
    replyDrafts: [
      replyDraft({
        state: 'POSTED',
        posted: true,
        postedAt: '2026-10-28T11:58:00.000Z',
        url: 'https://github.com/driftwood-js/driftwood/pull/1419#discussion_r1',
      }),
      replyDraft({
        draftId: 'D_2',
        comment: null,
        state: 'FAILED',
        lastError: {
          reason: 'forbidden',
          note: 'GitHub refused the reply: the conversation is locked or closed to you.',
          at: '2026-10-28T11:59:00.000Z',
        },
      }),
      replyDraft({ draftId: 'D_3', state: 'POSTING' }),
    ],
  }),
  stopped: followUp({ state: 'STOPPED', endReason: 'BUDGET' }),
  discarded: followUp({ state: 'DISCARDED', endReason: 'USER' }),
  /** Autopilot submits it in 42 minutes unless the user stops it. */
  pendingAutosubmit: detail({
    ...noFollowUps,
    state: 'PENDING_AUTOSUBMIT',
    autopilot: true,
    autosubmitAt: '2026-10-28T12:42:00.000Z',
  }),
} satisfies Record<string, ContributeAttemptDetail>;
