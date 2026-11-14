import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { HeaderLine } from '@/app/contribute/components/contribute-tabs-nav';
import { LearnAttemptScreen } from '@/app/learn/components/learn-attempt';
import { LearnLanding } from '@/app/learn/components/learn-landing';
import { LearnMaintainers } from '@/app/learn/components/learn-maintainers';
import { LearnProfileScreen } from '@/app/learn/components/learn-profile';
import { LearnTabs } from '@/app/learn/components/learn-tabs';
import type { LessonFlowStart } from '@/app/learn/components/lesson-flow';
import { LessonPageScreen } from '@/app/learn/components/lesson-page';
import { LessonResultScreen, type ResultViewer } from '@/app/learn/components/lesson-result';
import { LessonStubScreen } from '@/app/learn/components/lesson-stub';
import { MyLessonsScreen } from '@/app/learn/components/my-lessons';
import { Header } from '@/components/header/header';
import { detail, pullRequest } from '@/lib/contribute/__fixtures__/contribute-attempts';
import { views } from '@/lib/contribute/__fixtures__/contribute-views';
import type { ContributeAttemptDetail } from '@/lib/contribute/contribute.types';
import { CAUSE_HINT, CAUSE_QUESTION, FIX_QUESTION, FIX_WHY, lessons } from '@/lib/learn/__fixtures__/lesson';
import { emptyProfile, filledProfile, myLessons } from '@/lib/learn/__fixtures__/profile';
import { lessonPage, result, sharedRuns } from '@/lib/learn/__fixtures__/shared';
import type { LearnAttemptLesson, LessonResultPage, LessonVisibility } from '@/lib/learn/learn.types';
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

const page = (lesson: LearnAttemptLesson, attempt: ContributeAttemptDetail = learnAttempt(), start?: LessonFlowStart) =>
  frame(<LearnAttemptScreen view={views.active} attempt={attempt} lesson={lesson} start={start} />);

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
    id: 'learn-landing',
    title: 'Learn',
    area: 'learn',
    route: '/learn',
    sources: [
      'app/learn/page.tsx',
      'app/learn/components/learn-landing.tsx',
      'app/learn/components/example-question.tsx',
      'app/learn/components/learn-sign-in.tsx',
      'app/learn/components/diagram.tsx',
      'lib/learn/example-lesson.ts',
      'app/contribute/components/landing.tsx',
    ],
    states: [
      {
        id: 'signed-out',
        title: 'The front door, signed out: an example lesson, the handoff, what a lesson covers',
        path: '/learn',
        signedOut: true,
        height: 2160,
        render: () => bare(<LearnLanding viewer="visitor" />, <HeaderLine />),
      },
      {
        id: 'phone',
        title: 'The front door on a phone',
        path: '/learn',
        signedOut: true,
        width: 390,
        height: 3950,
        render: () => bare(<LearnLanding viewer="visitor" />, <HeaderLine />),
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
        title: 'No lessons yet: the prompt that starts one',
        path: '/learn/lessons',
        height: 550,
        render: () => frame(<MyLessonsScreen lessons={[]} />),
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
        title: 'The agent is working: the lesson comes next',
        path: PATH,
        height: 940,
        render: () => page(lessons.working, working),
      },
      {
        id: 'rewriting',
        title: 'Sent back: the agent writes a new fix or lesson',
        path: PATH,
        height: 940,
        render: () => page(lessons.rewriting, working),
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
        id: 'mid-width',
        title: 'A step at 720px: the stages stack, their lines whole',
        path: PATH,
        width: 720,
        height: 1500,
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
        title: 'The attempt ended',
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
        title: 'Signed in, no run yet: Start the lesson',
        path: LESSON_PATH,
        height: 3900,
        render: () => open(<LessonPageScreen page={lessonPage} viewer={{ kind: 'taker', login: 'mona', run: null }} />),
      },
      {
        id: 'taking',
        title: 'Taking it: a step and its question, an answer picked',
        path: LESSON_PATH,
        height: 1250,
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
        title: 'Passed: the summary and Share my result, no gate',
        path: LESSON_PATH,
        height: 900,
        render: () =>
          open(
            <LessonPageScreen page={lessonPage} viewer={{ kind: 'taker', login: 'mona', run: sharedRuns.passed }} />,
          ),
      },
      {
        id: 'shared',
        title: 'Passed and shared: the link to the result page',
        path: LESSON_PATH,
        height: 940,
        render: () =>
          open(
            <LessonPageScreen
              page={lessonPage}
              viewer={{
                kind: 'taker',
                login: 'mona',
                run: { ...sharedRuns.passed, resultPublic: true, worthIt: true },
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
