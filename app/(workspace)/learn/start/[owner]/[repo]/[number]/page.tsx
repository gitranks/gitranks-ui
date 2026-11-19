import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { StartPageBody } from '@/components/workspace/start/start-page-body';
import { WorkspaceLive } from '@/components/workspace/workspace-live';
import { loadLearnOpen, loadLearnProfile } from '@/lib/learn/learn.data';
import { LEARN_PATH } from '@/lib/learn/learn-path';
import { learnGoalLabelOf } from '@/lib/learn/profile-form';
import { viewerLogin } from '@/lib/workspace/contribute.data';
import { learnStartIssueOf, startBackOf } from '@/lib/workspace/start/start-page';
import { loadStartPageContributor, loadStartPageView } from '@/lib/workspace/start/start-page.data';

export const metadata: Metadata = { title: 'Start your own lesson', robots: { index: false, follow: false } };

type Params = PageProps<'/learn/start/[owner]/[repo]/[number]'>;

/**
 * Learn's own address of the Start page for one issue: the same page in lesson mode, the viewer's own, read per
 * request. Not indexed, and in no sitemap.
 */
export default function LearnStartPage({ params }: Params) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <LearnStartView params={params} />
      </Suspense>
    </main>
  );
}

/**
 * Behind Learn's gate: not found for anyone Learn is not open to, and for an address that names no issue. The
 * viewer's own attempt on the issue moves on to its pull request's page. An account that has not entered sees no tabs
 * here, so the page mounts the workspace's poll itself to notice the agent's claim; under the tabs, theirs runs alone.
 */
async function LearnStartView({ params }: Pick<Params, 'params'>) {
  const { owner, repo, number } = await params;
  const named = learnStartIssueOf(owner, repo, number);
  if (!(await viewerLogin())) notFound();
  const [open, profile] = await Promise.all([loadLearnOpen(), loadLearnProfile()]);
  if (!open || !named) notFound();

  const goal = learnGoalLabelOf(profile);
  // No goal and no contributor yet: Learn home asks for the goal, which sets the account up (as before this page moved).
  if (!goal && (await loadStartPageContributor()) === false) redirect(LEARN_PATH);

  const ref = { repo: named.repo, issue: named.number };
  const load = await loadStartPageView(ref, 'lesson', goal);
  if (load.kind === 'not-found') notFound();
  if (load.kind === 'claimed') redirect(load.href);

  const back = startBackOf('lesson');
  const body = (
    <StartPageBody
      issueRef={ref}
      mode="lesson"
      view={load.view}
      backHref={back.href}
      backLabel={back.label}
      frame="tabs"
    />
  );
  // The tabs' poll, when they show, takes over from this one (`WorkspaceLive` stands by).
  return <WorkspaceLive>{body}</WorkspaceLive>;
}
