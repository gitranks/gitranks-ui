import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { ContributeTabSkeleton } from '@/app/(workspace)/contribute/components/contribute-tab-skeleton';
import { ContributeTab } from '@/app/(workspace)/contribute/components/contribute-tab-view';
import { Landing } from '@/app/contribute/components/landing';
import {
  landingLiveOf,
  noViewPanelOf,
  signedInStartOf,
  startLandingReads,
  VISITOR_START,
} from '@/app/contribute/components/landing-view';
import { LANDING_HERO, LANDING_SEARCH_TITLE } from '@/lib/contribute/landing-copy';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { loadAttempts, loadContribute, loadProviderInterests } from '@/lib/workspace/contribute.data';
import { contributeHomeOf } from '@/lib/workspace/contribute-state';
import { loadWorkspaceGate } from '@/lib/workspace/gate.data';
import { hasAnyAttempt } from '@/lib/workspace/getting-in';
import { issuePageCarriedOf } from '@/lib/workspace/masked-issue';
import { AGENTS_DOC_PATH, GETTING_IN_PATHS, WORKSPACE_PATHS } from '@/lib/workspace/paths';

const SEO = pageMetadata({
  title: { absolute: LANDING_SEARCH_TITLE },
  description: LANDING_HERO.lead,
  path: WORKSPACE_PATHS.contribute,
});

/**
 * Indexed for every viewer: a search engine opens `/contribute` as a visitor and gets the landing, and what a signed-in
 * person sees here is never crawled. One static block, no read of the session. Its own canonical folds the page's
 * variants (`?as=visitor`, `?welcome=agent`, `?issue=`, old filter queries, tracking tags) into it. The Markdown for
 * agents is named in the head and served on `Accept: text/markdown`; metadata merges shallowly, so the canonical is
 * set again beside it.
 */
export const metadata: Metadata = {
  ...SEO,
  alternates: { ...SEO.alternates, types: { 'text/markdown': AGENTS_DOC_PATH } },
  robots: { index: true, follow: true },
};

/**
 * Contribute's home: the landing until the user is onboarded, then Contribute home. The landing is the page search
 * engines get.
 */
export default function ContributeHomePage({ searchParams }: PageProps<'/contribute'>) {
  return (
    <Suspense fallback={<ContributeTabSkeleton />}>
      <ContributeHome searchParams={searchParams} />
    </Suspense>
  );
}

async function ContributeHome({ searchParams }: Pick<PageProps<'/contribute'>, 'searchParams'>) {
  const params = await searchParams;
  // The landing's live reads (the numbers line, the proof), started beside the view: a failed or slow one leaves its
  // part out.
  const reads = startLandingReads();
  const view = await loadContribute();
  if (!view) {
    // Being set up, or no profile: the panel that says so. Launched, the landing is everyone's: a visitor's.
    return (
      (await noViewPanelOf()) ?? (
        <Landing viewer="visitor" start={VISITOR_START} noted={[]} {...(await landingLiveOf(reads))} />
      )
    );
  }

  // Ready now, after the setting-up: back to the page of the issue the account came from.
  const carried = issuePageCarriedOf(params);
  if (carried) redirect(carried);

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
    // An old address's filters (`kind`, `size`, `language`) are left in it: nothing reads them.
    return <ContributeTab view={view} agents={open ? gate.agents : { hosted: false, own: false }} />;
  }
  // A visitor's page starts with nothing noted and at the flow's first step, the preview of it too.
  const visitor = home.viewer === 'visitor';
  const [noted, live] = await Promise.all([visitor ? [] : loadProviderInterests(), landingLiveOf(reads)]);
  return (
    <Landing
      viewer={home.viewer}
      start={visitor ? VISITOR_START : signedInStartOf(view)}
      preview={home.preview}
      noted={noted}
      {...live}
    />
  );
}
