import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributeBadgePreview } from '../components/contribute-badge-preview';
import { LaunchedMorePages } from '../components/launched-more-pages';
import {
  MaintainerReposLoading,
  MaintainerReposPanel,
  MaintainersScreen,
  PrStrip,
} from '../components/maintainers-view';
import { loadMaintainerRepos } from '@/lib/contribute/maintainers.data';
import { orgAccessOf } from '@/lib/contribute/org-access';
import { prUrlOf } from '@/lib/contribute/pr-feedback';
import { loadMaintainerFacts, loadPrStrip } from '@/lib/contribute/pr-feedback.data';

export const metadata: Metadata = {
  title: 'For maintainers',
  description:
    'How a GitRanks pull request is made, the limits we hold ourselves to, how to tell us how one went, and how to opt out.',
};

/** A blocking route: it reads the footer link's PR and the numbers before it renders, both quick and cached. */
export const instant = false;

/**
 * Open to every visitor: the explanation renders with the numbers Contribute enforces, the visitor's repositories once
 * GitHub answers. A PR footer's link (`?from=`) names its PR above it all; an id we did not give names nothing.
 */
export default async function MaintainersPage({ searchParams }: PageProps<'/contribute/maintainers'>) {
  const { from } = await searchParams;
  const [facts, card] = await Promise.all([loadMaintainerFacts(), loadPrStrip(from)]);
  return (
    <MaintainersScreen
      facts={facts}
      strip={card ? <PrStrip card={card} /> : null}
      badge={
        <Suspense fallback={null}>
          <ContributeBadgePreview />
        </Suspense>
      }
      badgeRepo={card?.nameWithOwner}
      prLink={card ? prUrlOf(card) : undefined}
      repos={
        <Suspense fallback={<MaintainerReposLoading />}>
          <MaintainerRepos />
        </Suspense>
      }
      more={
        <Suspense fallback={null}>
          <LaunchedMorePages />
        </Suspense>
      }
    />
  );
}

async function MaintainerRepos() {
  return (
    <MaintainerReposPanel
      view={await loadMaintainerRepos()}
      orgAccessUrl={orgAccessOf(process.env.AUTH_GITHUB_BASIC_ID).url}
    />
  );
}
