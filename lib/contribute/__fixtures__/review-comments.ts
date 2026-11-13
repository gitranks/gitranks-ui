import type { CommentActionsInit } from '../comment-actions';
import type { ContributeFeedbackThread, ContributeReplyDraft } from '../contribute.types';
import { feedbackThread, flowDraft } from './contribute-attempts';

/**
 * Review comments in every state the list draws (made-up repos, accounts and text): replies refused for one reason
 * and for several, posted and resolved, a run's review with a question, waiting threads, an older API's drafts.
 */

const at = '2026-10-28T11:59:00.000Z';

/** A reply that did not post, for `reason`, on a person's thread by default. */
export const notPosted = (draftId: string, reason: string, patch: Partial<ContributeReplyDraft> = {}) =>
  flowDraft({
    draftId,
    bot: false,
    comment: {
      commentId: `C_${draftId}`,
      author: 'maintainer-mo',
      path: 'src/router/normalize-path.ts',
      line: 3,
      excerpt: 'Should the root path keep its slash?',
    },
    prefix: 'Fixed in 46de700: ',
    body: 'Fixed in 46de700: Kept it, with a test.',
    text: 'Kept it, with a test.',
    commentUrl: 'https://github.com/driftwood-js/driftwood/pull/1419#discussion_r901',
    state: 'FAILED',
    canPostAsComment: reason === 'org_restricted' || reason === 'forbidden',
    lastError: { reason, note: `GitHub did not take it (${reason}). Post it yourself.`, at },
    ...patch,
  });

/** A reply that posted. */
export const posted = (draftId: string, patch: Partial<ContributeReplyDraft> = {}) =>
  flowDraft({
    draftId,
    state: 'POSTED',
    posted: true,
    postedAt: at,
    url: `https://github.com/driftwood-js/driftwood/pull/1419#discussion_r${draftId}`,
    ...patch,
  });

/** Seven replies the organization refused in their threads. */
export const orgRefused = (): ContributeReplyDraft[] =>
  Array.from({ length: 7 }, (_, index) => notPosted(`D_${index + 1}`, 'org_restricted'));

/** Every reply's thread resolved on GitHub after the run. */
export const allResolved = (): ContributeReplyDraft[] =>
  Array.from({ length: 7 }, (_, index) =>
    flowDraft({ draftId: `D_${index + 1}`, state: 'DISMISSED', dismissedReason: 'THREAD_RESOLVED' }),
  );

/** After the push: posted, resolved, left for GitHub, no reply, resolved on GitHub. */
export const afterPush = (): ContributeReplyDraft[] => [
  posted('D_1'),
  posted('D_2', { resolveState: 'RESOLVED' }),
  flowDraft({ draftId: 'D_3', outcome: 'NEEDS_YOU', text: '', reason: 'Keep the slash, or drop it?' }),
  flowDraft({ draftId: 'D_4', outcome: 'SKIPPED', text: '' }),
  flowDraft({ draftId: 'D_5', state: 'DISMISSED', dismissedReason: 'THREAD_RESOLVED' }),
];

/** A run's review: a question with no answer, one answered, a bot's fixed thread, a person's, a top-level comment. */
export const inReview = (): ContributeReplyDraft[] => [
  flowDraft({ draftId: 'D_Q', outcome: 'NEEDS_YOU', text: '', reason: 'Trim too, or only collapse?' }),
  flowDraft({ draftId: 'D_A', outcome: 'NEEDS_YOU', text: 'Only collapse.', reason: 'Trim too?' }),
  flowDraft({ draftId: 'D_B' }),
  flowDraft({
    draftId: 'D_P',
    bot: false,
    comment: {
      commentId: 'C_P',
      author: 'maintainer-mo',
      path: 'src/router/layout-cache.ts',
      line: 12,
      excerpt: 'Name it rootPath.',
    },
  }),
  flowDraft({ draftId: 'D_T', comment: null, text: 'Pushed a fix for the lint check.', outcome: 'FIXED', bot: false }),
];

/** Waiting threads on the next step: two to address, one ignored in an earlier run. */
export const waitingThreads = (): ContributeFeedbackThread[] => [
  feedbackThread(),
  feedbackThread({
    threadId: 'T_2',
    commentId: 'C_2',
    author: 'maintainer-mo',
    bot: false,
    path: 'src/router/layout-cache.ts',
    line: 40,
    excerpt: 'This cache never evicts.',
  }),
  feedbackThread({ threadId: 'T_3', commentId: 'C_3', excerpt: 'Prefer early returns.', ignored: true }),
];

/** The provider's read for a run's comments. */
export const commentsInit = (patch: Partial<CommentActionsInit> = {}): CommentActionsInit => ({
  session: { runId: 'A_F1' },
  prId: 'PR_1',
  prNumber: 1419,
  attemptId: 'A_F1',
  runState: 'DONE',
  approvedAt: null,
  flow: true,
  checkStatus: 'PASSED',
  hasCommits: true,
  drafts: [],
  threads: [],
  resolveHumans: false,
  blocked: new Set(),
  canStart: true,
  ...patch,
});
