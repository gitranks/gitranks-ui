import type { ReactNode } from 'react';

import {
  AgentDidPanel,
  ApprovalPanel,
  ChecksPanel,
  CostPanel,
  ReadinessPanel,
  TimelinePanel,
  YourNotePanel,
} from './attempt-panels';
import { CheckStatusNote } from './check-status-note';
import { DiffViewer } from './diff-viewer';
import { PrForm, type PrFormProps } from './pr-form';
import { ReviewComments } from './review-comments';
import { SessionActionsProvider, type SessionActionsSeed } from './session-actions';
import { SessionHead } from './session-head';
import { type SessionTab, SessionTabs } from './session-tabs';
import { SubmitPanel } from './submit-panel';
import { editableBodyOf, repoOf } from '@/lib/contribute/attempt-format';
import type { CommentActionsInit } from '@/lib/contribute/comment-actions';
import type { ContributeAttemptDetail, ContributeView } from '@/lib/contribute/contribute.types';
import {
  type ContributionMoves,
  cardReasonsOf,
  headOf,
  type Pane,
  runFlowOf,
} from '@/lib/contribute/contribution-moves';
import { isWorking } from '@/lib/contribute/decisions';
import { GRANT_BOUNCES } from '@/lib/contribute/grant-resume';
import { orgAccessOf } from '@/lib/contribute/org-access';
import { parsePatch } from '@/lib/contribute/patch';
import { withoutDraftMarks } from '@/lib/contribute/pr-conventions';
import { orgNameOf } from '@/lib/contribute/reply-trouble';
import { firstAttemptDraftsOf, runModeOf } from '@/lib/contribute/review-comments';
import { NEXT_SESSION, nextRoundOpen } from '@/lib/contribute/sessions';

/**
 * One session's pane on a contribution's page: its head (a move card or a status line) and what it holds (the agent's
 * work, the pull request's form, the review comments, the details' tabs), or the next step's head and its waiting
 * comments; one provider of the session's actions above both.
 */

/**
 * The submit asks for GitHub access first: it is not connected, or the last submit bounced for want of it (revoked on
 * GitHub, say). A bounce for a missing grant asks no more once it is connected again (in Settings, say); a revoked one
 * still does, as only GitHub knows it. Not while it cannot be granted here, nor while the API does not answer the grant.
 */
export const grantNeededOf = (view: ContributeView, attempt: ContributeAttemptDetail): boolean => {
  const reason = attempt.submit?.lastError?.reason ?? '';
  const bounced = GRANT_BOUNCES.has(reason) && !(reason === 'grant_missing' && view.grant?.connected === true);
  return view.grantAvailable && (view.grant?.connected === false || bounced);
};

/**
 * What the pull request's form is drawn with for a first attempt in review: the title (the approved one, the agent's,
 * else the issue's, each without its WIP or draft marks), the body without the footer, the user's DCO setting, the
 * repo's asks, and whether the submit asks for GitHub access first.
 */
export const prFormPropsOf = (view: ContributeView, attempt: ContributeAttemptDetail): PrFormProps => ({
  attemptId: attempt.attemptId,
  issueNumber: attempt.number,
  repo: repoOf(attempt),
  defaultTitle:
    // Each candidate without its WIP or draft marks: one that is nothing but a mark gives way.
    [attempt.approval?.title, attempt.result?.prTitle, attempt.title]
      .map((title) => withoutDraftMarks(title ?? ''))
      .find(Boolean) ?? `Fix #${attempt.number}`,
  defaultBody: editableBodyOf(attempt.approval?.body ?? attempt.result?.prBody),
  login: view.contributor?.login ?? 'you',
  footer: attempt.prFooter,
  coAuthored: attempt.prCoAuthored,
  dcoMode: view.contributor?.settings?.dco ?? null,
  dcoRequired: attempt.dcoRequired,
  again: !!attempt.submit?.lastError,
  grantNeeded: grantNeededOf(view, attempt),
  grantConnected: view.grant?.connected === true,
  conventions: attempt.conventions,
  patch: attempt.patch,
});

/** What the details' Changes tab says when the session has no change to show. */
function emptyDiffOf(attempt: ContributeAttemptDetail): string | undefined {
  if (attempt.patch || isWorking(attempt)) return undefined;
  if (attempt.kind === 'FOLLOW_UP') return 'This run made no commits.';
  if (attempt.state === 'STOPPED' || attempt.state === 'DISCARDED') return 'The agent changed no files.';
  return undefined;
}

/** What every session's review comments read beside their rows. */
type CommentsContext = {
  first?: ContributeAttemptDetail;
  model: ContributionMoves;
  view: ContributeView;
  cardShown: boolean;
  now?: Date;
};

/** The shared props of the review comments: the PR, the stop, GitHub access, and who says a shared reason. */
function commentsPropsOf(
  { first, model, view, cardShown, now }: CommentsContext,
  runIds: string[],
  prNumber: number | null,
) {
  return {
    prNumber,
    org: orgNameOf(first?.nameWithOwner),
    blocked: model.hardStop?.blocked ?? new Set(),
    prOpen: first ? first.pullRequest?.state === 'OPEN' : true,
    grantConnected: view.grant?.connected === true,
    grantAvailable: view.grantAvailable,
    cardReasons: Object.fromEntries(runIds.map((runId) => [runId, [...cardReasonsOf(model, runId)]])),
    cardShown,
    orgAccess: orgAccessOf(),
    now,
  };
}

/**
 * One session: what the agent did, then what the user acts on (the pull request's form, or the review comments), then
 * its details a tab each: its changes, its checks, and what it cost and when.
 */
function SessionDetails({
  attempt,
  view,
  context,
}: {
  attempt: ContributeAttemptDetail;
  view: ContributeView;
  context: CommentsContext;
}) {
  const inReview = attempt.state === 'REVIEW';
  const followUp = attempt.kind === 'FOLLOW_UP';
  const prNumber = followUp ? (attempt.followUpOf?.number ?? null) : (attempt.pullRequest?.number ?? null);
  const flow = followUp && runFlowOf(attempt);
  const files = parsePatch(attempt.patch).files.length;
  const checks = attempt.checksPassed === true ? '✓' : attempt.checksPassed === false ? '✗' : undefined;

  // A run's comments, as the run left them; a first attempt's own drafts, of runs the rail does not show.
  const firstDrafts = !followUp && attempt.pullRequest ? firstAttemptDraftsOf(attempt) : [];
  const comments: ReactNode = followUp ? (
    attempt.replyDrafts ? (
      <ReviewComments
        mode={runModeOf(attempt, flow)}
        drafts={attempt.replyDrafts}
        run={{
          attemptId: attempt.attemptId,
          state: attempt.state,
          updatedAt: attempt.updatedAt,
          hasPatch: !!attempt.patch?.trim(),
          flow,
        }}
        {...commentsPropsOf(context, [attempt.attemptId], prNumber)}
      />
    ) : null
  ) : firstDrafts.length ? (
    <ReviewComments
      mode="perReply"
      drafts={firstDrafts}
      first={{
        attemptId: attempt.attemptId,
        state: attempt.state,
        updatedAt: attempt.updatedAt,
        currentAttemptId: attempt.followUps?.currentAttemptId ?? null,
      }}
      {...commentsPropsOf(context, [...new Set(firstDrafts.map(({ attemptId }) => attemptId))], prNumber)}
    />
  ) : null;

  const tabs: SessionTab[] = [
    {
      value: 'changes',
      label: 'Changes',
      badge: files ? `${files} ${files === 1 ? 'file' : 'files'}` : undefined,
      content: (
        <DiffViewer patch={attempt.patch} title={followUp ? 'The new commits' : 'Diff'} empty={emptyDiffOf(attempt)} />
      ),
    },
    {
      value: 'checks',
      label: 'Checks',
      badge: checks,
      content: (
        <>
          {followUp ? <CheckStatusNote status={attempt.checkStatus} /> : null}
          <ChecksPanel attempt={attempt} />
          <ReadinessPanel attempt={attempt} />
        </>
      ),
    },
    {
      value: 'activity',
      label: 'Activity',
      content: (
        <>
          <CostPanel attempt={attempt} />
          <TimelinePanel attempt={attempt} />
          <YourNotePanel attempt={attempt} />
        </>
      ),
    },
  ];
  // The change itself when there is one; else our checks when they ran; else what it spent and when.
  const opening = attempt.patch?.trim() ? 'changes' : attempt.checks.length ? 'checks' : 'activity';

  return (
    <div className="flex min-w-0 flex-col gap-4" data-session-details={attempt.attemptId}>
      <AgentDidPanel attempt={attempt} />
      {/* In review the form holds the approved title and description already. */}
      {!followUp && attempt.approval && !inReview ? <ApprovalPanel attempt={attempt} /> : null}
      {inReview && !followUp ? (
        <SubmitPanel>
          <PrForm {...prFormPropsOf(view, attempt)} />
        </SubmitPanel>
      ) : null}
      {comments}
      <SessionTabs
        key={attempt.attemptId}
        tabs={tabs}
        defaultValue={opening}
        label={followUp ? 'This follow-up run' : 'The first attempt'}
      />
    </div>
  );
}

/** The provider's key: a fresh read of what it starts from (a push that came back, a new thread) starts it afresh. */
function actionsKeyOf(
  attempt: ContributeAttemptDetail,
  first: ContributeAttemptDetail | undefined,
  next: boolean,
  note: string,
) {
  if (next && first) {
    return `${(first.reviewFeedback?.threads ?? []).map(({ commentId }) => commentId).join(',')}|${note}`;
  }
  return `${attempt.attemptId}|${attempt.state}|${attempt.submit?.lastError?.at ?? ''}`;
}

/**
 * One session of a contribution, beside its sessions: its head (a move card or a status line), then what it did and
 * what waits in it, or the next step (`next`, with the contribution's `first` attempt): its head and the review
 * comments that wait. One provider holds the session's actions above both.
 */
export function SessionPane({
  view,
  attempt,
  first,
  current,
  model,
  next = false,
  move,
  resumed = false,
  seed,
  now = new Date(),
  resolveHumans,
}: {
  view: ContributeView;
  attempt: ContributeAttemptDetail;
  first?: ContributeAttemptDetail;
  current?: ContributeAttemptDetail;
  model: ContributionMoves;
  next?: boolean;
  /** `?move=`: the held card to show. */
  move?: string | null;
  /** Back from GitHub's access screen (the grant's resume): the form opens with the page. */
  resumed?: boolean;
  /** The catalogue's and the specs' static states: pending, failed, the form open. */
  seed?: SessionActionsSeed;
  now?: Date;
  /** Whether a follow-up's replies resolve people's threads too; `undefined` while the API does not answer it. */
  resolveHumans?: boolean;
}) {
  const showNext = next && !!first;
  const followUp = attempt.kind === 'FOLLOW_UP';
  const pane: Pane = showNext ? 'next' : followUp ? `run:${attempt.attemptId}` : 'first';
  const blocked = model.hardStop?.blocked ?? new Set();
  const threads = showNext ? (first?.reviewFeedback?.threads ?? []) : [];
  const note =
    showNext && first
      ? ((model.moves.find(({ card }) => card === 'next-run')?.data as { note?: string } | undefined)?.note ?? '')
      : '';
  const init: CommentActionsInit = {
    session: showNext ? 'next' : followUp ? { runId: attempt.attemptId } : 'first',
    prId: first?.pullRequest?.prId ?? attempt.followUpOf?.prId ?? null,
    prNumber: first?.pullRequest?.number ?? attempt.followUpOf?.number ?? null,
    attemptId: showNext ? null : attempt.attemptId,
    runState: followUp ? attempt.state : null,
    approvedAt: attempt.approvedAt,
    flow: followUp && runFlowOf(attempt),
    checkStatus: attempt.checkStatus?.status ?? null,
    hasCommits: !!attempt.patch?.trim(),
    drafts: followUp ? (attempt.replyDrafts ?? []) : [],
    threads,
    resolveHumans,
    blocked,
    canStart: first ? nextRoundOpen(first) : false,
  };
  const form =
    !showNext && !followUp && attempt.state === 'REVIEW' ? !!attempt.submit?.lastError || resumed : undefined;
  const cardShown = headOf(model, pane, move).kind === 'card';
  const context: CommentsContext = { first, model, view, cardShown, now };

  return (
    <div
      className="flex min-w-0 flex-col gap-4"
      data-review={attempt.attemptId}
      data-state={attempt.state}
      data-shown-session={showNext ? NEXT_SESSION : attempt.attemptId}
    >
      <SessionActionsProvider key={actionsKeyOf(attempt, first, showNext, note)} init={init} form={form} seed={seed}>
        <SessionHead
          model={model}
          pane={pane}
          move={move}
          first={first}
          shown={attempt}
          current={current}
          view={view}
          now={now}
          orgAccess={orgAccessOf()}
        />
        {showNext ? (
          threads.length ? (
            <ReviewComments
              mode="waiting"
              threads={threads}
              readAt={first?.reviewFeedback?.readAt ?? null}
              {...commentsPropsOf(context, [], first?.pullRequest?.number ?? null)}
            />
          ) : null
        ) : (
          <SessionDetails attempt={attempt} view={view} context={context} />
        )}
      </SessionActionsProvider>
    </div>
  );
}
