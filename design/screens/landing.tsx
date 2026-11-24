import { withBadgeFacts } from '../images';
import type { Screen } from '../registry';
import { landingData } from '@/app/components/landing/__fixtures__/landing';
import { LandingScreen } from '@/app/components/landing/landing-screen';
import { orgBig, repoBig, userBig, userMid } from '@/badge/v3/fixtures';
import { unsungHero } from '@/lib/unsung-hero/__fixtures__/hero';

// The README mock draws today's #1s; the signed-in viewer's card and badges are theirs (`viewerRankCard`).
for (const facts of [userBig, repoBig, orgBig]) withBadgeFacts(facts);
withBadgeFacts({ ...userMid, login: 'octocat' });

const SOURCES = [
  'app/components/landing/landing-screen.tsx',
  'app/components/landing/landing-sections.tsx',
  'app/components/landing/hero-aside.tsx',
  'app/components/landing/unsung-hero-card.tsx',
  'app/components/landing/your-rank-card.tsx',
  'app/components/landing/example-cards.tsx',
  'app/components/landing/rank-facts.tsx',
  'app/components/landing/packages-section.tsx',
  'app/components/landing/products-block-live.tsx',
  'app/components/landing/products-block.tsx',
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
        id: 'signed-in',
        title: 'Signed in, with the package rankings',
        path: '/',
        height: 7500,
        render: () => <LandingScreen {...landingData} contribute />,
      },
      {
        id: 'signed-out',
        title: 'Signed out: the block for Contribute and Learn under the hero',
        path: '/',
        signedOut: true,
        height: 7500,
        render: () => <LandingScreen {...landingData} contribute />,
      },
      {
        id: 'unsung-hero',
        title: 'Unsung hero of the week, signed in or out',
        path: '/',
        signedOut: true,
        height: 6700,
        render: () => <LandingScreen {...landingData} contribute hero={unsungHero} />,
      },
      {
        id: 'signed-out-phone',
        title: 'Signed out · phone',
        path: '/',
        signedOut: true,
        width: 390,
        height: 7300,
        render: () => <LandingScreen {...landingData} contribute />,
      },
    ],
  },
];
