import type { Route } from 'next';
import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { GoalSettingsScreen } from '@/app/(workspace)/my/settings/components/settings-pages';
import { LearnHomeScreen } from '@/app/learn/components/learn-home';
import { LearnLanding } from '@/app/learn/components/learn-landing';
import { LearnMaintainers } from '@/app/learn/components/learn-maintainers';
import { LessonPageScreen } from '@/app/learn/components/lesson-page';
import { LessonResultScreen, type ResultViewer } from '@/app/learn/components/lesson-result';
import { LessonStubScreen } from '@/app/learn/components/lesson-stub';
import { LessonViewScreen } from '@/app/learn/components/lesson-view';
import { RecentLessons } from '@/app/learn/components/recent-lessons';
import { Header } from '@/components/header/header';
import type { LessonFlowStart } from '@/components/learn/lesson-flow';
import { ProgressScreen } from '@/components/learn/progress/progress-screen';
import { HeaderLine } from '@/components/workspace/header-line';
import { ContributionShell, ReviewScreen } from '@/components/workspace/pull-request/review-view';
import { WorkspaceTabsNav } from '@/components/workspace/workspace-tabs-nav';
import {
  detail,
  feedbackThread,
  followUpAttempts,
  pullRequest,
} from '@/lib/contribute/__fixtures__/contribute-attempts';
import { NOW, views } from '@/lib/contribute/__fixtures__/contribute-views';
import {
  emptyIssues,
  learnIssues,
  myLearnAttempts,
  practiceLessons,
  practiceNext,
} from '@/lib/learn/__fixtures__/home';
import { CAUSE_HINT, CAUSE_QUESTION, FIX_QUESTION, FIX_WHY, lessons } from '@/lib/learn/__fixtures__/lesson';
import { emptyProfile, filledProfile } from '@/lib/learn/__fixtures__/profile';
import { recentLessons } from '@/lib/learn/__fixtures__/recent-lessons';
import { lessonPage, result, sharedRuns } from '@/lib/learn/__fixtures__/shared';
import type {
  LearnAttemptLesson,
  LearnIssues,
  LearnProfile,
  LessonResultPage,
  LessonVisibility,
  MyLearnAttempts,
  PracticeLessons,
} from '@/lib/learn/learn.types';
import { learnHomeStateOf } from '@/lib/learn/learn-home';
import {
  learnedPage,
  lessonsPage,
  mergedPage,
  progressCounts,
  reposPage,
  zeroCounts,
} from '@/lib/learn/progress/__fixtures__/progress';
import { DONT_KNOW } from '@/lib/learn/question';
import type { ContributeAttemptDetail } from '@/lib/workspace/contribute.types';
import { contributionMovesOf } from '@/lib/workspace/contribution-moves';

/** Your progress's lists, one per view. */
const progress = {
  lessons: { view: 'lessons', lessons: lessonsPage },
  learned: { view: 'learned', lessons: learnedPage },
  repos: { view: 'repos', repos: reposPage },
  merged: { view: 'merged', merged: mergedPage },
} as const;

/** A page's own container, as its `page.tsx` draws it. */
const MAIN = 'mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16';
/** A Settings page's column. */
const SETTINGS_MAIN = 'mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16';

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

/** Learn home as a signed-in learner reads it: a TypeScript goal, the issues for it and practice, unless named. */
const home = (
  attempts: MyLearnAttempts,
  {
    profile = filledProfile,
    issues = learnIssues(),
    practice = practiceLessons(),
    settingUp = false,
  }: { profile?: LearnProfile | null; issues?: LearnIssues; practice?: PracticeLessons; settingUp?: boolean } = {},
) =>
  bare(
    <LearnHomeScreen
      state={learnHomeStateOf({ settingUp, profile, attempts })}
      profile={profile}
      issues={issues}
      practice={practice}
    />,
  );

const FOOTER =
  'Made with [GitRanks Learn](https://gitranks.com/learn/maintainers), where developers learn on real issues · Claude Code (Opus) wrote this fix and taught it to @octocat, who [passed a check on it](https://gitranks.com/learn/lessons/route-cache-miss-8f3k/passes/octocat) and submitted it\nSomething off? [Tell us or opt out in one step](https://gitranks.com/learn/maintainers) — maintainers are always in control';

/** The user's own agent's Learn attempt, in review while the lesson is taken. */
const learnAttempt = (patch: Partial<ContributeAttemptDetail> = {}): ContributeAttemptDetail =>
  detail({
    mode: 'LEARN',
    runner: 'MCP',
    agent: { name: 'CLAUDE_CODE', model: null },
    sendBacksLeft: 2,
    changesRequested: null,
    leaseUntil: null,
    openedBy: null,
    costUsd: 0,
    budgetUsd: 0,
    prFooter: FOOTER,
    prCoAuthored: true,
    dcoRequired: false,
    learnGatePassed: false,
    result: {
      verdict: 'DONE',
      summary: 'Layout lookups used the raw route path as the cache key. It now normalizes the path first.',
      tests: [{ command: 'pnpm vitest run test/layout-cache.spec.ts', passed: true, output: 'Tests 14 passed (14)' }],
      filesChanged: ['src/router/layout-cache.ts', 'test/layout-cache.spec.ts'],
      risk: 'LOW',
      riskNotes: null,
      prBody: 'Fixes #871\n\n## What changed\nNormalize the route path before the layout cache lookup.',
      prTitle: 'Normalize the route path before the layout cache lookup',
    },
    ...patch,
  });

/** While the agent works: claimed, reproduced, writing. */
const working = learnAttempt({
  state: 'RUNNING',
  patch: null,
  checksPassed: null,
  checks: [],
  events: [
    { state: 'RUNNING', detail: 'claimed', at: '2026-10-28T09:10:00.000Z' },
    { state: 'RUNNING', detail: 'Reproduced the bug with a failing test', at: '2026-10-28T09:14:00.000Z' },
    { state: 'RUNNING', detail: 'Writing the fix', at: '2026-10-28T09:31:00.000Z' },
  ],
});

/** The pull request's page of the Learn attempt, by its repo and issue. */
const BASE = '/my/pull-requests/driftwood-js/driftwood/871' as Route;

/** The Lesson view, under the pull request's header (the lesson line, the two views). */
const page = (
  lesson: LearnAttemptLesson,
  attempt: ContributeAttemptDetail = learnAttempt(),
  start?: LessonFlowStart,
  practice?: PracticeLessons,
) =>
  frame(
    <ContributionShell
      view={views.active}
      attempt={attempt}
      first={attempt}
      model={contributionMovesOf({ view: views.active, first: attempt, now: NOW })}
      lesson={lesson}
      base={BASE}
      now={NOW}
    >
      <LessonViewScreen
        view={views.active}
        attempt={attempt}
        lesson={lesson}
        base={BASE}
        start={start}
        practice={practice}
        now={NOW}
      />
    </ContributionShell>,
  );

/** The Pull request view of a Learn pull request, under the same header. */
const prView = (attempt: ContributeAttemptDetail, lesson: LearnAttemptLesson, next = false) =>
  frame(<ReviewScreen view={views.active} attempt={attempt} next={next} lesson={lesson} base={BASE} now={NOW} />);

/** A Learn pull request a maintainer asked a change on: the prompt card for the own agent. */
const learnNeedsYou = learnAttempt({
  ...followUpAttempts.prNeedsYou,
  mode: 'LEARN',
  runner: 'MCP',
  agent: { name: 'CLAUDE_CODE', model: null },
  learnGatePassed: true,
  reviewFeedback: { readAt: '2026-10-28T11:45:00.000Z', threads: [feedbackThread()] },
});

/** A shared lesson taken as practice by mona, whose goal is TypeScript too. */
const MONA_GOAL = { kind: 'language', value: 'TypeScript', level: 'Some' };

const PATH = `${BASE}/lesson`;

/** A shared lesson's page and its result pages: open to everyone, so under the header's line, without the workspace's tabs. */
const LESSON_PATH = '/learn/lessons/route-cache-miss-8f3k';
const RESULT_PATH = `${LESSON_PATH}/passes/octocat`;
const open = (children: ReactNode) => bare(children, <HeaderLine />);
const stubPage = (visibility: LessonVisibility | 'MISSING') => open(<LessonStubScreen visibility={visibility} />);

/** A maintainer from the pull request, without the light sign-in: nothing stored yet. */
const MAINTAINER: ResultViewer = { canReact: false, mine: null, returned: null };
const resultPage = (page: LessonResultPage = result(), viewer: ResultViewer = MAINTAINER) =>
  open(<LessonResultScreen result={page} viewer={viewer} />);

export const LEARN_SCREENS: Screen[] = [
  {
    id: 'learn-home',
    title: 'Learn home',
    area: 'learn',
    route: '/learn',
    sources: [
      'app/learn/page.tsx',
      'app/learn/components/learn-home.tsx',
      'app/learn/components/learn-goal-quick.tsx',
      'app/learn/components/learn-issues.tsx',
      'app/learn/components/practice-lessons.tsx',
      'app/learn/components/own-lesson-card.tsx',
      'app/learn/components/learn-home-live.tsx',
      'app/learn/components/stage-strip.tsx',
      'app/learn/components/learn-tabs.tsx',
      'lib/learn/learn-home.ts',
    ],
    states: [
      {
        id: 'first',
        title: 'No goal yet: what do you want to learn, and how every lesson is made',
        path: '/learn',
        height: 1240,
        render: () => home(myLearnAttempts.none, { profile: emptyProfile }),
      },
      {
        id: 'ready',
        title: 'Goal set: pick an issue for your lesson, practice first if you like',
        path: '/learn',
        height: 1820,
        render: () => home(myLearnAttempts.none),
      },
      {
        id: 'working',
        title: 'Your agent is working: your lesson card, how to give it back, practice while you wait',
        path: '/learn',
        height: 1500,
        render: () => home(myLearnAttempts.working),
      },
      {
        id: 'lesson-ready',
        title: 'Your lesson is ready: take it',
        path: '/learn',
        height: 1440,
        render: () => home(myLearnAttempts.ready),
      },
      {
        id: 'blocked',
        title: 'The lesson’s questions need fixing: send it back from its page',
        path: '/learn',
        height: 760,
        render: () => home(myLearnAttempts.blocked),
      },
      {
        id: 'approve',
        title: 'You passed: approve your pull request',
        path: '/learn',
        height: 700,
        render: () => home(myLearnAttempts.approve),
      },
      {
        id: 'submitting',
        title: 'Opening your pull request',
        path: '/learn',
        height: 680,
        render: () => home(myLearnAttempts.submitting),
      },
      {
        id: 'pr-open',
        title: 'Your pull request is open: what maintainers do next, your next lesson, practice',
        path: '/learn',
        height: 1900,
        render: () => home(myLearnAttempts.prOpen),
      },
      {
        id: 'pr-merged',
        title: 'Your pull request was merged',
        path: '/learn',
        height: 1880,
        render: () => home(myLearnAttempts.merged),
      },
      {
        id: 'no-room',
        title: 'No room for a new lesson: the issues stay, Start gives way to why',
        path: '/learn',
        height: 1820,
        render: () => home(myLearnAttempts.none, { issues: emptyIssues.noRoom }),
      },
      {
        id: 'none-today',
        title: 'No open issues fit the goal today',
        path: '/learn',
        height: 1220,
        render: () => home(myLearnAttempts.none, { issues: emptyIssues.noneToday }),
      },
      {
        id: 'goal-unsupported',
        title: 'A goal Learn can’t find issues for yet: change it',
        path: '/learn',
        height: 760,
        render: () =>
          home(myLearnAttempts.none, {
            profile: { ...filledProfile, goalValue: 'C++' },
            issues: emptyIssues.unsupported,
            practice: practiceLessons({ items: [], total: 0 }),
          }),
      },
      {
        id: 'cap',
        title: 'The day’s new issues are all shown',
        path: '/learn',
        height: 1220,
        render: () => home(myLearnAttempts.none, { issues: emptyIssues.cap }),
      },
      {
        id: 'unread',
        title: 'The issues could not be loaded',
        path: '/learn',
        height: 1200,
        render: () => home(myLearnAttempts.none, { issues: emptyIssues.unread }),
      },
      {
        id: 'setting-up',
        title: 'A new account: its GitRanks account is still being set up',
        path: '/learn',
        height: 560,
        render: () => home(myLearnAttempts.none, { profile: null, settingUp: true }),
      },
      {
        id: 'phone',
        title: 'No goal yet, on a phone: only the step you are at shows',
        path: '/learn',
        width: 390,
        height: 1700,
        render: () => home(myLearnAttempts.none, { profile: emptyProfile }),
      },
      {
        id: 'phone-ready',
        title: 'Goal set, on a phone',
        path: '/learn',
        width: 390,
        height: 3300,
        render: () => home(myLearnAttempts.none),
      },
    ],
  },
  {
    id: 'learn-landing',
    title: 'Learn’s front door',
    area: 'learn',
    route: '/learn',
    sources: [
      'app/learn/page.tsx',
      'app/learn/about/page.tsx',
      'app/learn/components/learn-landing.tsx',
      'app/learn/components/recent-lessons.tsx',
      'app/learn/components/example-question.tsx',
      'app/learn/components/learn-sign-in.tsx',
      'app/learn/components/diagram.tsx',
      'lib/learn/example-lesson.ts',
      'app/contribute/components/landing.tsx',
    ],
    states: [
      {
        id: 'signed-out',
        title: 'The front door, signed out: an example lesson, the handoff, what a lesson covers, recent lessons',
        path: '/learn',
        signedOut: true,
        height: 2480,
        render: () =>
          bare(
            <LearnLanding viewer="visitor" recentLessons={<RecentLessons lessons={recentLessons} />} />,
            <HeaderLine />,
          ),
      },
      {
        id: 'phone',
        title: 'The front door on a phone',
        path: '/learn',
        signedOut: true,
        width: 390,
        height: 4500,
        render: () =>
          bare(
            <LearnLanding viewer="visitor" recentLessons={<RecentLessons lessons={recentLessons} />} />,
            <HeaderLine />,
          ),
      },
    ],
  },
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
    ],
  },
  {
    id: 'learn-profile',
    title: 'Goal and level',
    area: 'learn',
    route: '/my/settings/goal',
    sources: [
      'app/(workspace)/my/settings/goal/page.tsx',
      'app/(workspace)/my/settings/components/settings-pages.tsx',
      'components/learn/learn-profile-form.tsx',
      'app/learn/components/learn-setting-up.tsx',
      'lib/learn/profile-form.ts',
    ],
    states: [
      {
        id: 'empty',
        title: 'First visit: no goal yet, the levels guessed',
        path: '/my/settings/goal',
        height: 1170,
        render: () => bare(<main className={SETTINGS_MAIN}>{<GoalSettingsScreen profile={emptyProfile} />}</main>),
      },
      {
        id: 'filled',
        title: 'A goal saved: Save goes back to Settings',
        path: '/my/settings/goal',
        height: 1240,
        render: () => bare(<main className={SETTINGS_MAIN}>{<GoalSettingsScreen profile={filledProfile} />}</main>),
      },
      {
        id: 'setting-up',
        title: 'A new account: its GitRanks account is still being set up',
        path: '/my/settings/goal',
        height: 600,
        render: () => bare(<main className={SETTINGS_MAIN}>{<GoalSettingsScreen profile={null} settingUp />}</main>),
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
      'lib/learn/progress/progress.ts',
    ],
    states: [
      {
        id: 'lessons',
        title:
          'Lessons passed: own lessons with their pull request’s state, practice lessons, one taken down, Not finished',
        path: '/my/progress',
        height: 1700,
        render: () => frame(<ProgressScreen view="lessons" page={1} counts={progressCounts} list={progress.lessons} />),
      },
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
        id: 'phone-learned',
        title: 'New things learned on a phone: one column of tiles',
        path: '/my/progress?view=learned',
        width: 390,
        height: 3000,
        render: () => frame(<ProgressScreen view="learned" page={1} counts={progressCounts} list={progress.learned} />),
      },
    ],
  },
  {
    id: 'learn-attempt',
    title: 'A lesson: the Lesson view of its pull request',
    area: 'learn',
    route: '/my/pull-requests/[owner]/[repo]/[issue]/lesson',
    sources: [
      'app/learn/components/lesson-view.tsx',
      'components/workspace/pull-request/pull-request-header.tsx',
      'components/workspace/pull-request/stage-line.ts',
      'components/workspace/view-tabs.tsx',
      'lib/learn/learn-view.ts',
      'app/learn/components/practice-lessons.tsx',
      'app/learn/components/lesson-flow.tsx',
      'app/learn/components/lesson-steps.tsx',
      'app/learn/components/question-card.tsx',
      'app/learn/components/lesson-block.tsx',
      'app/learn/components/diagram.tsx',
      'app/learn/components/lesson-summary.tsx',
      'app/learn/components/lesson-share.tsx',
      'lib/learn/diagram-layout.ts',
      'lib/learn/question.ts',
      'lib/learn/lesson-format.ts',
    ],
    states: [
      {
        id: 'wait',
        title: 'The agent is working: the lesson comes next, how to give the issue back, a practice lesson meanwhile',
        path: PATH,
        height: 1340,
        render: () => page(lessons.working, working, undefined, practiceLessons()),
      },
      {
        id: 'warm-up',
        title: 'The fix is ready: three warm-up questions first',
        path: PATH,
        height: 1690,
        render: () => page(lessons.warmup, undefined, { warmupPicks: { w1: ['w1a'], w3: [DONT_KNOW] } }),
      },
      {
        id: 'step',
        title: 'A step and its question, an answer picked',
        path: PATH,
        height: 1240,
        render: () => page(lessons.step, undefined, { picked: ['q2a2'] }),
      },
      {
        id: 'ask-again',
        title: 'A wrong answer: its hint, and the step asks again',
        path: PATH,
        height: 1460,
        render: () =>
          page(lessons.askAgain, undefined, {
            checked: { question: CAUSE_QUESTION, picked: ['q2a1'], correct: false, why: CAUSE_HINT },
          }),
      },
      {
        id: 'right',
        title: 'A right answer: why each option is right or wrong, and Next step',
        path: PATH,
        height: 1480,
        render: () =>
          page(lessons.right, undefined, {
            checked: { question: FIX_QUESTION, picked: ['q3a1', 'q3a3'], correct: true, why: FIX_WHY },
          }),
      },
      {
        id: 'report',
        title: 'Reporting a question: four reasons',
        path: PATH,
        height: 1240,
        render: () => page(lessons.step, undefined, { reportDrawn: true }),
      },
      {
        id: 'summary',
        title: 'Lesson passed: the summary, then the pull request',
        path: PATH,
        height: 2700,
        render: () => page(lessons.ready, learnAttempt({ learnGatePassed: true })),
      },
      {
        id: 'phone',
        title: 'A step on a phone',
        path: PATH,
        width: 390,
        height: 1700,
        render: () => page(lessons.step, undefined, { picked: ['q2a2'] }),
      },
      {
        id: 'blocked',
        title: 'Two steps with every question reported: the questions need fixing',
        path: PATH,
        height: 1000,
        render: () => page(lessons.blocked),
      },
      {
        id: 'pr-open',
        title: 'The pull request is open: share the lesson, or take it down',
        path: PATH,
        height: 1700,
        render: () =>
          page(
            lessons.prOpen,
            learnAttempt({
              state: 'PR_OPEN',
              learnGatePassed: true,
              approvedAt: '2026-10-28T11:25:00.000Z',
              pullRequest: pullRequest({ number: 902, url: 'https://github.com/driftwood-js/driftwood/pull/902' }),
            }),
          ),
      },
      {
        id: 'removed',
        title: 'The author took the lesson down',
        path: PATH,
        height: 1300,
        render: () =>
          page(
            { ...lessons.prOpen, visibility: 'REMOVED' },
            learnAttempt({ state: 'PR_OPEN', pullRequest: pullRequest({ number: 902 }) }),
          ),
      },
      {
        id: 'hand-pr',
        title: 'A pull request opened by hand: no footer, the lesson stays private',
        path: PATH,
        height: 1300,
        render: () =>
          page(lessons.handPr, learnAttempt({ state: 'PR_OPEN', openedBy: 'HAND', pullRequest: pullRequest() })),
      },
      {
        id: 'opening',
        title: 'Opening the pull request: the stepper, the page moves on by itself',
        path: PATH,
        height: 1500,
        render: () =>
          page(
            lessons.ready,
            learnAttempt({
              state: 'SUBMITTING',
              learnGatePassed: true,
              submit: { step: 'PUSH', waitUntil: null, fork: null, branch: null, lastError: null },
            }),
          ),
      },
      {
        id: 'needs-you',
        title: 'A maintainer asked for a change: the prompt for the own agent (the Pull request view)',
        path: `${BASE}?session=next`,
        height: 1400,
        render: () => prView(learnNeedsYou, lessons.prOpen, true),
      },
      {
        id: 'needs-you-phone',
        title: 'The same on a phone · phone',
        path: `${BASE}?session=next`,
        width: 390,
        height: 2000,
        render: () => prView(learnNeedsYou, lessons.prOpen, true),
      },
      {
        id: 'merged',
        title: 'Merged: the code is in, the lesson stays public (the Pull request view)',
        path: BASE,
        height: 1400,
        render: () =>
          prView(
            learnAttempt({
              state: 'MERGED',
              learnGatePassed: true,
              pullRequest: pullRequest({ state: 'MERGED', mergedAt: '2026-10-28T11:55:00.000Z' }),
            }),
            lessons.prOpen,
          ),
      },
      {
        id: 'ended',
        title: 'The attempt ended: why, and Pick another issue',
        path: PATH,
        height: 900,
        render: () =>
          page(
            lessons.ended,
            learnAttempt({ state: 'DISCARDED', endReason: 'USER', endDetail: null, checksPassed: true }),
          ),
      },
    ],
  },
  {
    id: 'lesson-visuals',
    title: 'Lesson · the four new visuals',
    area: 'learn',
    route: '/my/pull-requests/[owner]/[repo]/[issue]/lesson',
    sources: [
      'app/learn/components/lesson-block.tsx',
      'app/learn/components/diagram.tsx',
      'app/learn/components/sequence-diagram.tsx',
      'app/learn/components/compare-block.tsx',
      'app/learn/components/code-excerpt.tsx',
      'app/learn/components/case-table.tsx',
      'lib/learn/diagram-layout.ts',
      'lib/learn/sequence-layout.ts',
      'lib/learn/line-diff.ts',
      'lib/learn/lesson-format.ts',
    ],
    states: [
      {
        id: 'desktop',
        title: 'A step told with a call sequence, a table of cases, an arrow label and two before-and-afters',
        path: PATH,
        height: 2200,
        render: () => page(lessons.visuals, undefined, { picked: ['q2a2'] }),
      },
      {
        id: 'phone',
        title: 'The same step on a phone: the sequence and the table scroll sideways, the before-and-afters stack',
        path: PATH,
        width: 390,
        height: 3600,
        render: () => page(lessons.visuals, undefined, { picked: ['q2a2'] }),
      },
    ],
  },
  {
    id: 'lesson-page',
    title: 'A shared lesson',
    area: 'learn',
    route: '/learn/lessons/[slug]',
    sources: [
      'app/learn/lessons/[slug]/page.tsx',
      'app/learn/components/lesson-page.tsx',
      'app/learn/components/lesson-read.tsx',
      'app/learn/components/shared-lesson.tsx',
      'app/learn/components/lesson-header.tsx',
      'app/learn/components/lesson-stub.tsx',
      'app/learn/lessons/[slug]/not-found.tsx',
      'app/learn/components/lesson-flow.tsx',
      'app/learn/components/lesson-summary.tsx',
      'app/learn/components/practice-context.tsx',
      'app/learn/components/practice-next.tsx',
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
        id: 'guest-phone',
        title: 'Signed out on a phone while Learn is not open to everyone',
        path: LESSON_PATH,
        signedOut: true,
        width: 390,
        height: 6700,
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
      'app/learn/lessons/[slug]/passes/[login]/page.tsx',
      'app/learn/components/lesson-result.tsx',
      'app/learn/components/result-reactions.tsx',
      'app/learn/components/lesson-header.tsx',
      'app/learn/components/question-card.tsx',
      'app/api/learn/lessons/[slug]/passes/[login]/route.ts',
      'lib/learn/lesson-public.ts',
      'lib/learn/lesson-seo.ts',
    ],
    states: [
      {
        id: 'review',
        title: 'From the pull request: the result per step, the lesson with the answers, a reaction',
        path: RESULT_PATH,
        signedOut: true,
        height: 4700,
        render: () => resultPage(),
      },
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
