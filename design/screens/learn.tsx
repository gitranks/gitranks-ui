import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { HeaderLine } from '@/app/contribute/components/contribute-tabs-nav';
import { LearnAttemptScreen } from '@/app/learn/components/learn-attempt';
import { LearnHomeScreen } from '@/app/learn/components/learn-home';
import { LearnLanding } from '@/app/learn/components/learn-landing';
import { LearnMaintainers } from '@/app/learn/components/learn-maintainers';
import { LearnProfileScreen } from '@/app/learn/components/learn-profile';
import { LearnTabs } from '@/app/learn/components/learn-tabs';
import type { LessonFlowStart } from '@/app/learn/components/lesson-flow';
import { LessonPageScreen } from '@/app/learn/components/lesson-page';
import { LessonResultScreen, type ResultViewer } from '@/app/learn/components/lesson-result';
import { LessonStubScreen } from '@/app/learn/components/lesson-stub';
import { MyLessonsScreen } from '@/app/learn/components/my-lessons';
import { RecentLessons } from '@/app/learn/components/recent-lessons';
import { Header } from '@/components/header/header';
import { detail, pullRequest } from '@/lib/contribute/__fixtures__/contribute-attempts';
import { views } from '@/lib/contribute/__fixtures__/contribute-views';
import type { ContributeAttemptDetail } from '@/lib/contribute/contribute.types';
import {
  emptyIssues,
  learnIssues,
  myLearnAttempts,
  practiceLessons,
  practiceNext,
} from '@/lib/learn/__fixtures__/home';
import { CAUSE_HINT, CAUSE_QUESTION, FIX_QUESTION, FIX_WHY, lessons } from '@/lib/learn/__fixtures__/lesson';
import { emptyProfile, filledProfile, myLessons } from '@/lib/learn/__fixtures__/profile';
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
import { DONT_KNOW } from '@/lib/learn/question';

/** A page's own container, as its `page.tsx` draws it. */
const MAIN = 'mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16';

/** The page as the Learn layout frames it: the site header, then Learn's tabs. */
const frame = (children: ReactNode) => (
  <>
    <Header section="learn" />
    <LearnTabs />
    <main className={MAIN}>{children}</main>
  </>
);

/** A page that draws its own `main` (the front door, the page for maintainers), under the header and `line`. */
const bare = (children: ReactNode, line: ReactNode = <LearnTabs />) => (
  <>
    <Header section="learn" />
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
      attempts={attempts}
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

const page = (
  lesson: LearnAttemptLesson,
  attempt: ContributeAttemptDetail = learnAttempt(),
  start?: LessonFlowStart,
  practice?: PracticeLessons,
) =>
  frame(<LearnAttemptScreen view={views.active} attempt={attempt} lesson={lesson} start={start} practice={practice} />);

/** A shared lesson taken as practice by mona, whose goal is TypeScript too. */
const MONA_GOAL = { kind: 'language', value: 'TypeScript', level: 'Some' };

const PATH = '/learn/attempts/A_1';

/** A shared lesson's page and its result pages: open to everyone, so under the header's line, without Learn's tabs. */
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
        id: 'pr-closed',
        title: 'Your pull request was closed: the lesson stays yours',
        path: '/learn',
        height: 1880,
        render: () => home(myLearnAttempts.closed),
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
      {
        id: 'about',
        title: 'How Learn works, signed in (/learn/about): Start learning leads to Learn home',
        path: '/learn/about',
        height: 2480,
        render: () =>
          bare(<LearnLanding viewer="signed-in" recentLessons={<RecentLessons lessons={recentLessons} />} />),
      },
    ],
  },
  {
    id: 'learn-maintainers',
    title: 'Learn for maintainers',
    area: 'learn',
    route: '/learn/maintainers',
    sources: ['app/learn/maintainers/page.tsx', 'app/learn/components/learn-maintainers.tsx'],
    states: [
      {
        id: 'default',
        title: 'What a Learn pull request is, learn: welcome, set rules or report it',
        path: '/learn/maintainers',
        signedOut: true,
        height: 1030,
        render: () => bare(<LearnMaintainers />),
      },
    ],
  },
  {
    id: 'learn-profile',
    title: 'Goal and level',
    area: 'learn',
    route: '/learn/profile',
    sources: [
      'app/learn/profile/page.tsx',
      'app/learn/components/learn-profile.tsx',
      'app/learn/components/learn-profile-form.tsx',
      'app/learn/components/learn-setting-up.tsx',
      'lib/learn/profile-form.ts',
    ],
    states: [
      {
        id: 'empty',
        title: 'First visit: no goal yet, the levels guessed, the agent not set up',
        path: '/learn/profile',
        height: 1170,
        render: () => frame(<LearnProfileScreen profile={emptyProfile} ownAgent={views.onboardedNoPath.ownAgent} />),
      },
      {
        id: 'filled',
        title: 'Saved: learn TypeScript, a level set, two focus picks, the agent connected',
        path: '/learn/profile',
        height: 1220,
        render: () => frame(<LearnProfileScreen profile={filledProfile} ownAgent={views.agentOnboarded.ownAgent} />),
      },
      {
        id: 'saved',
        title: 'Saved: Saved by the button, and the next step under the form, the issues for the goal',
        path: '/learn/profile',
        height: 1340,
        render: () =>
          frame(
            <LearnProfileScreen
              profile={filledProfile}
              ownAgent={views.agentOnboarded.ownAgent}
              saved={{ next: practiceNext.own }}
            />,
          ),
      },
      {
        id: 'saved-lesson',
        title: 'Saved with a lesson in progress: back to it',
        path: '/learn/profile',
        height: 1340,
        render: () =>
          frame(
            <LearnProfileScreen
              profile={filledProfile}
              ownAgent={views.agentOnboarded.ownAgent}
              saved={{ next: practiceNext.back }}
            />,
          ),
      },
      {
        id: 'saved-unsupported',
        title: 'Saved a goal Learn can’t find issues for: back to Learn home',
        path: '/learn/profile',
        height: 1340,
        render: () =>
          frame(
            <LearnProfileScreen
              profile={{ ...filledProfile, goalValue: 'C++' }}
              ownAgent={views.agentOnboarded.ownAgent}
              saved={{ next: practiceNext.unsupported }}
            />,
          ),
      },
      {
        id: 'setting-up',
        title: 'A new account: its GitRanks account is still being set up',
        path: '/learn/profile',
        height: 900,
        render: () => frame(<LearnProfileScreen profile={null} ownAgent={undefined} settingUp />),
      },
    ],
  },
  {
    id: 'my-lessons',
    title: 'My lessons',
    area: 'learn',
    route: '/learn/lessons',
    sources: [
      'app/learn/lessons/page.tsx',
      'app/learn/components/my-lessons.tsx',
      'lib/learn/my-lessons.ts',
      'app/contribute/components/contributions-view.tsx',
    ],
    states: [
      {
        id: 'empty',
        title: 'No lessons yet: pick an issue on Learn home, or a practice lesson first',
        path: '/learn/lessons',
        height: 480,
        render: () => frame(<MyLessonsScreen lessons={[]} hasGoal />),
      },
      {
        id: 'just-claimed',
        title: 'A claimed issue with no lesson yet: in progress, named owner/repo#n until its title is stored',
        path: '/learn/lessons',
        height: 820,
        render: () =>
          frame(
            <MyLessonsScreen
              lessons={[
                {
                  slug: null,
                  attemptId: 'A_4',
                  title: 'tidewave/tide#958',
                  repo: 'tidewave/tide',
                  state: 'IN_PROGRESS',
                  passedAt: null,
                },
                ...myLessons.slice(1),
              ]}
            />,
          ),
      },
      {
        id: 'filled',
        title: 'In progress, then done: own attempts and a shared lesson passed',
        path: '/learn/lessons',
        height: 820,
        render: () => frame(<MyLessonsScreen lessons={myLessons} />),
      },
    ],
  },
  {
    id: 'learn-attempt',
    title: 'A lesson',
    area: 'learn',
    route: '/learn/attempts/[id]',
    sources: [
      'app/learn/components/learn-attempt.tsx',
      'app/learn/components/attempt-stage-watch.tsx',
      'app/learn/components/practice-lessons.tsx',
      'app/learn/components/lesson-flow.tsx',
      'app/learn/components/stage-strip.tsx',
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
        id: 'rewriting',
        title: 'Sent back: the agent writes a new fix or lesson',
        path: PATH,
        height: 1340,
        render: () => page(lessons.rewriting, working, undefined, practiceLessons()),
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
      {
        id: 'ended-claim-lost',
        title: 'Ended before the agent could start: the issue changed',
        path: PATH,
        height: 900,
        render: () =>
          page(lessons.ended, learnAttempt({ state: 'STOPPED', endReason: 'CLAIM_LOST', endDetail: 'claim_lost' })),
      },
      {
        id: 'ended-released',
        title: 'Ended: the agent gave the issue back',
        path: PATH,
        height: 900,
        render: () =>
          page(lessons.ended, learnAttempt({ state: 'STOPPED', endReason: 'RELEASED', endDetail: 'released' })),
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
        title: 'Signed out: every step to read, sign in to answer',
        path: LESSON_PATH,
        signedOut: true,
        height: 4300,
        render: () => open(<LessonPageScreen page={lessonPage} viewer={{ kind: 'visitor' }} />),
      },
      {
        id: 'phone',
        title: 'Signed out on a phone',
        path: LESSON_PATH,
        signedOut: true,
        width: 390,
        height: 6900,
        render: () => open(<LessonPageScreen page={lessonPage} viewer={{ kind: 'visitor' }} />),
      },
      {
        id: 'reader',
        title: 'Signed in, answering not open to the account yet: read only',
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
        id: 'passed',
        title: 'A practice lesson passed: the summary, Share my result, then Now your own lesson with two issues',
        path: LESSON_PATH,
        height: 1560,
        render: () =>
          open(
            <LessonPageScreen
              page={lessonPage}
              viewer={{ kind: 'taker', login: 'mona', run: sharedRuns.passed, goal: MONA_GOAL, next: practiceNext.own }}
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
        id: 'no-reactions',
        title: 'No reaction yet',
        path: RESULT_PATH,
        signedOut: true,
        height: 4700,
        render: () => resultPage(result({ reactions: [] })),
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
        id: 'reacted',
        title: 'Back from the sign-in: the reaction stored, with the name',
        path: RESULT_PATH,
        height: 4700,
        render: () =>
          resultPage(
            result({
              reactions: [
                { login: 'mona', role: 'maintainer', reaction: 'YES' },
                { login: 'hubot', role: 'collaborator', reaction: 'YES' },
              ],
            }),
            { canReact: true, mine: 'YES', returned: null },
          ),
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
