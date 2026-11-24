import type { ReactElement } from 'react';

import { withBadgeFacts } from '../images';
import type { Screen } from '../registry';
import {
  bigRepo,
  bigRepoPulse,
  repoLanguages,
  repoRankTiers,
  youngRepo,
  youngRepoFacts,
} from '@/app/repo/[owner]/[name]/__fixtures__/repo';
import { RepoContributorsScreen } from '@/app/repo/[owner]/[name]/(tabs)/contributors/components/repo-contributors-screen';
import { RepoOverviewScreen } from '@/app/repo/[owner]/[name]/(tabs)/overview/components/repo-overview-screen';
import { UsedByScreen } from '@/app/repo/[owner]/[name]/(tabs)/used-by/components/used-by-screen';
import { RepoFrame } from '@/app/repo/[owner]/[name]/components/repo-frame';
import { repoBig } from '@/badge/v3/fixtures';
import {
  firstPage,
  fivePackages,
  noDependents,
  onePackage,
  threePackages,
} from '@/components/dependents/dependents.fixtures';
import type { Unavailable } from '@/graphql/helpers/fetch-repo-packages';
import type { RepoPackages } from '@/graphql/repo-packages';
import { entityCards } from '@/lib/learn/__fixtures__/entity-card';
import type { DailyUpdatesViewer } from '@/types/daily-updates.types';
import { DailyUpdateReason } from '@/types/generated/graphql';

const badges = withBadgeFacts(repoBig);
const youngBadges = withBadgeFacts(youngRepoFacts);

/** A signed-in visitor's own daily updates, as the browser reads them: no repository picked, 3 left to add today. */
const picker = {
  dailyUpdates: {
    open: true,
    state: 'on',
    until: '2026-11-04T12:00:00.000Z',
    manual: { available: true, nextAt: null },
    picks: [],
    newPicksLeftToday: 3,
  } satisfies DailyUpdatesViewer,
};

/** The tabbed page of `nebula/ui` around a tab: its packages decide the Used by tab and its count. */
const bigFrame = (packages: RepoPackages | Unavailable | null, tab: ReactElement) => (
  <RepoFrame
    repo={bigRepo}
    packages={packages}
    contributors={bigRepoPulse.last12.activeContributors}
    badgeFacts={badges}
    now={new Date()}
  >
    {tab}
  </RepoFrame>
);

/** The tabbed page of the young repository: no package, no analytics. */
const youngFrame = (tab: ReactElement, repo = youngRepo) => (
  <RepoFrame repo={repo} packages={null} contributors={null} badgeFacts={youngBadges} now={new Date()}>
    {tab}
  </RepoFrame>
);

/** `nebula/ui`'s Overview: today's sections, the Used by card of its three packages, and its Learn card. */
const bigOverview = () =>
  bigFrame(
    threePackages,
    <RepoOverviewScreen
      repo={bigRepo}
      languages={repoLanguages}
      tiers={repoRankTiers}
      packages={threePackages}
      dependents={firstPage}
      learnCard={entityCards.repoEverything}
    />,
  );

/**
 * The young repository's Overview: no package, so no Used by tab and no card. No analytics yet, and most of GitHub's
 * stars from suspected fake accounts.
 */
const youngOverview = (repo = youngRepo) =>
  youngFrame(
    <RepoOverviewScreen
      repo={repo}
      languages={repoLanguages}
      tiers={repoRankTiers}
      packages={null}
      dependents={null}
      learnCard={null}
    />,
    repo,
  );

/** The young repository on daily updates for one reason, as anyone sees it. */
const youngOnDailyUpdates = (reason: DailyUpdateReason) =>
  youngOverview({
    ...youngRepo,
    dailyUpdates: {
      reasons: [reason],
      nextUpdateAt: '2026-10-28T17:00:00.000Z',
      lastUpdatedAt: '2026-10-27T17:00:00.000Z',
    },
  });

/** `nebula/ui`'s Used by tab for what it publishes, with the first page of its dependents. */
const usedBy = (packages: RepoPackages | Unavailable, page: typeof firstPage | null = firstPage) =>
  bigFrame(
    packages,
    <UsedByScreen
      nameWithOwner={bigRepo.nameWithOwner}
      packages={packages}
      firstPage={page && packages !== 'unavailable' ? { ...page, total: packages.dependents } : page}
    />,
  );

const OVERVIEW_PATH = `/repo/${bigRepo.nameWithOwner}`;
const USED_BY_PATH = `/repo/${bigRepo.nameWithOwner}/used-by`;
const CONTRIBUTORS_PATH = `/repo/${bigRepo.nameWithOwner}/contributors`;

const FRAME_SOURCES = [
  'app/repo/[owner]/[name]/(tabs)/layout.tsx',
  'app/repo/[owner]/[name]/components/repo-frame.tsx',
  'app/repo/[owner]/[name]/components/repo-layout.tsx',
];

export const REPO_SCREENS: Screen[] = [
  {
    id: 'repo-overview',
    title: 'Repository · Overview',
    area: 'repo',
    route: '/repo/[owner]/[name]',
    sources: [
      ...FRAME_SOURCES,
      'app/repo/[owner]/[name]/(tabs)/overview/page.tsx',
      'app/repo/[owner]/[name]/(tabs)/overview/components/repo-overview-screen.tsx',
      'app/repo/[owner]/[name]/(tabs)/overview/components/used-by-card.tsx',
      'components/learn/entity/learn-entity-card.tsx',
      'app/repo/[owner]/[name]/components/repo-overview-sections.tsx',
      'app/repo/[owner]/[name]/components/repo-tier-card.tsx',
      'app/repo/[owner]/[name]/components/who-builds-it-card.tsx',
      'app/repo/[owner]/[name]/components/stars-best-section.tsx',
      'app/repo/[owner]/[name]/components/pull-button.tsx',
      'components/dependents/dependents-table.tsx',
    ],
    states: [
      {
        id: 'supernova',
        title: 'A Supernova whose packages are used: the Used by card, then the Learn card',
        path: OVERVIEW_PATH,
        height: 2100,
        render: bigOverview,
      },
      {
        id: 'young',
        title: 'A young repository with no package: no Used by tab, stars not counted',
        path: `/repo/${youngRepo.nameWithOwner}`,
        height: 1000,
        render: () => youngOverview(),
      },
      {
        id: 'young-daily-badge',
        title: 'On daily updates, kept on by a badge: “Updates daily”',
        path: `/repo/${youngRepo.nameWithOwner}`,
        height: 1000,
        render: () => youngOnDailyUpdates(DailyUpdateReason.Badge),
      },
      {
        id: 'young-pick-off',
        title: 'Signed in, can add a repo or package: “Update daily”',
        path: `/repo/${youngRepo.nameWithOwner}`,
        height: 1000,
        viewer: picker,
        render: () => youngOverview(),
      },
      {
        id: 'supernova-phone',
        title: 'A Supernova whose packages are used · phone',
        path: OVERVIEW_PATH,
        width: 390,
        height: 3500,
        render: bigOverview,
      },
    ],
  },
  {
    id: 'repo-used-by',
    title: 'Repository · Used by',
    area: 'repo',
    route: '/repo/[owner]/[name]/used-by',
    sources: [
      ...FRAME_SOURCES,
      'app/repo/[owner]/[name]/(tabs)/used-by/page.tsx',
      'app/repo/[owner]/[name]/(tabs)/used-by/components/used-by-screen.tsx',
      'app/repo/[owner]/[name]/(tabs)/used-by/components/package-card.tsx',
      'app/repo/[owner]/[name]/(tabs)/used-by/components/packages-table.tsx',
      'app/repo/[owner]/[name]/(tabs)/used-by/components/package-filter.tsx',
      'app/repo/[owner]/[name]/(tabs)/used-by/components/used-by-list.tsx',
      'components/dependents/dependents-table.tsx',
    ],
    states: [
      {
        id: 'one',
        title: 'One package',
        path: USED_BY_PATH,
        height: 1400,
        render: () => usedBy(onePackage),
      },
      {
        id: 'three',
        title: 'Three packages: a card each and the filter as chips',
        path: USED_BY_PATH,
        height: 1500,
        render: () => usedBy(threePackages),
      },
      {
        id: 'five',
        title: 'Five packages: the packages table and the filter as a list',
        path: USED_BY_PATH,
        height: 1700,
        render: () => usedBy(fivePackages),
      },
      {
        id: 'none',
        title: 'No repository with 100+ stars uses it yet',
        path: USED_BY_PATH,
        height: 1100,
        render: () => usedBy(noDependents, null),
      },
      {
        id: 'unavailable',
        title: 'Package data not available right now',
        path: USED_BY_PATH,
        height: 1100,
        render: () => usedBy('unavailable', null),
      },
      {
        id: 'three-phone',
        title: 'Three packages · phone',
        path: USED_BY_PATH,
        width: 390,
        height: 2900,
        render: () => usedBy(threePackages),
      },
    ],
  },
  {
    id: 'repo-contributors',
    title: 'Repository · Contributors',
    area: 'repo',
    route: '/repo/[owner]/[name]/contributors',
    sources: [
      ...FRAME_SOURCES,
      'app/repo/[owner]/[name]/(tabs)/contributors/page.tsx',
      'app/repo/[owner]/[name]/(tabs)/contributors/components/repo-contributors-screen.tsx',
      'app/repo/[owner]/[name]/components/repo-contributors-sections.tsx',
      'app/repo/[owner]/[name]/components/repo-pulse-area.tsx',
    ],
    states: [
      {
        id: 'supernova',
        title: 'A year of analytics',
        path: CONTRIBUTORS_PATH,
        height: 2400,
        render: () => bigFrame(threePackages, <RepoContributorsScreen repo={bigRepo} pulse={bigRepoPulse} />),
      },
      {
        id: 'young',
        title: 'No analytics yet',
        path: `/repo/${youngRepo.nameWithOwner}/contributors`,
        height: 1000,
        render: () => youngFrame(<RepoContributorsScreen repo={youngRepo} pulse={null} />),
      },
    ],
  },
];
