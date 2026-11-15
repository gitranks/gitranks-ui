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
import { RepoScreen } from '@/app/repo/[owner]/[name]/components/repo-screen';
import { repoBig } from '@/badge/v3/fixtures';
import type { DailyUpdatesViewer } from '@/types/daily-updates.types';
import { DailyUpdateReason } from '@/types/generated/graphql';

const badges = withBadgeFacts(repoBig);
const youngBadges = withBadgeFacts(youngRepoFacts);

/** A young repository: no analytics yet, and most of GitHub's stars from suspected fake accounts. */
const young = (repo = youngRepo) => (
  <RepoScreen repo={repo} pulse={null} languages={repoLanguages} tiers={repoRankTiers} badgeFacts={youngBadges} />
);

/** The young repository on daily updates for one reason, as anyone sees it. */
const youngOnDailyUpdates = (reason: DailyUpdateReason) =>
  young({
    ...youngRepo,
    dailyUpdates: {
      reasons: [reason],
      nextUpdateAt: '2026-10-28T17:00:00.000Z',
      lastUpdatedAt: '2026-10-27T17:00:00.000Z',
    },
  });

const pickOf = (nameWithOwner: string) => ({ nameWithOwner, pickedAt: '2026-10-28T09:00:00.000Z' });

/**
 * A signed-in visitor's own daily updates, as the browser reads them: with this repository picked, with none, or with
 * all 3 picks on other repositories.
 */
const picker = (picks: 'this' | 'none' | 'full') => ({
  dailyUpdates: {
    open: true,
    state: 'on',
    until: '2026-11-04T12:00:00.000Z',
    manual: { available: true, nextAt: null },
    picks:
      picks === 'this'
        ? [pickOf(youngRepo.nameWithOwner)]
        : picks === 'full'
          ? [pickOf('quiet/atlas'), pickOf('octo/rocket'), pickOf('octo/lantern')]
          : [],
    newPicksLeftToday: picks === 'none' ? 3 : 2,
  } satisfies DailyUpdatesViewer,
});

export const REPO_SCREENS: Screen[] = [
  {
    id: 'repo',
    title: 'Repository',
    area: 'repo',
    route: '/repo/[owner]/[name]',
    sources: [
      'app/repo/[owner]/[name]/components/repo-screen.tsx',
      'app/repo/[owner]/[name]/components/repo-layout.tsx',
      'app/repo/[owner]/[name]/components/repo-tier-card.tsx',
      'app/repo/[owner]/[name]/components/who-builds-it-card.tsx',
      'app/repo/[owner]/[name]/components/stars-best-section.tsx',
      'app/repo/[owner]/[name]/components/repo-pulse-area.tsx',
      'app/repo/[owner]/[name]/components/pull-button.tsx',
    ],
    states: [
      {
        id: 'supernova',
        title: 'A Supernova with analytics',
        path: `/repo/${bigRepo.nameWithOwner}`,
        height: 3800,
        render: () => (
          <RepoScreen
            repo={bigRepo}
            pulse={bigRepoPulse}
            languages={repoLanguages}
            tiers={repoRankTiers}
            badgeFacts={badges}
          />
        ),
      },
      {
        id: 'young',
        title: 'A young repository, stars not counted',
        path: `/repo/${youngRepo.nameWithOwner}`,
        height: 2000,
        render: () => young(),
      },
      {
        id: 'young-daily-badge',
        title: 'On daily updates, kept on by a badge: “Updates daily”',
        path: `/repo/${youngRepo.nameWithOwner}`,
        height: 2000,
        render: () => youngOnDailyUpdates(DailyUpdateReason.Badge),
      },
      {
        id: 'young-daily-pick',
        title: 'On daily updates, picked: nobody is named',
        path: `/repo/${youngRepo.nameWithOwner}`,
        height: 2000,
        render: () => youngOnDailyUpdates(DailyUpdateReason.Pick),
      },
      {
        id: 'young-pick-off',
        title: 'Signed in with a pick left: “Update daily”',
        path: `/repo/${youngRepo.nameWithOwner}`,
        height: 2000,
        viewer: picker('none'),
        render: () => young(),
      },
      {
        id: 'young-your-pick',
        title: 'Your pick',
        path: `/repo/${youngRepo.nameWithOwner}`,
        height: 2000,
        viewer: picker('this'),
        render: () => youngOnDailyUpdates(DailyUpdateReason.Pick),
      },
      {
        id: 'young-picks-full',
        title: 'Signed in, all 3 picks used: Refresh',
        path: `/repo/${youngRepo.nameWithOwner}`,
        height: 2000,
        viewer: picker('full'),
        render: () => young(),
      },
      {
        id: 'young-signed-out',
        title: 'Signed out: Refresh',
        path: `/repo/${youngRepo.nameWithOwner}`,
        height: 2000,
        signedOut: true,
        render: () => young(),
      },
      {
        id: 'young-phone',
        title: 'A young repository, stars not counted · phone',
        path: `/repo/${youngRepo.nameWithOwner}`,
        width: 390,
        height: 3000,
        render: () => young(),
      },
    ],
  },
];
