import { withBadgeFacts } from '../images';
import { OpenRefreshDialog } from '../open-refresh-dialog';
import type { Screen } from '../registry';
import {
  notReadPackage,
  onBadge,
  quietPackage,
  rankedPackage,
} from '@/app/package/[registry]/[...name]/__fixtures__/package';
import { PackageScreen } from '@/app/package/[registry]/[...name]/components/package-screen';
import type { PackageFacts } from '@/badge/v3/facts';
import { packageBig } from '@/badge/v3/fixtures';
import { packageDealOf } from '@/components/refresh-dialogs/refresh-messages';
import type { PackagePage } from '@/graphql/package-page';
import type { DailyUpdatesViewer } from '@/types/daily-updates.types';
import { DailyUpdateReason } from '@/types/generated/graphql';
import { packagePickOf } from '@/utils/daily-updates-view';
import { packagePath } from '@/utils/package-paths';

/** A read package's badge data, from its page's: what its Badges card shows tells the page's own story. */
const badgeFactsOf = (pkg: PackagePage): PackageFacts => ({
  kind: 'package',
  registry: 'npm',
  name: pkg.name,
  repo: pkg.repo ?? null,
  repositoryName: pkg.repo ? null : (pkg.repositoryName ?? null),
  dependentsCount: pkg.dependentsCount,
  dependentsStars: pkg.dependentsStars,
  dependents: (pkg.dependents?.items ?? []).map(({ nameWithOwner, ownerAvatarUrl, stars, archived }) => ({
    nameWithOwner,
    ownerAvatarUrl: ownerAvatarUrl ?? null,
    stars,
    archived,
  })),
  downloads: pkg.downloads
    ? {
        through: pkg.downloads.through,
        lastWeek: pkg.downloads.lastWeek,
        previousWeek: pkg.downloads.previousWeek,
        last52Weeks: pkg.downloads.last52Weeks,
        previous52Weeks: pkg.downloads.previous52Weeks ?? null,
        perStar: pkg.downloads.perStar ?? null,
        weeks: pkg.downloads.weeks ?? [],
      }
    : null,
});

// The Badges cards of the two read packages: `react-resize-detector` (the badge fixtures' own) and `@nebula/ui`.
withBadgeFacts(packageBig);
withBadgeFacts(badgeFactsOf(quietPackage));

const page = (pkg: PackagePage | 'unavailable', name = rankedPackage.name) => (
  <PackageScreen registry="npm" name={pkg === 'unavailable' ? name : pkg.name} pkg={pkg} />
);

/** Read and ranked, on daily updates because somebody added it. */
const picked: PackagePage = {
  ...rankedPackage,
  dailyUpdates: { reasons: [DailyUpdateReason.Pick], nextUpdateAt: '2026-10-29T10:00:00.000Z' },
};

/** The viewer's own daily updates, as the browser reads them: this package picked, two left to add today. */
const yourPick = {
  dailyUpdates: {
    open: true,
    state: 'on',
    until: '2026-11-04T12:00:00.000Z',
    manual: { available: true, nextAt: null },
    picks: [{ ...packagePickOf({ registry: 'npm', name: rankedPackage.name }), pickedAt: '2026-10-28T09:00:00.000Z' }],
    newPicksLeftToday: 2,
  } satisfies DailyUpdatesViewer,
};

const RANKED_PATH = packagePath(rankedPackage.name);

export const PACKAGE_SCREENS: Screen[] = [
  {
    id: 'package-page',
    title: 'Package',
    area: 'package',
    route: '/package/[registry]/[...name]',
    sources: [
      'app/package/[registry]/[...name]/page.tsx',
      'app/package/[registry]/[...name]/components/package-screen.tsx',
      'app/package/[registry]/[...name]/components/package-ranks-card.tsx',
      'app/package/[registry]/[...name]/components/package-downloads-card.tsx',
      'app/package/[registry]/[...name]/components/package-dependents-list.tsx',
      'app/package/[registry]/[...name]/components/package-updates-button.tsx',
      'app/package/[registry]/[...name]/components/package-badge-section.tsx',
      'components/dependents/dependents-table.tsx',
    ],
    states: [
      {
        id: 'ranked',
        title: 'Read and ranked',
        path: RANKED_PATH,
        packagesOpen: true,
        height: 1500,
        render: () => page(rankedPackage),
      },
      {
        id: 'unranked',
        title: 'Read, not ranked yet',
        path: RANKED_PATH,
        packagesOpen: true,
        height: 1500,
        render: () => page({ ...rankedPackage, ranks: null }),
      },
      {
        id: 'no-dependents',
        title: 'No repository with 100+ stars uses it yet',
        path: packagePath(quietPackage.name),
        packagesOpen: true,
        height: 1300,
        render: () => page(quietPackage),
      },
      {
        id: 'signed-out',
        title: 'Signed out: Refresh',
        path: RANKED_PATH,
        signedOut: true,
        packagesOpen: true,
        height: 1500,
        render: () => page(rankedPackage),
      },
      {
        id: 'signed-out-deal',
        title: 'Signed out, Refresh pressed: the deal',
        path: RANKED_PATH,
        signedOut: true,
        packagesOpen: true,
        height: 1500,
        render: () => (
          <OpenRefreshDialog
            page={page(rankedPackage)}
            message={packageDealOf(rankedPackage.name, rankedPackage.repo?.nameWithOwner)}
          />
        ),
      },
      {
        id: 'your-pick',
        title: 'On your daily updates',
        path: RANKED_PATH,
        viewer: yourPick,
        packagesOpen: true,
        height: 1500,
        render: () => page(picked),
      },
      {
        id: 'on-pick',
        title: 'On daily updates, added by someone: nobody is named',
        path: RANKED_PATH,
        packagesOpen: true,
        height: 1500,
        render: () => page(picked),
      },
      {
        id: 'on-badge',
        title: 'On daily updates, kept on by a badge',
        path: RANKED_PATH,
        packagesOpen: true,
        height: 1500,
        render: () => page({ ...rankedPackage, dailyUpdates: onBadge }),
      },
      {
        id: 'not-read',
        title: 'Not read yet',
        path: packagePath(notReadPackage.name),
        packagesOpen: true,
        height: 800,
        render: () => page(notReadPackage),
      },
      {
        id: 'unavailable',
        title: 'Package data not available right now',
        path: RANKED_PATH,
        packagesOpen: true,
        height: 800,
        render: () => page('unavailable'),
      },
      {
        id: 'ranked-phone',
        title: 'Read and ranked · phone',
        path: RANKED_PATH,
        packagesOpen: true,
        width: 390,
        height: 2800,
        render: () => page(rankedPackage),
      },
    ],
  },
];
