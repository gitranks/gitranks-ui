import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { HomeBoards, LandingBoards, PhoneBoards } from './learn-home';
import { Header } from '@/components/header/header';
import { ProgressScreen } from '@/components/learn/progress/progress-screen';
import { WorkspaceTabsNav } from '@/components/workspace/workspace-tabs-nav';
import {
  learnedPage,
  lessonsPage,
  mergedPage,
  progressCounts,
  reposPage,
  zeroCounts,
} from '@/lib/learn/progress/__fixtures__/progress';
import type { LearnProgressCounts } from '@/lib/learn/progress/progress.types';

/** Your progress's lists, one per view. */
const progress = {
  lessons: { view: 'lessons', lessons: lessonsPage },
  learned: { view: 'learned', lessons: learnedPage },
  repos: { view: 'repos', repos: reposPage },
  merged: { view: 'merged', merged: mergedPage },
} as const;

/** A page's own container, as its `page.tsx` draws it. */
const MAIN = 'mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16';

/** Every tab, as a signed-in account sees them. */
const TABS = ['contribute', 'learn', 'pull-requests', 'agent', 'settings'] as const;

/** The page as the workspace's layout frames it: the site header (it marks itself by the path), then the tabs. */
const frame = (children: ReactNode) => (
  <>
    <Header />
    <WorkspaceTabsNav tabs={TABS} needsYou={2} />
    <main className={MAIN}>{children}</main>
  </>
);

/** Your progress with its Share control, as a learner with a public record (or none) reads it. */
const shared = (publicCounts: LearnProgressCounts | null) => ({
  view: 'lessons' as const,
  page: 1,
  counts: progressCounts,
  list: progress.lessons,
  share: { url: 'https://gitranks.com/profile/octocat/skills', publicCounts },
});

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
  {
    id: 'progress',
    title: 'Your progress',
    area: 'learn',
    route: '/my/progress',
    sources: [
      'app/(workspace)/my/progress/page.tsx',
      'components/learn/progress/progress-view.tsx',
      'components/learn/progress/progress-screen.tsx',
      'components/learn/progress/progress-lists.tsx',
      'components/learn/progress/learned-lesson-card.tsx',
      'components/learn/progress/learn-lesson-state-pill.tsx',
      'components/learn/progress/share-progress.tsx',
      'lib/learn/progress/progress.ts',
    ],
    states: [
      {
        id: 'learned',
        title: 'New things learned: one card per lesson, a tile per new step',
        path: '/my/progress?view=learned',
        height: 1600,
        render: () => frame(<ProgressScreen view="learned" page={1} counts={progressCounts} list={progress.learned} />),
      },
      {
        id: 'repos',
        title: 'Repos helped: one row per repository, its first pull requests',
        path: '/my/progress?view=repos',
        height: 760,
        render: () => frame(<ProgressScreen view="repos" page={1} counts={progressCounts} list={progress.repos} />),
      },
      {
        id: 'merged',
        title: 'Pull requests merged, newest first, the lesson while it is there',
        path: '/my/progress?view=merged',
        height: 1060,
        render: () => frame(<ProgressScreen view="merged" page={1} counts={progressCounts} list={progress.merged} />),
      },
      {
        id: 'empty',
        title: 'Nothing passed yet: the four tabs at 0 and the way to a first lesson',
        path: '/my/progress',
        height: 560,
        render: () => frame(<ProgressScreen view="lessons" page={1} counts={zeroCounts} />),
      },
      {
        id: 'nothing-new',
        title: 'Lessons passed, none taught a new thing',
        path: '/my/progress?view=learned',
        height: 600,
        render: () =>
          frame(
            <ProgressScreen
              view="learned"
              page={1}
              counts={{ ...zeroCounts, lessonsPassed: 2 }}
              list={{ view: 'learned', lessons: { items: [], total: 0, notFinished: [] } }}
            />,
          ),
      },
      {
        id: 'none-merged',
        title: 'No pull request merged yet, two open',
        path: '/my/progress?view=merged',
        height: 620,
        render: () =>
          frame(
            <ProgressScreen
              view="merged"
              page={1}
              counts={{ ...progressCounts, prsMerged: 0, reposHelped: 0 }}
              list={{ view: 'merged', merged: { items: [], total: 0 } }}
              openPrs={2}
            />,
          ),
      },
      {
        id: 'phone',
        title: 'Lessons passed on a phone: the tabs scroll, the state and the button under each row',
        path: '/my/progress',
        width: 390,
        height: 3000,
        render: () => frame(<ProgressScreen view="lessons" page={1} counts={progressCounts} list={progress.lessons} />),
      },
      {
        id: 'share',
        title: 'Share: the public page counts as much as Your progress',
        path: '/my/progress',
        height: 1700,
        render: () => frame(<ProgressScreen {...shared(progressCounts)} />),
      },
      {
        id: 'share-differ',
        title: 'Share: the public page counts fewer lessons, and says why',
        path: '/my/progress',
        height: 1700,
        render: () => frame(<ProgressScreen {...shared({ ...progressCounts, lessonsPassed: 5, newThings: 9 })} />),
      },
      {
        id: 'share-none',
        title: 'Share: nothing public yet, no button',
        path: '/my/progress',
        height: 1700,
        render: () => frame(<ProgressScreen {...shared(null)} />),
      },
    ],
  },
];
