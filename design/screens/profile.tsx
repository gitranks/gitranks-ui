import { withBadgeFacts } from '../images';
import { OpenRefreshDialog } from '../open-refresh-dialog';
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
import { ProfileLearnListBox, ProfilePickedBox } from '@/app/profile/[login]/components/profile-owner-boxes';
import type { UserFacts } from '@/badge/v3/facts';
import { userBig, userUnranked } from '@/badge/v3/fixtures';
import { REFRESH_MESSAGES } from '@/components/refresh-dialogs/refresh-messages';
import { SkillsBlock } from '@/components/skills/skills-block';
import { promoColors } from '@/lib/learn/__fixtures__/promo';
import { learnerNumbers } from '@/lib/skills/__fixtures__/skills';
import { maskedIssues } from '@/lib/workspace/__fixtures__/masked-issue';
import type { DailyUpdatesViewer } from '@/types/daily-updates.types';
import { DailyUpdateReason } from '@/types/generated/graphql';

// The strong profile is the badge fixtures' `userBig`; the newcomer has nothing a badge could show yet.
const strongBadges = withBadgeFacts(userBig);
const newcomerBadges = withBadgeFacts({ ...userUnranked, login: newcomerProfile.login });

/** The strong profile on daily updates for one reason, as anyone but its owner sees it. */
const onDailyUpdates = (reason: DailyUpdateReason): ProfileUser => ({
  ...strongProfile,
  dailyUpdates: {
    reasons: [reason],
    nextUpdateAt: '2026-10-28T17:00:00.000Z',
    lastUpdatedAt: '2026-10-27T17:00:00.000Z',
  },
});

/** The owner signed in on their own profile, with their daily updates as the browser reads them. */
const ownerViewer = (overrides: Partial<DailyUpdatesViewer>) => ({
  login: strongProfile.login,
  dailyUpdates: {
    open: true,
    state: 'on',
    until: '2026-11-04T12:00:00.000Z',
    manual: { available: true, nextAt: null },
    picks: [],
    newPicksLeftToday: 3,
    ...overrides,
  } satisfies DailyUpdatesViewer,
});

const overview = (user: ProfileUser, badgeFacts: UserFacts, extras = strongExtras) => (
  <ProfileFrame login={user.login}>
    <OverviewPage user={user} extras={extras} badgeFacts={badgeFacts} isGlobalContext now={new Date()} />
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

const PROFILE_PATH = `/profile/${strongProfile.login}`;

/** Issues picked for an owner who uses neither product: masked, as the box lists them. */
const PICKED = maskedIssues.map((masked) => ({
  repo: '',
  number: 0,
  url: '',
  title: null,
  language: null,
  why: null,
  masked,
}));
const picked = (learnOpen: boolean) => (
  <ProfilePickedBox issues={PICKED} readyIssues={2500} matchedTo="TypeScript, Python and Go" learnOpen={learnOpen} />
);

/** A learner's own box, above the Skills block everyone reads, as the owner sees them. */
const learner = (
  <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-6">
    <ProfileLearnListBox rows={maskedIssues.map((masked) => ({ kind: 'masked', masked }))} colors={promoColors} />
    <SkillsBlock login={strongProfile.login} numbers={learnerNumbers} />
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
        id: 'daily-by-owner',
        title: 'On daily updates, turned on by the owner',
        path: `/profile/${strongProfile.login}`,
        height: 3000,
        render: () => overview(onDailyUpdates(DailyUpdateReason.Owner), strongBadges),
      },
      {
        id: 'daily-owner-on',
        title: 'Your profile, daily updates on',
        path: `/profile/${strongProfile.login}`,
        height: 3000,
        viewer: ownerViewer({}),
        render: () => overview(onDailyUpdates(DailyUpdateReason.Owner), strongBadges),
      },
      {
        id: 'daily-deal',
        title: 'Signed out, presses Refresh: the deal',
        path: `/profile/${strongProfile.login}`,
        height: 1000,
        signedOut: true,
        render: () => (
          <OpenRefreshDialog page={overview(strongProfile, strongBadges)} message={REFRESH_MESSAGES.deal} />
        ),
      },
      {
        id: 'daily-star-step',
        title: 'After the sign-in, no star yet',
        path: `/profile/${strongProfile.login}`,
        height: 1000,
        viewer: ownerViewer({ state: 'never', until: null }),
        render: () => (
          <OpenRefreshDialog page={overview(strongProfile, strongBadges)} message={REFRESH_MESSAGES.starStep} />
        ),
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
    id: 'profile-owner-box',
    title: "Profile · the owner's box, for someone who does not contribute",
    area: 'profile',
    route: '/profile/[login]',
    sources: [
      'app/profile/[login]/components/profile-contribute.tsx',
      'app/profile/[login]/components/profile-owner-boxes.tsx',
    ],
    states: [
      {
        id: 'uses-neither',
        title: 'The owner uses neither product: issues picked for them, with a way into each',
        path: PROFILE_PATH,
        height: 620,
        render: () => alone(picked(true)),
      },
      {
        id: 'learns',
        title: 'The owner learns: the top of their own list, above the Skills block',
        path: PROFILE_PATH,
        height: 900,
        render: () => learner,
      },
      {
        id: 'uses-neither-phone',
        title: 'The owner uses neither product, Learn not open to them · phone',
        path: PROFILE_PATH,
        width: 390,
        height: 1100,
        render: () => alone(picked(false)),
      },
    ],
  },
];
