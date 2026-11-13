import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { LearnAttemptScreen } from '@/app/learn/components/learn-attempt';
import { LearnTabs } from '@/app/learn/components/learn-tabs';
import type { LessonFlowStart } from '@/app/learn/components/lesson-flow';
import { Header } from '@/components/header/header';
import { detail, pullRequest } from '@/lib/contribute/__fixtures__/contribute-attempts';
import { views } from '@/lib/contribute/__fixtures__/contribute-views';
import type { ContributeAttemptDetail } from '@/lib/contribute/contribute.types';
import { CAUSE_HINT, CAUSE_QUESTION, FIX_QUESTION, FIX_WHY, lessons } from '@/lib/learn/__fixtures__/lesson';
import type { LearnAttemptLesson } from '@/lib/learn/learn.types';
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

export const LEARN_SCREENS: Screen[] = [
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
];
