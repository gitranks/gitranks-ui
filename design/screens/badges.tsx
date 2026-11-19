import { NuqsTestingAdapter } from 'nuqs/adapters/testing';

import { withBadgeFacts } from '../images';
import type { Screen } from '../registry';
import { BadgeBuilder } from '@/app/badge/builder/[[...login]]/components/badge-builder';
import BadgeLayout from '@/app/badge/builder/[[...login]]/layout';
import { builderHref } from '@/app/badge/builder/[[...login]]/utils/builder-state';
import { GalleryScreen } from '@/app/badge/gallery/components/gallery-screen';
import BadgeGalleryLayout from '@/app/badge/gallery/layout';
import { findBadge } from '@/badge/v3/catalogue';
import { packageBadgeName } from '@/badge/v3/facts';
import { orgBig, packageBig, packageNew, repoBig, userBig } from '@/badge/v3/fixtures';

const leaders = [withBadgeFacts(userBig), withBadgeFacts(repoBig), withBadgeFacts(orgBig)];
// Packages: one used by 16 repos with 100+ stars and published from a repository; one new, with no repository known.
withBadgeFacts(packageBig);
// The new package under a name of its own: `@nebula/ui` is the package page's.
const newPackage = withBadgeFacts({ ...packageNew, name: '@tern/sparkline' });

/** The builder at a URL: its steps live in the query, and its facts come from the fixtures (`design/images.ts`). */
const builder = (path: string) => (
  <NuqsTestingAdapter searchParams={path.split('?')[1] ?? ''}>
    <BadgeLayout params={Promise.resolve({})}>
      <BadgeBuilder />
    </BadgeLayout>
  </NuqsTestingAdapter>
);

const user = { kind: 'user', name: userBig.login } as const;
const card = findBadge('user', 'profile-card');
const repo = { kind: 'repo', name: 'brightfern/tidepool' } as const;
const contribute = findBadge('repo', 'contribute');
const pkg = { kind: 'package', name: packageBadgeName(packageBig) } as const;
const newPkg = { kind: 'package', name: packageBadgeName(newPackage) } as const;
const usedBy = findBadge('package', 'used-by');
const BUILDER = {
  find: builderHref({ kind: null }),
  badge: builderHref(user),
  repoBadge: builderHref(repo),
  style: builderHref({ ...user, badge: card }),
  embed: builderHref({ ...user, badge: card, embed: true }),
  contributeStyle: builderHref({ ...repo, badge: contribute }),
  contributeEmbed: builderHref({ ...repo, badge: contribute, embed: true }),
  packageBadge: builderHref(pkg),
  newPackageBadge: builderHref(newPkg),
  packageEmbed: builderHref({ ...pkg, badge: usedBy, embed: true }),
  newPackageEmbed: builderHref({ ...newPkg, badge: findBadge('package', 'downloads'), embed: true }),
};

export const BADGES_SCREENS: Screen[] = [
  {
    id: 'badge-builder',
    title: 'Badge builder',
    area: 'badges',
    route: '/badge/builder',
    sources: [
      'app/badge/builder/[[...login]]/components/badge-builder.tsx',
      'app/badge/builder/[[...login]]/components/find-step.tsx',
      'app/badge/builder/[[...login]]/components/badge-step.tsx',
      'app/badge/builder/[[...login]]/components/style-step.tsx',
      'app/badge/builder/[[...login]]/components/embed-step.tsx',
      'app/badge/builder/[[...login]]/components/daily-updates-card.tsx',
    ],
    states: [
      { id: 'find', title: '1 · Find', path: BUILDER.find, height: 800, render: () => builder(BUILDER.find) },
      {
        id: 'badge',
        title: '2 · Pick a badge',
        path: BUILDER.badge,
        height: 1100,
        render: () => builder(BUILDER.badge),
      },
      { id: 'style', title: '3 · Style', path: BUILDER.style, height: 800, render: () => builder(BUILDER.style) },
      { id: 'embed', title: '4 · Embed', path: BUILDER.embed, height: 1000, render: () => builder(BUILDER.embed) },
      {
        id: 'embed-check-found',
        title: '4 · Embed, badge found',
        path: BUILDER.embed,
        height: 1000,
        badgeCheck: { status: 'found', until: '2026-11-04T12:00:00.000Z' },
        render: () => builder(BUILDER.embed),
      },
      {
        id: 'embed-check-missing',
        title: '4 · Embed, badge not found yet',
        path: BUILDER.embed,
        height: 1000,
        badgeCheck: { status: 'not_found', checksLeft: 2 },
        render: () => builder(BUILDER.embed),
      },
      {
        id: 'embed-check-limit',
        title: '4 · Embed, no checks left for now',
        path: BUILDER.embed,
        height: 1000,
        badgeCheck: { status: 'limit', nextAt: '2026-10-29T00:00:00.000Z' },
        render: () => builder(BUILDER.embed),
      },
      {
        id: 'embed-check-failed',
        title: '4 · Embed, the check failed',
        path: BUILDER.embed,
        height: 1000,
        badgeCheck: { status: 'unavailable' },
        render: () => builder(BUILDER.embed),
      },
      {
        id: 'badge-repo',
        title: '2 · Pick a badge, for a repository',
        path: BUILDER.repoBadge,
        height: 1800,
        render: () => builder(BUILDER.repoBadge),
      },
      {
        id: 'style-contribute',
        title: '3 · Style, the Contribute badge',
        path: BUILDER.contributeStyle,
        height: 800,
        render: () => builder(BUILDER.contributeStyle),
      },
      {
        id: 'embed-contribute',
        title: '4 · Embed, the Contribute badge',
        path: BUILDER.contributeEmbed,
        height: 800,
        render: () => builder(BUILDER.contributeEmbed),
      },
      {
        id: 'badge-package',
        title: '2 · Pick a badge, for a package',
        path: BUILDER.packageBadge,
        packagesOpen: true,
        height: 1300,
        render: () => builder(BUILDER.packageBadge),
      },
      {
        id: 'badge-package-new',
        title: '2 · Pick a badge, for a new package: "new", no year over year',
        path: BUILDER.newPackageBadge,
        packagesOpen: true,
        height: 800,
        render: () => builder(BUILDER.newPackageBadge),
      },
      {
        id: 'embed-package',
        title: '4 · Embed, for a package',
        path: BUILDER.packageEmbed,
        packagesOpen: true,
        height: 800,
        render: () => builder(BUILDER.packageEmbed),
      },
      {
        id: 'embed-package-no-repository',
        title: '4 · Embed, for a package with no repository known: no README to check',
        path: BUILDER.newPackageEmbed,
        packagesOpen: true,
        height: 800,
        badgeCheck: { status: 'no_repository' },
        render: () => builder(BUILDER.newPackageEmbed),
      },
    ],
  },
  {
    id: 'badge-gallery',
    title: 'Badge gallery',
    area: 'badges',
    route: '/badge/gallery',
    sources: ['app/badge/gallery/components/gallery-section.tsx', 'app/badge/gallery/gallery-badges.ts'],
    states: [
      {
        id: 'leaders',
        title: "Today's #1s",
        path: '/badge/gallery',
        height: 2000,
        render: () => (
          <BadgeGalleryLayout params={Promise.resolve({})}>
            <GalleryScreen leaders={leaders} now={new Date()} />
          </BadgeGalleryLayout>
        ),
      },
    ],
  },
];
