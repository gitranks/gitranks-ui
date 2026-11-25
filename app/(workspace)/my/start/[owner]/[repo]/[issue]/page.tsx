import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { StartPageBody } from '@/components/workspace/start/start-page-body';
import { signTargetOf } from '@/lib/workspace/gate';
import { loadWorkspaceGate } from '@/lib/workspace/gate.data';
import { loadStartPageWithMask } from '@/lib/workspace/masked-issue.data';
import { searchParamsOf, startPath } from '@/lib/workspace/paths';
import { learnStartIssueOf, startBackOf, startModeOf } from '@/lib/workspace/start/start-page';
import { loadStartPageView } from '@/lib/workspace/start/start-page.data';

export const metadata: Metadata = { title: 'Start an issue', robots: { index: false, follow: false } };

type Params = PageProps<'/my/start/[owner]/[repo]/[issue]'>;

/**
 * The Start page for one issue, the viewer's own, read per request: Fix it, or with a lesson (`?lesson=1`, a page Learn
 * owns: no tab is current). Not indexed, and in no sitemap.
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
 * The page's reads. An address that names no issue is not found. The viewer's own attempt on the issue moves on to its
 * pull request's page (a Fix attempt in lesson mode is worded instead), whatever sign they have, so such a link still
 * leads to it. Only then the sign the page needs is checked (`signTargetOf`): the Contribute sign from Contribute, the
 * Learn sign from Learn (`?from=learn` or `?lesson=1`), each sending a person without it to its onboarding. Lesson mode
 * the API has no page for goes to the same address in Fix mode.
 *
 * Issue details are hidden until a person asks to see one, and an issue's own page is at its mask's address. This
 * address keeps working for an issue the viewer works on (its pull request's page), holds or named (this page), and is
 * not found for any other: it would name an issue nobody uncovered. The issue's answer is read once, with its mask.
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

  const withMask = await loadStartPageWithMask(ref, mode);
  const load = await loadStartPageView(ref, mode, withMask?.answer);
  if (load.kind === 'claimed') redirect(load.href);
  const to = signTargetOf(fixMode, searchParamsOf(search), gate.signs);
  if (to) redirect(to);
  if (load.kind === 'not-found') {
    if (mode === 'lesson') redirect(fixMode);
    notFound();
  }
  if (withMask?.maskId) notFound();

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
