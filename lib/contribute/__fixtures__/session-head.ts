import type {
  ContributeAttemptDetail,
  ContributeReplyDraft,
  ContributeReplyWaiting,
  ContributeSubmitError,
  ContributeView,
} from '../contribute.types';
import {
  attempts,
  detail,
  feedbackThread,
  flowDraft,
  followUp,
  followUpAttempts,
  followUpRun,
  followUps,
  ownAgentAttempt,
  pullRequest,
  replyDraft,
} from './contribute-attempts';
import { NOW, views } from './contribute-views';
import { nextForDco, nextForProof, nextForRun, proofResult, proofSession, signal } from './needs-you';
import { inReview, notPosted, posted } from './review-comments';

/**
 * A contribution in each state its session head draws (made-up repos, accounts and text): a first attempt in review,
 * back for approval or waiting on GitHub access; a run in review, bounced, waiting for autopilot or with replies that
 * did not reach GitHub; the next step's cards; the proof's stages.
 */

const at = '2026-10-28T11:30:00.000Z';
const error = (reason: string, note: string): ContributeSubmitError => ({ reason, note, at });

/** GitHub access not connected, though it can be granted here. */
export const noGrant: ContributeView = { ...views.active, grant: { connected: false, login: null } };

/** The first attempt with its pull request open after run 1 pushed: nothing new on it. */
export const afterRun = (patch: Partial<ContributeAttemptDetail> = {}) =>
  detail({
    ...followUpAttempts.quiet,
    followUps: followUps({ used: 1, manualRuns: 1, history: [followUpRun()] }),
    ...patch,
  });

/** The first attempt while `run` is under way (its review and countdown included). */
export const underWay = (run: ContributeAttemptDetail) =>
  detail({
    ...afterRun(),
    state: 'FOLLOW_UP',
    followUps: followUps({ used: 1, manualRuns: 1, currentAttemptId: run.attemptId }),
  });

/** A run of the follow-up flow, in review: a question, a bot's fixed thread, a person's, a top-level comment. */
export const runInReview = (patch: Partial<ContributeAttemptDetail> = {}) =>
  followUp({
    checkStatus: { status: 'PASSED', note: 'Every test passed.' },
    round: followUpRun({ state: 'REVIEW', pushedSha: null, fixed: 3, skipped: 0, replied: 0 }),
    replyDrafts: inReview(),
    ...patch,
  });

/** A run that pushed (run 1), its replies as given. */
export const runDone = (drafts: ContributeReplyDraft[], patch: Partial<ContributeAttemptDetail> = {}) =>
  followUp({ state: 'DONE', round: followUpRun(), replyDrafts: drafts, ...patch });

/** The drafts as the waiting replies' read gives them; `inReview` while their run waits for the user. */
export const waitingOf = (drafts: ContributeReplyDraft[], review = false): ContributeReplyWaiting[] =>
  drafts
    .filter((draft) => draft.state === 'DRAFT' || draft.state === 'FAILED')
    .map((draft) => ({ ...draft, nameWithOwner: 'driftwood-js/driftwood', prNumber: 1419, inReview: review }));

/** Seven replies the organization refused in their threads, after run 1 pushed. */
export const orgRefusedRun = () =>
  Array.from({ length: 7 }, (_, index) =>
    notPosted(`D_${index + 1}`, 'org_restricted', {
      lastError: {
        reason: 'org_restricted',
        note: "GitHub did not let us post it: this repository's organization lets only apps it has approved post in review threads. Post this reply yourself.",
        at,
      },
    }),
  );

/** Replies refused for several reasons: three by the org, two unanswered, one invalid. */
export const mixedRefusals = () => [
  ...orgRefusedRun().slice(0, 3),
  notPosted('D_4', 'no_answer'),
  notPosted('D_5', 'no_answer'),
  notPosted('D_6', 'invalid'),
];

/** One reply that did not post among the posted ones. */
export const oneRefused = () => [
  posted('D_1'),
  posted('D_2', { resolveState: 'RESOLVED' }),
  notPosted('D_3', 'transient'),
];

/** Replies left out of the push, still to post. */
export const leftOut = () => [
  replyDraft({ draftId: 'D_1', state: 'DRAFT', send: false }),
  replyDraft({ draftId: 'D_2', state: 'DRAFT', send: false, comment: null, text: 'Thanks for the review.' }),
];

/** A run that ended with nothing pushed: how it ended, as the next step reads it. */
export const runEnded = (outcome: 'STOPPED' | 'PUSH_FAILED', detailText: string) =>
  afterRun({
    needsYou: {
      since: NOW.toISOString(),
      signals: [signal('RUN_ENDED', { outcome, round: 1, attemptId: 'A_F1', detail: detailText })],
    },
    followUps: followUps({
      used: 1,
      manualRuns: 1,
      history: [
        followUpRun({ state: outcome === 'STOPPED' ? 'STOPPED' : 'DONE', endReason: 'BUDGET', pushedSha: null }),
      ],
    }),
  });

/** The repo's rules the pull request breaks: the title, the description, the changelog. */
const titleIssue = {
  kind: 'TITLE' as const,
  check: 'semantic-title',
  message: 'The title needs a type prefix',
  suggestion: 'fix(router): keep the layout cache',
  why: 'The repo checks every title for a type prefix, like `fix:` or `feat:`.',
};
const templateIssue = {
  kind: 'TEMPLATE' as const,
  check: null,
  message: 'Fill in the template',
  suggestion: null,
  why: 'The repo leaves its template to the person who tested the change.',
  fields: [
    { label: 'How I tested it', value: 'Ran the layout cache tests on both path forms.', tick: null, note: null },
    { label: 'I ran the tests', value: null, tick: true, note: null },
  ],
};
const changelogIssue = {
  kind: 'CHANGELOG' as const,
  check: 'changelog',
  message: 'Add a changelog line',
  suggestion: '- fix(router): keep the layout cache for paths with a trailing slash',
};

/** The rules card's states: several rules, a title flagged with no fix read, a retitle that failed, a CLA alone. */
export const rules = {
  several: afterRun({ prIssues: [titleIssue, templateIssue, changelogIssue] }),
  titleSignalOnly: afterRun({
    needsYou: { since: NOW.toISOString(), signals: [signal('TITLE', { detail: 'Layout cache drops nested routes' })] },
    prIssues: [templateIssue],
  }),
  fixFailed: afterRun({
    prIssues: [titleIssue],
    prFix: { kind: 'TITLE', state: 'FAILED', note: 'GitHub refused the new title.', at },
  }),
  claOnly: afterRun({
    prIssues: [
      { kind: 'CLA', check: 'license/cla', message: 'Sign the CLA', suggestion: 'https://cla.example.com/driftwood' },
    ],
  }),
};

/** The sign-off's states: sent, by hand, failed. */
export const dco = {
  sent: detail({ ...nextForDco, prFix: { kind: 'SIGN_OFF', state: 'DONE', note: null, at } }),
  byHand: detail({ ...nextForDco, openedBy: 'HAND' }),
  failed: detail({
    ...nextForDco,
    prFix: { kind: 'SIGN_OFF', state: 'FAILED', note: 'The force-push was refused: the branch is protected.', at },
  }),
};

/** The repo left Contribute: our PRs left unanswered there, or it said no to AI-made pull requests. */
export const repoOut = {
  prMisses: afterRun({
    needsYou: { since: NOW.toISOString(), signals: [signal('REPO_OUT', { detail: 'pr_misses' })] },
  }),
  saidNo: afterRun({
    needsYou: {
      since: NOW.toISOString(),
      signals: [signal('CHANGES_REQUESTED'), signal('REPO_OUT', { detail: 'closed_no_ai' })],
    },
  }),
};

/** A pull request opened by hand: comments wait, no run may take them. */
export const handOpened = {
  commentsOnly: detail({ ...nextForRun, needsYou: null, openedBy: 'HAND' }),
  changes: detail({ ...nextForRun, reviewFeedback: null, openedBy: 'HAND' }),
};

/** The proof's stages not drawn elsewhere: unreadable, posting, the ask gone. */
export const proof = {
  unreadable: detail({
    ...nextForProof.review,
    proof: {
      ...nextForProof.review.proof!,
      session: proofSession({
        state: 'REVIEW',
        stateAt: '2026-10-28T11:46:00.000Z',
        result: proofResult({ section: null }),
      }),
    },
  }),
  posting: detail({
    ...nextForProof.review,
    proof: {
      ...nextForProof.review.proof!,
      session: proofSession({
        state: 'POSTING',
        stateAt: '2026-10-28T11:55:00.000Z',
        result: proofResult(),
        post: { step: 'BODY', commitSha: '3f2a9c1e', bodyAt: null, commentUrl: null, error: null },
      }),
    },
  }),
  askCleared: detail({
    ...nextForProof.review,
    needsYou: null,
    proof: {
      ask: null,
      session: proofSession({ state: 'DISCARDED', stateAt: '2026-10-28T11:00:00.000Z', endedReason: 'ASK_CLEARED' }),
    },
  }),
};

/** Several moves at once on the next step: the proof, a title rule, and review comments. */
export const severalMoves = detail({
  ...nextForProof.review,
  prIssues: [titleIssue],
  reviewFeedback: {
    threads: [
      feedbackThread(),
      feedbackThread({
        threadId: 'T_2',
        commentId: 'C_2',
        author: 'maintainer-mo',
        bot: false,
        excerpt: 'Name it rootPath.',
      }),
    ],
    readAt: '2026-10-28T11:45:00.000Z',
  },
});

/** The first attempt's own states: back for approval, GitHub access, a claim refused, discarded, submitting. */
export const firstAttempt = {
  backForApproval: detail({
    submit: {
      step: 'PUSH',
      waitUntil: null,
      fork: 'octocat/driftwood',
      branch: 'gitranks/871-nested-layouts',
      lastError: error('transient', 'The push to your fork timed out. Approve again in a minute.'),
      steps: [
        { step: 'FORK', startedAt: '2026-10-28T11:20:00.000Z', doneAt: '2026-10-28T11:20:30.000Z' },
        { step: 'SYNC', startedAt: '2026-10-28T11:20:30.000Z', doneAt: '2026-10-28T11:21:00.000Z' },
      ],
    },
    approval: attempts.bounced.approval,
  }),
  repoBusy: detail({
    submit: {
      step: 'QUEUED',
      waitUntil: null,
      fork: null,
      branch: null,
      lastError: error(
        'repo_busy',
        'The repo has 3 open pull requests from GitRanks, its limit. It takes one more once one is merged or closed.',
      ),
    },
  }),
  grant: detail({
    submit: {
      step: 'FORK',
      waitUntil: null,
      fork: null,
      branch: null,
      lastError: error('grant_missing', 'GitRanks has no access to open pull requests in your name yet.'),
    },
  }),
  claimRefused: detail({
    state: 'DISCARDED',
    endReason: 'CANCELLED',
    endDetail: 'repo_no_gfi',
    patch: null,
    result: null,
  }),
  cancelled: detail({ state: 'DISCARDED', endReason: 'CANCELLED', patch: null, result: null }),
  submitting: detail({
    state: 'SUBMITTING',
    approvedAt: '2026-10-28T11:20:00.000Z',
    submit: {
      step: 'PUSH',
      waitUntil: null,
      fork: 'octocat/driftwood',
      branch: 'gitranks/871-nested-layouts',
      lastError: null,
      steps: [
        { step: 'FORK', startedAt: '2026-10-28T11:58:00.000Z', doneAt: '2026-10-28T11:58:20.000Z' },
        { step: 'SYNC', startedAt: '2026-10-28T11:58:20.000Z', doneAt: '2026-10-28T11:58:40.000Z' },
      ],
      stepStartedAt: '2026-10-28T11:58:40.000Z',
    },
  }),
  ownBounced: detail({
    ...ownAgentAttempt,
    leaseUntil: '2026-10-29T12:00:00.000Z',
    sendBacksLeft: 2,
    submit: {
      step: 'PULL_REQUEST',
      waitUntil: null,
      fork: 'octocat/driftwood',
      branch: 'gitranks/871',
      lastError: error('invalid', 'GitHub refused the pull request: its title is empty.'),
    },
  }),
};

/** A run's states the head draws: working, its review's variants, a push back, GitHub access, done with no commits. */
export const runs = {
  working: followUp({
    state: 'RUNNING',
    patch: null,
    replyDrafts: [],
    events: [
      { state: 'QUEUED', detail: 'user', at: '2026-10-28T11:50:00.000Z' },
      { state: 'RUNNING', detail: 'go: sent', at: '2026-10-28T11:52:00.000Z' },
    ],
    createdAt: '2026-10-28T11:50:00.000Z',
    costUsd: 0.31,
  }),
  testsFailed: runInReview({
    checkStatus: { status: 'FAILED', note: 'test/layout-cache.spec.ts failed on the root path' },
  }),
  blocked: runInReview({ checkStatus: { status: 'BLOCKED', note: 'The commits change a workflow file.' } }),
  bounced: runInReview({
    submit: {
      step: 'PUSH',
      waitUntil: null,
      fork: 'octocat/driftwood',
      branch: 'b',
      lastError: error('transient', 'GitHub did not answer the push. Approve again.'),
    },
  }),
  bouncedOrg: runInReview({
    submit: {
      step: 'PUSH',
      waitUntil: null,
      fork: 'octocat/driftwood',
      branch: 'b',
      lastError: error('org_restricted', "The repository's organization only lets apps it approved push there."),
    },
  }),
  branchConflict: runInReview({
    submit: {
      step: 'PUSH',
      waitUntil: null,
      fork: 'octocat/driftwood',
      branch: 'b',
      lastError: error('branch_conflict', 'The branch has commits GitRanks did not push.'),
    },
  }),
  grant: runInReview({
    submit: {
      step: 'PUSH',
      waitUntil: null,
      fork: null,
      branch: null,
      lastError: error('grant_revoked', 'GitHub says the access was revoked.'),
    },
  }),
  autopilot: runInReview({ state: 'PENDING_AUTOSUBMIT', autosubmitAt: '2026-10-28T12:42:00.000Z' }),
  doneNoCommits: runDone([posted('D_1'), posted('D_2', { resolveState: 'RESOLVED' })], {
    patch: null,
    round: followUpRun({ pushedSha: null, fixed: 0, skipped: 2, replied: 2 }),
  }),
};

/** A first attempt with drafts of a run its rail does not show (an older API). */
export const firstWithDrafts = afterRun({
  replyDrafts: [
    replyDraft({ draftId: 'D_9', attemptId: 'A_F0' }),
    replyDraft({
      draftId: 'D_8',
      attemptId: 'A_F0',
      comment: null,
      text: 'Thanks, done.',
      state: 'FAILED',
      lastError: error('not_found', 'The comment is gone.'),
    }),
  ],
});

/** Twenty-two waiting threads, every one set to Address. */
export const manyThreads = detail({
  ...nextForRun,
  needsYou: null,
  reviewFeedback: {
    threads: Array.from({ length: 22 }, (_, index) =>
      feedbackThread({
        threadId: `T_${index}`,
        commentId: `C_${index}`,
        line: index + 1,
        excerpt: `Nit ${index + 1}.`,
      }),
    ),
    readAt: '2026-10-28T11:45:00.000Z',
  },
});

/** A pull request now closed: two of run 1's replies failed for one reason. */
export const closedWithRefusals = afterRun({
  state: 'CLOSED',
  pullRequest: pullRequest({ state: 'CLOSED', closedAt: at }),
});

/** Drafts with no outcome (an older API), in review with commits. */
export const olderReview = followUp({
  replyDrafts: [replyDraft(), replyDraft({ draftId: 'D_2', comment: null, text: 'Fixed the lint.' })],
});

/** A reply in a state this page does not know. */
export const unknownState = () => [posted('D_1'), flowDraft({ draftId: 'D_2', state: 'ARCHIVED' as never })];
