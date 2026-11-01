import { NuqsTestingAdapter } from 'nuqs/adapters/testing';

import { withBadgeFacts } from '../images';
import type { Screen } from '../registry';
import { BadgeBuilder } from '@/app/badge/builder/[[...login]]/components/badge-builder';
import BadgeLayout from '@/app/badge/builder/[[...login]]/layout';
import { builderHref } from '@/app/badge/builder/[[...login]]/utils/builder-state';
import { GalleryScreen } from '@/app/badge/gallery/components/gallery-screen';
import BadgeGalleryLayout from '@/app/badge/gallery/layout';
import { findBadge } from '@/badge/v3/catalogue';
import { orgBig, repoBig, userBig } from '@/badge/v3/fixtures';

const leaders = [withBadgeFacts(userBig), withBadgeFacts(repoBig), withBadgeFacts(orgBig)];

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
const BUILDER = {
  find: builderHref({ kind: null }),
  badge: builderHref(user),
  repoBadge: builderHref(repo),
  style: builderHref({ ...user, badge: card }),
  embed: builderHref({ ...user, badge: card, embed: true }),
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
      { id: 'embed', title: '4 · Embed', path: BUILDER.embed, height: 800, render: () => builder(BUILDER.embed) },
      {
        id: 'badge-repo',
        title: '2 · Pick a badge, for a repository',
        path: BUILDER.repoBadge,
        height: 1800,
        render: () => builder(BUILDER.repoBadge),
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
