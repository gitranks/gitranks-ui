import type { Route } from 'next';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { SessionsList } from './attempt-sessions';
import { ContributeNotices } from './contribute-notices';
import { BackLink, ContributionHeader } from './contribution-header';
import { PrNotesPanel } from './pr-notes';
import { HEADING } from './primitives';
import { AttemptRepoRules } from './repo-rules';
import type { SessionActionsSeed } from './session-actions';
import { SessionPane } from './session-pane';
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
import { type ContributionMoves, contributionMovesOf, onPane } from '@/lib/contribute/contribution-moves';
import { RESUME_PARAM } from '@/lib/contribute/grant-resume';
import { orgAccessOf, orgRestrictionOf, threadsBlockedOf } from '@/lib/contribute/org-access';
import { isFinishedAttempt } from '@/lib/contribute/repo-rules';
import {
  attemptPath,
  NEXT_SESSION,
  runsLabelOf,
  sessionPath,
  sessionsOf,
  waitingThreadsOf,
} from '@/lib/contribute/sessions';
import { learnAttemptPath } from '@/lib/learn/learn-path';

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
  // The pull request's own, a run's review included: the repo rules count a refusal there; the moves leave them out.
  const replies = waiting?.filter(({ prId }) => prId === first.pullRequest?.prId);
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

/** The address with the query it came with (a grant's resume, the move named), `session` aside. */
export function withQuery(path: Route, query: Query): Route {
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
  const next = paramOf(query, 'session') === NEXT_SESSION;
  // A Learn attempt's page is its lesson; its next step (follow-ups on its pull request) stays here. The query goes
  // along: back from GitHub's access screen, the grant's resume opens the pull request there.
  if (attempt.mode === 'LEARN' && !next) redirect(withQuery(learnAttemptPath(attempt.attemptId), query));
  const { current, prNotes, replies } = await contributionOf(attempt);
  const now = new Date();
  const model = contributionMovesOf({ view, first: attempt, current, shown: attempt, replies, prNotes, now });
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
  if (attempt.kind !== 'FOLLOW_UP' || attempt.followUpOf?.attemptId !== id) redirect(withQuery(attemptPath(runId), query));
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
            threadsBlocked={!!threadsBlockedOf({ first, current: run })}
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
  const waiting = replies?.filter(({ prId }) => prId === first?.pullRequest?.prId);
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

export { grantNeededOf, prFormPropsOf } from './session-pane';
