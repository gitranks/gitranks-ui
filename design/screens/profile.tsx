import { withBadgeFacts } from '../images';
import type { Screen } from '../registry';
import {
  BLOCK_STATS,
  OWN_PICKS,
  TYPESCRIPT_PROFILE,
  VISITOR_PICKS,
} from '@/app/profile/[login]/__fixtures__/contribute-block';
import {
  newcomerExtras,
  newcomerProfile,
  type ProfileUser,
  strongExtras,
  strongProfile,
  strongProfileStarsNotCounted,
} from '@/app/profile/[login]/__fixtures__/overview';
import { OverviewPage } from '@/app/profile/[login]/components/overview-page';
import { ProfileContributeBlock } from '@/app/profile/[login]/components/profile-contribute-block';
import { ProfileFrame } from '@/app/profile/[login]/components/profile-frame';
import type { UserFacts } from '@/badge/v3/facts';
import { userBig, userUnranked } from '@/badge/v3/fixtures';

// The strong profile is the badge fixtures' `userBig`; the newcomer has nothing a badge could show yet.
const strongBadges = withBadgeFacts(userBig);
const newcomerBadges = withBadgeFacts({ ...userUnranked, login: newcomerProfile.login });

const overview = (user: ProfileUser, badgeFacts: UserFacts, extras = strongExtras) => (
  <ProfileFrame login={user.login}>
    <OverviewPage user={user} extras={extras} badgeFacts={badgeFacts} isGlobalContext />
  </ProfileFrame>
);

/** The Contribute block alone, at the overview's width: it loads in the browser, so the overview boards never show it. */
const contributeBlock = (block: React.ReactNode) => <div className="mx-auto max-w-7xl px-4 py-6">{block}</div>;
const ownBlock = (
  <ProfileContributeBlock audience="own" picks={OWN_PICKS} stats={BLOCK_STATS} language={TYPESCRIPT_PROFILE} />
);
const visitorBlock = (
  <ProfileContributeBlock
    audience="visitor"
    picks={VISITOR_PICKS}
    stats={BLOCK_STATS}
    language={TYPESCRIPT_PROFILE}
    onSignIn={() => {}}
  />
);

export const PROFILE_SCREENS: Screen[] = [
  {
    id: 'profile-overview',
    title: 'Developer profile',
    area: 'profile',
    route: '/profile/[login]',
    sources: [
      'app/profile/[login]/components/profile-frame.tsx',
      'app/profile/[login]/components/overview-page.tsx',
      'app/profile/[login]/components/layout-left-column.tsx',
      'app/profile/[login]/components/overview-cards/overview-cards.tsx',
    ],
    states: [
      {
        id: 'strong',
        title: 'Near the top of every ranking',
        path: `/profile/${strongProfile.login}`,
        height: 3000,
        render: () => overview(strongProfile, strongBadges),
      },
      {
        id: 'newcomer',
        title: 'A newcomer, not ranked yet',
        path: `/profile/${newcomerProfile.login}`,
        height: 1100,
        render: () => overview(newcomerProfile, newcomerBadges, newcomerExtras),
      },
      {
        id: 'stars-not-counted',
        title: 'Some stars not counted',
        path: `/profile/${strongProfile.login}`,
        height: 3000,
        render: () => overview(strongProfileStarsNotCounted, strongBadges),
      },
      {
        id: 'strong-phone',
        title: 'Near the top · phone',
        path: `/profile/${strongProfile.login}`,
        width: 390,
        height: 4400,
        render: () => overview(strongProfile, strongBadges),
      },
    ],
  },
  {
    id: 'profile-contribute',
    title: 'Profile · Contribute block',
    area: 'profile',
    route: '/profile/[login]',
    sources: [
      'app/profile/[login]/components/profile-contribute.tsx',
      'app/profile/[login]/components/profile-contribute-block.tsx',
    ],
    states: [
      {
        id: 'own',
        title: 'The owner, not connected yet',
        path: '/profile/octo-dev',
        height: 560,
        render: () => contributeBlock(ownBlock),
      },
      {
        id: 'visitor',
        title: 'A visitor, signed out',
        path: '/profile/octo-dev',
        signedOut: true,
        height: 600,
        render: () => contributeBlock(visitorBlock),
      },
      {
        id: 'own-phone',
        title: 'The owner · phone',
        path: '/profile/octo-dev',
        width: 390,
        height: 1180,
        render: () => contributeBlock(ownBlock),
      },
      {
        id: 'visitor-phone',
        title: 'A visitor · phone',
        path: '/profile/octo-dev',
        signedOut: true,
        width: 390,
        height: 1260,
        render: () => contributeBlock(visitorBlock),
      },
    ],
  },
];
