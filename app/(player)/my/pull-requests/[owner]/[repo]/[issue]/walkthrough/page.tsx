import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { FixerWaiting } from '@/components/learn/walkthrough/fixer-waiting';
import { FixerWalkthroughPlayer } from '@/components/learn/walkthrough/fixer-walkthrough';
import { WalkthroughHead, WalkthroughPartArticle } from '@/components/learn/walkthrough/walkthrough-parts';
import { ContributeSessionSkeleton } from '@/components/workspace/page-skeleton';
import { type PlayerCrumb, PlayerStrip } from '@/components/workspace/player/player-strip';
import { lessonPageOf, type PageParams, Unavailable } from '@/components/workspace/pull-request/page-read';
import { LEARN_APPROVE_PAGE_BUILT } from '@/lib/learn/built-pages';
import type { LearnAttemptLesson } from '@/lib/learn/learn.types';
import { LEARN_PULL_REQUESTS_PATH, learnFixWalkthroughPath } from '@/lib/learn/paths';
import { pullRequestApprovePath } from '@/lib/workspace/paths';

/** The person's own page: named plainly, never indexed (the layout's). */
export const metadata: Metadata = { title: 'Fix walkthrough' };

/** The fixer's own walkthrough, before the pull request opens: signed in only (the layout's gate). */
export default function FixerWalkthroughPage({
  params,
  searchParams,
}: PageProps<'/my/pull-requests/[owner]/[repo]/[issue]/walkthrough'>) {
  return (
    <Suspense fallback={<ContributeSessionSkeleton />}>
      <FixerWalkthroughView params={params} searchParams={searchParams} />
    </Suspense>
  );
}

/** The way back: the pull requests, this one, this page. */
function crumbsOf(repo: string, issue: number, base: Route): PlayerCrumb[] {
  return [
    { label: 'Pull requests', href: LEARN_PULL_REQUESTS_PATH },
    { label: `${repo} #${issue}`, href: base },
    { label: 'The walkthrough of this fix' },
  ];
}

/** The attempt's states while its pull request is being opened. */
const OPENING: ReadonlySet<string> = new Set(['PENDING_AUTOSUBMIT', 'SUBMITTING']);

/** The pull request the walkthrough is about, once it is open: from the lesson, else from the attempt. */
const openPrOf = (lesson: LearnAttemptLesson, number: number | null | undefined) =>
  lesson.head?.subject.pr ?? number ?? null;

/**
 * The fixer's walkthrough by stage. While the agent writes or rewrites it, a box that says so; then the parts and the
 * run (`WARMUP` and `LESSON`, and a blocked run, which the player draws). A passed one opens Approve, the way on (the
 * pull request's page while it is being opened). Once the pull request is open the
 * walkthrough is public: its public address. A pull request opened by hand, or an attempt that ended, has its own words
 * on the pull request's page. A Fix attempt has no walkthrough: its pull request's page.
 */
async function FixerWalkthroughView({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const read = await lessonPageOf(params, await searchParams);
  if (!read) return null;
  if (read === 'unread') return <Unavailable />;
  const { first, lesson, base } = read;
  const { owner, repo: name, issue } = await params;
  const repo = first.nameWithOwner ?? `${owner}/${name}`;
  const issueNumber = first.number ?? Number(issue);
  const crumbs = crumbsOf(repo, issueNumber, base);
  const approve = LEARN_APPROVE_PAGE_BUILT ? pullRequestApprovePath({ repo, issue: issueNumber }) : base;

  switch (lesson.stage) {
    case 'PR_OPEN': {
      const pr = openPrOf(lesson, first.pullRequest?.number);
      return redirect(pr ? learnFixWalkthroughPath({ nameWithOwner: repo, number: pr }) : base);
    }
    case 'HAND_PR':
    case 'ENDED':
      return redirect(base);
    // Passed: the emails' "Read and send" lead here, and the way on is Approve; a pull request being opened, its page.
    case 'READY_TO_APPROVE':
      return redirect(OPENING.has(first.state) ? base : approve);
    case 'AGENT_WORKING':
    case 'AGENT_REWRITING':
      return (
        <>
          <PlayerStrip crumbs={crumbs} />
          <FixerWaiting rewriting={lesson.stage === 'AGENT_REWRITING'} back={base} />
        </>
      );
    default:
      break;
  }

  const steps = lesson.steps ?? [];
  const head = (
    <WalkthroughHead
      facts={{
        repo,
        issueNumber,
        number: null,
        language: lesson.head?.language ?? null,
        fixer: null,
        title: lesson.head?.subject.issueTitle?.trim() || lesson.head?.title || `${repo} #${issueNumber}`,
      }}
    />
  );
  return (
    <FixerWalkthroughPlayer
      // A new stage from the API starts the run's screen afresh: a passed run, a blocked one.
      key={lesson.stage}
      attemptId={first.attemptId}
      crumbs={crumbs}
      head={head}
      stepIds={steps.map((step) => step.id)}
      articles={steps.map((step, index) => (
        <WalkthroughPartArticle
          key={step.id}
          heading={step.title}
          blocks={step.blocks}
          index={index}
          count={steps.length}
        />
      ))}
      run={lesson.run}
      pullRequest={base}
      finish={approve}
    />
  );
}
