import { AutosubmitCountdown, StopAutopilotButton } from './follow-up-buttons';
import {
  CardError,
  DiscardRunButton,
  GrantButton,
  ProbeLine,
  PushButton,
  PushTitle,
  RepoRulesLink,
  ResolveHumansSetting,
  ResolveLine,
  SendBack,
} from './head-actions';
import { GithubButton, MoveCard } from './move-card';
import type { CardProps } from './move-props';
import { OrgAccessButton } from './moves-first';
import { Pill } from './primitives';
import {
  CopyAll,
  CopyAllBodies,
  DismissSeveral,
  PostAsOneComment,
  PostSeveral,
  RetrySeveral,
  TryCommentAgain,
} from './reply-batch-actions';
import { Button } from '@/components/ui/button';
import { githubUrlOf, isOwnAgent, timeLabel } from '@/lib/contribute/attempt-format';
import type { ContributeReplyDraft } from '@/lib/contribute/contribute.types';
import { runFlowOf } from '@/lib/contribute/contribution-moves';
import { bracketed } from '@/lib/contribute/needs-you';
import { firstSentenceOf, noteSplitOf, oneCommentCardOf, partOf, probeLineOf } from '@/lib/contribute/one-comment';
import {
  orgNameOf,
  RETRY_REASONS,
  reasonKeyOf,
  replyTroubleLineOf,
  replyTroubleOf,
} from '@/lib/contribute/reply-trouble';
import { firstSentence } from '@/lib/contribute/session-status';

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

/** The pull request a run follows up: its number and link. */
const prOf = ({ first, run }: Pick<CardProps, 'first' | 'run'>) => ({
  number: first?.pullRequest?.number ?? run?.followUpOf?.number ?? null,
  url: githubUrlOf(first?.pullRequest?.url ?? run?.followUpOf?.url),
});

/** "The agent fixed 3 comments and answered 2 without a change.", from the round's tallies. */
function didOf(run: NonNullable<CardProps['run']>): string {
  const fixed = run.round?.fixed ?? 0;
  const skipped = run.round?.skipped ?? 0;
  const parts = [
    fixed ? `fixed ${plural(fixed, 'comment')}` : null,
    skipped ? `answered ${skipped} without a change` : null,
  ]
    .filter(Boolean)
    .join(' and ');
  return parts ? `The agent ${parts}. ` : '';
}

/** A run in review: push its commits and post its replies (as the rows say), or discard it. */
export function RunReadyCard({ move, first, run, blocked, orgAccess, rider }: CardProps) {
  if (!run || move.data.card !== 'run-ready') return null;
  const { variant, commits, round } = move.data;
  const pr = prOf({ first, run });
  const flow = runFlowOf(run);
  const error = run.submit?.lastError;
  const answer =
    pr.url && (blocked.has('push') || variant === 'blocked') ? (
      <GithubButton href={pr.url} primary={false}>
        Answer on GitHub ↗
      </GithubButton>
    ) : null;
  const sendBack = isOwnAgent(run) ? <SendBack left={run.sendBacksLeft ?? 0} /> : null;

  const errors = <CardError sources={['discard-run', 'send-back', 'discard', 'start']} />;
  const common = {
    id: move.kinds[0],
    name: 'run-ready',
    tone: move.tone,
    kindLine: move.kindLine,
    rider,
    error: errors,
  };
  const status = run.checkStatus;

  if (variant === 'blocked') {
    return (
      <MoveCard
        {...common}
        title={move.title}
        why={<p>{status?.note ? `${status.note} ` : ''}Discard the run, or answer the threads on GitHub yourself.</p>}
        primary={<DiscardRunButton primary />}
        secondary={answer}
        whyBody={
          <p>
            Once it is discarded, the next step starts run {(round ?? 0) + 1} with your note: say what to do
            differently.
          </p>
        }
      />
    );
  }
  if (variant === 'branch-conflict') {
    return (
      <MoveCard
        {...common}
        title={move.title}
        why={
          <p>
            The pull request&apos;s branch has commits GitRanks did not push, and GitRanks never overwrites them.
            Discard this run, then start run {(round ?? 0) + 1}: it builds on the branch as it is now.
          </p>
        }
        primary={<DiscardRunButton primary />}
        whyLabel="Details"
        whyBody={error ? <p>{`${error.note} (${timeLabel(error.at)})`}</p> : null}
      />
    );
  }
  if (variant === 'bounced') {
    const org = error?.reason.trim().toLowerCase() === 'org_restricted';
    return (
      <MoveCard
        {...common}
        title={move.title}
        why={<p>{`${firstSentence(error?.note)} Nothing was posted.`.trim()}</p>}
        primary={<PushButton commits={commits} prNumber={pr.number} flow={flow} again />}
        secondary={
          <>
            {answer}
            <DiscardRunButton />
          </>
        }
        whyLabel="Details"
        whyBody={
          error ? (
            <>
              <p>{`${error.note} (${timeLabel(error.at)})`}</p>
              {org ? <OrgAccessButton access={orgAccess} /> : null}
            </>
          ) : null
        }
      />
    );
  }
  if (variant === 'older') {
    return (
      <MoveCard
        {...common}
        title={move.title}
        why={
          <p>
            {commits
              ? `The new commits go onto pull request #${pr.number ?? ''}'s branch on your fork, in your name, signed off as its first commits were. The pull request shows them at once.`
              : 'The agent made no commits this run, only the replies below. Approve the replies you want posted, here or once it is finished; finishing it pushes nothing.'}
          </p>
        }
        primary={<PushButton commits={commits} prNumber={pr.number} flow={false} />}
        secondary={
          <>
            {answer}
            {sendBack}
            <DiscardRunButton />
          </>
        }
      />
    );
  }
  const tests = variant === 'tests';
  // The run's first reply is tried in its thread first: said under the push, never promising one comment.
  const probe = probeLineOf(run);
  const what = `The commits go onto #${pr.number ?? ''}'s branch on your fork; each reply posts in its thread${probe ? ', or in one comment with the others if the organization blocks the first' : ''}, in your name. Nothing goes to GitHub before you approve it.`;
  return (
    <MoveCard
      {...common}
      title={<PushTitle commits={commits} fallback={move.title} />}
      why={
        <p>
          {tests
            ? `${status?.status === 'NOT_RUN' ? 'The tests could not run' : 'A test failed'}${status?.note ? `: ${status.note}` : ''}. You can push anyway or discard the run.`
            : `${didOf(run)}Check the replies below; untick any you don't want posted.`}
        </p>
      }
      body={
        <div className="flex flex-col gap-2">
          {probe ? (
            <ProbeLine
              org={probe.org}
              blocked={probe.blocked}
              prNumber={pr.number}
              threadDraftIds={(run.replyDrafts ?? []).flatMap((draft) => (draft.comment ? [draft.draftId] : []))}
            />
          ) : null}
          <ResolveLine probe={!!probe} />
          <ResolveHumansSetting />
        </div>
      }
      primary={
        <PushButton commits={commits} prNumber={pr.number} flow={flow} label={tests ? 'Push anyway' : undefined} />
      }
      secondary={
        <>
          {answer}
          {sendBack}
          <DiscardRunButton />
        </>
      }
      whyLabel="What pushing does"
      whyBody={<p>{what}</p>}
    />
  );
}

/** A run's push came back for want of GitHub access: allow it, then push again. */
export function RunGrantCard({ move, run, view, rider }: CardProps) {
  if (!run || move.data.card !== 'grant' || !move.data.run) return null;
  const revoked = move.data.reason.trim().toLowerCase() === 'grant_revoked';
  const error = run.submit?.lastError;
  return (
    <MoveCard
      id={move.kinds[0]}
      name="grant"
      tone={move.tone}
      kindLine={move.kindLine}
      title={move.title}
      why={
        <p>
          {revoked
            ? 'GitHub says the access you gave GitRanks was revoked.'
            : 'The pull request opens under your GitHub account, and GitRanks has no access to it yet.'}
        </p>
      }
      primary={view.grantAvailable ? <GrantButton label="Allow GitHub access" primary /> : null}
      secondary={<DiscardRunButton />}
      error={<CardError sources={['discard-run', 'discard', 'send-back']} />}
      whyLabel="Details"
      whyBody={error ? <p>{`${error.note} (${timeLabel(error.at)})`}</p> : null}
      rider={rider}
    />
  );
}

/** Autopilot pushes the run at its hour unless the user stops it to check it first. */
export function RunAutopilotCard({ move, run, now, rider }: CardProps) {
  if (!run || move.data.card !== 'run-autopilot') return null;
  const at = run.autosubmitAt;
  return (
    <MoveCard
      id={move.kinds[0]}
      name="run-autopilot"
      tone={move.tone}
      kindLine={move.kindLine}
      title={move.title}
      why={<p>Every check passed and the risk is low. Stop it to check the commits and replies yourself first.</p>}
      body={
        at ? (
          <p className="text-sm">
            <AutosubmitCountdown at={at} from={now.toISOString()} />
          </p>
        ) : null
      }
      primary={<StopAutopilotButton attemptId={run.attemptId} />}
      rider={rider}
    />
  );
}

/** Why the organization's refusal keeps replies out of their threads, and how it lifts. */
function OrgWhy({ org, access }: { org: string; access: CardProps['orgAccess'] }) {
  return (
    <>
      <p>
        The organization turned on GitHub&apos;s OAuth app access restriction. Pull requests and plain comments still go
        through; review-thread replies don&apos;t. Only an owner of {org} can lift it for GitRanks.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <OrgAccessButton access={access} />
        <RepoRulesLink />
      </div>
      <p>Once an owner approves it, replies post in their threads again.</p>
    </>
  );
}

/**
 * A run's replies that did not reach GitHub, or that its plan held back: one alone (its row says why), or several (the
 * reasons, said once). GitHub may still take them as one comment on the pull request, each quoting and linking its
 * thread: the card posts them so, tries a failed comment again, or copies them all to post by hand.
 */
export function ReplyFailedCard({ move, first, run, view, blocked, orgAccess, rider }: CardProps) {
  if (move.data.card !== 'reply-failed') return null;
  const { trouble, pushed, runId, heldBack } = move.data;
  const common = {
    id: move.kinds[0],
    name: 'reply-failed',
    tone: move.tone,
    kindLine: move.kindLine,
    title: move.title,
    rider,
  };
  const shown = run?.attemptId === runId ? run : undefined;
  const card = oneCommentCardOf(shown, trouble.failed, heldBack);
  const canPost = !blocked.has('post_reply');
  const prNumber = first?.pullRequest?.number ?? shown?.followUpOf?.number ?? null;
  const all = [...trouble.failed, ...heldBack];
  const postAs = (primary: boolean) =>
    canPost && card.post ? (
      <PostAsOneComment
        attemptId={runId}
        draftIds={card.post.draftIds}
        bodies={card.post.bodies}
        prNumber={prNumber}
        primary={primary}
      />
    ) : null;
  const showIt = (
    <Button asChild variant="link" className="h-auto self-start p-0 max-sm:min-h-11">
      <a href={`#comment-${all[0]?.draftId ?? ''}`}>Show it</a>
    </Button>
  );
  if (all.length === 1 && !card.failedBatches.length && !heldBack.length) {
    return <MoveCard {...common} primary={postAs(true)} secondary={showIt} />;
  }

  const org = orgNameOf(first?.nameWithOwner ?? shown?.nameWithOwner);
  const grantConnected = view.grant?.connected === true;
  // The thread refusals, said once each: the replies refused in their threads, or as comments of their own.
  const thread = replyTroubleOf(card.threadFailed)[0] ?? { runId, failed: [], shared: [], alone: [] };
  const lines = thread.shared.map(({ reason, drafts }) => (
    <p key={reason} data-trouble={reason}>
      {replyTroubleLineOf(reason, drafts.length, org, pushed, drafts[0]?.lastError?.note)}
    </p>
  ));
  const alone = thread.alone.length;
  const held = heldBack[0]?.heldBack;
  const failedComments = card.failedBatches.map(({ batch, lead }) => (
    <p key={batch.batchId} data-batch-failed={batch.batchId} className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <Pill tone="red">Not posted</Pill>
      <span>
        {partOf(batch) ? `${partOf(batch)}: ` : ''}
        {lead || 'GitHub did not take the comment.'}
      </span>
    </p>
  ));

  // Try again on each failed comment that offers it (GitHub access first, after a grant reason).
  const tries = canPost
    ? card.failedBatches
        .filter(({ offer }) => offer.tryAgain && (!offer.grantFirst || grantConnected))
        .map(({ batch, drafts }, index) => (
          <TryCommentAgain
            key={batch.batchId}
            attemptId={runId}
            batch={batch}
            count={drafts.length}
            primary={index === 0}
          />
        ))
    : [];
  const post = postAs(!tries.length);
  const grantFirst =
    canPost && !grantConnected && view.grantAvailable && card.failedBatches.some(({ offer }) => offer.grantFirst);
  // Copy all, unless every reply is in a comment GitHub may have posted already (Try again sends it exactly).
  const copyOff =
    !card.threadFailed.length &&
    !heldBack.length &&
    card.failedBatches.every(({ offer }) => offer.tryAgain && !offer.copy);
  const copy = copyOff ? null : card.copy ? (
    <CopyAllBodies text={card.copy.text} count={card.copy.count} primary={!tries.length && !post} />
  ) : (
    <CopyAll drafts={all} primary={!tries.length && !post} />
  );
  const dismiss = <DismissSeveral ids={all.map(({ draftId }) => draftId)} />;
  const primary = tries[0] ?? post ?? copy;
  // At most two beside the primary: with Try again leading, Copy all moves into Why.
  const copyInWhy = !!tries[0] && !!post && !!copy;
  const secondary = (
    <>
      {primary === post ? null : post}
      {copyInWhy || primary === copy ? null : copy}
      {dismiss}
    </>
  );

  // The thread replies a retry can mend: Try all again, in Why.
  const retryable = thread.shared.filter(({ reason }) => RETRY_REASONS.has(reason));
  const grantOnly = retryable.length > 0 && retryable.every(({ reason }) => reason.startsWith('grant_'));
  const retry =
    !canPost || !retryable.length ? null : grantOnly && !grantConnected ? (
      view.grantAvailable ? (
        <GrantButton label="Allow GitHub access again" />
      ) : null
    ) : (
      <RetrySeveral
        drafts={
          retryable
            .filter(({ reason }) => !reason.startsWith('grant_') || grantConnected)
            .flatMap(({ drafts }) => drafts) as ContributeReplyDraft[]
        }
      />
    );
  const reasons = new Set([
    ...thread.shared.map(({ reason }) => reason),
    ...thread.alone.map(reasonKeyOf),
    ...card.failedBatches.map(({ batch }) => batch.lastError?.reason?.trim().toLowerCase() ?? ''),
    ...(held ? [held.reason.trim().toLowerCase()] : []),
  ]);
  const restricted = reasons.has('org_restricted');
  const grant = [...reasons].some((reason) => reason === 'grant_missing' || reason === 'grant_revoked');
  const notes = thread.shared
    .filter(({ reason }) => reason !== 'org_restricted' && !reason.startsWith('grant_'))
    .map(({ reason, drafts }) => (
      <p key={reason}>{drafts[0]?.lastError?.note ?? replyTroubleLineOf(reason, drafts.length, org, pushed)}</p>
    ));
  const rests = card.failedBatches.flatMap(({ batch, rest }) => (rest ? [<p key={batch.batchId}>{rest}</p>] : []));
  const heldRest = held ? noteSplitOf(held.note).rest : null;
  const whyBody =
    restricted || grant || notes.length || rests.length || heldRest || retry || copyInWhy || tries.length > 1 ? (
      <div className="flex flex-col gap-2" data-reply-trouble={runId}>
        {restricted ? <OrgWhy org={org} access={orgAccess} /> : null}
        {((grant && view.grantAvailable && !grantConnected && !restricted) || grantFirst) &&
        !(retry && grantOnly && !grantConnected) ? (
          <GrantButton label="Allow GitHub access again" />
        ) : null}
        {notes}
        {rests}
        {heldRest ? <p>{heldRest}</p> : null}
        {retry || copyInWhy || tries.length > 1 ? (
          <div className="flex flex-wrap items-start gap-2">
            {tries.slice(1)}
            {copyInWhy ? copy : null}
            {retry}
          </div>
        ) : null}
      </div>
    ) : null;
  return (
    <MoveCard
      {...common}
      why={
        <>
          {failedComments}
          {lines}
          {held ? (
            <p data-held-back="">
              {heldBack.length === 1 ? 'A reply was held back' : `${heldBack.length} replies were held back`}: the first
              reply didn&apos;t reach its thread ({bracketed(firstSentenceOf(held.note))}).
            </p>
          ) : null}
          {alone && (thread.shared.length || card.failedBatches.length || heldBack.length) ? (
            <p>{alone} more failed for reasons of their own; their rows say why.</p>
          ) : null}
          {!thread.shared.length && !card.failedBatches.length && !heldBack.length ? (
            <p>Each failed for a reason of its own; their rows say why.</p>
          ) : null}
        </>
      }
      primary={primary}
      secondary={secondary}
      whyLabel={restricted ? "Why can't GitRanks reply in the threads?" : 'Why…'}
      whyBody={whyBody}
    />
  );
}

/** Replies left out of a push, still to post: post them, or dismiss them. */
export function RepliesCard({ move, first, blocked, rider }: CardProps) {
  if (move.data.card !== 'replies') return null;
  const drafts = move.data.drafts;
  const many = drafts.length > 1;
  const them = many ? 'them' : 'it';
  const empty = drafts.filter((draft) => !draft.text.trim()).length;
  return (
    <MoveCard
      id={move.kinds[0]}
      name="replies"
      tone={move.tone}
      kindLine={move.kindLine}
      title={move.title}
      why={<p>{`You left ${them} out of the push. Post ${them} now, or dismiss ${them}.`}</p>}
      primary={
        blocked.has('post_reply') ? null : (
          <PostSeveral drafts={drafts} prNumber={first?.pullRequest?.number ?? null} primary />
        )
      }
      secondary={<DismissSeveral ids={drafts.map(({ draftId }) => draftId)} />}
      whyBody={empty ? <p>{plural(empty, 'reply has', 'replies have')} no text and can only be dismissed.</p> : null}
      rider={rider}
    />
  );
}
