import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { FixerWaiting } from '@/components/learn/walkthrough/fixer-waiting';
import { FixerWalkthroughPlayer } from '@/components/learn/walkthrough/fixer-walkthrough';
import { WalkthroughHead, WalkthroughPartArticle } from '@/components/learn/walkthrough/walkthrough-parts';
import { ContributeSessionSkeleton } from '@/components/workspace/page-skeleton';
import { type PlayerCrumb, PlayerStrip } from '@/components/workspace/player/player-strip';
import { LessonUnavailable, lessonPageOf, type PageParams } from '@/components/workspace/pull-request/review-view';
import { LEARN_APPROVE_PAGE_BUILT } from '@/lib/learn/built-pages';
import type { LearnAttemptLesson } from '@/lib/learn/learn.types';
import { LEARN_PULL_REQUESTS_PATH, learnFixWalkthroughPath } from '@/lib/learn/paths';
import { pullRequestApprovePath } from '@/lib/workspace/paths';

/** The person's own page: named plainly, never indexed (the layout's). */
export const metadata: Metadata = { title: 'Fix walkthrough' };

/** The fixer's own walkthrough, before the pull request opens: signed in only (the layout's gate). */
export default function FixerWalkthroughPage({
  params,
}: PageProps<'/my/pull-requests/[owner]/[repo]/[issue]/walkthrough'>) {
  return (
    <Suspense fallback={<ContributeSessionSkeleton />}>
      <FixerWalkthroughView params={params} />
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

/** The pull request the walkthrough is about, once it is open: from the lesson, else from the attempt. */
const openPrOf = (lesson: LearnAttemptLesson, number: number | null | undefined) =>
  lesson.head?.subject.pr ?? number ?? null;

/**
 * The fixer's walkthrough by stage. While the agent writes or rewrites it, a box that says so; then the parts and the
 * run (`WARMUP` and `LESSON`, and a passed or blocked run, which the player draws). Once the pull request is open the
 * walkthrough is public: its public address. A pull request opened by hand, or an attempt that ended, has its own words
 * on the pull request's page. A Fix attempt has no walkthrough: its pull request's page.
 */
async function FixerWalkthroughView({ params }: { params: Promise<PageParams> }) {
  const read = await lessonPageOf(params, 'walkthrough');
  if (!read) return null;
  if (read === 'unread') return <LessonUnavailable />;
  const { first, lesson, base } = read;
  const { owner, repo: name, issue } = await params;
  const repo = first.nameWithOwner ?? `${owner}/${name}`;
  const issueNumber = first.number ?? Number(issue);
  const crumbs = crumbsOf(repo, issueNumber, base);

  switch (lesson.stage) {
    case 'PR_OPEN': {
      const pr = openPrOf(lesson, first.pullRequest?.number);
      return redirect(pr ? learnFixWalkthroughPath({ nameWithOwner: repo, number: pr }) : base);
    }
    case 'HAND_PR':
    case 'ENDED':
      return redirect(base);
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
      finish={LEARN_APPROVE_PAGE_BUILT ? pullRequestApprovePath({ repo, issue: issueNumber }) : base}
    />
  );
}
