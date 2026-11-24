import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributeBadgePreview } from '@/app/contribute/components/contribute-badge-preview';
import { LaunchedMorePages } from '@/app/contribute/components/launched-more-pages';
import {
  BadgeMarkdown,
  MaintainerReposLoading,
  MaintainerReposPanel,
  MaintainersFoot,
  MaintainersScreen,
  PrStrip,
} from '@/app/contribute/components/maintainers-view';
import { ScrollToHash } from '@/components/workspace/scroll-to-hash';
import { loadMaintainerRepos } from '@/lib/contribute/maintainers.data';
import { loadMaintainerFacts, loadPrStrip } from '@/lib/contribute/pr-feedback.data';
import type { ContributeMaintainerFacts, ContributePrCard } from '@/lib/workspace/contribute.types';
import { BADGE_EXAMPLE_REPO } from '@/lib/workspace/maintainer-config';
import { orgAccessOf } from '@/lib/workspace/org-access';
import { MAINTAINERS_PATH } from '@/lib/workspace/paths';
import { attemptIdOf } from '@/lib/workspace/pr-feedback';
import { publicTimelinePathOf } from '@/lib/workspace/pr-timeline.data';

export const metadata: Metadata = {
  title: 'For maintainers',
  description:
    'How a GitRanks pull request is made, with Contribute or Learn, the limits we hold ourselves to, your rules, and how to opt out.',
};

type Query = PageProps<'/contribute/maintainers'>['searchParams'];

/**
 * Open to every visitor: the page renders at once with the numbers Contribute enforces (cached), and what depends on
 * the request streams in: the PR a footer link names (`?from=`, nothing for an id we did not give) on top and in the
 * question at the foot, its repo in the badge's Markdown, and the visitor's repositories once GitHub answers.
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
      foot={
        <Suspense fallback={<MaintainersFoot card={null} />}>
          <FootSlot card={card} />
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
  if (!read) return null;
  // The card streams in above `#learn`: once it is in place, land on the part the address names again.
  return (
    <>
      <PrStrip card={read} timelinePath={await publicTimelinePathOf(read.attemptId)} />
      <ScrollToHash />
    </>
  );
}

async function BadgeMarkdownSlot({ card }: { card: Promise<ContributePrCard | null> }) {
  return <BadgeMarkdown repo={(await card)?.nameWithOwner ?? BADGE_EXAMPLE_REPO} />;
}

async function FootSlot({ card }: { card: Promise<ContributePrCard | null> }) {
  return <MaintainersFoot card={await card} />;
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
