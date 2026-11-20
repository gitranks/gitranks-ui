import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { StartPageBody } from '@/components/workspace/start/start-page-body';
import { loadLearnProfile } from '@/lib/learn/learn.data';
import { learnGoalLabelOf } from '@/lib/learn/profile-form';
import { notEnteredTargetOf } from '@/lib/workspace/gate';
import { loadWorkspaceGate } from '@/lib/workspace/gate.data';
import { startPath } from '@/lib/workspace/paths';
import { learnStartIssueOf, startBackOf, startModeOf } from '@/lib/workspace/start/start-page';
import { loadStartPageView } from '@/lib/workspace/start/start-page.data';

export const metadata: Metadata = { title: 'Start an issue', robots: { index: false, follow: false } };

type Params = PageProps<'/my/start/[owner]/[repo]/[issue]'>;

/**
 * The Start page for one issue, the viewer's own, read per request: Fix it, or with a lesson (`?lesson=1`, which lights
 * the Learn tab). Not indexed, and in no sitemap.
 */
export default function StartPage({ params, searchParams }: Params) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <StartView params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/**
 * The page's reads. An address that names no issue is not found. Lesson mode, for an account Learn is not open to, goes
 * to the same address in Fix mode; an account that has not entered goes where the gate says (a lesson: Learn's step
 * for the issue). The viewer's own
 * attempt on the issue moves on to its pull request's page (a Fix attempt in lesson mode is worded instead).
 */
async function StartView({ params, searchParams }: Pick<Params, 'params' | 'searchParams'>) {
  const [{ owner, repo, issue }, search] = await Promise.all([params, searchParams]);
  const named = learnStartIssueOf(owner, repo, issue);
  if (!named) notFound();
  const ref = { repo: named.repo, issue: named.number };
  const mode = startModeOf(search.lesson);
  const fixMode = startPath(ref);

  // Signed out, hidden and being set up are the layout's (the sign-in, the 404, Contribute's home).
  const gate = await loadWorkspaceGate();
  if (gate.kind !== 'open') notFound();
  if (mode === 'lesson' && !gate.learnOpen) redirect(fixMode);
  if (!gate.entered) {
    const to = notEnteredTargetOf(fixMode, new URLSearchParams(mode === 'lesson' ? { lesson: '1' } : {}));
    if (to) redirect(to);
  }

  const goal = mode === 'lesson' ? learnGoalLabelOf(await loadLearnProfile()) : null;
  const load = await loadStartPageView(ref, mode, goal);
  if (load.kind === 'not-found') {
    if (mode === 'lesson') redirect(fixMode);
    notFound();
  }
  if (load.kind === 'claimed') redirect(load.href);

  const back = startBackOf(mode, search.from);
  return (
    <StartPageBody
      issueRef={ref}
      mode={mode}
      view={load.view}
      backHref={back.href}
      backLabel={back.label}
      frame="tabs"
    />
  );
}
