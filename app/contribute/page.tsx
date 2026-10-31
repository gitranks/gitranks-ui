import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { Landing } from './components/landing';
import { overviewReadSectionsOf } from './components/overview-home';
import { OverviewScreen } from './components/overview-status';
import { ContributePageSkeleton } from './components/page-skeleton';
import { isAgentWelcome } from '@/lib/contribute/agent-connect';
import { loadAttempts, loadContribute, loadIssues, loadProviderInterests } from '@/lib/contribute/contribute.data';
import { contributeHomeOf, isOwnAgentOnly } from '@/lib/contribute/contribute-state';
import { isAgentFirstRun, isFirstRun } from '@/lib/contribute/first-run';
import { contributeOpen } from '@/lib/contribute/preview-gate';

/** The attempts the welcome reads to tell whether the user's own agent has made one. */
const AGENT_ATTEMPTS_READ = 20;

/** Contribute's home: the landing until the user is onboarded, then the overview. */
export default function ContributeHomePage({ searchParams }: PageProps<'/contribute'>) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-7xl px-4 pt-8 pb-16">
          <ContributePageSkeleton />
        </main>
      }
    >
      <ContributeHome searchParams={searchParams} />
    </Suspense>
  );
}

async function ContributeHome({ searchParams }: Pick<PageProps<'/contribute'>, 'searchParams'>) {
  const params = await searchParams;
  // Read beside the view, for the overview's first-run check; the landing does not wait for it. The welcome of the
  // user's own agent looks further back, for an attempt of the agent's beside the key's.
  const attempts = loadAttempts(undefined, isAgentWelcome(params.welcome) ? AGENT_ATTEMPTS_READ : 1).catch(
    () => undefined,
  );
  const view = await loadContribute();
  if (!view) {
    // Launched, the landing is everyone's (§9.3): a visitor without a session, or one Contribute does not know yet.
    if (await contributeOpen()) return <Landing viewer="visitor" noted={[]} />;
    notFound();
  }

  const home = contributeHomeOf(view, params);
  if (home.screen === 'overview') {
    // The feed's first page, read once: the guide's picks, Up next, and Right now's "no issues".
    const feed = loadIssues({});
    const sections = overviewReadSectionsOf(view, feed);
    if (home.welcome) {
      // The welcome of the user's own agent: its guide until it has made an attempt, which a hosted one is not.
      const read = await attempts;
      return (
        <OverviewScreen
          view={view}
          sections={sections}
          welcome={home.welcome}
          agentFirstRun={isAgentFirstRun(view, read) ? { page: await feed } : undefined}
        />
      );
    }
    // Before the first attempt, the guide says whether anything is picked yet: a key's (A3), or the own agent's (B2).
    const latest = await attempts;
    if (isFirstRun(view, latest)) {
      return <OverviewScreen view={view} sections={sections} firstRun={{ page: await feed }} />;
    }
    const agentFirstRun = isOwnAgentOnly(view) && isAgentFirstRun(view, latest);
    return (
      <OverviewScreen
        view={view}
        sections={sections}
        agentFirstRun={agentFirstRun ? { page: await feed } : undefined}
      />
    );
  }
  // A visitor's page starts with nothing noted, the preview of it too.
  const noted = home.viewer === 'visitor' ? [] : await loadProviderInterests();
  return <Landing viewer={home.viewer} preview={home.preview} noted={noted} />;
}
