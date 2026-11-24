import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { fixPageUrlOf, pullRequestLinksOf } from './page-links';
import { gate, type PageParams, pageOf, type Query, Unavailable, withQuery } from './page-read';
import { type PullRequestOps, PullRequestPageView } from './page-view';
import { PrNotesPanel } from './pr-notes';
import { ProofSection } from './proof-section';
import { WalkthroughTakeDown } from './walkthrough-take-down';
import { WorkspaceSignIn } from '@/components/workspace/workspace-sign-in';
import { SITE_URL } from '@/lib/seo/site';
import { ownAgentChangesOf } from '@/lib/workspace/attempt-format';
import type { WalkthroughSendBack } from '@/lib/workspace/blocked-walkthrough';
import { loadAttempt, loadPrNotes, loadRepliesWaiting, viewerLogin } from '@/lib/workspace/contribute.data';
import type { ContributeAttemptDetail, ContributeReplyWaiting } from '@/lib/workspace/contribute.types';
import { pullRequestByAttemptPath, pullRequestPath } from '@/lib/workspace/paths';
import {
  loadBlockedWalkthroughs,
  loadPullRequestPage,
  loadTimelineSwitch,
  pullRequestRefOf,
} from '@/lib/workspace/pull-request.data';
import type { PullRequestPage } from '@/lib/workspace/pull-request-page.types';

/** The run a round's send-back goes to: the one under way, else the newest. */
const runIdOf = (first: ContributeAttemptDetail) =>
  first.followUps?.currentAttemptId ?? first.followUps?.history?.at(-1)?.attemptId ?? null;

/** What "Try again" starts again: a fix stopped before its pull request, or a round stopped at the person's limit. */
function retryIdOf(page: PullRequestPage, first: ContributeAttemptDetail): string | null {
  if (page.box !== 'STOPPED') return null;
  if (page.number === null) return first.retry ? first.attemptId : null;
  return page.stoppedAtLimit ? (first.followUps?.history?.at(-1)?.attemptId ?? null) : null;
}

/** How long a read that only adds a part to the page may take: past it, the page is drawn without that part. */
const PART_MS = 2500;

/** A read that only adds a part: null when it fails or is late, so it never holds the page. */
function part<T>(read: Promise<T>): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), PART_MS);
  });
  return Promise.race([read.catch(() => null), late]).finally(() => clearTimeout(timer));
}

/** Whether a walkthrough that waits for another pass can go back to the person's own agent. */
function walkthroughSendBackOf(first: ContributeAttemptDetail): WalkthroughSendBack {
  if (!ownAgentChangesOf(first)) return 'no';
  return (first.sendBacksLeft ?? 0) > 0 ? 'yes' : 'none-left';
}

/** The fixer's walkthrough of a Learn fix, while it is public or paused: the one they may take down. */
async function takeDownSlugOf(attemptId: string): Promise<string | null> {
  const { loadAttemptLesson } = await import('@/lib/learn/learn.data');
  const lesson = await part(loadAttemptLesson(attemptId));
  const visible = lesson?.visibility === 'PUBLIC' || lesson?.visibility === 'HELD';
  return visible ? (lesson?.head?.slug ?? null) : null;
}

/** The replies of the pull request that did not post, by the newest run that drafted any. */
function failedRepliesOf(waiting: ContributeReplyWaiting[] | undefined, prId: string | null) {
  const failed = (waiting ?? []).filter((reply) => reply.prId === prId && reply.state === 'FAILED');
  const runId = failed.at(-1)?.attemptId;
  if (!runId) return null;
  return { runId, draftIds: failed.filter((reply) => reply.attemptId === runId).map((reply) => reply.draftId) };
}

/**
 * The pull request's page for its address: the issue's newest fix, an earlier attempt's (`attemptId`), or one of its
 * runs (`runId`), which opens the page at the run's round. An address in another spelling moves to the current one, a
 * run of another fix to its own page.
 */
export async function PullRequestPageScreen({
  params,
  searchParams,
}: {
  params: Promise<PageParams & { runId?: string }>;
  searchParams: Promise<Query>;
}) {
  const [gated, query, { runId }] = await Promise.all([gate(), searchParams, params]);
  if (!gated) return <WorkspaceSignIn what="contribution" />;
  const read = await pageOf(params);
  if (read.kind === 'unread') return <Unavailable />;
  if (read.kind === 'move') redirect(withQuery(pullRequestPath(read.ref, runId ? { run: runId } : undefined), query));
  const { first, earlier, base } = read;

  let openRound: number | null = null;
  if (runId) {
    const run = await loadAttempt(runId).catch(() => undefined);
    if (run === undefined) return <Unavailable />;
    if (run === null) notFound();
    if (run.kind !== 'FOLLOW_UP' || run.followUpOf?.attemptId !== first.attemptId) {
      redirect(withQuery(pullRequestByAttemptPath(runId), query));
    }
    openRound = run.round?.round ?? null;
  }

  const refInput = pullRequestRefOf(read.repo, read.issue, first.attemptId);
  const [page, login] = await Promise.all([loadPullRequestPage(refInput), viewerLogin()]);
  if (page === undefined) return <Unavailable />;
  if (page === null) notFound();

  const prId = first.pullRequest?.prId ?? null;
  const kinds = new Set(page.onlyYou.map(({ kind }) => kind));
  const open = page.number !== null;
  const [timeline, waiting, current, prNotes, blocked, takeDown] = await Promise.all([
    open ? loadTimelineSwitch(first.attemptId) : null,
    kinds.has('replies_failed') || kinds.has('bot_blocked') ? loadRepliesWaiting() : undefined,
    kinds.has('bot_blocked') && first.followUps?.currentAttemptId
      ? loadAttempt(first.followUps.currentAttemptId).catch(() => undefined)
      : undefined,
    first.pullRequest ? part(loadPrNotes(first.attemptId)) : null,
    page.made === 'LEARN' && page.box === 'WALKTHROUGH' ? loadBlockedWalkthroughs() : null,
    page.made === 'LEARN' && open && !earlier ? takeDownSlugOf(first.attemptId) : null,
  ]);
  const now = new Date();
  const latest = !earlier;
  const ops: PullRequestOps = {
    attemptId: first.attemptId,
    prId: page.number !== null && page.box !== 'MERGED' ? prId : null,
    runId: runIdOf(first),
    walkthroughSendBack: walkthroughSendBackOf(first),
    retryId: retryIdOf(page, first),
    discard: latest && page.number === null && !['STOPPED', 'DISCARDED', 'CLOSED'].includes(page.box),
    failedReplies: failedRepliesOf(waiting, prId),
    timeline:
      timeline && page.number !== null
        ? { nameWithOwner: page.repo, number: page.number, shown: timeline.shown }
        : null,
    returnTo: base,
  };
  const replies = waiting?.filter((reply) => reply.prId === prId);
  const view = (
    <PullRequestPageView
      page={page}
      now={now}
      refInput={refInput}
      links={pullRequestLinksOf(page, { latest, login })}
      fixUrl={fixPageUrlOf(page, SITE_URL)}
      ops={ops}
      openRound={openRound}
      walkthroughBlocked={blocked?.get(first.attemptId) ?? null}
      maintainers={prNotes?.notes.length ? <PrNotesPanel notes={prNotes} /> : null}
      takeDown={takeDown ? <WalkthroughTakeDown slug={takeDown} /> : null}
      proof={
        kinds.has('bot_blocked') ? (
          <ProofSection
            view={gated.view}
            first={first}
            current={current ?? undefined}
            replies={replies}
            prNotes={prNotes ?? undefined}
            now={now}
          />
        ) : null
      }
    />
  );
  if (!earlier) return view;
  return (
    <>
      <p className="mx-auto m-0 w-full max-w-4xl text-sm text-muted-foreground" data-earlier="">
        An earlier attempt on this issue.{' '}
        <Link href={earlier.latest} prefetch={false} className="font-semibold text-link hover:underline">
          See the latest →
        </Link>
      </p>
      {view}
    </>
  );
}
