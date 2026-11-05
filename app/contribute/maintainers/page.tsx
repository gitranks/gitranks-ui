import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributeBadgePreview } from '../components/contribute-badge-preview';
import { LaunchedMorePages } from '../components/launched-more-pages';
import {
  BadgeMarkdown,
  MaintainerReposLoading,
  MaintainerReposPanel,
  MaintainersScreen,
  PrStrip,
} from '../components/maintainers-view';
import { PrLinkForm } from '../components/pr-link-form';
import type { ContributeMaintainerFacts, ContributePrCard } from '@/lib/contribute/contribute.types';
import { MAINTAINERS_PATH } from '@/lib/contribute/contribute-path';
import { BADGE_EXAMPLE_REPO } from '@/lib/contribute/maintainer-config';
import { loadMaintainerRepos } from '@/lib/contribute/maintainers.data';
import { orgAccessOf } from '@/lib/contribute/org-access';
import { attemptIdOf, prUrlOf } from '@/lib/contribute/pr-feedback';
import { loadMaintainerFacts, loadPrStrip } from '@/lib/contribute/pr-feedback.data';

export const metadata: Metadata = {
  title: 'For maintainers',
  description:
    'How a GitRanks pull request is made, the limits we hold ourselves to, how to tell us how one went, and how to opt out.',
};

type Query = PageProps<'/contribute/maintainers'>['searchParams'];

/**
 * Open to every visitor: the page renders at once with the numbers Contribute enforces (cached), and what depends on
 * the request streams in: the PR a footer link names (`?from=`, nothing for an id we did not give), its repo in the
 * badge's Markdown and the PR link, and the visitor's repositories once GitHub answers.
 */
export default async function MaintainersPage({ searchParams }: PageProps<'/contribute/maintainers'>) {
  const facts = await loadMaintainerFacts();
  // One read of the footer link's PR, shared by the parts that show it.
  const card = searchParams.then(({ from }) => loadPrStrip(from));
  return (
    <MaintainersScreen
      facts={facts}
      strip={
        <Suspense fallback={null}>
          <StripSlot card={card} />
        </Suspense>
      }
      badge={
        <Suspense fallback={null}>
          <ContributeBadgePreview />
        </Suspense>
      }
      badgeMarkdown={
        <Suspense fallback={<BadgeMarkdown repo={BADGE_EXAMPLE_REPO} />}>
          <BadgeMarkdownSlot card={card} />
        </Suspense>
      }
      prLinkForm={
        <Suspense fallback={<PrLinkForm />}>
          <PrLinkSlot card={card} />
        </Suspense>
      }
      repos={
        <Suspense fallback={<MaintainerReposLoading />}>
          <MaintainerRepos searchParams={searchParams} facts={facts} />
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

async function StripSlot({ card }: { card: Promise<ContributePrCard | null> }) {
  const read = await card;
  return read ? <PrStrip card={read} /> : null;
}

async function BadgeMarkdownSlot({ card }: { card: Promise<ContributePrCard | null> }) {
  return <BadgeMarkdown repo={(await card)?.nameWithOwner ?? BADGE_EXAMPLE_REPO} />;
}

async function PrLinkSlot({ card }: { card: Promise<ContributePrCard | null> }) {
  const read = await card;
  return <PrLinkForm defaultValue={read ? prUrlOf(read) : ''} />;
}

async function MaintainerRepos({
  searchParams,
  facts,
}: {
  searchParams: Query;
  facts: ContributeMaintainerFacts | null;
}) {
  const from = attemptIdOf((await searchParams).from);
  return (
    <MaintainerReposPanel
      view={await loadMaintainerRepos()}
      facts={facts}
      orgAccessUrl={orgAccessOf(process.env.AUTH_GITHUB_BASIC_ID).url}
      returnTo={from ? `${MAINTAINERS_PATH}?${new URLSearchParams({ from })}` : MAINTAINERS_PATH}
    />
  );
}
