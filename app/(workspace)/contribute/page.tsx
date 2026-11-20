import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { ContributeTabSkeleton } from '@/app/(workspace)/contribute/components/contribute-tab-skeleton';
import { ContributeTab } from '@/app/(workspace)/contribute/components/contribute-tab-view';
import { issuesQueryOf } from '@/app/contribute/components/issues-filter';
import { Landing } from '@/app/contribute/components/landing';
import { ContributeNoProfile, ContributeSettingUp } from '@/components/workspace/setting-up';
import { loadAgentPage } from '@/lib/contribute/agent-page';
import {
  loadContribute,
  loadContributeSetup,
  loadProviderInterests,
  viewerLogin,
} from '@/lib/workspace/contribute.data';
import { contributeHomeOf } from '@/lib/workspace/contribute-state';
import { loadWorkspaceGate } from '@/lib/workspace/gate.data';
import { AGENTS_DOC_PATH, CONNECT_AGENT_PATH, CONNECT_KEY_PATH } from '@/lib/workspace/paths';
import { contributeOpen } from '@/lib/workspace/preview-gate';

/** The landing's markdown, for agents: named in the head, and served on `Accept: text/markdown`. */
export const metadata: Metadata = { alternates: { types: { 'text/markdown': AGENTS_DOC_PATH } } };

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
  // Where an agent sends its person: a visitor gets the own-agent sign-in open over the landing,
  // anyone signed in goes straight to connecting their agent (an onboarded member's is the Contribute tab).
  const startAgent = params.start === 'agent';
  if (startAgent && view) redirect(CONNECT_AGENT_PATH);
  // Back from setting up a new account (`settingUpHomeOf`): on to the Claude key's first step.
  if (params.start === 'key' && view) redirect(CONNECT_KEY_PATH);
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
      return <Landing viewer="visitor" noted={[]} startAgent={startAgent} stats={(await agentPage)?.stats} />;
    }
    notFound();
  }

  const home = contributeHomeOf(view, params);
  if (home.screen === 'tab') {
    // The tab; `?welcome=agent` from the own agent's connect step is taken as the tab itself.
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
  // A visitor's page starts with nothing noted, the preview of it too.
  const noted = home.viewer === 'visitor' ? [] : await loadProviderInterests();
  return <Landing viewer={home.viewer} preview={home.preview} noted={noted} stats={(await agentPage)?.stats} />;
}
