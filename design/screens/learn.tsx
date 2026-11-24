import type { Screen } from '../registry';
import { HomeBoards, LandingBoards, PhoneBoards } from './learn-home';

export const LEARN_SCREENS: Screen[] = [
  {
    id: 'learn-landing',
    title: 'Learn home, the landing and How Learn works',
    area: 'learn',
    route: '/learn',
    sources: [
      'app/(learn)/learn/page.tsx',
      'app/(public)/learn/about/page.tsx',
      'app/learn/components/learn-front.tsx',
      'components/learn/home/learn-home-view.tsx',
      'components/learn/landing/learn-landing-view.tsx',
      'components/learn/landing/try-lesson.tsx',
      'lib/learn/home.ts',
      'lib/learn/landing.ts',
      'components/workspace/getting-in/landing-parts.ts',
    ],
    states: [
      {
        id: 'signed-out',
        title: 'The landing: the whole page, the lesson at the top in its states, launch day, no course yet',
        path: '/learn',
        signedOut: true,
        height: 11500,
        render: () => <LandingBoards />,
      },
      {
        id: 'phone',
        title: 'The landing and Learn home on a phone',
        path: '/learn',
        signedOut: true,
        width: 390,
        height: 8250,
        render: () => <PhoneBoards />,
      },
      {
        id: 'about',
        title: 'How Learn works for a learner, and Learn home in each of its states',
        path: '/learn/about',
        height: 8400,
        render: () => <HomeBoards />,
      },
    ],
  },
];
