import type { Route } from 'next';
import { notFound, redirect } from 'next/navigation';
import { cache, type ReactNode } from 'react';

import { SessionsList } from './attempt-sessions';
import { PrNotesPanel } from './pr-notes';
import { PullRequestBody } from './pull-request-body';
import { BackLink, PullRequestHeader } from './pull-request-header';
import { AttemptRepoRules } from './repo-rules';
import type { SessionActionsSeed } from './session-actions';
import { SessionPane } from './session-pane';
import { ContributeNotices } from '@/components/workspace/contribute-notices';
import { HEADING } from '@/components/workspace/primitives';
import { WorkspaceSignIn } from '@/components/workspace/workspace-sign-in';
import type { LearnAttemptLesson } from '@/lib/learn/learn.types';
import {
  loadAttempt,
  loadContribute,
  loadContributeSetup,
  loadIssueAttempt,
  loadPrNotes,
  loadRepliesWaiting,
  loadResolveHumanThreads,
  viewerLogin,
} from '@/lib/workspace/contribute.data';
import type {
  ContributeAttemptDetail,
  ContributePrNotes,
  ContributeReplyWaiting,
  ContributeView,
} from '@/lib/workspace/contribute.types';
import { accessNoticesOf, isContributePageOpen, settingsOf } from '@/lib/workspace/contribute-state';
import { type ContributionMoves, contributionMovesOf, onPane } from '@/lib/workspace/contribution-moves';
import { RESUME_PARAM } from '@/lib/workspace/grant-resume';
import { orgAccessOf, orgRestrictionOf, threadsBlockedOf } from '@/lib/workspace/org-access';
import { type IssueRef, pullRequestByAttemptPath, pullRequestPath } from '@/lib/workspace/paths';
import { isFinishedAttempt } from '@/lib/workspace/repo-rules';
import {
  NEXT_SESSION,
  pageAtOf,
  runsLabelOf,
  sessionNamesOf,
  sessionPath,
  sessionsOf,
  waitingThreadsOf,
} from '@/lib/workspace/sessions';
import { contributeHidden } from '@/lib/workspace/setting-up';

type Query = Record<string, string | string[] | undefined>;

/** The page's address, as the router reads it: the issue, and on an earlier attempt's page its id. */
export type PageParams = { owner: string; repo: string; issue: string; attemptId?: string };

/**
 * The gates every page of a pull request passes: signed in, and let in. Null signed out: the workspace's layout asks
 * the visitor to sign in (the link an agent hands its person), and the page shows nothing under it.
 */
async function gate() {
  if (!(await viewerLogin())) return null;
  const view = await loadContribute();
  if (!view) contributeHidden(await loadContributeSetup());
  if (!isContributePageOpen(view, 'attempt')) redirect('/contribute');
  return { view };
}

/** GraphQL's largest `Int`: an issue's number above it names no issue. */
const MAX_INT = 2_147_483_647;

/** What the address names, read once per request (the layout and the session's page both ask). */
type PageRead =
  /** No issue of the viewer's at this address, or an attempt id that is not an earlier one on it: a 404. */
  | { kind: 'missing' }
  /** The API did not answer. */
  | { kind: 'unread' }
  /** The repo's name changed (or its letter case, or the issue's spelling), or the "earlier" attempt is the latest. */
  | { kind: 'move'; ref: IssueRef }
  | {
      kind: 'page';
      first: ContributeAttemptDetail;
      /** The page's own address: the issue's, or the earlier attempt's under it. */
      base: Route;
      /** On an earlier attempt's page: the latest's address. */
      earlier: { latest: Route } | null;
    };

/**
 * The viewer's first attempt the address names: the issue's newest (`contributeAttemptRef`), or with `attemptId` an
 * older first attempt on the same issue. An address in another spelling than the API's (a renamed repo, another letter
 * case) moves to the current one.
 */
const readPage = cache(async (owner: string, repo: string, issue: string, earlierId?: string): Promise<PageRead> => {
  // An issue's number, in any spelling of it (`0871`), up to GraphQL's largest `Int`.
  const number = /^\d{1,10}$/.test(issue) ? Number(issue) : 0;
  if (number < 1 || number > MAX_INT) return { kind: 'missing' };
  const ref = await loadIssueAttempt(owner, repo, number);
  if (ref === undefined) return { kind: 'unread' };
  if (ref === null) return { kind: 'missing' };
  const earlier = earlierId && earlierId !== ref.attemptId ? earlierId : null;
  if (ref.repo !== `${owner}/${repo}` || issue !== String(ref.number) || (earlierId && !earlier)) {
    return { kind: 'move', ref: { repo: ref.repo, issue: ref.number, earlier } };
  }
  const first = await loadAttempt(earlier ?? ref.attemptId).catch(() => undefined);
  if (first === undefined) return { kind: 'unread' };
  if (first === null || first.kind !== 'FIRST') return { kind: 'missing' };
  if (earlier) {
    // An older first attempt on this very issue: listed by the API, or named so (its repo may have been renamed since).
    const named = (first.nameWithOwner ?? '').toLowerCase();
    const same =
      first.number === ref.number &&
      (!!ref.earlier?.includes(earlier) ||
        named === ref.repo.toLowerCase() ||
        named === `${owner}/${repo}`.toLowerCase());
    if (!same) return { kind: 'missing' };
  }
  const latest = pullRequestPath({ repo: ref.repo, issue: ref.number });
  return {
    kind: 'page',
    first,
    base: earlier ? pullRequestPath({ repo: ref.repo, issue: ref.number, earlier }) : latest,
    earlier: earlier ? { latest } : null,
  };
});

/** The page the params name, or the 404. */
async function pageOf(params: Promise<PageParams>) {
  const { owner, repo, issue, attemptId } = await params;
  const page = await readPage(owner, repo, issue, attemptId);
  if (page.kind === 'missing') notFound();
  return page;
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
 * The pull request's layout, read from its first attempt: the header on top, then its sessions beside the one shown
 * (`children`), its repo's rules and the maintainers' notes. Moving between the sessions keeps it and reads only the
 * session. An address the page moves on from (a rename, the latest named as earlier) or does not read leaves the page
 * to itself.
 */
export async function ContributionLayout({ params, children }: { params: Promise<PageParams>; children: ReactNode }) {
  const gated = await gate();
  if (!gated) return <WorkspaceSignIn what="contribution" />;
  const page = await pageOf(params);
  if (page.kind !== 'page') return children;
  const { view } = gated;
  const { first, base, earlier } = page;
  const [{ current, prNotes, replies }, lesson] = await Promise.all([contributionOf(first), lessonOf(first)]);
  const now = new Date();
  const model = contributionMovesOf({ view, first, current, replies, prNotes, now });
  return (
    <ContributionShell
      view={view}
      attempt={first}
      first={first}
      run={current}
      prNotes={prNotes}
      replies={replies}
      model={model}
      now={now}
      base={base}
      earlier={earlier}
      lesson={lesson}
    >
      {children}
    </ContributionShell>
  );
}

/**
 * A Learn attempt's lesson, while Learn is open to the viewer: the header's lesson line and its two views. Null for a
 * Fix attempt, for Learn closed to the account (the pull request's view alone), and while the API does not answer it.
 */
async function lessonOf(first: ContributeAttemptDetail): Promise<LearnAttemptLesson | null> {
  if (first.mode !== 'LEARN') return null;
  const { loadLearnOpen, loadAttemptLesson } = await learnReads();
  if (!(await loadLearnOpen())) return null;
  return loadAttemptLesson(first.attemptId).catch(() => null);
}

/** Learn's reads, loaded only for a Learn attempt's page: a Fix attempt's never asks Learn anything. */
const learnReads = () => import('@/lib/learn/learn.data');

/**
 * The Lesson view's reads (`…/lesson`): the page's first attempt and its lesson. A Fix attempt's goes to its page; an
 * address in another spelling to the current one; Learn closed to the viewer, or no lesson, is the 404. Null signed out
 * (the layout asks to sign in); `unread` while the API does not answer.
 */
export async function lessonPageOf(params: Promise<PageParams>) {
  const gated = await gate();
  if (!gated) return null;
  const page = await pageOf(params);
  if (page.kind === 'unread') return 'unread' as const;
  if (page.kind === 'move') redirect(`${pullRequestPath(page.ref)}/lesson` as Route);
  const { first, base } = page;
  if (first.mode !== 'LEARN') redirect(base);
  const { loadLearnOpen, loadAttemptLesson } = await learnReads();
  if (!(await loadLearnOpen())) notFound();
  const lesson = await loadAttemptLesson(first.attemptId).catch(() => undefined);
  if (lesson === undefined) return 'unread' as const;
  if (!lesson) notFound();
  return { view: gated.view, first, lesson, base };
}

/** The Lesson view while the API does not answer: the same screen as the pull request's. */
export const LessonUnavailable = () => <Unavailable />;

/** The address with the query it came with (a grant's resume, the move named), `session` aside unless `keep`. */
export function withQuery(path: Route, query: Query, { keep = false }: { keep?: boolean } = {}): Route {
  const params = new URLSearchParams(path.includes('?') ? path.slice(path.indexOf('?') + 1) : '');
  for (const [key, value] of Object.entries(query)) {
    if (key === 'session' && !keep) continue;
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

/** The page's API did not answer: say so, with the way back. */
function Unavailable() {
  return (
    <div className="flex flex-col items-start gap-3" data-review="unavailable">
      <BackLink />
      <h1 className={HEADING.page}>This page didn't load</h1>
      <p className="text-muted-foreground">Reload to try again.</p>
    </div>
  );
}

/**
 * The first attempt's session, the page itself, or the next step (`?session=next`). The next step goes to the run
 * under way while there is one, and to the first attempt when it would show nothing. A Learn attempt's Pull request
 * view is this one too; its lesson is the other view, `…/lesson`.
 */
export async function FirstSessionView({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<Query>;
}) {
  const [gated, resolveHumans, query] = await Promise.all([gate(), loadResolveHumanThreads(), searchParams]);
  if (!gated) return null;
  const page = await pageOf(params);
  if (page.kind === 'unread') return <Unavailable />;
  if (page.kind === 'move') redirect(withQuery(pullRequestPath(page.ref), query, { keep: true }));
  const { view } = gated;
  const { first: attempt, base } = page;
  const at = { firstId: attempt.attemptId, base };
  const next = paramOf(query, 'session') === NEXT_SESSION;
  const { current, prNotes, replies } = await contributionOf(attempt);
  const now = new Date();
  const model = contributionMovesOf({ view, first: attempt, current, shown: attempt, replies, prNotes, now });
  if (next) {
    const underWay = attempt.followUps?.currentAttemptId;
    if (underWay) redirect(withQuery(sessionPath(at, underWay), query));
    if (attempt.pullRequest?.state !== 'OPEN' || !nextPaneShows(model, attempt)) redirect(withQuery(base, query));
  }
  return (
    <SessionPane
      view={view}
      attempt={attempt}
      first={attempt}
      current={current}
      model={model}
      next={next}
      move={paramOf(query, 'move')}
      resumed={!!paramOf(query, RESUME_PARAM)}
      now={now}
      resolveHumans={resolveHumans}
      base={base}
    />
  );
}

/**
 * A follow-up run's session, under its first attempt's page. An id that is not a run of this page's first attempt goes
 * to its own page, by its id.
 */
export async function RunSessionView({
  params,
  searchParams,
}: {
  params: Promise<PageParams & { runId: string }>;
  searchParams: Promise<Query>;
}) {
  const [{ runId }, gated, resolveHumans, query] = await Promise.all([
    params,
    gate(),
    loadResolveHumanThreads(),
    searchParams,
  ]);
  if (!gated) return null;
  const page = await pageOf(params);
  if (page.kind === 'unread') return <Unavailable />;
  if (page.kind === 'move') redirect(withQuery(pullRequestPath(page.ref, { run: runId }), query, { keep: true }));
  const { view } = gated;
  const { first, base } = page;
  const attempt = await loadAttempt(runId).catch(() => undefined);
  if (attempt === undefined) return <Unavailable />;
  if (attempt === null) notFound();
  if (attempt.kind !== 'FOLLOW_UP' || attempt.followUpOf?.attemptId !== first.attemptId) {
    redirect(withQuery(pullRequestByAttemptPath(runId), query, { keep: true }));
  }
  const { current, prNotes, replies } = await contributionOf(first);
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
      base={base}
    />
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
  base,
  earlier,
  lesson,
  children,
}: {
  view: ContributeView;
  attempt: ContributeAttemptDetail;
  first?: ContributeAttemptDetail;
  run?: ContributeAttemptDetail;
  shown?: string;
  /** A Learn attempt's lesson, while Learn is open to the viewer: the header's lesson line and its two views. */
  lesson?: LearnAttemptLesson | null;
  /** The page's address its sessions sit under; else the issue's, from the first attempt. */
  base?: Route;
  /** On an earlier attempt's page: the latest's address. */
  earlier?: { latest: Route } | null;
  now?: Date;
  /** The maintainers' say on its PR: a stop, and "this PR helped" notes. */
  prNotes?: ContributePrNotes;
  /** Its pull request's replies waiting for the user: a refusal names the org's block. */
  replies?: ContributeReplyWaiting[];
  model: ContributionMoves;
  children: ReactNode;
}) {
  const pageBase = first ? pageAtOf(first, base).base : base;
  const cards = first && pageBase ? sessionsOf(first, run, model, pageBase, sessionNamesOf(first.mode)) : null;
  const session = first
    ? { firstId: first.attemptId, nextShown: !!model.nextTileTitle || !!model.proofStage, shown }
    : null;

  return (
    <div className="flex flex-col gap-5" data-contribution={first?.attemptId ?? attempt.attemptId}>
      {/* The access level holds every attempt and run; the key's trouble is Needs you's to say. */}
      <ContributeNotices notices={accessNoticesOf(view)} variant="line" />
      <PullRequestHeader
        attempt={attempt}
        first={first}
        prNotes={prNotes}
        earlier={earlier}
        lesson={lesson}
        base={pageBase}
        now={now}
      />

      <PullRequestBody
        grid={cards ? RAIL_GRID : PANE_GRID}
        paneClass={cards ? '[grid-area:pane] min-w-0 mt-5 lg:mt-0' : '[grid-area:pane] min-w-0'}
        sessions={
          cards && first && session ? <SessionsList cards={cards} rounds={runsLabelOf(first)} {...session} /> : null
        }
        rules={
          cards && first ? (
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
          ) : null
        }
        notes={
          prNotes ? (
            <PrNotesPanel
              notes={prNotes}
              className={cards ? '[grid-area:notes] mt-5 lg:mt-4' : '[grid-area:notes] mt-5'}
            />
          ) : null
        }
      >
        {children}
      </PullRequestBody>
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
  base,
  earlier,
  lesson,
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
  /** The page's address; else the issue's, from the first attempt. */
  base?: Route;
  /** On an earlier attempt's page: the latest's address. */
  earlier?: { latest: Route } | null;
  /** A Learn attempt's lesson: the header's lesson line and its two views. */
  lesson?: LearnAttemptLesson | null;
}) {
  if (!attempt) return <Unavailable />;

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
      base={base}
      earlier={earlier}
      lesson={lesson}
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
        base={base}
      />
    </ContributionShell>
  );
}

export { grantNeededOf, prFormPropsOf } from './session-pane';
