import { withBadgeFacts } from '../images';
import { followChannelsOf, OpenFollowDialog } from '../open-follow-dialog';
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
import { outcomeView } from '@/lib/follow/follow-copy';
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

const RANKED_PATH = packagePath(rankedPackage.name);

/** The Follow dialog's boards: the viewer's verified email, and the package a press followed. */
const FOLLOW_EMAIL = 'octo-dev@example.com';
const FOLLOWED = { registry: 'npm', name: rankedPackage.name };

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
      'components/package-follow/follow-slot.tsx',
      'components/package-follow/follow-dialog.tsx',
      'lib/follow/follow-copy.ts',
    ],
    states: [
      {
        id: 'no-dependents',
        title: 'No repository with 100+ stars uses it yet',
        path: packagePath(quietPackage.name),
        packagesOpen: true,
        height: 1300,
        render: () => page(quietPackage),
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
        id: 'follow-signed-out-email',
        title: 'Signed out, Connect on Email: why, and the GitHub sign-in',
        path: RANKED_PATH,
        signedOut: true,
        packagesOpen: true,
        height: 1100,
        render: () => (
          <OpenFollowDialog
            page={page(rankedPackage)}
            label={rankedPackage.name}
            view={followChannelsOf(false)}
            signedIn={false}
            emailOpen
          />
        ),
      },
      {
        id: 'follow-signed-in',
        title: 'Signed in, Follow pressed: Email at the verified address',
        path: RANKED_PATH,
        packagesOpen: true,
        height: 1100,
        render: () => (
          <OpenFollowDialog
            page={page(rankedPackage)}
            label={rankedPackage.name}
            view={followChannelsOf(true, FOLLOW_EMAIL)}
            signedIn
            selected={['email', 'whatsapp']}
          />
        ),
      },
      {
        id: 'follow-done',
        title: 'Signed in, after Follow',
        path: RANKED_PATH,
        packagesOpen: true,
        height: 900,
        render: () => (
          <OpenFollowDialog
            page={page(rankedPackage)}
            label={rankedPackage.name}
            view={followChannelsOf(true, FOLLOW_EMAIL)}
            signedIn
            outcome={outcomeView(
              {
                refusal: null,
                notHeld: [],
                results: [
                  { channel: 'email', package: FOLLOWED, result: 'active', url: null, limit: null },
                  { channel: 'whatsapp', package: FOLLOWED, result: 'active', url: null, limit: null },
                ],
              },
              rankedPackage.name,
              FOLLOW_EMAIL,
            )}
          />
        ),
      },
      {
        id: 'follow-no-verified-email',
        title: 'Signed in, no verified email on GitHub',
        path: RANKED_PATH,
        packagesOpen: true,
        height: 1100,
        render: () => (
          <OpenFollowDialog
            page={page(rankedPackage)}
            label={rankedPackage.name}
            view={followChannelsOf(true)}
            signedIn
            selected={['whatsapp']}
          />
        ),
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
