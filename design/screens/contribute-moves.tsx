import type { ReactElement, ReactNode } from 'react';

import type { ScreenState } from '../registry';
import { ReviewComments } from '@/app/contribute/components/review-comments';
import { ReviewScreen } from '@/app/contribute/components/review-view';
import { SessionActionsProvider, type SessionActionsSeed } from '@/app/contribute/components/session-actions';
import {
  decisionAttempts,
  flowDraft,
  followUp,
  followUpAttempts,
  ownAgentAttempt,
  replyDraft,
} from '@/lib/contribute/__fixtures__/contribute-attempts';
import { NOW, views } from '@/lib/contribute/__fixtures__/contribute-views';
import { prNotes } from '@/lib/contribute/__fixtures__/maintainers';
import { nextForProof, nextForRun, nextForSilent, nextForYou } from '@/lib/contribute/__fixtures__/needs-you';
import { commentsInit, notPosted, posted, waitingThreads } from '@/lib/contribute/__fixtures__/review-comments';
import {
  afterRun,
  closedWithRefusals,
  dco,
  firstAttempt,
  firstWithDrafts,
  handOpened,
  leftOut,
  manyThreads,
  mixedRefusals,
  noGrant,
  olderReview,
  oneRefused,
  orgRefusedRun,
  proof,
  repoOut,
  rules,
  runDone,
  runEnded,
  runInReview,
  runs,
  severalMoves,
  underWay,
  unknownState,
  waitingOf,
} from '@/lib/contribute/__fixtures__/session-head';
import type { ContributeAttemptDetail, ContributeReplyDraft, ContributeView } from '@/lib/contribute/contribute.types';
import { orgAccessOf } from '@/lib/contribute/org-access';

/**
 * The contribution page's session head (a status line, or one move card with Also waiting) and its review comments, in
 * each state the catalogue draws. `page` frames a page as the Contribute layout does.
 */

type Page = (children: ReactNode) => ReactElement;

const A_DAY_ON = '2026-10-29T12:00:00.000Z';

/** A run's page: the run, read beside its first attempt, with its waiting replies. */
const runPage = (
  page: Page,
  run: ContributeAttemptDetail,
  {
    first = run.state === 'REVIEW' || run.state === 'PENDING_AUTOSUBMIT' ? underWay(run) : afterRun(),
    drafts,
    view = views.active,
  }: { first?: ContributeAttemptDetail; drafts?: ContributeReplyDraft[]; view?: ContributeView } = {},
) =>
  page(
    <ReviewScreen
      view={view}
      attempt={run}
      first={first}
      current={first.followUps?.currentAttemptId === run.attemptId ? run : undefined}
      replies={waitingOf(drafts ?? run.replyDrafts ?? [], run.state === 'REVIEW' || run.state === 'PENDING_AUTOSUBMIT')}
      resolveHumans={false}
      now={NOW}
    />,
  );

/** The first attempt's page, or its next step. */
const firstPage = (
  page: Page,
  first: ContributeAttemptDetail,
  {
    next = false,
    view = views.active,
    seed,
    move,
    stopped = false,
  }: { next?: boolean; view?: ContributeView; seed?: SessionActionsSeed; move?: string; stopped?: boolean } = {},
) =>
  page(
    <ReviewScreen
      view={view}
      attempt={first}
      next={next}
      move={move}
      seed={seed}
      prNotes={stopped ? prNotes({ stopped: { login: 'sam-w', at: '2026-10-28T11:04:00.000Z' } }) : undefined}
      now={NOW}
    />,
  );

/** The user's own agent has called GitRanks. */
const connected: ContributeView = {
  ...views.active,
  ownAgent: { paths: { hosted: true, mcp: true }, tokens: [] },
};

const NEXT = '/contribute/attempts/A_1?session=next';
const FIRST = '/contribute/attempts/A_1';
const RUN = '/contribute/attempts/A_1/runs/A_F1';

/** The session head's states: each status line, move card and variant. */
export const sessionHeadStates = (page: Page): ScreenState[] => [
  {
    id: 'replies-refused-org',
    title: 'Run 1 pushed; the organization refused its 7 replies: one card, rows say "Not posted"',
    path: RUN,
    height: 2200,
    render: () => runPage(page, runDone(orgRefusedRun())),
  },
  {
    id: 'replies-refused-mixed',
    title: 'Replies refused for two shared reasons, one retryable, and one alone',
    path: RUN,
    height: 2100,
    render: () => runPage(page, runDone(mixedRefusals())),
  },
  {
    id: 'reply-failed-alone',
    title: 'One reply did not post: the card says so, its row says why',
    path: RUN,
    height: 1900,
    render: () => runPage(page, runDone(oneRefused())),
  },
  {
    id: 'several-moves',
    title: 'Several moves: the comments lead; a title rule and the proof under Also waiting',
    path: NEXT,
    height: 2600,
    render: () => firstPage(page, severalMoves, { next: true, view: connected }),
  },
  {
    id: 'hard-stop',
    title: 'A maintainer stopped GitRanks work: said once in the header, the card offers GitHub only',
    path: NEXT,
    height: 1700,
    render: () => firstPage(page, nextForRun, { next: true, stopped: true }),
  },
  {
    id: 'grant',
    title: 'The submit asks for GitHub access',
    path: FIRST,
    height: 2600,
    render: () => firstPage(page, firstAttempt.grant, { view: noGrant }),
  },
  {
    id: 'grant-run',
    title: "A run's push asks for GitHub access again",
    path: RUN,
    height: 2100,
    render: () => runPage(page, runs.grant, { view: noGrant }),
  },
  {
    id: 'own-review-send-back',
    title: 'Your own agent’s change: write the pull request, or send it back with a note',
    path: FIRST,
    height: 2000,
    render: () => firstPage(page, { ...ownAgentAttempt, leaseUntil: A_DAY_ON, sendBacksLeft: 2 }),
  },
  {
    id: 'own-review-bounced',
    title: 'Your own agent’s change came back from GitHub',
    path: FIRST,
    height: 2600,
    render: () => firstPage(page, firstAttempt.ownBounced),
  },
  {
    id: 'review-form-open',
    title: 'The pull request form open: the card draws no primary, Submit is the one',
    path: FIRST,
    height: 2600,
    render: () => firstPage(page, decisionAttempts.went, { seed: { formOpen: true } }),
  },
  {
    id: 'run-ready',
    title: 'A run ready: push its commits and post its replies',
    path: RUN,
    height: 2400,
    render: () => runPage(page, runInReview()),
  },
  {
    id: 'run-ready-tests-failed',
    title: 'A run whose test failed: push anyway, or discard it',
    path: RUN,
    height: 2400,
    render: () => runPage(page, runs.testsFailed),
  },
  {
    id: 'run-blocked',
    title: 'Our checks block a run’s commits',
    path: RUN,
    height: 2300,
    render: () => runPage(page, runs.blocked),
  },
  {
    id: 'run-bounced',
    title: 'A run’s push did not go through',
    path: RUN,
    height: 2300,
    render: () => runPage(page, runs.bounced),
  },
  {
    id: 'run-bounced-org',
    title: 'A run’s push the organization refused (amber)',
    path: RUN,
    height: 2300,
    render: () => runPage(page, runs.bouncedOrg),
  },
  {
    id: 'run-bounced-branch-conflict',
    title: 'Someone pushed to the branch: discard, then the next run',
    path: RUN,
    height: 2300,
    render: () => runPage(page, runs.branchConflict),
  },
  {
    id: 'replies',
    title: 'Replies left out of the push, still to post',
    path: RUN,
    height: 1900,
    render: () => runPage(page, runDone(leftOut())),
  },
  {
    id: 'found',
    title: 'A bot blocks the merge and run 1 left the rest to you',
    path: NEXT,
    height: 1500,
    render: () => firstPage(page, nextForYou, { next: true }),
  },
  {
    id: 'run-stopped',
    title: 'Run 1 stopped: try run 2, or handle it yourself',
    path: NEXT,
    height: 1500,
    render: () => firstPage(page, runEnded('STOPPED', 'It reached your $5 limit per run.'), { next: true }),
  },
  {
    id: 'push-failed',
    title: 'Run 1’s commits were not pushed',
    path: NEXT,
    height: 1500,
    render: () => firstPage(page, runEnded('PUSH_FAILED', 'The branch moved while it worked.'), { next: true }),
  },
  {
    id: 'rules-several',
    title: 'The pull request breaks three of the repo’s rules',
    path: NEXT,
    height: 1900,
    render: () => firstPage(page, rules.several, { next: true }),
  },
  {
    id: 'rules-title-signal-only',
    title: 'A title the repo flags with no fix read, among the rules',
    path: NEXT,
    height: 1700,
    render: () => firstPage(page, rules.titleSignalOnly, { next: true }),
  },
  {
    id: 'rules-fix-failed',
    title: 'A retitle that did not go through',
    path: NEXT,
    height: 1500,
    render: () => firstPage(page, rules.fixFailed, { next: true }),
  },
  {
    id: 'rules-cla-only',
    title: 'A CLA to sign, read from the repo’s rules alone',
    path: NEXT,
    height: 1400,
    render: () => firstPage(page, rules.claOnly, { next: true }),
  },
  {
    id: 'dco-sent',
    title: 'Signed off and pushed: waiting for the DCO check',
    path: NEXT,
    height: 1400,
    render: () => firstPage(page, dco.sent, { next: true }),
  },
  {
    id: 'dco-by-hand',
    title: 'Sign off your own commits, by hand',
    path: NEXT,
    height: 1500,
    render: () => firstPage(page, dco.byHand, { next: true }),
  },
  {
    id: 'dco-failed',
    title: 'The sign-off did not go through',
    path: NEXT,
    height: 1500,
    render: () => firstPage(page, dco.failed, { next: true }),
  },
  {
    id: 'silent',
    title: 'No answer in 30 days: keep it open',
    path: NEXT,
    height: 1400,
    render: () => firstPage(page, nextForSilent, { next: true }),
  },
  {
    id: 'repo-out-pr-misses',
    title: 'The repo is out of Contribute: close the pull request or keep it open',
    path: NEXT,
    height: 1400,
    render: () => firstPage(page, repoOut.prMisses, { next: true }),
  },
  {
    id: 'repo-said-no',
    title: 'The repo said no to AI-made pull requests: no run, the GitHub variant',
    path: NEXT,
    height: 1500,
    render: () => firstPage(page, repoOut.saidNo, { next: true }),
  },
  {
    id: 'comments-wait-no-run',
    title: 'Opened by hand: comments wait, no run may take them',
    path: NEXT,
    height: 1500,
    render: () => firstPage(page, handOpened.commentsOnly, { next: true }),
  },
  {
    id: 'hand-opened-next-step',
    title: 'Opened by hand: the "Next step" tile and its GitHub card',
    path: NEXT,
    height: 1400,
    render: () => firstPage(page, handOpened.changes, { next: true }),
  },
  {
    id: 'proof-unreadable',
    title: 'Proof from your agent: it can’t be shown',
    path: NEXT,
    height: 1400,
    render: () => firstPage(page, proof.unreadable, { next: true, view: connected }),
  },
  {
    id: 'proof-failed',
    title: 'Proof from your agent: posting failed',
    path: NEXT,
    height: 1400,
    render: () => firstPage(page, nextForProof.failed, { next: true, view: connected }),
  },
  {
    id: 'proof-posting',
    title: 'Proof from your agent: posting it',
    path: NEXT,
    height: 1300,
    render: () => firstPage(page, proof.posting, { next: true, view: connected }),
  },
  {
    id: 'proof-ask-cleared',
    title: 'The bot no longer asks for proof',
    path: NEXT,
    height: 1300,
    render: () => firstPage(page, proof.askCleared, { next: true, view: connected }),
  },
  {
    id: 'claim-refused',
    title: 'The repo’s rules refused the claim',
    path: FIRST,
    height: 1300,
    render: () => firstPage(page, firstAttempt.claimRefused),
  },
  {
    id: 'discarded-cancelled',
    title: 'Cancelled before it finished',
    path: FIRST,
    height: 1300,
    render: () => firstPage(page, firstAttempt.cancelled),
  },
  {
    id: 'submit-pending',
    title: 'Submitting from the form: the card’s Discard waits',
    path: FIRST,
    height: 2600,
    render: () => firstPage(page, decisionAttempts.went, { seed: { pending: 'submit', formOpen: true } }),
  },
  {
    id: 'submit-error',
    title: 'The submit failed: its error in the card',
    path: FIRST,
    height: 2000,
    render: () =>
      firstPage(page, decisionAttempts.went, {
        seed: {
          error: {
            source: 'submit',
            text: 'Your PR could not be opened: the connection failed. Your title and description are as you left them. Submit again.',
          },
        },
      }),
  },
  {
    id: 'run-working',
    title: 'A run fixing: its line and its steps',
    path: RUN,
    height: 1300,
    render: () => runPage(page, runs.working, { first: underWay(runs.working) }),
  },
  {
    id: 'submitting',
    title: 'Opening your pull request: its steps as a bar',
    path: FIRST,
    height: 1300,
    render: () => firstPage(page, firstAttempt.submitting),
  },
  {
    id: 'back-for-approval',
    title: 'Back for your approval: the push to your fork failed',
    path: FIRST,
    height: 2600,
    render: () => firstPage(page, firstAttempt.backForApproval),
  },
  {
    id: 'back-for-approval-repo-busy',
    title: 'Back for your approval: the repo takes no more pull requests for now',
    path: FIRST,
    height: 2600,
    render: () => firstPage(page, firstAttempt.repoBusy),
  },
  {
    id: 'autopilot-countdown',
    title: 'Autopilot opens the pull request in 42 minutes',
    path: FIRST,
    height: 1900,
    render: () => firstPage(page, followUpAttempts.pendingAutosubmit),
  },
  {
    id: 'run-done-no-commits',
    title: 'A run with replies only, posted',
    path: RUN,
    height: 1700,
    render: () => runPage(page, runs.doneNoCommits),
  },
  {
    id: 'retry-boost',
    title: 'The check ran out: retry with a bigger budget',
    path: FIRST,
    height: 1400,
    render: () => firstPage(page, decisionAttempts.ranOut),
  },
  {
    id: 'nothing-waits',
    title: 'The next step with nothing waiting: start a run anyway',
    path: NEXT,
    height: 1200,
    render: () => firstPage(page, afterRun(), { next: true }),
  },
  {
    id: 'move-elsewhere',
    title: 'The first attempt: its line points at the move on the next step',
    path: FIRST,
    height: 1500,
    render: () => firstPage(page, nextForYou),
  },
];

/** The review comments list alone, in its provider: a group drawn open. */
const commentsAlone = (page: Page, children: ReactNode) =>
  page(<div className="mx-auto w-full max-w-4xl px-4 pt-7 pb-16">{children}</div>);

/** The review comments' states: each mode and row state the list draws. */
export const reviewCommentStates = (page: Page): ScreenState[] => [
  {
    id: 'replies-all-resolved',
    title: 'Every thread resolved on GitHub',
    path: RUN,
    height: 1500,
    render: () =>
      runPage(
        page,
        runDone(
          Array.from({ length: 7 }, (_, index) =>
            flowDraft({ draftId: `D_${index}`, state: 'DISMISSED', dismissedReason: 'THREAD_RESOLVED' }),
          ),
        ),
      ),
  },
  ...[1280, 390].map((width) => ({
    id: width === 390 ? 'replies-after-push-phone' : 'replies-after-push',
    title: `Posted, resolved, left for GitHub, no reply, resolved on GitHub${width === 390 ? ' · phone' : ''}`,
    path: RUN,
    width,
    height: width === 390 ? 2600 : 1700,
    render: () =>
      runPage(
        page,
        runDone([
          posted('D_1'),
          posted('D_2', { resolveState: 'RESOLVED' }),
          flowDraft({ draftId: 'D_3', outcome: 'NEEDS_YOU', text: '', reason: 'Keep the slash, or drop it?' }),
          flowDraft({ draftId: 'D_4', outcome: 'SKIPPED', text: '' }),
          flowDraft({ draftId: 'D_5', state: 'DISMISSED', dismissedReason: 'THREAD_RESOLVED' }),
        ]),
      ),
  })),
  {
    id: 'replies-resolve-failed',
    title: 'Two threads not resolved for one reason (one line), one alone (its note)',
    path: RUN,
    height: 1700,
    render: () =>
      runPage(
        page,
        runDone([
          posted('D_1', {
            resolveState: 'FAILED',
            lastError: { reason: 'forbidden', note: 'GitRanks may not resolve threads here.', at: '' },
          }),
          posted('D_2', {
            resolveState: 'FAILED',
            lastError: { reason: 'forbidden', note: 'GitRanks may not resolve threads here.', at: '' },
          }),
          posted('D_3', {
            resolveState: 'FAILED',
            lastError: { reason: 'transient', note: 'GitHub did not answer the resolve.', at: '' },
          }),
        ]),
      ),
  },
  {
    id: 'replies-closed-pr',
    title: 'A closed PR: two replies failed for one reason, said once in the list',
    path: RUN,
    height: 1600,
    render: () =>
      runPage(page, runDone([notPosted('D_1', 'transient'), notPosted('D_2', 'transient')]), {
        first: closedWithRefusals,
      }),
  },
  {
    id: 'comments-over-limit',
    title: 'More than 20 comments set to Address',
    path: NEXT,
    height: 2600,
    render: () => firstPage(page, manyThreads, { next: true }),
  },
  {
    id: 'comments-ignored-open',
    title: 'The Ignored group open',
    path: NEXT,
    height: 900,
    render: () =>
      commentsAlone(
        page,
        <SessionActionsProvider init={commentsInit({ session: 'next', runState: null, threads: waitingThreads() })}>
          <ReviewComments
            mode="waiting"
            threads={waitingThreads()}
            readAt="2026-10-28T11:48:00.000Z"
            prNumber={1419}
            org="driftwood-js"
            blocked={new Set()}
            prOpen
            grantConnected
            grantAvailable
            cardReasons={{}}
            cardShown
            orgAccess={orgAccessOf()}
            now={NOW}
            defaultOpen={['ignored']}
          />
        </SessionActionsProvider>,
      ),
  },
  {
    id: 'replies-older-api',
    title: 'A run’s drafts from an API without outcomes',
    path: RUN,
    height: 1900,
    render: () => runPage(page, olderReview),
  },
  {
    id: 'reply-own-as-comment',
    title: 'One reply refused in its thread: post it as a comment instead',
    path: RUN,
    height: 1800,
    render: () => runPage(page, runDone([posted('D_1'), notPosted('D_2', 'forbidden')])),
  },
  {
    id: 'reply-draft-not-sent',
    title: 'A reply left out of the push, still to post',
    path: RUN,
    height: 1700,
    render: () => runPage(page, runDone([posted('D_1'), replyDraft({ draftId: 'D_2', send: false })])),
  },
  {
    id: 'reply-unknown-state',
    title: 'A reply in a state this page does not know',
    path: RUN,
    height: 1600,
    render: () => runPage(page, runDone(unknownState())),
  },
  {
    id: 'replies-autopilot',
    title: 'A run waiting for autopilot: its replies read-only',
    path: RUN,
    height: 2000,
    render: () => runPage(page, runs.autopilot),
  },
  {
    id: 'replies-run-discarded',
    title: 'A discarded run with commits: "Nothing posted", rows read-only',
    path: RUN,
    height: 1700,
    render: () =>
      runPage(page, followUp({ state: 'DISCARDED', endReason: 'USER', replyDrafts: runInReview().replyDrafts })),
  },
  {
    id: 'first-attempt-drafts',
    title: 'The first attempt’s drafts of a run without a tile',
    path: FIRST,
    height: 1700,
    render: () => firstPage(page, firstWithDrafts),
  },
];

/** Two states drawn anew: a run in review with a question and a bot's thread, and the waiting comments. */
export const changedCommentStates = {
  followUpRun: (page: Page) => runPage(page, { ...runInReview(), attemptId: 'A_F1' }),
  nextRound: (page: Page) =>
    firstPage(
      page,
      {
        ...followUpAttempts.prNeedsYou,
        reviewFeedback: { threads: waitingThreads(), readAt: '2026-10-28T11:48:00.000Z' },
      },
      { next: true },
    ),
};
