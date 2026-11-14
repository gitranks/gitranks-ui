import { withBadgeFacts } from '../images';
import type { Screen } from '../registry';
import { CONNECTED_ISSUES, NOT_CONNECTED_ISSUES } from '@/app/profile/[login]/__fixtures__/contribute-owner';
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
import { ProfileLearnBlock } from '@/app/profile/[login]/components/profile-learn-block';
import { LearnRecordCard } from '@/app/profile/[login]/components/profile-learn-record';
import type { UserFacts } from '@/badge/v3/facts';
import { userBig, userUnranked } from '@/badge/v3/fixtures';
import { learnRecord, profilePromo, promoColors } from '@/lib/learn/__fixtures__/promo';

// The strong profile is the badge fixtures' `userBig`; the newcomer has nothing a badge could show yet.
const strongBadges = withBadgeFacts(userBig);
const newcomerBadges = withBadgeFacts({ ...userUnranked, login: newcomerProfile.login });

const overview = (user: ProfileUser, badgeFacts: UserFacts, extras = strongExtras) => (
  <ProfileFrame login={user.login}>
    <OverviewPage user={user} extras={extras} badgeFacts={badgeFacts} isGlobalContext />
  </ProfileFrame>
);

/** The block alone, at the overview's width: it loads in the browser, so the overview boards never show it. */
const alone = (block: React.ReactNode) => <div className="mx-auto max-w-7xl px-4 py-6">{block}</div>;

const notConnected = (
  <ProfileContributeBlock
    state="not_connected"
    issues={NOT_CONNECTED_ISSUES}
    readyIssues={3105}
    matchedTo="TypeScript and JavaScript"
  />
);
const connected = <ProfileContributeBlock state="connected" issues={CONNECTED_ISSUES} />;

/** Learn's suggestion in the Contribute block's place, and the Learn record under it, as the owner reads them. */
const learn = (record: boolean) => (
  <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-6">
    <ProfileLearnBlock promo={profilePromo} colors={promoColors} />
    <LearnRecordCard record={record ? learnRecord : null} own />
  </div>
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
    title: 'Profile · Contribute, the owner alone',
    area: 'profile',
    route: '/profile/[login]',
    sources: [
      'app/profile/[login]/components/profile-contribute.tsx',
      'app/profile/[login]/components/profile-contribute-block.tsx',
    ],
    states: [
      {
        id: 'owner-not-connected',
        title: 'The owner, not connected yet',
        path: `/profile/${strongProfile.login}`,
        height: 520,
        render: () => alone(notConnected),
      },
      {
        id: 'owner-connected',
        title: 'The owner, connected',
        path: `/profile/${strongProfile.login}`,
        height: 520,
        render: () => alone(connected),
      },
      {
        id: 'owner-not-connected-phone',
        title: 'The owner, not connected · phone',
        path: `/profile/${strongProfile.login}`,
        width: 390,
        height: 1100,
        render: () => alone(notConnected),
      },
    ],
  },
  {
    id: 'profile-learn',
    title: 'Profile · Learn, suggested to the owner, and the Learn record',
    area: 'profile',
    route: '/profile/[login]',
    sources: [
      'app/profile/[login]/components/profile-contribute.tsx',
      'app/profile/[login]/components/profile-learn-block.tsx',
      'app/profile/[login]/components/profile-learn-record.tsx',
    ],
    states: [
      {
        id: 'owner-promo',
        title: 'The owner Learn may suit, with a record',
        path: `/profile/${strongProfile.login}`,
        height: 660,
        render: () => learn(true),
      },
      {
        id: 'owner-promo-no-record',
        title: 'The owner Learn may suit, no public pass yet: no record',
        path: `/profile/${strongProfile.login}`,
        height: 440,
        render: () => learn(false),
      },
      {
        id: 'owner-promo-no-issues',
        title: 'The owner Learn may suit, no issues to list',
        path: `/profile/${strongProfile.login}`,
        height: 240,
        render: () => alone(<ProfileLearnBlock promo={{ ...profilePromo, issues: [] }} />),
      },
      {
        id: 'record',
        title: 'The Learn record, as anyone reads it',
        path: `/profile/${strongProfile.login}`,
        signedOut: true,
        height: 260,
        render: () => alone(<LearnRecordCard record={learnRecord} />),
      },
      {
        id: 'owner-promo-phone',
        title: 'The owner Learn may suit, with a record · phone',
        path: `/profile/${strongProfile.login}`,
        width: 390,
        height: 1020,
        render: () => learn(true),
      },
    ],
  },
];
