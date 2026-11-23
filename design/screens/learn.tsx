import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { LEARN_FLOW_SCREENS } from './getting-in';
import { HomeBoards, LandingBoards, PhoneBoards } from './learn-home';
import { LearnTabScreen } from '@/app/(workspace)/learn/components/learn-tab';
import { LearnMaintainers } from '@/app/learn/components/learn-maintainers';
import { PrContext, PrLesson } from '@/app/learn/components/learn-pr-lesson';
import { LessonPageScreen } from '@/app/learn/components/lesson-page';
import { LessonResultScreen, type ResultViewer } from '@/app/learn/components/lesson-result';
import { LessonStubScreen } from '@/app/learn/components/lesson-stub';
import { Header } from '@/components/header/header';
import { ProgressScreen } from '@/components/learn/progress/progress-screen';
import {
  PublicProgressScreen,
  type PublicProgressScreenProps,
} from '@/components/learn/progress/public-progress-screen';
import { HeaderLine } from '@/components/workspace/header-line';
import { WorkspaceTabsNav } from '@/components/workspace/workspace-tabs-nav';
import { activityOf, runOf } from '@/lib/contribute/__fixtures__/agent-runs';
import { prCard } from '@/lib/contribute/__fixtures__/maintainers';
import {
  emptyIssues,
  learnIssues,
  myAttempt,
  myLearnAttempts,
  practiceLessons,
  practiceNext,
} from '@/lib/learn/__fixtures__/home';
import { emptyProfile, filledProfile } from '@/lib/learn/__fixtures__/profile';
import { lessonPage, result, sharedRuns } from '@/lib/learn/__fixtures__/shared';
import type {
  LearnIssues,
  LearnProfile,
  LessonResultPage,
  LessonVisibility,
  MyLearnAttempts,
  PracticeLessons,
} from '@/lib/learn/learn.types';
import { learnTabStateOf } from '@/lib/learn/learn-tab';
import type { PrLessonRead } from '@/lib/learn/pr-lesson';
import {
  learnedPage,
  lessonsPage,
  mergedPage,
  progressCounts,
  reposPage,
  zeroCounts,
} from '@/lib/learn/progress/__fixtures__/progress';
import type { LearnProgressCounts } from '@/lib/learn/progress/progress.types';
import { publicProgress } from '@/lib/learn/public-progress/__fixtures__/public-progress';

/** Your progress's lists, one per view. */
const progress = {
  lessons: { view: 'lessons', lessons: lessonsPage },
  learned: { view: 'learned', lessons: learnedPage },
  repos: { view: 'repos', repos: reposPage },
  merged: { view: 'merged', merged: mergedPage },
} as const;

/** A page's own container, as its `page.tsx` draws it. */
const MAIN = 'mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16';

/** Every tab, as an account Learn is open to sees them. */
const TABS = ['contribute', 'learn', 'pull-requests', 'agent', 'settings'] as const;

/** The page as the workspace's layout frames it: the site header (it marks itself by the path), then the tabs. */
const frame = (children: ReactNode) => (
  <>
    <Header />
    <WorkspaceTabsNav tabs={TABS} needsYou={2} />
    <main className={MAIN}>{children}</main>
  </>
);

/** A page that draws its own `main` (the front door, the page for maintainers), under the header and `line`. */
const bare = (children: ReactNode, line: ReactNode = <WorkspaceTabsNav tabs={TABS} needsYou={2} />) => (
  <>
    <Header />
    {line}
    {children}
  </>
);

/** The viewer's own agent writing the lesson of their Learn attempt, as Right now shows it. */
const WRITING = activityOf(
  runOf({
    attemptId: 'A_1',
    nameWithOwner: 'driftwood-js/driftwood',
    number: 934,
    title: 'Route params lose their type after a redirect',
    runner: 'MCP',
    mode: 'LEARN',
    phase: 'WRITING_LESSON',
    elapsedSeconds: 18 * 60,
    spendUsd: 0,
    budgetUsd: 0,
    lastCallAt: '2026-10-31T11:58:00.000Z',
    latestEvent: { state: 'RUNNING', detail: 'Checks passed', at: '2026-10-31T11:57:00.000Z' },
  }),
);

/** The Learn tab as a signed-in learner reads it: a TypeScript goal, the issues for it and practice, unless named. */
const learnTab = (
  attempts: MyLearnAttempts,
  {
    profile = filledProfile,
    issues = learnIssues(),
    practice = practiceLessons(),
    counts = zeroCounts,
    settingUp = false,
    held = false,
  }: {
    profile?: LearnProfile | null;
    issues?: LearnIssues;
    practice?: PracticeLessons;
    counts?: LearnProgressCounts;
    settingUp?: boolean;
    held?: boolean;
  } = {},
) =>
  bare(
    <LearnTabScreen
      state={learnTabStateOf({ held, settingUp, profile, attempts })}
      profile={profile}
      attempts={attempts}
      counts={counts}
      issues={issues}
      practice={practice}
      activity={attempts.current?.stage === 'AGENT_WORKING' ? WRITING : null}
      agentName="Claude Code"
    />,
  );

/** A shared lesson taken as practice by mona, whose goal is TypeScript too. */
const MONA_GOAL = { kind: 'language', value: 'TypeScript', level: 'Some' };

/** A shared lesson's page and its result pages: open to everyone, so under the header's line, without the workspace's tabs. */
const LESSON_PATH = '/learn/lessons/route-cache-miss-8f3k';
const RESULT_PATH = `${LESSON_PATH}/passes/octocat`;
const open = (children: ReactNode) => bare(children, <HeaderLine />);
const stubPage = (visibility: LessonVisibility | 'MISSING') => open(<LessonStubScreen visibility={visibility} />);

/** A maintainer from the pull request, without the light sign-in: nothing stored yet. */
const MAINTAINER: ResultViewer = { canReact: false, mine: null, returned: null };

/** A Learn pull request's footer link: the maintainers page with its first attempt. */
const FROM_PR_PATH = '/learn/maintainers?from=6650a1b2c3d4e5f6a7b8c9d0';
/** The lesson's pull request, as the footer link names it. */
const LEARN_PR = prCard({
  number: 902,
  title: 'Keep nested layouts cached across navigations',
  contributorLogin: 'octocat',
  agentPhrase: 'GitRanks Learn and Claude Code (Opus)',
  learn: { slug: 'route-cache-miss-8f3k' },
});
const prLesson = (viewer: ResultViewer = MAINTAINER): PrLessonRead => ({
  kind: 'lesson',
  card: LEARN_PR,
  result: result(),
  viewer: { own: false, ...viewer },
});
const fromPr = (read: PrLessonRead) =>
  open(
    <LearnMaintainers
      context={<PrContext card={read.card} />}
      lesson={<PrLesson read={read} />}
      from={read.card.attemptId}
    />,
  );
const resultPage = (page: LessonResultPage = result(), viewer: ResultViewer = MAINTAINER) =>
  open(<LessonResultScreen result={page} viewer={viewer} />);

/** Your progress with its Share control, as a learner with a public record (or none) reads it. */
const shared = (publicCounts: LearnProgressCounts | null) => ({
  view: 'lessons' as const,
  page: 1,
  counts: progressCounts,
  list: progress.lessons,
  share: { url: 'https://gitranks.com/learn/progress/octocat', publicCounts },
});

/** octocat's public progress page, open to everyone: under the header's line, without the workspace's tabs. */
const PUBLIC_PROGRESS_PATH = '/learn/progress/octocat';
const publicPage = (props: Partial<PublicProgressScreenProps> = {}) => (
  <main className={MAIN}>
    <PublicProgressScreen login="octocat" page={1} progress={publicProgress} own={false} everyone={false} {...props} />
  </main>
);

export const LEARN_SCREENS: Screen[] = [
  {
    id: 'learn-tab',
    title: 'Learn tab',
    area: 'learn',
    route: '/learn/earlier',
    sources: [
      'app/(workspace)/learn/earlier/page.tsx',
      'app/(workspace)/learn/components/learn-tab.tsx',
      'app/(workspace)/learn/components/learn-tab-view.tsx',
      'app/(workspace)/learn/components/issue-list.tsx',
      'app/learn/components/learn-goal-quick.tsx',
      'app/learn/components/practice-lessons.tsx',
      'app/learn/components/stage-strip.tsx',
      'components/learn/learn-issue-notes.tsx',
      'components/workspace/issue-row.tsx',
      'components/workspace/right-now.tsx',
      'lib/learn/learn-tab.ts',
    ],
    states: [
      {
        id: 'first',
        title: 'No goal yet: what do you want to learn, and how every lesson is made',
        path: '/learn/earlier',
        height: 1240,
        render: () => learnTab(myLearnAttempts.none, { profile: emptyProfile }),
      },
      {
        id: 'ready',
        title: 'Goal set: Learn something new, practice lessons optional',
        path: '/learn/earlier',
        height: 1820,
        render: () => learnTab(myLearnAttempts.none),
      },
      {
        id: 'numbers',
        title: 'After a first Learn pull request: four numbers in the path’s place',
        path: '/learn/earlier',
        height: 1820,
        render: () => learnTab(myLearnAttempts.none, { counts: progressCounts }),
      },
      {
        id: 'working',
        title: 'Your agent is working: Right now, practice while you wait',
        path: '/learn/earlier',
        height: 1300,
        render: () => learnTab(myLearnAttempts.working),
      },
      {
        id: 'lesson-ready',
        title: 'Your first lesson is ready: step 3 is the link',
        path: '/learn/earlier',
        height: 1100,
        render: () =>
          learnTab({
            current: myAttempt({ stage: 'WARMUP', state: 'REVIEW', lessonMinutes: 10 }),
            lastPullRequest: null,
          }),
      },
      {
        id: 'blocked',
        title: 'The lesson’s questions need fixing: open it',
        path: '/learn/earlier',
        height: 1100,
        render: () => learnTab(myLearnAttempts.blocked),
      },
      {
        id: 'approve',
        title: 'You passed: submit your pull request',
        path: '/learn/earlier',
        height: 1100,
        render: () => learnTab(myLearnAttempts.approve),
      },
      {
        id: 'no-room',
        title: 'At the open pull request limit: the issues stay, without Start',
        path: '/learn/earlier',
        height: 1900,
        render: () => learnTab(myLearnAttempts.none, { issues: emptyIssues.noRoom }),
      },
      {
        id: 'none-today',
        title: 'No open issues fit the goal today',
        path: '/learn/earlier',
        height: 1220,
        render: () => learnTab(myLearnAttempts.none, { issues: emptyIssues.noneToday }),
      },
      {
        id: 'goal-unsupported',
        title: 'A goal Learn can’t find issues for yet: change it',
        path: '/learn/earlier',
        height: 760,
        render: () =>
          learnTab(myLearnAttempts.none, {
            profile: { ...filledProfile, goalValue: 'C++' },
            issues: emptyIssues.unsupported,
            practice: practiceLessons({ items: [], total: 0 }),
          }),
      },
      {
        id: 'cap',
        title: 'The day’s new issues are all shown',
        path: '/learn/earlier',
        height: 1220,
        render: () => learnTab(myLearnAttempts.none, { issues: emptyIssues.cap }),
      },
      {
        id: 'unread',
        title: 'The issues could not be loaded',
        path: '/learn/earlier',
        height: 1200,
        render: () => learnTab(myLearnAttempts.none, { issues: emptyIssues.unread }),
      },
      {
        id: 'held',
        title: 'The account is held: no issues, practice stays',
        path: '/learn/earlier',
        height: 1100,
        render: () => learnTab(myLearnAttempts.none, { held: true }),
      },
      {
        id: 'setting-up',
        title: 'A new account: its GitRanks account is still being set up',
        path: '/learn/earlier',
        height: 560,
        render: () => learnTab(myLearnAttempts.none, { profile: null, settingUp: true }),
      },
      {
        id: 'phone',
        title: 'After a first Learn pull request, on a phone: numbers two by two',
        path: '/learn/earlier',
        width: 390,
        height: 3300,
        render: () => learnTab(myLearnAttempts.none, { counts: progressCounts }),
      },
    ],
  },
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
        height: 10600,
        render: () => <LandingBoards />,
      },
      {
        id: 'phone',
        title: 'The landing and Learn home on a phone',
        path: '/learn',
        signedOut: true,
        width: 390,
        height: 7650,
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
  ...LEARN_FLOW_SCREENS,
  {
    id: 'learn-maintainers',
    title: 'Learn for maintainers',
    area: 'learn',
    route: '/learn/maintainers',
    sources: ['app/(public)/learn/maintainers/page.tsx', 'app/learn/components/learn-maintainers.tsx'],
    states: [
      {
        id: 'default',
        title: 'What a Learn pull request is, learn: welcome, set rules or report it',
        path: '/learn/maintainers',
        signedOut: true,
        height: 1030,
        render: () => open(<LearnMaintainers />),
      },
      {
        id: 'from-pr',
        title:
          'From a Learn pull request’s footer: the pull request on top, then what it is, its lesson, Did this help?, your rules',
        path: FROM_PR_PATH,
        signedOut: true,
        height: 1690,
        render: () => fromPr(prLesson()),
      },
      {
        id: 'from-pr-sign-in',
        title: 'After a click on “Yes, it helped”, signed out: the GitHub sign-in',
        path: FROM_PR_PATH,
        signedOut: true,
        height: 1810,
        render: () => fromPr(prLesson({ ...MAINTAINER, prompt: 'YES' })),
      },
      {
        id: 'from-pr-phone',
        title: 'From the footer, on a phone',
        path: FROM_PR_PATH,
        signedOut: true,
        width: 390,
        height: 2140,
        render: () => fromPr(prLesson()),
      },
      {
        id: 'from-pr-closed',
        title: 'Its lesson held, hidden or removed: the pull request on top, one neutral line, no feedback',
        path: FROM_PR_PATH,
        signedOut: true,
        height: 1300,
        render: () => fromPr({ kind: 'closed', card: { ...LEARN_PR, learn: { slug: null } } }),
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
      'lib/learn/public-progress/public-progress.ts',
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
  {
    id: 'public-progress',
    title: 'A public progress page',
    area: 'learn',
    route: '/learn/progress/[login]',
    sources: [
      'app/(public)/learn/progress/[login]/page.tsx',
      'components/learn/progress/public-progress-view.tsx',
      'components/learn/progress/public-progress-screen.tsx',
      'components/learn/progress/learned-lesson-card.tsx',
      'lib/learn/public-progress/public-progress.ts',
      'lib/learn/public-progress/public-progress-seo.ts',
    ],
    states: [
      {
        id: 'own',
        title: 'The person themself: one line to Your progress',
        path: PUBLIC_PROGRESS_PATH,
        height: 1460,
        render: () => open(publicPage({ own: true })),
      },
      {
        id: 'everyone',
        title: 'Once Learn is open to everyone: the way in at the end',
        path: PUBLIC_PROGRESS_PATH,
        signedOut: true,
        height: 1460,
        render: () => open(publicPage({ everyone: true })),
      },
      {
        id: 'unavailable',
        title: 'The read failed',
        path: PUBLIC_PROGRESS_PATH,
        signedOut: true,
        height: 420,
        render: () => open(publicPage({ progress: 'unavailable' })),
      },
      {
        id: 'phone',
        title: 'On a phone: the numbers in a 2 × 2 grid, the rows stacked',
        path: PUBLIC_PROGRESS_PATH,
        signedOut: true,
        width: 390,
        height: 2300,
        render: () => open(publicPage()),
      },
    ],
  },
  {
    id: 'lesson-page',
    title: 'A shared lesson',
    area: 'learn',
    route: '/learn/lessons/[slug]',
    sources: [
      'app/(public)/learn/lessons/[slug]/page.tsx',
      'app/learn/components/lesson-page.tsx',
      'components/learn/lesson-read.tsx',
      'app/learn/components/shared-lesson.tsx',
      'app/learn/components/lesson-header.tsx',
      'app/learn/components/lesson-stub.tsx',
      'app/(public)/learn/lessons/[slug]/not-found.tsx',
      'components/learn/lesson-flow.tsx',
      'components/learn/lesson-summary.tsx',
      'app/learn/components/practice-context.tsx',
      'components/learn/practice-next.tsx',
      'lib/learn/lesson-public.ts',
      'lib/learn/lesson-seo.ts',
    ],
    states: [
      {
        id: 'signed-out',
        title: 'Signed out, once Learn is open to everyone: every step to read, sign in to answer',
        path: LESSON_PATH,
        signedOut: true,
        height: 4300,
        render: () => open(<LessonPageScreen page={lessonPage} viewer={{ kind: 'visitor' }} />),
      },
      {
        id: 'phone',
        title: 'Signed out on a phone, once Learn is open to everyone',
        path: LESSON_PATH,
        signedOut: true,
        width: 390,
        height: 6900,
        render: () => open(<LessonPageScreen page={lessonPage} viewer={{ kind: 'visitor' }} />),
      },
      {
        id: 'guest',
        title: 'Signed out while Learn is not open to everyone: every step to read, asked nothing',
        path: LESSON_PATH,
        signedOut: true,
        height: 4200,
        render: () => open(<LessonPageScreen page={lessonPage} viewer={{ kind: 'guest' }} />),
      },
      {
        id: 'reader',
        title: 'Signed in, Learn not open to the account: read only, told nothing of Learn',
        path: LESSON_PATH,
        height: 3900,
        render: () => open(<LessonPageScreen page={lessonPage} viewer={{ kind: 'reader', login: 'mona' }} />),
      },
      {
        id: 'start',
        title: 'A practice lesson, no run yet: back to Learn home, its context, Skip it or Start the lesson',
        path: LESSON_PATH,
        height: 4060,
        render: () =>
          open(
            <LessonPageScreen
              page={lessonPage}
              viewer={{ kind: 'taker', login: 'mona', run: null, goal: MONA_GOAL }}
            />,
          ),
      },
      {
        id: 'author',
        title: 'Its author, signed in: the lesson page as it was, no practice wording',
        path: LESSON_PATH,
        height: 3900,
        render: () =>
          open(<LessonPageScreen page={lessonPage} viewer={{ kind: 'taker', login: 'octocat', run: null }} />),
      },
      {
        id: 'taking',
        title: 'Taking it: a step and its question, an answer picked',
        path: LESSON_PATH,
        height: 1450,
        render: () =>
          open(
            <LessonPageScreen
              page={lessonPage}
              viewer={{ kind: 'taker', login: 'mona', run: sharedRuns.step }}
              start={{ picked: ['q2a2'] }}
            />,
          ),
      },
      {
        id: 'passed-back',
        title: 'Passed with a lesson of their own in progress: back to it',
        path: LESSON_PATH,
        height: 1260,
        render: () =>
          open(
            <LessonPageScreen
              page={lessonPage}
              viewer={{
                kind: 'taker',
                login: 'mona',
                run: sharedRuns.passed,
                goal: MONA_GOAL,
                next: practiceNext.back,
              }}
            />,
          ),
      },
      {
        id: 'passed-no-goal',
        title: 'Passed with no goal saved: tell us what you want to learn',
        path: LESSON_PATH,
        height: 1260,
        render: () =>
          open(
            <LessonPageScreen
              page={lessonPage}
              viewer={{ kind: 'taker', login: 'mona', run: sharedRuns.passed, goal: null, next: practiceNext.noGoal }}
            />,
          ),
      },
      {
        id: 'shared',
        title: 'Passed and shared: the link to the result page',
        path: LESSON_PATH,
        height: 1600,
        render: () =>
          open(
            <LessonPageScreen
              page={lessonPage}
              viewer={{
                kind: 'taker',
                login: 'mona',
                run: { ...sharedRuns.passed, resultPublic: true, worthIt: true },
                goal: MONA_GOAL,
                next: practiceNext.own,
              }}
            />,
          ),
      },
      {
        id: 'held',
        title: 'Held while reports are read: the lesson page is closed',
        path: LESSON_PATH,
        signedOut: true,
        height: 520,
        render: () => stubPage('HELD'),
      },
      {
        id: 'removed',
        title: 'Removed by its author',
        path: LESSON_PATH,
        signedOut: true,
        height: 520,
        render: () => stubPage('REMOVED'),
      },
      {
        id: 'hidden',
        title: 'Hidden by GitRanks, or not there: a 404 that says it is not available',
        path: LESSON_PATH,
        signedOut: true,
        height: 520,
        render: () => stubPage('MISSING'),
      },
    ],
  },
  {
    id: 'lesson-result',
    title: 'A lesson result',
    area: 'learn',
    route: '/learn/lessons/[slug]/passes/[login]',
    sources: [
      'app/(public)/learn/lessons/[slug]/passes/[login]/page.tsx',
      'app/learn/components/lesson-result.tsx',
      'app/learn/components/result-reactions.tsx',
      'app/learn/components/lesson-header.tsx',
      'components/learn/question-card.tsx',
      'app/api/learn/lessons/[slug]/passes/[login]/route.ts',
      'lib/learn/lesson-public.ts',
      'lib/learn/lesson-seo.ts',
    ],
    states: [
      {
        id: 'sign-in',
        title: 'After a click on “Yes, it helped”, signed out: the GitHub sign-in',
        path: RESULT_PATH,
        signedOut: true,
        height: 4700,
        render: () => resultPage(result(), { ...MAINTAINER, prompt: 'YES' }),
      },
      {
        id: 'own',
        title: 'Its own person, signed in: a line in place of the buttons',
        path: RESULT_PATH,
        height: 4700,
        render: () => resultPage(result(), { ...MAINTAINER, own: true }),
      },
      {
        id: 'phone',
        title: 'On a phone',
        path: RESULT_PATH,
        signedOut: true,
        width: 390,
        height: 7400,
        render: () => resultPage(),
      },
      {
        id: 'removed',
        title: 'Removed by its author',
        path: RESULT_PATH,
        signedOut: true,
        height: 520,
        render: () => stubPage('REMOVED'),
      },
      {
        id: 'hidden',
        title: 'Hidden, or no public pass: a 404 that says it is not available',
        path: RESULT_PATH,
        signedOut: true,
        height: 520,
        render: () => stubPage('MISSING'),
      },
    ],
  },
];
