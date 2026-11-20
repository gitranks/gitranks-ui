import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { ContributeTabSkeleton } from '@/app/(workspace)/contribute/components/contribute-tab-skeleton';
import { ContributeTab } from '@/app/(workspace)/contribute/components/contribute-tab-view';
import { issuesQueryOf } from '@/app/contribute/components/issues-filter';
import { Landing } from '@/app/contribute/components/landing';
import { signedInStartOf, VISITOR_START } from '@/app/contribute/components/landing-view';
import { ContributeNoProfile, ContributeSettingUp } from '@/components/workspace/setting-up';
import { loadAgentPage } from '@/lib/contribute/agent-page';
import {
  loadAttempts,
  loadContribute,
  loadContributeSetup,
  loadProviderInterests,
  viewerLogin,
} from '@/lib/workspace/contribute.data';
import { contributeHomeOf } from '@/lib/workspace/contribute-state';
import { loadWorkspaceGate } from '@/lib/workspace/gate.data';
import { hasAnyAttempt } from '@/lib/workspace/getting-in';
import { AGENTS_DOC_PATH, GETTING_IN_PATHS, WORKSPACE_PATHS } from '@/lib/workspace/paths';
import { contributeOpen } from '@/lib/workspace/preview-gate';

/**
 * The landing's markdown, for agents: named in the head, and served on `Accept: text/markdown`. Not indexed, set here as
 * well as on the section, so the landing stays out of search whatever its layout says.
 */
export const metadata: Metadata = {
  alternates: { types: { 'text/markdown': AGENTS_DOC_PATH } },
  robots: { index: false, follow: false },
};

/** Contribute's home: the landing until the user is onboarded, then the Contribute tab. */
export default function ContributeHomePage({ searchParams }: PageProps<'/contribute'>) {
  return (
    <Suspense fallback={<ContributeTabSkeleton />}>
      <ContributeHome searchParams={searchParams} />
    </Suspense>
  );
}

async function ContributeHome({ searchParams }: Pick<PageProps<'/contribute'>, 'searchParams'>) {
  const params = await searchParams;
  // The landing's numbers line, read beside the view: it never holds the page up, and a failed read leaves it out.
  const agentPage = loadAgentPage();
  const view = await loadContribute();
  if (!view) {
    // A new GitHub account, signed in and read for the first time now: what happens, until its account is ready.
    if (await loadContributeSetup()) {
      return (
        <main className="mx-auto w-full max-w-7xl px-4 pt-10 pb-16">
          <ContributeSettingUp />
        </main>
      );
    }
    const open = await contributeOpen();
    // Launched, signed in, and no profile here nor one on its way: the landing's sign-in would lead nowhere.
    if (open && (await viewerLogin())) {
      return (
        <main className="mx-auto w-full max-w-7xl px-4 pt-10 pb-16">
          <ContributeNoProfile />
        </main>
      );
    }
    // Launched, the landing is everyone's (§9.3): a visitor without a session.
    if (open) {
      return <Landing viewer="visitor" start={VISITOR_START} noted={[]} stats={(await agentPage)?.stats} />;
    }
    notFound();
  }

  const home = contributeHomeOf(view, params);
  // The own agent's old welcome (`?welcome=agent`, from a connect page still open in a tab): the first issue while
  // there is no attempt yet, else the tab without it.
  if (home.screen === 'tab' && params.welcome === 'agent') {
    redirect(
      hasAnyAttempt(await loadAttempts(undefined, 1)) ? WORKSPACE_PATHS.contribute : GETTING_IN_PATHS.contributeIssue,
    );
  }
  if (home.screen === 'tab') {
    const gate = await loadWorkspaceGate();
    const open = gate.kind === 'open';
    return (
      <ContributeTab
        view={view}
        agents={open ? gate.agents : { hosted: false, own: false }}
        learnOpen={open && gate.learnOpen}
        query={issuesQueryOf(params)}
      />
    );
  }
  // A visitor's page starts with nothing noted and at the flow's first step, the preview of it too.
  const visitor = home.viewer === 'visitor';
  return (
    <Landing
      viewer={home.viewer}
      start={visitor ? VISITOR_START : signedInStartOf(view)}
      preview={home.preview}
      noted={visitor ? [] : await loadProviderInterests()}
      stats={(await agentPage)?.stats}
    />
  );
}
