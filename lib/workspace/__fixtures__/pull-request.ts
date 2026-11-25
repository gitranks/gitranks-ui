import type { Route } from 'next';

import { LIST_PLACE } from '../pull-request-list';
import type {
  LearnIssueLesson,
  PullRequestApproval,
  PullRequestBox,
  PullRequestChecks,
  PullRequestList,
  PullRequestListRow,
  PullRequestOnlyYou,
  PullRequestPage,
  PullRequestRound,
  PullRequestRoundAsk,
} from '../pull-request-page.types';

/** The catalogue's clock: 28 Oct 2026, 12:00 UTC. */
export const PR_NOW = new Date('2026-10-28T12:00:00.000Z');

const at = (day: number, hour = 9) => new Date(Date.UTC(2026, 9, day, hour)).toISOString();
const TODAY = '2026-10-28T09:40:00.000Z';

export const prLesson: LearnIssueLesson = {
  slug: 'a-stack-last-in-first-out',
  title: 'A stack: last in, first out',
  course: 'data-structures',
  courseName: 'Data structures',
};

/** The links a page gives the parts, so the parts build no address of either product. */
export const prLinks = {
  back: '/my/pull-requests' as Route,
  walkthrough: '/my/pull-requests/harbor-kit/relay/431/walkthrough' as Route,
  approve: '/my/pull-requests/harbor-kit/relay/431/approve' as Route,
  change: '/my/pull-requests/harbor-kit/relay/431/approve#change' as Route,
  answers: '/my/pull-requests/harbor-kit/relay/431/walkthrough' as Route,
  lesson: '/learn/lessons/a-stack-last-in-first-out' as Route,
  lessonQuestions: '/learn/lessons/a-stack-last-in-first-out' as Route,
  lessonIssues: '/learn/issues?lesson=a-stack-last-in-first-out' as Route,
  course: '/learn/courses/data-structures' as Route,
  similar: '/learn/issues' as Route,
  issues: '/learn/issues' as Route,
  pullRequestText: '/my/pull-requests/harbor-kit/relay/431/approve' as Route,
  fix: 'https://gitranks.com/learn/fixes/harbor-kit/relay/58',
};

const REVIEW_TEXT =
  'The fix is right in spirit, but three things must change before this can merge. First, the cap is applied in a second pass over the list, which doubles the work on every failed delivery. Second, the new test covers only the happy path. Third, the new option needs a line in the changelog.';

export const prAsk = (patch: Partial<PullRequestRoundAsk> = {}): PullRequestRoundAsk => ({
  id: 'c_1',
  kind: 'changes_requested',
  author: 'mara-k',
  bot: false,
  excerpt: REVIEW_TEXT,
  comments: 7,
  url: 'https://github.com/harbor-kit/relay/pull/58#pullrequestreview-1',
  ...patch,
});

/** Round 2's asks: a review, a person's comment, a bot's five comments and a failing check. */
export const prAsks: PullRequestRoundAsk[] = [
  prAsk(),
  prAsk({
    id: 'c_2',
    kind: 'conversation',
    author: 'dev-okoro',
    excerpt:
      'Thanks for picking this up. The log line on a dropped retry still says “list full”. Could you reword it to name the limit, and say which webhook it was?',
    comments: null,
    url: 'https://github.com/harbor-kit/relay/pull/58#issuecomment-2',
  }),
  prAsk({
    id: 'c_3',
    kind: 'comment',
    author: 'CodeRabbit',
    bot: true,
    excerpt: 'Consider naming the limit in the error message.',
    comments: 5,
    url: 'https://github.com/harbor-kit/relay/pull/58#pullrequestreview-3',
  }),
  prAsk({
    id: null,
    kind: 'check_failed',
    author: 'unit-test',
    excerpt: null,
    comments: null,
    url: 'https://github.com/harbor-kit/relay/pull/58/checks',
  }),
];

/** Round 1: the pull request opened, and a bot's comments were answered. */
export const prRoundOne: PullRequestRound = {
  n: 1,
  state: 'SENT',
  openedAt: at(21),
  asked: [],
  did: 'The pull request opened with 4 files.',
  commits: 1,
  replies: [
    { id: 'r_0', to: 'CodeRabbit', text: 'Done.', leftOut: false },
    { id: 'r_00', to: 'CodeRabbit', text: 'Answered in the code.', leftOut: false },
  ],
  sentAt: at(21, 10),
  since: [],
  notNeeded: null,
  prompt: null,
};

export const prRound = (patch: Partial<PullRequestRound> = {}): PullRequestRound => ({
  n: 2,
  state: 'WAITING',
  openedAt: at(27),
  asked: prAsks,
  did: null,
  commits: null,
  replies: [],
  sentAt: null,
  since: [],
  notNeeded: null,
  prompt: 'Do round 2 of https://github.com/harbor-kit/relay/pull/58 with GitRanks',
  ...patch,
});

/** Round 2 ready: two commits, replies to the review folded, one reply left out. */
export const prRoundReady = prRound({
  state: 'READY',
  did: 'The cap now sits where retries are counted, with tests at the limit.',
  commits: 2,
  prompt: null,
  replies: [
    ...Array.from({ length: 7 }, (_, index) => ({
      id: `r_${index + 1}`,
      to: 'mara-k’s review',
      text: `Changed as asked, point ${index + 1}.`,
      leftOut: false,
    })),
    {
      id: 'r_8',
      to: 'dev-okoro',
      text: 'Reworded in 3f2a91c: the line now names the limit and the webhook.',
      leftOut: false,
    },
    { id: 'r_9', to: 'sam-lee', text: 'Yes, the same cap applies to the batch endpoint.', leftOut: true },
  ],
});

export const prRoundSent = prRound({
  ...prRoundReady,
  state: 'SENT',
  sentAt: TODAY,
});

export const prChecks: PullRequestChecks = {
  pass: 11,
  agentCanFix: 1,
  needsYou: 1,
  notYours: 3,
  rows: [
    {
      name: 'unit-test',
      class: 'AGENT_CAN_FIX',
      reason: 'A test your change touches fails.',
      url: 'https://github.com/harbor-kit/relay/runs/1',
    },
    {
      name: 'license/cla',
      class: 'NEEDS_YOU',
      reason: 'The agreement is not signed yet.',
      url: 'https://github.com/harbor-kit/relay/runs/2',
    },
    {
      name: 'e2e-nightly',
      class: 'NOT_YOURS',
      reason: 'It already fails on the main branch.',
      url: 'https://github.com/harbor-kit/relay/runs/3',
    },
    {
      name: 'build / approval',
      class: 'NOT_YOURS',
      reason: 'It waits for a maintainer’s approval to run.',
      url: 'https://github.com/harbor-kit/relay/runs/4',
    },
    {
      name: 'Vercel',
      class: 'NOT_YOURS',
      reason: 'Deploys do not run from a fork.',
      url: 'https://github.com/harbor-kit/relay/runs/5',
    },
  ],
};

const CHANGE = {
  summary: 'The retry list has a limit; the oldest job leaves when it is full.',
  files: 4,
  added: 86,
  removed: 12,
};

const PASSED = { questions: 4, answered: 4, passedAt: at(21), readers: 3, shared: true };

/** A Learn fix whose walkthrough is ready and not started: the first board of the page. */
export const prPage = (patch: Partial<PullRequestPage> = {}): PullRequestPage => ({
  attemptId: 'att_431',
  made: 'LEARN',
  hosted: false,
  repo: 'harbor-kit/relay',
  issueNumber: 431,
  issueTitle: 'The retry list grows without limit when a webhook keeps failing',
  issueUrl: 'https://github.com/harbor-kit/relay/issues/431',
  number: null,
  url: null,
  lesson: prLesson,
  lessonConfirmed: true,
  stages: ['FIX', 'WALKTHROUGH', 'APPROVE', 'REVIEW', 'MERGED'],
  stage: 'WALKTHROUGH',
  working: false,
  box: 'WALKTHROUGH',
  round: null,
  openingStep: null,
  onlyYou: [],
  change: CHANGE,
  walkthrough: { questions: 4, answered: 0, passedAt: null, readers: null, shared: false },
  rounds: [],
  checks: null,
  rules: 'Start the title with fix:, feat: or docs:. Sign off every commit. Keep a pull request to one change.',
  lessonToAsk: true,
  outcome: null,
  ...patch,
});

const OPENED = { number: 58, url: 'https://github.com/harbor-kit/relay/pull/58' };

/** Every stage of a Learn fix, from the agent's first call to the merge. */
export const prStages = {
  fixing: prPage({
    stage: 'FIX',
    box: 'FIXING',
    working: true,
    change: null,
    walkthrough: null,
    lessonConfirmed: false,
  }),
  writing: prPage({ box: 'WRITING_WALKTHROUGH', working: true, walkthrough: null }),
  walkthrough: prPage(),
  partly: prPage({ walkthrough: { questions: 4, answered: 2, passedAt: null, readers: null, shared: false } }),
  rewriting: prPage({ box: 'REWRITING_WALKTHROUGH', working: true }),
  approve: prPage({ stage: 'APPROVE', box: 'APPROVE', walkthrough: { ...PASSED, passedAt: TODAY, readers: null } }),
  opening: prPage({
    stage: 'APPROVE',
    box: 'OPENING',
    working: true,
    openingStep: 4,
    walkthrough: { ...PASSED, passedAt: TODAY, readers: null },
  }),
  open: prPage({ ...OPENED, stage: 'REVIEW', box: 'OPEN', walkthrough: PASSED, rounds: [prRoundOne] }),
  merged: prPage({ ...OPENED, stage: 'MERGED', box: 'MERGED', walkthrough: PASSED, rounds: [prRoundOne] }),
  noLesson: prPage({ lesson: null, lessonToAsk: false }),
  noLessonMerged: prPage({
    ...OPENED,
    lesson: null,
    lessonToAsk: false,
    stage: 'MERGED',
    box: 'MERGED',
    walkthrough: PASSED,
    rounds: [prRoundOne],
  }),
};

const REVIEW_PAGE = { ...OPENED, stage: 'REVIEW' as const, walkthrough: PASSED, checks: prChecks };

export const prCla: PullRequestOnlyYou = {
  kind: 'cla',
  text: 'The project asks every contributor to sign its CLA once. Its bot checks again by itself after you sign, and this page moves on.',
  url: 'https://cla.example.org/harbor-kit/relay',
};

/** Review in Learn: a round asked, ready, sent, and a comment that asks for nothing. */
export const prReview = {
  asked: prPage({
    ...REVIEW_PAGE,
    box: 'ROUND_WAITING',
    round: 2,
    rounds: [prRound(), prRoundOne],
    onlyYou: [prCla],
  }),
  working: prPage({
    ...REVIEW_PAGE,
    box: 'ROUND_WORKING',
    working: true,
    round: 2,
    rounds: [prRound({ state: 'WORKING', prompt: null }), prRoundOne],
  }),
  ready: prPage({ ...REVIEW_PAGE, box: 'ROUND_READY', round: 2, rounds: [prRoundReady, prRoundOne] }),
  sent: prPage({ ...REVIEW_PAGE, box: 'WITH_MAINTAINERS', round: 2, rounds: [prRoundSent, prRoundOne] }),
  asksNothing: prPage({
    ...REVIEW_PAGE,
    box: 'WITH_MAINTAINERS',
    round: 2,
    rounds: [
      prRound({
        ...prRoundSent,
        since: [
          prAsk({
            id: 'c_9',
            kind: 'conversation',
            excerpt: 'Thank you! I will review this later this week.',
            comments: null,
            url: 'https://github.com/harbor-kit/relay/pull/58#issuecomment-9',
          }),
        ],
      }),
      prRoundOne,
    ],
  }),
  notNeeded: prPage({
    ...REVIEW_PAGE,
    box: 'WITH_MAINTAINERS',
    rounds: [
      prRound({
        n: 3,
        state: 'NOT_NEEDED',
        notNeeded: 'FAILS_ON_BASE',
        prompt: null,
        asked: [
          prAsk({ id: null, kind: 'check_failed', author: 'e2e-nightly', excerpt: null, comments: null }),
          prAsk({ id: null, kind: 'check_failed', author: 'lint', excerpt: null, comments: null }),
          prAsk({ id: 'c_5', kind: 'comment', author: 'CodeRabbit', bot: true, excerpt: null, comments: 2 }),
        ],
      }),
      prRoundSent,
      prRoundOne,
    ],
  }),
};

/** What only the person can do, one at a time in the box. */
export const prOnlyYou: Record<string, PullRequestOnlyYou> = {
  cla: prCla,
  dco: {
    kind: 'dco',
    text: 'The project needs a “Signed-off-by” line with your name on each commit. We add it and push again; the code does not change.',
    url: 'https://github.com/harbor-kit/relay/pull/58/checks',
  },
  conversation: {
    kind: 'conversation',
    text: 'mara-k asked: “Would you be open to splitting this into two pull requests?” Your agent can draft the reply, but the decision is yours.',
    url: 'https://github.com/harbor-kit/relay/pull/58#issuecomment-7',
  },
  title: {
    kind: 'title',
    text: 'The rule: start with fix:, feat: or docs:. Proposed: “fix(delivery): cap the retry list at the configured limit”.',
    url: null,
  },
  github: {
    kind: 'github',
    text: 'GitHub asks again for permission to push to your fork. Nothing else changes, and the round is sent right after.',
    url: null,
  },
  check_yours: {
    kind: 'check_yours',
    text: 'The check “license/cla” needs something from your GitHub account, not from the code.',
    url: 'https://github.com/harbor-kit/relay/pull/58/checks',
  },
  bot_blocked: {
    kind: 'bot_blocked',
    text: 'A bot blocks the merge until the pull request shows the fix working, usually with screenshots.',
    url: 'https://github.com/harbor-kit/relay/pull/58#issuecomment-8',
  },
  replies_failed: {
    kind: 'replies_failed',
    text: '2 replies did not post: the project refuses replies inside review threads. We can post them as one comment that quotes each thread.',
    url: null,
  },
};

/** The box about the first kind; the others wait behind it, in that order. */
export const prOnlyYouQueue = (...kinds: string[]) =>
  prPage({
    ...REVIEW_PAGE,
    box: 'ONLY_YOU',
    rounds: [prRoundSent, prRoundOne],
    onlyYou: kinds.map((kind) => prOnlyYou[kind]),
  });

export const prOnlyYouPage = (kind: string) => prOnlyYouQueue(kind);

/** How it ends. */
export const prEnds = {
  merged: prPage({
    ...OPENED,
    stage: 'MERGED',
    box: 'MERGED',
    walkthrough: PASSED,
    rounds: [prRoundSent, prRoundOne],
  }),
  closed: prPage({ ...REVIEW_PAGE, box: 'CLOSED', checks: null, rounds: [prRoundOne] }),
  stopped: prPage({ ...REVIEW_PAGE, box: 'STOPPED', checks: null, rounds: [prRoundOne], outcome: 'REPO_OUT' }),
  stoppedEarly: prPage({ stage: 'FIX', box: 'STOPPED', change: null, walkthrough: null, lessonConfirmed: false }),
  discarded: prPage({ stage: 'APPROVE', box: 'DISCARDED', walkthrough: PASSED }),
  silent: prPage({ ...REVIEW_PAGE, box: 'WITH_MAINTAINERS', rounds: [prRoundSent, prRoundOne], outcome: 'SILENT' }),
  /** Merged after two answered rounds and one marked as not needed: "after 2 rounds". */
  mergedSkipped: prPage({
    ...OPENED,
    stage: 'MERGED',
    box: 'MERGED',
    walkthrough: PASSED,
    rounds: [prRound({ n: 3, state: 'NOT_NEEDED', notNeeded: 'ASKS_NOTHING', prompt: null }), prRoundSent, prRoundOne],
  }),
};

/** The same page in Contribute, with a hosted agent: four stages, a button in place of a prompt. */
export const prContribute = {
  asked: prPage({
    ...REVIEW_PAGE,
    made: 'CONTRIBUTE',
    hosted: true,
    lesson: null,
    lessonToAsk: false,
    walkthrough: null,
    stages: ['FIX', 'APPROVE', 'REVIEW', 'MERGED'],
    box: 'ROUND_WAITING',
    round: 2,
    rounds: [prRound({ prompt: null }), prRoundOne],
    onlyYou: [prCla],
  }),
  /** A hosted round that stopped at the person's limit: the pull request stays open on GitHub. */
  stoppedAtLimit: prPage({
    ...REVIEW_PAGE,
    made: 'CONTRIBUTE',
    hosted: true,
    lesson: null,
    lessonToAsk: false,
    walkthrough: null,
    stages: ['FIX', 'APPROVE', 'REVIEW', 'MERGED'],
    box: 'STOPPED',
    checks: null,
    round: 2,
    rounds: [prRound({ prompt: null }), prRoundOne],
  }),
  fixing: prPage({
    made: 'CONTRIBUTE',
    hosted: true,
    lesson: null,
    lessonToAsk: false,
    walkthrough: null,
    change: null,
    stages: ['FIX', 'APPROVE', 'REVIEW', 'MERGED'],
    stage: 'FIX',
    box: 'FIXING',
    working: true,
  }),
};

/** A short patch, two files, for the change read on Approve. */
export const prPatch = `diff --git a/delivery/retry.go b/delivery/retry.go
--- a/delivery/retry.go
+++ b/delivery/retry.go
@@ -10,5 +10,8 @@ func (d *Delivery) fail(job Job) {
 func (d *Delivery) fail(job Job) {
+	if len(d.retries) >= d.limit {
+		d.retries = d.retries[1:] // drop the oldest
+	}
 	d.retries = append(d.retries, job)
 }
diff --git a/delivery/retry_test.go b/delivery/retry_test.go
new file mode 100644
--- /dev/null
+++ b/delivery/retry_test.go
@@ -0,0 +1,6 @@
+func TestRetryListIsCapped(t *testing.T) {
+	d := NewDelivery(WithRetryLimit(5))
+	for i := 0; i < 8; i++ {
+		d.fail(Job{ID: i})
+	}
+}
`;

/** Approve, right after the walkthrough: nothing is needed, GitHub's permission is there. */
export const prApproval = (patch: Partial<PullRequestApproval> = {}): PullRequestApproval => ({
  title: 'Cap the retry list when a webhook keeps failing',
  description:
    'Fixes #431.\n\nEvery failed delivery was added to a list that nothing ever emptied, so memory grew while a webhook kept failing.\n\n- The list now has a limit, `retry_limit`. When it is full, the oldest job leaves before the new one joins.\n- The default is 100, so nothing changes for a service that never fills the list.',
  footer:
    'Made with GitRanks Learn, where developers learn on real issues · Claude Code wrote this fix and taught it to @octo-dev, who answered 4 questions about it and sent it.',
  titlePrefix: null,
  signOffNeeded: false,
  signOffOn: false,
  githubAllowed: true,
  walkthroughPassed: true,
  lessonLater: prLesson,
  change: CHANGE,
  ...patch,
});

/** Approve's states. */
export const prApprovals = {
  send: prApproval(),
  needs: prApproval({ titlePrefix: 'fix:', signOffNeeded: true }),
  github: prApproval({ githubAllowed: false }),
  signedOff: prApproval({ signOffNeeded: true, signOffOn: true }),
  contribute: prApproval({
    title: 'Close a tooltip when its trigger leaves the page',
    description: 'Fixes #1274.\n\nThe tooltip now closes when its trigger leaves the page.',
    footer: 'Made with GitRanks Contribute, powered by Claude · Reviewed and submitted by @octo-dev.',
    walkthroughPassed: null,
    lessonLater: null,
    change: { summary: null, files: 2, added: 31, removed: 4 },
  }),
};

/** A row of the list of pull requests in `box`, its group and mark as the API gives them. */
export const prRow = (box: PullRequestBox, patch: Partial<PullRequestListRow> = {}): PullRequestListRow => ({
  attemptId: `att_${box.toLowerCase()}`,
  made: 'LEARN',
  repo: 'harbor-kit/relay',
  issueNumber: 431,
  issueUrl: 'https://github.com/harbor-kit/relay/issues/431',
  number: null,
  url: null,
  title: 'The retry list grows without limit when a webhook keeps failing',
  ...LIST_PLACE[box],
  box,
  round: null,
  agent: 'Claude Code',
  costUsd: null,
  lesson: null,
  pageRemoved: false,
  since: at(28, 11),
  ...patch,
});

/** Each row its own attempt id, as the API gives them. */
const withIds = (tag: string, rows: PullRequestListRow[]) =>
  rows.map((row, index) => ({ ...row, attemptId: `att_${tag}_${index + 1}` }));

const pr = (repo: string, issue: number, number: number | null) => ({
  repo,
  issueNumber: issue,
  issueUrl: `https://github.com/${repo}/issues/${issue}`,
  number,
  url: number ? `https://github.com/${repo}/pull/${number}` : null,
});

/** Opened from Contribute: what needs you, what is in progress, what has ended. */
export const prRowsContribute: PullRequestListRow[] = withIds('contribute', [
  prRow('ROUND_WAITING', {
    ...pr('kelp-db/kelp', 1400, 1419),
    made: 'CONTRIBUTE',
    title: 'Add a --json flag to kelp status',
    round: 2,
    agent: 'Hosted agent',
    costUsd: 3.12,
    since: at(26),
  }),
  prRow('ROUND_READY', {
    ...pr('driftwood-js/driftwood', 934, 961),
    title: 'Route params lose their type after a redirect',
    round: 2,
    lesson: { ...prLesson, slug: 'a-hash-map', title: 'A hash map stores values by key' },
    since: at(27),
  }),
  prRow('WALKTHROUGH', {
    ...pr('tidewave/tide', 958, null),
    title: 'Dark mode toggle flashes on first load',
    since: at(28, 8),
  }),
  prRow('FIXING', {
    ...pr('driftwood-js/driftwood', 871, null),
    made: 'CONTRIBUTE',
    title: 'Nested layouts re-render on every navigation',
    agent: 'Hosted agent',
    costUsd: 0.4,
    since: at(28, 9),
  }),
  prRow('OPEN', {
    ...pr('nimbus-ci/nimbus', 633, 640),
    made: 'CONTRIBUTE',
    title: 'Retry a flaky cache upload',
    since: at(25),
  }),
  prRow('MERGED', {
    ...pr('fern-lang/fern', 2481, 2490),
    made: 'CONTRIBUTE',
    title: 'Keep trailing comments when formatting match arms',
    agent: 'Hosted agent',
    costUsd: 1.84,
    since: at(26),
  }),
  prRow('MERGED', {
    ...pr('tidewave/tide', 931, 947),
    title: 'Sidebar forgets its width after a reload',
    lesson: { ...prLesson, slug: 'find-duplicates', title: 'Find duplicates in one pass with a set' },
    since: at(23),
  }),
  prRow('STOPPED', {
    ...pr('spool-rs/spool', 77, null),
    made: 'CONTRIBUTE',
    title: 'A panic when the lock file is empty',
    agent: 'Hosted agent',
    costUsd: 0.35,
    since: at(22),
  }),
  prRow('CLOSED', {
    ...pr('tern-lang/tern-fmt', 91, 92),
    made: 'CONTRIBUTE',
    title: 'Format nested where clauses',
    agent: 'Hosted agent',
    costUsd: 2.9,
    since: at(19),
  }),
]);

/** Opened from Learn: one fix in each group. */
export const prRowsLearn: PullRequestListRow[] = withIds('learn', [
  prRow('WALKTHROUGH', { lesson: prLesson }),
  prRow('OPEN', {
    ...pr('lumen-data/importer', 88, 93),
    title: 'The importer counted one email as two users',
    lesson: { ...prLesson, slug: 'find-duplicates', title: 'Find duplicates in one pass with a set' },
    since: at(12),
  }),
  prRow('MERGED', {
    ...pr('tessera-ui/tessera', 1290, 1302),
    title: 'Two spellings of one route got two cache entries',
    lesson: { ...prLesson, slug: 'a-hash-map', title: 'A hash map stores values by key' },
    since: at(18),
  }),
]);

/** A row in every state the list draws. */
export const prRowsEvery: PullRequestListRow[] = withIds('every', [
  prRow('WALKTHROUGH', { lesson: prLesson }),
  prRow('APPROVE', { ...pr('tidewave/tide', 958, null), title: 'Dark mode toggle flashes on first load' }),
  prRow('ONLY_YOU', { ...pr('nimbus-ci/nimbus', 633, 640), title: 'Retry a flaky cache upload' }),
  prRow('ROUND_WAITING', { ...prRowsContribute[0] }),
  prRow('ROUND_READY', { ...prRowsContribute[1], lesson: null }),
  prRow('FIXING', { since: at(28, 11) }),
  prRow('WRITING_WALKTHROUGH', { since: at(28, 11) }),
  prRow('FIXING', { ...prRowsContribute[3] }),
  prRow('OPEN', { ...prRowsContribute[4] }),
  prRow('WITH_MAINTAINERS', {
    ...prRowsContribute[0],
    box: 'WITH_MAINTAINERS',
    round: 3,
    since: TODAY,
    ...LIST_PLACE.WITH_MAINTAINERS,
  }),
  prRow('MERGED', { ...prRowsContribute[6] }),
  prRow('CLOSED', { ...prRowsContribute[8] }),
  prRow('STOPPED', { ...prRowsContribute[7] }),
  prRow('DISCARDED', {
    ...pr('spool-rs/spool', 77, null),
    title: 'A panic when the lock file is empty',
    since: at(20),
  }),
  prRow('MERGED', {
    ...pr('tessera-ui/tessera', 1290, 1302),
    title: 'Two spellings of one route got two cache entries',
    pageRemoved: true,
    since: at(21),
  }),
]);

export const prList = (patch: Partial<PullRequestList> = {}): PullRequestList => ({
  rows: prRowsContribute,
  open: 3,
  limit: 8,
  atLimit: false,
  more: 'cursor_20',
  ...patch,
});

export const prLists = {
  contribute: prList(),
  learn: prList({ rows: prRowsLearn, open: 1, limit: 3, more: null }),
  every: prList({ rows: prRowsEvery, more: null }),
  atLimit: prList({ open: 8, atLimit: true }),
  empty: prList({ rows: [], open: 0, more: null }),
};
