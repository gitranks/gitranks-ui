import type {
  ContributeAttemptDetail,
  ContributeContribution,
  ContributeNeedsYou,
  ContributeProof,
  ContributeProofAsk,
  ContributeProofResult,
  ContributeProofSession,
  ContributePrSignal,
} from '../contribute.types';
import type { NeedsYouRead } from '../needs-you';
import {
  attempt,
  detail,
  feedbackThread,
  followUpOf,
  followUpRun,
  followUps,
  pullRequest,
} from './contribute-attempts';
import { replyWaiting } from './contribute-overview';

/** Signals as the reads raise them, at an hour each before `NOW` (12:00). */
export const signal = (
  kind: ContributePrSignal['kind'],
  patch: Partial<ContributePrSignal> = {},
): ContributePrSignal => ({
  kind,
  at: '2026-10-28T10:00:00.000Z',
  detail: null,
  ...patch,
});

const needs = (...signals: ContributePrSignal[]): ContributeNeedsYou => ({
  since: signals[0]?.at ?? '2026-10-28T10:00:00.000Z',
  signals,
});

/** An open pull request of the user's, opened through our submission, nothing waiting on it. */
export const openPr = (patch: Partial<ContributeContribution> = {}): ContributeContribution => ({
  attemptId: 'A_8',
  issueId: 'I_8',
  repositoryId: 'R_8',
  nameWithOwner: 'kelp-db/kelp',
  issueNumber: 1400,
  title: 'Add a --json flag to kelp status',
  pullRequest: pullRequest({ prId: 'PR_8', number: 1419, url: 'https://github.com/kelp-db/kelp/pull/1419' }),
  costUsd: 3.12,
  needsYou: null,
  followUps: followUps({ used: 1, manualRuns: 1 }),
  runner: 'MANAGED_AGENTS',
  agent: null,
  openedBy: 'SUBMIT',
  prFix: null,
  prIssues: [],
  conventions: null,
  ...patch,
});

/** A pull request numbered `n` in its own repo: each row of the boards on its own pull request. */
const pr = (n: number, repo: string, title: string, patch: Partial<ContributeContribution>) =>
  openPr({
    attemptId: `A_PR${n}`,
    nameWithOwner: repo,
    title,
    pullRequest: pullRequest({
      prId: `PR_${n}`,
      number: n,
      url: `https://github.com/${repo}/pull/${n}`,
      syncedAt: '2026-10-28T11:55:00.000Z',
    }),
    ...patch,
  });

/** One open pull request for each reason a pull request needs the user, and one for each run at work. */
export const prsNeedingYou = {
  changes: pr(1419, 'kelp-db/kelp', 'Add a --json flag to kelp status', {
    needsYou: needs(
      signal('CHANGES_REQUESTED', { at: '2026-10-28T08:00:00.000Z' }),
      signal('CHECK_FAILED', { at: '2026-10-28T09:00:00.000Z', detail: 'lint, test (ubuntu)' }),
    ),
    followUps: followUps({ used: 1, manualRuns: 1, recommended: true }),
  }),
  comment: pr(2205, 'tidewave/tide', 'Debounce the file watcher', {
    needsYou: needs(signal('COMMENT', { at: '2026-10-28T08:30:00.000Z' })),
    followUps: followUps({ recommended: true }),
  }),
  check: pr(381, 'oxbow-dev/oxbow', 'Close idle connections on shutdown', {
    needsYou: needs(signal('CHECK_FAILED', { at: '2026-10-28T08:40:00.000Z', detail: 'lint' })),
    followUps: followUps({ recommended: true }),
  }),
  agreement: pr(23935, 'carbon-design-system/carbon', 'a11y: hard-coded ids in text input', {
    needsYou: needs(signal('CLA', { at: '2026-10-28T09:10:00.000Z', detail: 'DCO' })),
    followUps: followUps(),
    conventions: {
      cla: {
        check: 'DCO',
        signUrl: 'https://github.com/carbon-design-system/carbon/blob/main/.github/DCO.md',
        agreement: 'DCO',
        signComment: 'I have read the DCO Document and I hereby sign the DCO',
      },
    },
  }),
  cla: pr(2502, 'fern-lang/fern', 'Keep blank lines between match arms', {
    needsYou: needs(signal('CLA', { at: '2026-10-28T09:20:00.000Z', detail: 'license/cla' })),
    followUps: followUps(),
    conventions: {
      cla: { check: 'license/cla', signUrl: 'https://cla-assistant.io/fern-lang/fern', agreement: 'CLA' },
    },
  }),
  title: pr(912, 'quill-rs/quill', 'Panic when a span ends at EOF', {
    needsYou: needs(signal('TITLE', { at: '2026-10-28T09:25:00.000Z', detail: 'Panic when a span ends at EOF' })),
    followUps: followUps(),
    prIssues: [
      { kind: 'TITLE', check: 'semantic-pr', message: 'Use the repo’s form', suggestion: 'fix(span): panic at EOF' },
    ],
  }),
  bot: pr(190186, 'openclaw/openclaw', 'sessions.abort loses the typed message', {
    needsYou: needs(
      signal('BOT_BLOCKED', {
        at: '2026-10-28T04:00:00.000Z',
        detail: 'clawsweeper: Blocked before merge — 1 item remains: Add real behavior proof',
      }),
    ),
    followUps: followUps(),
  }),
  found: pr(190187, 'openclaw/openclaw', 'sessions.abort loses the typed message', {
    needsYou: needs(
      signal('BOT_BLOCKED', {
        at: '2026-10-28T04:00:00.000Z',
        detail: 'clawsweeper: Blocked before merge — 1 item remains: Add real behavior proof',
      }),
      signal('RUN_ENDED', {
        at: '2026-10-28T10:52:00.000Z',
        detail:
          'Add real behavior proof to the PR description: redacted terminal output, logs or a recording of a stopped run',
        attemptId: 'A_OC1',
        round: 1,
        outcome: 'NO_GO',
      }),
    ),
    followUps: followUps({ used: 1, manualRuns: 1 }),
  }),
  stopped: pr(77, 'driftwood-js/driftwood', 'Nested layouts re-render on every navigation', {
    needsYou: needs(
      signal('RUN_ENDED', {
        at: '2026-10-28T10:30:00.000Z',
        detail: 'It reached your limit for one attempt before the fix was done',
        attemptId: 'A_DW2',
        round: 2,
        outcome: 'STOPPED',
      }),
    ),
    followUps: followUps({ used: 2, manualRuns: 2 }),
  }),
  /** Run 2's approved commits could not be pushed: the branch moved under them. */
  pushFailed: pr(78, 'driftwood-js/driftwood', 'Nested layouts re-render on every navigation', {
    needsYou: needs(
      signal('RUN_ENDED', {
        at: '2026-10-28T10:40:00.000Z',
        detail: 'The branch changed on GitHub: the commits no longer apply',
        attemptId: 'A_DW3',
        round: 2,
        outcome: 'PUSH_FAILED',
      }),
    ),
    followUps: followUps({ used: 2, manualRuns: 2 }),
  }),
  dco: pr(4410, 'tern-lang/tern-fmt', 'Format nested where clauses', {
    needsYou: needs(signal('DCO', { at: '2026-10-28T09:40:00.000Z', detail: 'DCO' })),
    followUps: followUps(),
  }),
  fixFailed: pr(4411, 'tern-lang/tern', 'Keep doc comments on enum variants', {
    needsYou: needs(signal('DCO', { at: '2026-10-28T09:45:00.000Z', detail: 'DCO' })),
    followUps: followUps(),
    prFix: {
      kind: 'SIGN_OFF',
      state: 'FAILED',
      note: 'The branch moved since GitRanks read it',
      at: '2026-10-28T11:00:00.000Z',
    },
  }),
  working: pr(11195, 'fabricjs/fabric.js', 'loadFromJSON swallows a failed image', {
    needsYou: needs(signal('CHANGES_REQUESTED', { at: '2026-10-28T09:00:00.000Z' })),
    followUps: followUps({ used: 2, manualRuns: 2, currentAttemptId: 'A_FAB2' }),
  }),
  ownWorking: pr(640, 'nimbus-ci/nimbus', 'Retry a flaky artifact upload', {
    runner: 'MCP',
    followUps: followUps({ used: 1, manualRuns: 1, currentAttemptId: 'A_NIM1' }),
  }),
  pushed: pr(1502, 'loom-ui/loom', 'Keep focus in the dialog on close', {
    needsYou: needs(signal('COMMENT', { at: '2026-10-28T09:00:00.000Z' })),
    followUps: followUps({ used: 1, manualRuns: 1, lastEndedAt: '2026-10-28T11:58:00.000Z' }),
  }),
  signingOff: pr(4412, 'tern-lang/tern-lsp', 'Hover shows the alias, not the type', {
    needsYou: needs(signal('DCO', { at: '2026-10-28T09:50:00.000Z', detail: 'DCO' })),
    followUps: followUps(),
    prFix: { kind: 'SIGN_OFF', state: 'SENDING', note: null, at: '2026-10-28T11:59:00.000Z' },
  }),
} satisfies Record<string, ContributeContribution>;

/** The runs the page read in flight: the follow-up at work on fabric.js, the own agent's on nimbus. */
export const runsInFlight = [
  attempt({
    attemptId: 'A_FAB2',
    kind: 'FOLLOW_UP',
    state: 'RUNNING',
    nameWithOwner: 'fabricjs/fabric.js',
    followUpOf: { ...followUpOf, attemptId: 'A_PR11195', prId: 'PR_11195', number: 11195 },
    followUpStep: 'reading',
    round: followUpRun({ round: 2, attemptId: 'A_FAB2', state: 'RUNNING', pushedSha: null, fixed: 0, replied: 0 }),
    createdAt: '2026-10-28T11:58:00.000Z',
  }),
  attempt({
    attemptId: 'A_NIM1',
    kind: 'FOLLOW_UP',
    state: 'RUNNING',
    runner: 'MCP',
    nameWithOwner: 'nimbus-ci/nimbus',
    followUpOf: { ...followUpOf, attemptId: 'A_PR640', prId: 'PR_640', number: 640 },
    leaseUntil: '2026-10-28T15:00:00.000Z',
    createdAt: '2026-10-28T11:30:00.000Z',
  }),
];

/** A follow-up ready for review on driftwood #1419: two comments fixed, two replies drafted. */
export const runReady = attempt({
  attemptId: 'A_F1',
  kind: 'FOLLOW_UP',
  followUpOf,
  costUsd: 1.12,
  reviewAt: '2026-10-28T11:00:00.000Z',
  round: followUpRun({ round: 2, state: 'REVIEW', pushedSha: null, fixed: 2, replied: 0 }),
  checkStatus: { status: 'PASSED', note: '' },
});

/** Every row Overview shows: the reviews, a reply to approve, and each reason a pull request needs the user. */
export const needsEverything = (): NeedsYouRead => ({
  reviews: [
    runReady,
    attempt({
      attemptId: 'A_NEW',
      number: 2481,
      nameWithOwner: 'fern-lang/fern',
      reviewAt: '2026-10-28T10:00:00.000Z',
    }),
  ],
  replies: [replyWaiting({ prId: 'PR_2205', attemptId: 'A_TIDE1', nameWithOwner: 'tidewave/tide', prNumber: 2205 })],
  contributions: Object.values(prsNeedingYou),
  runs: runsInFlight,
});

/** What Overview shows of it: a few reasons and the runs at work, as the board draws them. */
export const needsSome = (): NeedsYouRead => ({
  reviews: [runReady],
  replies: [],
  contributions: [
    prsNeedingYou.agreement,
    prsNeedingYou.found,
    prsNeedingYou.dco,
    prsNeedingYou.cla,
    prsNeedingYou.working,
    prsNeedingYou.ownWorking,
  ],
  runs: runsInFlight,
});

// ---------------------------------------------------------------------------------------------------------------------
// The next step, as the contribution page reads it

const first = (patch: Partial<ContributeAttemptDetail>) =>
  detail({
    state: 'PR_OPEN',
    followUpOf: null,
    autosubmitAt: null,
    autopilot: false,
    replyDrafts: [],
    openedBy: 'SUBMIT',
    runner: 'MANAGED_AGENTS',
    prIssues: [],
    prFix: null,
    conventions: null,
    ...patch,
  });

/** A run can do it: changes requested with two comments waiting, and a failing check. */
export const nextForRun = first({
  attemptId: 'A_8',
  nameWithOwner: 'kelp-db/kelp',
  number: 1400,
  title: 'Add a --json flag to kelp status',
  pullRequest: pullRequest({
    prId: 'PR_8',
    number: 1419,
    url: 'https://github.com/kelp-db/kelp/pull/1419',
    reviewDecision: 'CHANGES_REQUESTED',
    checks: 'FAILURE',
  }),
  needsYou: prsNeedingYou.changes.needsYou,
  followUps: followUps({ used: 1, manualRuns: 1, recommended: true, history: [followUpRun()] }),
  reviewFeedback: {
    threads: [
      feedbackThread({ author: 'ana-kelp', bot: false, excerpt: 'Print the JSON to stdout, not stderr.' }),
      feedbackThread({
        threadId: 'T_2',
        commentId: 'C_2',
        author: 'ana-kelp',
        bot: false,
        path: 'src/status.rs',
        line: 88,
        excerpt: 'Keep the field names snake_case.',
      }),
    ],
    readAt: '2026-10-28T11:45:00.000Z',
  },
});

/** A run can do it, no review comments read: the note and the items alone. */
export const nextForChecks = first({
  ...nextForRun,
  reviewFeedback: null,
  needsYou: needs(signal('CHECK_FAILED', { detail: 'lint, test (ubuntu)' })),
});

/** Only the user can do it: a bot blocks the merge, and run 1 ended no-go saying what proof to add. */
export const nextForYou = first({
  attemptId: 'A_OC',
  nameWithOwner: 'openclaw/openclaw',
  number: 160004,
  title: 'sessions.abort loses the typed message',
  url: 'https://github.com/openclaw/openclaw/issues/160004',
  pullRequest: pullRequest({
    prId: 'PR_OC',
    number: 190186,
    url: 'https://github.com/openclaw/openclaw/pull/190186',
    reviewDecision: null,
  }),
  needsYou: prsNeedingYou.found.needsYou,
  followUps: followUps({
    used: 1,
    manualRuns: 1,
    history: [
      followUpRun({
        round: 1,
        attemptId: 'A_OC1',
        trigger: 'own',
        state: 'STOPPED',
        endReason: 'NO_GO',
        pushedSha: null,
        fixed: 0,
        replied: 0,
        at: '2026-10-28T10:52:00.000Z',
      }),
    ],
  }),
});

/** An agreement signed by a comment on the pull request (CLA Assistant Lite's `DCO`). */
export const nextForAgreement = first({
  attemptId: 'A_C',
  nameWithOwner: 'carbon-design-system/carbon',
  number: 18389,
  title: 'a11y: hard-coded ids in text input',
  url: 'https://github.com/carbon-design-system/carbon/issues/18389',
  pullRequest: pullRequest({
    prId: 'PR_C',
    number: 23935,
    url: 'https://github.com/carbon-design-system/carbon/pull/23935',
    checks: 'FAILURE',
  }),
  needsYou: prsNeedingYou.agreement.needsYou,
  followUps: followUps(),
  conventions: {
    title: null,
    titleExamples: [],
    template: null,
    changelog: null,
    cla: prsNeedingYou.agreement.conventions?.cla ?? null,
    dco: false,
    generated: [],
    notes: [],
  },
  prIssues: [
    {
      kind: 'CLA',
      check: 'DCO',
      message: 'Sign the DCO',
      suggestion: 'https://github.com/carbon-design-system/carbon/blob/main/.github/DCO.md',
    },
  ],
});

/** A DCO sign-off missing on our commits (the DCO app's check). */
export const nextForDco = first({
  attemptId: 'A_T',
  nameWithOwner: 'tern-lang/tern-fmt',
  number: 4400,
  title: 'Format nested where clauses',
  url: 'https://github.com/tern-lang/tern-fmt/issues/4400',
  pullRequest: pullRequest({
    prId: 'PR_4410',
    number: 4410,
    url: 'https://github.com/tern-lang/tern-fmt/pull/4410',
    checks: 'FAILURE',
  }),
  needsYou: prsNeedingYou.dco.needsYou,
  followUps: followUps(),
});

// ─── Proof from the user's own agent ─────────────────────────────────────────────────────────────────────────────────

/** ClawSweeper's ask on openclaw#190186, as the API reads it. */
export const proofAsk = (patch: Partial<ContributeProofAsk> = {}): ContributeProofAsk => ({
  bot: 'clawsweeper',
  title: 'Add real behavior proof',
  detail:
    'redacted terminal output, logs, or a recording of a live Gateway hitting real SQLite contention while stopping a recovered embedded run, with IPs, API keys, phone numbers and non-public endpoints removed.',
  at: '2026-10-28T04:00:00.000Z',
  headSha: '89cc1af0d2b5e7a14f3c9e8b1d6a2c4f5e7b9d01',
  reReview: '@clawsweeper re-review',
  ...patch,
});

const PROVED_MARKDOWN = `Live proof on the PR head \`89cc1af0\`, captured by the contributor's own coding agent on their machine (macOS 15, Node 24.22):

- Started an isolated Gateway on a free port with a real model and an embedded run; restarted it so the run was recovered.
- From a second process, held \`BEGIN EXCLUSIVE\` on the session database for 12 s.
- Sent Stop through \`sessions.abort\`: the reply was \`UNAVAILABLE\`, \`errorKind: state_contention\`; Stop applied once, no replay.
- Same steps on \`main\`: the raw \`database is locked\` error escaped.

<details><summary>Gateway log, redacted · 42 lines</summary>

\`\`\`
[gateway] listening on 127.0.0.1:[port]
[run] recovered embedded run contention-embedded-run
[rpc] sessions.abort → UNAVAILABLE {"errorKind":"state_contention"}
\`\`\`

</details>

![Terminal: the lock held, Stop sent](proof:1)
![Control UI: the busy-state Stop notice](proof:2)`;

/** What the agent sent back: the proof, by default. */
export const proofResult = (patch: Partial<ContributeProofResult> = {}): ContributeProofResult => ({
  outcome: 'PROVED',
  summary:
    'Reproduced the lock on a live Gateway and stopped the recovered run; the typed reply came back, Stop applied once.',
  section: { heading: '## Evidence', markdown: PROVED_MARKDOWN },
  reply: null,
  note: null,
  redactions: ['2 IP addresses', '1 API key'],
  headSha: '89cc1af0d2b5e7a14f3c9e8b1d6a2c4f5e7b9d01',
  files: [
    {
      slot: 1,
      name: 'lock-held.png',
      caption: 'Terminal: the lock held, Stop sent',
      bytes: 421_888,
      width: 1600,
      height: 900,
    },
    {
      slot: 2,
      name: 'stop-notice.png',
      caption: 'Control UI: the busy-state Stop notice',
      bytes: 704_512,
      width: 1440,
      height: 900,
    },
  ],
  ...patch,
});

/** A proof the user's agent holds, by default; picked up 6 minutes before `NOW`. */
export const proofSession = (patch: Partial<ContributeProofSession> = {}): ContributeProofSession => ({
  id: 'PF_1',
  state: 'RUNNING',
  agent: { name: 'CLAUDE_CODE', model: null },
  leaseUntil: '2026-10-28T13:54:00.000Z',
  round: 1,
  startedAt: '2026-10-28T11:54:00.000Z',
  stateAt: '2026-10-28T11:54:00.000Z',
  checkError: null,
  result: null,
  post: null,
  sendBack: null,
  endedReason: null,
  ...patch,
});

const CANNOT_REPLY =
  'Thanks for the review. I tried to capture the live proof on the PR head (89cc1af0) and couldn\'t reach the contended write: with a real exclusive lock held from a second process, sessions.abort answers {"ok":true,"status":"no-active-run"} before it reaches the persistence write. So on current main the injected-error regression is the only proof that reaches this path. Could a maintainer decide whether that is enough here?';

/** The openclaw pull request whose bot asks for proof, the proof as given. */
const withProof = (proof: ContributeProof, extra: ContributePrSignal[] = []): ContributeAttemptDetail => ({
  ...nextForYou,
  needsYou: needs(
    signal('BOT_BLOCKED', {
      at: '2026-10-28T04:00:00.000Z',
      detail: 'clawsweeper: Blocked before merge — 1 item remains: Add real behavior proof',
    }),
    ...extra,
  ),
  proof,
});

/** Every stage of a proof's card, on the openclaw pull request. */
export const nextForProof = {
  notConnected: withProof({ ask: proofAsk(), session: null }),
  connected: withProof({ ask: proofAsk(), session: null }),
  working: withProof({ ask: proofAsk(), session: proofSession() }),
  review: withProof({
    ask: proofAsk(),
    session: proofSession({ state: 'REVIEW', stateAt: '2026-10-28T11:46:00.000Z', result: proofResult() }),
  }),
  cannot: withProof({
    ask: proofAsk(),
    session: proofSession({
      state: 'REVIEW',
      stateAt: '2026-10-28T11:40:00.000Z',
      result: proofResult({
        outcome: 'CANNOT_PROVE',
        summary:
          "A real lock never reaches the code this PR changes on current main: Stop answers no-active-run first. The proof clawsweeper asks for can't be made, by anyone.",
        section: null,
        reply: CANNOT_REPLY,
        redactions: [],
        files: [],
      }),
    }),
  }),
  fixBroken: withProof({
    ask: proofAsk(),
    session: proofSession({
      state: 'REVIEW',
      stateAt: '2026-10-28T11:40:00.000Z',
      result: proofResult({
        outcome: 'FIX_BROKEN',
        summary: 'With the lock held, Stop still replays the typed message on the PR head.',
        section: null,
        note: 'On 89cc1af0, with BEGIN EXCLUSIVE held from a second process, sessions.abort returns UNAVAILABLE but the recovered run replays the typed message once the lock is released. Make the abort path drop the queued message when it answers state_contention.',
        redactions: [],
        files: [],
      }),
    }),
  }),
  failed: withProof({
    ask: proofAsk(),
    session: proofSession({
      state: 'FAILED',
      stateAt: '2026-10-28T11:50:00.000Z',
      result: proofResult(),
      post: {
        step: 'BODY',
        commitSha: '3f2a9c1e',
        bodyAt: null,
        commentUrl: null,
        error: 'The description is longer than GitHub takes (body_too_long).',
      },
    }),
  }),
  posted: withProof({
    ask: proofAsk(),
    session: proofSession({
      state: 'POSTED',
      stateAt: '2026-10-28T11:56:00.000Z',
      result: proofResult(),
      post: {
        step: 'COMMENT',
        commitSha: '3f2a9c1e',
        bodyAt: '2026-10-28T11:55:00.000Z',
        commentUrl: 'https://github.com/openclaw/openclaw/pull/190186#issuecomment-1',
        error: null,
      },
    }),
  }),
} satisfies Record<string, ContributeAttemptDetail>;
