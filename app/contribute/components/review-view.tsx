import type { Route } from 'next';
import { notFound, redirect } from 'next/navigation';
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
import { SessionsList } from './attempt-sessions';
import { CheckStatusNote } from './check-status-note';
import { ContributeNotices } from './contribute-notices';
import { BackLink, ContributionHeader } from './contribution-header';
import { DiffViewer } from './diff-viewer';
import { PrForm, type PrFormProps } from './pr-form';
import { PrNotesPanel } from './pr-notes';
import { HEADING } from './primitives';
import { AttemptRepoRules } from './repo-rules';
import { ReviewComments } from './review-comments';
import { SessionActionsProvider, type SessionActionsSeed } from './session-actions';
import { SessionHead } from './session-head';
import { type SessionTab, SessionTabs } from './session-tabs';
import { SubmitPanel } from './submit-panel';
import { editableBodyOf, repoOf } from '@/lib/contribute/attempt-format';
import type { CommentActionsInit } from '@/lib/contribute/comment-actions';
import {
  loadAttempt,
  loadContribute,
  loadPrNotes,
  loadRepliesWaiting,
  loadResolveHumanThreads,
} from '@/lib/contribute/contribute.data';
import type {
  ContributeAttemptDetail,
  ContributePrNotes,
  ContributeReplyWaiting,
  ContributeView,
} from '@/lib/contribute/contribute.types';
import { accessNoticesOf, isContributePageOpen, settingsOf } from '@/lib/contribute/contribute-state';
import {
  type ContributionMoves,
  cardReasonsOf,
  contributionMovesOf,
  headOf,
  onPane,
  type Pane,
  runFlowOf,
} from '@/lib/contribute/contribution-moves';
import { isWorking } from '@/lib/contribute/decisions';
import { GRANT_BOUNCES, RESUME_PARAM } from '@/lib/contribute/grant-resume';
import { orgAccessOf, orgRestrictionOf } from '@/lib/contribute/org-access';
import { parsePatch } from '@/lib/contribute/patch';
import { withoutDraftMarks } from '@/lib/contribute/pr-conventions';
import { orgNameOf } from '@/lib/contribute/reply-trouble';
import { isFinishedAttempt } from '@/lib/contribute/repo-rules';
import { firstAttemptDraftsOf, runModeOf } from '@/lib/contribute/review-comments';
import {
  attemptPath,
  NEXT_SESSION,
  nextRoundOpen,
  runsLabelOf,
  sessionPath,
  sessionsOf,
  waitingThreadsOf,
} from '@/lib/contribute/sessions';

type Query = Record<string, string | string[] | undefined>;

/** The gates every page of a contribution passes: signed in, let in, and the attempt theirs. */
async function gate(id: string) {
  const [view, attempt] = await Promise.all([loadContribute(), loadAttempt(id)]);
  if (!view) notFound();
  if (!isContributePageOpen(view, 'attempt')) redirect('/contribute');
  if (attempt === null) notFound();
  return { view, attempt };
}

/** One value of a query parameter. */
const paramOf = (query: Query, key: string) => {
  const value = query[key];
  return (Array.isArray(value) ? value[0] : value) ?? null;
};

/**
 * What a contribution's moves read, around its first attempt: the run under way, the pull request's waiting replies
 * and the maintainers' say. The layout and every session's page read the same, with the same ids, so a request reads
 * each once.
 */
async function contributionOf(first: ContributeAttemptDetail) {
  const currentId = first.followUps?.currentAttemptId;
  const open = first.pullRequest?.state === 'OPEN';
  const [read, prNotes, waiting] = await Promise.all([
    currentId ? loadAttempt(currentId).catch(() => undefined) : undefined,
    first.pullRequest ? loadPrNotes(first.attemptId) : undefined,
    open ? loadRepliesWaiting() : undefined,
  ]);
  const current = read?.kind === 'FOLLOW_UP' && read.followUpOf?.attemptId === first.attemptId ? read : undefined;
  const replies = waiting?.filter(({ prId, inReview }) => prId === first.pullRequest?.prId && !inReview);
  return { current, prNotes, replies };
}

/**
 * The contribution's layout, read from its first attempt: the issue and its pull request on top, then its sessions
 * beside the one shown (`children`), its repo's rules and the maintainers' notes. Moving between the sessions keeps it
 * and reads only the session. Any other attempt in the address (a run's own address, or a review the API does not
 * answer) leaves the page to itself.
 */
export async function ContributionLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: ReactNode;
}) {
  const { id } = await params;
  const { view, attempt } = await gate(id);
  if (!attempt || attempt.kind === 'FOLLOW_UP') return children;
  const { current, prNotes, replies } = await contributionOf(attempt);
  const now = new Date();
  const model = contributionMovesOf({ view, first: attempt, current, replies, prNotes, now });
  return (
    <ContributionShell
      view={view}
      attempt={attempt}
      first={attempt}
      run={current}
      prNotes={prNotes}
      replies={replies}
      model={model}
      now={now}
    >
      {children}
    </ContributionShell>
  );
}

/** The address with the query it came with (a grant's resume, the move named). */
function withQuery(path: Route, query: Query): Route {
  const params = new URLSearchParams(path.includes('?') ? path.slice(path.indexOf('?') + 1) : '');
  for (const [key, value] of Object.entries(query)) {
    if (key === 'session') continue;
    for (const one of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(key, one);
  }
  const base = path.includes('?') ? path.slice(0, path.indexOf('?')) : path;
  const search = params.toString();
  return (search ? `${base}?${search}` : base) as Route;
}

/**
 * Whether the next step's pane has something to show: a move the next step or the proof holds, the proof's line, the
 * comments that wait, or a run that may start.
 */
export const nextPaneShows = (model: ContributionMoves, first: ContributeAttemptDetail) =>
  model.moves.some((move) => onPane(move, 'next')) ||
  !!model.proofStage ||
  waitingThreadsOf(first).length > 0 ||
  model.mayStart;

/**
 * The first attempt's page, or the next step (`?session=next`). A run's own address goes under its first attempt, so it
 * shows in the contribution's layout; one whose first attempt is not known shows on its own. The next step goes to the
 * run under way while there is one, and to the first attempt when it would show nothing.
 */
export async function FirstSessionView({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Query>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [{ view, attempt }, resolveHumans] = await Promise.all([gate(id), loadResolveHumanThreads()]);
  if (!attempt) return <ReviewScreen view={view} attempt={undefined} />;
  const move = paramOf(query, 'move');
  if (attempt.kind === 'FOLLOW_UP') {
    const first = await firstOf(attempt);
    if (first) redirect(withQuery(sessionPath(first.attemptId, attempt.attemptId), query));
    const prNotes = await loadPrNotes(attempt.attemptId);
    return <ReviewScreen view={view} attempt={attempt} resolveHumans={resolveHumans} prNotes={prNotes} move={move} />;
  }
  const { current, prNotes, replies } = await contributionOf(attempt);
  const now = new Date();
  const model = contributionMovesOf({ view, first: attempt, current, shown: attempt, replies, prNotes, now });
  const next = paramOf(query, 'session') === NEXT_SESSION;
  if (next) {
    const underWay = attempt.followUps?.currentAttemptId;
    if (underWay) redirect(withQuery(sessionPath(attempt.attemptId, underWay), query));
    if (attempt.pullRequest?.state !== 'OPEN' || !nextPaneShows(model, attempt)) {
      redirect(withQuery(attemptPath(attempt.attemptId), query));
    }
  }
  return (
    <SessionPane
      view={view}
      attempt={attempt}
      first={attempt}
      current={current}
      model={model}
      next={next}
      move={move}
      resumed={!!paramOf(query, RESUME_PARAM)}
      now={now}
      resolveHumans={resolveHumans}
    />
  );
}

/** A follow-up run's page, under its first attempt; an address that pairs it with another goes to its own. */
export async function RunSessionView({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; runId: string }>;
  searchParams: Promise<Query>;
}) {
  const [{ id, runId }, query] = await Promise.all([params, searchParams]);
  const [{ view, attempt }, resolveHumans] = await Promise.all([gate(runId), loadResolveHumanThreads()]);
  if (!attempt) return <ReviewScreen view={view} attempt={undefined} />;
  if (attempt.kind !== 'FOLLOW_UP' || attempt.followUpOf?.attemptId !== id) redirect(attemptPath(runId));
  const first = await firstOf(attempt);
  const { current, prNotes, replies } = first
    ? await contributionOf(first)
    : { current: undefined, prNotes: await loadPrNotes(attempt.attemptId), replies: undefined };
  const now = new Date();
  const model = contributionMovesOf({ view, first, current, shown: attempt, replies, prNotes, now });
  return (
    <SessionPane
      view={view}
      attempt={attempt}
      first={first}
      current={current}
      model={model}
      move={paramOf(query, 'move')}
      now={now}
      resolveHumans={resolveHumans}
    />
  );
}

/** A run's first attempt, the one whose pull request it follows up; undefined when that read is no part of its page. */
async function firstOf(run: ContributeAttemptDetail): Promise<ContributeAttemptDetail | undefined> {
  const of = run.followUpOf;
  const read = of ? await loadAttempt(of.attemptId).catch(() => undefined) : undefined;
  return read?.kind === 'FIRST' && (!read.pullRequest || read.pullRequest.prId === of?.prId) ? read : undefined;
}

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

/** The two limits the rail's rules read: a client component, so nothing else of the settings goes to the browser. */
const railSettingsOf = (view: ContributeView) => {
  const settings = settingsOf(view);
  return settings ? { maxChangedLines: settings.maxChangedLines, maxFiles: settings.maxFiles } : null;
};

/** The grid with the sessions' rail: one column on a phone, the rail's column beside the pane from `lg`. */
const RAIL_GRID =
  "grid grid-cols-[minmax(0,1fr)] items-start gap-x-5 gap-y-0 [grid-template-areas:'sessions'_'pane'_'rules'_'notes'] lg:grid-cols-[17rem_minmax(0,1fr)] lg:grid-rows-[auto_auto_1fr] lg:[grid-template-areas:'sessions_pane'_'rules_pane'_'notes_pane']";
/** The grid of a run whose first attempt is not known: the pane, then the notes. */
const PANE_GRID = "grid grid-cols-[minmax(0,1fr)] gap-y-0 [grid-template-areas:'pane'_'notes']";

/** The organization a repo belongs to, as the repo rules name it: "driftwood-js". */
const orgOf = (attempt: ContributeAttemptDetail) => attempt.nameWithOwner?.split('/')[0] || 'The organization';

/**
 * A contribution, one layout for all its sessions, in the phone's order: the account's notice, the header (the issue,
 * its pull request's state, a maintainer's stop), then the sessions, the one shown (`children`), the repo's rules and
 * the maintainers' notes. From `lg` the sessions, rules and notes stack in a rail beside the one shown. `attempt` names
 * the issue; `first` is the contribution's first attempt, and `run` the run read beside it (the one under way). The
 * tiles' pills come from the contribution's moves (`model`), as the session heads do. The address says which session is
 * shown, unless `shown` does.
 */
export function ContributionShell({
  view,
  attempt,
  first,
  run,
  shown,
  now,
  prNotes,
  replies,
  model,
  children,
}: {
  view: ContributeView;
  attempt: ContributeAttemptDetail;
  first?: ContributeAttemptDetail;
  run?: ContributeAttemptDetail;
  shown?: string;
  now?: Date;
  /** The maintainers' say on its PR: a stop, and "this PR helped" notes. */
  prNotes?: ContributePrNotes;
  /** Its pull request's replies waiting for the user: a refusal names the org's block. */
  replies?: ContributeReplyWaiting[];
  model: ContributionMoves;
  children: ReactNode;
}) {
  const cards = first ? sessionsOf(first, run, model) : null;
  const session = first
    ? { firstId: first.attemptId, nextShown: !!model.nextTileTitle || !!model.proofStage, shown }
    : null;

  return (
    <div className="flex flex-col gap-5" data-contribution={first?.attemptId ?? attempt.attemptId}>
      {/* The access level holds every attempt and run; the key's trouble is Needs you's to say. */}
      <ContributeNotices notices={accessNoticesOf(view)} variant="line" />
      <ContributionHeader attempt={attempt} first={first} prNotes={prNotes} now={now} />

      <div className={cards ? RAIL_GRID : PANE_GRID}>
        {cards && first && session ? <SessionsList cards={cards} rounds={runsLabelOf(first)} {...session} /> : null}
        <div className={cards ? '[grid-area:pane] min-w-0 mt-5 lg:mt-0' : '[grid-area:pane] min-w-0'}>{children}</div>
        {cards && first ? (
          <AttemptRepoRules
            rules={first.repoRules}
            settings={railSettingsOf(view)}
            finished={isFinishedAttempt(first.state)}
            // Never the session shown: the layout stays as the user moves between them.
            access={orgRestrictionOf({ first, current: run, replies })}
            org={orgOf(first)}
            orgAccess={orgAccessOf()}
          />
        ) : null}
        {prNotes ? (
          <PrNotesPanel
            notes={prNotes}
            className={cards ? '[grid-area:notes] mt-5 lg:mt-4' : '[grid-area:notes] mt-5'}
          />
        ) : null}
      </div>
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

/**
 * A contribution's page in one: its layout around the session in `attempt` (`undefined` while the API does not answer
 * it). `first` is a run's first attempt, read beside it (a first attempt is its own); `next` shows the next step;
 * `current` the run under way; `move` the held card to show. A run whose first attempt is not known shows on its own,
 * with the pull request it follows up.
 */
export function ReviewScreen({
  view,
  attempt,
  first: firstRead,
  current,
  next = false,
  move,
  now = new Date(),
  resolveHumans,
  prNotes,
  replies,
  seed,
  resumed = false,
}: {
  view: ContributeView;
  attempt: ContributeAttemptDetail | undefined;
  first?: ContributeAttemptDetail;
  current?: ContributeAttemptDetail;
  next?: boolean;
  move?: string | null;
  now?: Date;
  resolveHumans?: boolean;
  /** The maintainers' say on its PR. */
  prNotes?: ContributePrNotes;
  /** Its pull request's replies waiting for the user. */
  replies?: ContributeReplyWaiting[];
  seed?: SessionActionsSeed;
  resumed?: boolean;
}) {
  if (!attempt) {
    return (
      <div className="flex flex-col items-start gap-3" data-review="unavailable">
        <BackLink />
        <h1 className={HEADING.page}>Reviews are not available yet</h1>
        <p className="text-muted-foreground">This is coming soon. Check back shortly.</p>
      </div>
    );
  }

  const followUp = attempt.kind === 'FOLLOW_UP';
  const first = followUp ? firstRead : attempt;
  // The run under way: the one read beside it, or the run shown when it is the one.
  const underWay = first?.followUps?.currentAttemptId;
  const run = current ?? (followUp && attempt.attemptId === underWay ? attempt : undefined);
  const waiting = replies?.filter(({ prId, inReview }) => prId === first?.pullRequest?.prId && !inReview);
  const model = contributionMovesOf({ view, first, current: run, shown: attempt, replies: waiting, prNotes, now });
  const showNext = !!first && next && !underWay && first.pullRequest?.state === 'OPEN' && nextPaneShows(model, first);

  return (
    <ContributionShell
      view={view}
      attempt={attempt}
      first={first}
      run={run}
      shown={showNext ? NEXT_SESSION : attempt.attemptId}
      now={now}
      prNotes={prNotes}
      replies={waiting}
      model={model}
    >
      <SessionPane
        view={view}
        attempt={attempt}
        first={first}
        current={run}
        model={model}
        next={showNext}
        move={move}
        resumed={resumed}
        seed={seed}
        now={now}
        resolveHumans={resolveHumans}
      />
    </ContributionShell>
  );
}
