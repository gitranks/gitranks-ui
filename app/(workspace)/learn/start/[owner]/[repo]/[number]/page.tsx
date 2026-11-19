import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { StartPageBody } from '@/components/workspace/start/start-page-body';
import { WorkspaceLive } from '@/components/workspace/workspace-live';
import { loadLearnOpen, loadLearnProfile } from '@/lib/learn/learn.data';
import { learnGoalLabelOf } from '@/lib/learn/profile-form';
import { viewerLogin } from '@/lib/workspace/contribute.data';
import { tabsOf } from '@/lib/workspace/gate';
import { loadWorkspaceGate } from '@/lib/workspace/gate.data';
import { learnStartIssueOf, startBackOf } from '@/lib/workspace/start/start-page';
import { loadStartPageView } from '@/lib/workspace/start/start-page.data';

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
 * here, so the page mounts the workspace's poll itself to notice the agent's claim.
 */
async function LearnStartView({ params }: Pick<Params, 'params'>) {
  const { owner, repo, number } = await params;
  const named = learnStartIssueOf(owner, repo, number);
  if (!(await viewerLogin())) notFound();
  const [open, profile] = await Promise.all([loadLearnOpen(), loadLearnProfile()]);
  if (!open || !named) notFound();

  const ref = { repo: named.repo, issue: named.number };
  const load = await loadStartPageView(ref, 'lesson', learnGoalLabelOf(profile));
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
  const gate = await loadWorkspaceGate().catch(() => null);
  return gate && tabsOf(gate).length ? body : <WorkspaceLive>{body}</WorkspaceLive>;
}
