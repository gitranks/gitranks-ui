import { Suspense } from 'react';

import { WorkingNowSection } from './agent-runs';
import {
  ImpactSection,
  NeedsYouSection,
  RightNowSection,
  SectionSkeleton,
  UpNextSection,
  WaysSection,
} from './overview-sections';
import type { OverviewSections } from './overview-status';
import {
  loadContributeActivity,
  loadOverviewImpact,
  loadOverviewNeeds,
  loadOverviewNow,
  loadProviderInterests,
} from '@/lib/contribute/contribute.data';
import type { ContributeIssuePage, ContributeView } from '@/lib/contribute/contribute.types';

type Feed = Promise<ContributeIssuePage | null | undefined>;

async function WorkingNowRead() {
  return <WorkingNowSection activity={await loadContributeActivity().catch(() => null)} />;
}

async function NeedsYouRead({ view }: { view: ContributeView }) {
  return <NeedsYouSection view={view} read={await loadOverviewNeeds()} />;
}

async function RightNowRead({ view, feed }: { view: ContributeView; feed: Feed }) {
  const [read, page] = await Promise.all([loadOverviewNow(), feed]);
  return <RightNowSection view={view} read={read} page={page} />;
}

async function ImpactRead({ view }: { view: ContributeView }) {
  return <ImpactSection view={view} totals={await loadOverviewImpact()} />;
}

async function WaysRead({ view }: { view: ContributeView }) {
  return <WaysSection view={view} noted={await loadProviderInterests()} />;
}

async function UpNextRead({ feed }: { feed: Feed }) {
  return <UpNextSection page={await feed} />;
}

/**
 * Overview's sections, each read by its own loader in a `<Suspense>` of its own, a skeleton of its height meanwhile.
 * `feed` is the feed's first page, read once: Up next shows it, and Right now tells "no issues" from it.
 */
export const overviewReadSectionsOf = (view: ContributeView, feed: Feed): OverviewSections => ({
  // The tabs read it too (once per request); with no runs it renders nothing, so it waits with no skeleton.
  working: (
    <Suspense fallback={null}>
      <WorkingNowRead />
    </Suspense>
  ),
  needs: (
    <Suspense fallback={<SectionSkeleton className="h-20" />}>
      <NeedsYouRead view={view} />
    </Suspense>
  ),
  now: (
    <Suspense fallback={<SectionSkeleton className="h-44" />}>
      <RightNowRead view={view} feed={feed} />
    </Suspense>
  ),
  impact: (
    <Suspense fallback={<SectionSkeleton className="h-32" />}>
      <ImpactRead view={view} />
    </Suspense>
  ),
  ways: (
    <Suspense fallback={<SectionSkeleton className="h-72" />}>
      <WaysRead view={view} />
    </Suspense>
  ),
  upNext: (
    <Suspense fallback={<SectionSkeleton className="h-64" />}>
      <UpNextRead feed={feed} />
    </Suspense>
  ),
});
