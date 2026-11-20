import type { ReactElement, ReactNode } from 'react';

import type { ScreenState } from '../registry';
import { ReviewComments } from '@/components/workspace/pull-request/review-comments';
import { ReviewScreen } from '@/components/workspace/pull-request/review-view';
import { SessionActionsProvider, type SessionActionsSeed } from '@/components/workspace/pull-request/session-actions';
import {
  decisionAttempts,
  flowDraft,
  followUp,
  followUpAttempts,
  noReplyDraft,
  replyDraft,
} from '@/lib/contribute/__fixtures__/contribute-attempts';
import { NOW, views } from '@/lib/contribute/__fixtures__/contribute-views';
import { prNotes } from '@/lib/contribute/__fixtures__/maintainers';
import {
  nextForCheckYours,
  nextForConversation,
  nextForProof,
  nextForRun,
  nextForSilent,
  nextForYou,
} from '@/lib/contribute/__fixtures__/needs-you';
import { commentsInit, notPosted, posted, waitingThreads } from '@/lib/contribute/__fixtures__/review-comments';
import {
  afterRun,
  closedWithRefusals,
  dco,
  firstAttempt,
  firstWithDrafts,
  handOpened,
  heldBackRun,
  leftOut,
  manyThreads,
  mixedRefusals,
  noGrant,
  olderReview,
  oneCommentFailed,
  oneCommentPlan,
  oneRefused,
  orgRefusedOneComment,
  postedInOneComment,
  proof,
  repoOut,
  rules,
  runDone,
  runEnded,
  runInReview,
  runReadyFirstInOrg,
  runs,
  severalMoves,
  underWay,
  unknownState,
  waitingForProbe,
  waitingOf,
} from '@/lib/contribute/__fixtures__/session-head';
import type { ContributeAttemptDetail, ContributeReplyDraft, ContributeView } from '@/lib/workspace/contribute.types';
import { orgAccessOf } from '@/lib/workspace/org-access';

/**
 * The contribution page's session head (a status line, or one move card with Also waiting) and its review comments, in
 * each state the catalogue draws. `page` frames a page as the Contribute layout does.
 */

type Page = (children: ReactNode) => ReactElement;

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

const NEXT = '/my/pull-requests/driftwood-js/driftwood/871?session=next';
const FIRST = '/my/pull-requests/driftwood-js/driftwood/871';
const RUN = '/my/pull-requests/driftwood-js/driftwood/871/runs/A_F1';

/** The session head's states: each status line, move card and variant. */
export const sessionHeadStates = (page: Page): ScreenState[] => [
  {
    id: 'replies-refused-mixed',
    title: 'Replies refused for two shared reasons, one retryable, and one alone',
    path: RUN,
    height: 2100,
    render: () => runPage(page, runDone(mixedRefusals())),
  },
  {
    id: 'replies-one-comment',
    title: 'The organization refused 7 replies in their threads: post them as one comment, copy them, or dismiss them',
    path: RUN,
    height: 2200,
    render: () => runPage(page, runDone(orgRefusedOneComment(), oneCommentPlan())),
  },
  {
    id: 'replies-one-comment-alone',
    title: 'One reply refused in its thread: post it as a comment, quoting its thread',
    path: RUN,
    height: 1900,
    render: () => runPage(page, runDone(orgRefusedOneComment().slice(0, 1), oneCommentPlan(1))),
  },
  {
    id: 'replies-one-comment-unanswered',
    title: 'The one comment got no clear answer: Try again sends it exactly as before',
    path: RUN,
    height: 2200,
    render: () => {
      const { drafts, plan } = oneCommentFailed(
        'no_answer',
        'GitHub did not answer clearly, so the comment may be there already. Try again: it is sent exactly as before and never posted twice.',
        'RESEND',
      );
      return runPage(page, runDone(drafts, plan));
    },
  },
  {
    id: 'replies-one-comment-refused',
    title: 'GitHub refused the one comment too: copy the replies, or dismiss them',
    path: RUN,
    height: 2200,
    render: () => {
      const { drafts, plan } = oneCommentFailed(
        'org_restricted',
        "GitHub refused the comment too: this repository's organization keeps GitRanks Contribute from commenting here. Copy the replies and post them on the pull request yourself.",
        null,
      );
      return runPage(page, runDone(drafts, plan));
    },
  },
  {
    id: 'replies-held-back',
    title: 'The first reply did not reach its thread: the other 6 were held back, to post as one comment',
    path: RUN,
    height: 2200,
    render: () => {
      const { drafts, plan } = heldBackRun();
      return runPage(page, runDone(drafts, plan));
    },
  },
  {
    id: 'replies-wait-for-probe',
    title: 'After the push: the first reply on its way to its thread, the others wait for it',
    path: RUN,
    height: 1800,
    render: () => runPage(page, runDone(waitingForProbe(), { probeFirst: true })),
  },
  {
    id: 'replies-posted-one-comment',
    title: 'The 7 replies posted in one comment',
    path: RUN,
    height: 1800,
    render: () => runPage(page, runDone(postedInOneComment(), { probeFirst: true })),
  },
  {
    id: 'run-ready-first-in-org',
    title: 'A run ready in an organization where no reply of GitRanks has posted yet',
    path: RUN,
    height: 2400,
    render: () => runPage(page, runReadyFirstInOrg()),
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
    id: 'own-review-bounced',
    title: 'Your own agent’s change came back from GitHub',
    path: FIRST,
    height: 2600,
    render: () => firstPage(page, firstAttempt.ownBounced),
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
    id: 'conversation',
    title: 'A new comment in the conversation: read it, reply on GitHub, a run one disclosure away',
    path: NEXT,
    height: 1400,
    render: () => firstPage(page, nextForConversation, { next: true }),
  },
  {
    id: 'check-yours',
    title: 'Checks only you can clear, and under the pull request’s line the failing ones that call nobody',
    path: NEXT,
    height: 1500,
    render: () => firstPage(page, nextForCheckYours, { next: true }),
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
  {
    id: 'replies-after-push',
    title: 'Posted, resolved, left for GitHub, no reply, resolved on GitHub',
    path: RUN,
    height: 1700,
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
  },
  {
    id: 'run-verdicts-no-reply',
    title: 'A run’s verdicts on the failing checks, and two threads that need no reply',
    path: RUN,
    height: 1900,
    render: () =>
      runPage(
        page,
        runDone(
          [
            posted('D_1', { resolveState: 'RESOLVED' }),
            noReplyDraft(),
            noReplyDraft({
              draftId: 'D_NR2',
              bot: false,
              comment: {
                commentId: 'C_NR2',
                author: 'maintainer-mo',
                path: 'src/router/normalize-path.ts',
                line: 3,
                excerpt: 'Thanks, that reads better.',
              },
              reason: 'The maintainer only said thanks.',
            }),
          ],
          {
            checkVerdicts: [
              { name: 'lint', whose: 'PR', why: 'The new file missed a semicolon: fixed in this run.' },
              { name: 'Fast checks', whose: 'NOT_PR', why: 'It fails on the base branch too.' },
              {
                name: 'deploy-preview',
                whose: 'CONTRIBUTOR',
                why: 'A maintainer must approve the preview for a fork.',
              },
              { name: 'e2e (merge)', whose: 'BASE', why: 'It fails only on the merge with the base branch.' },
            ],
          },
        ),
      ),
  },
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

/** A state drawn anew: the waiting comments. */
export const changedCommentStates = {
  nextRound: (page: Page) =>
    firstPage(
      page,
      {
        ...followUpAttempts.prNeedsYou,
        reviewFeedback: { threads: waitingThreads(), readAt: '2026-10-28T11:48:00.000Z' },
      },
      { next: true },
    ),
  /** The same comments on a pull request the person's own agent made: the prompt for that agent, never a run of ours. */
  ownAgentNext: (page: Page) =>
    firstPage(
      page,
      {
        ...followUpAttempts.prNeedsYou,
        runner: 'MCP',
        agent: { name: 'CLAUDE_CODE', model: null },
        reviewFeedback: { threads: waitingThreads(), readAt: '2026-10-28T11:48:00.000Z' },
      },
      { next: true },
    ),
};
