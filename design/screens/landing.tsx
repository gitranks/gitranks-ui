import { withBadgeFacts } from '../images';
import type { Screen } from '../registry';
import { landingData } from '@/app/components/landing/__fixtures__/landing';
import { LandingScreen } from '@/app/components/landing/landing-screen';
import { orgBig, repoBig, userBig, userMid } from '@/badge/v3/fixtures';

// The README mock draws today's #1s; the signed-in viewer's card and badges are theirs (`viewerRankCard`).
for (const facts of [userBig, repoBig, orgBig]) withBadgeFacts(facts);
withBadgeFacts({ ...userMid, login: 'octocat' });

const SOURCES = [
  'app/components/landing/landing-screen.tsx',
  'app/components/landing/landing-sections.tsx',
  'app/components/landing/hero-aside.tsx',
  'app/components/landing/contribute-section.tsx',
  'app/components/landing/readme-section.tsx',
  'app/components/landing/repos-section.tsx',
];

export const LANDING_SCREENS: Screen[] = [
  {
    id: 'landing',
    title: 'Landing',
    area: 'landing',
    route: '/',
    sources: SOURCES,
    states: [
      {
        id: 'signed-out',
        title: 'Signed out',
        path: '/',
        signedOut: true,
        height: 6000,
        render: () => <LandingScreen {...landingData} />,
      },
      {
        id: 'signed-in',
        title: 'Signed in, with Contribute',
        path: '/',
        height: 6900,
        render: () => <LandingScreen {...landingData} />,
      },
      {
        id: 'signed-out-phone',
        title: 'Signed out · phone',
        path: '/',
        signedOut: true,
        width: 390,
        height: 6500,
        render: () => <LandingScreen {...landingData} />,
      },
    ],
  },
];
