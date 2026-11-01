import { withBadgeFacts } from '../images';
import type { Screen } from '../registry';
import {
  newcomerExtras,
  newcomerProfile,
  type ProfileUser,
  strongExtras,
  strongProfile,
} from '@/app/profile/[login]/__fixtures__/overview';
import { OverviewPage } from '@/app/profile/[login]/components/overview-page';
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
        id: 'strong-phone',
        title: 'Near the top · phone',
        path: `/profile/${strongProfile.login}`,
        width: 390,
        height: 4400,
        render: () => overview(strongProfile, strongBadges),
      },
    ],
  },
];
