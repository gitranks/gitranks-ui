import type { Route } from 'next';
import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { GoalSettingsScreen } from '@/app/(workspace)/my/settings/components/settings-pages';
import { LessonViewScreen } from '@/app/learn/components/lesson-view';
import { Header } from '@/components/header/header';
import type { LessonFlowStart } from '@/components/learn/lesson-flow';
import { ContributionShell, ReviewScreen } from '@/components/workspace/pull-request/review-view';
import { WorkspaceTabsNav } from '@/components/workspace/workspace-tabs-nav';
import {
  detail,
  feedbackThread,
  followUpAttempts,
  pullRequest,
} from '@/lib/contribute/__fixtures__/contribute-attempts';
import { NOW, views } from '@/lib/contribute/__fixtures__/contribute-views';
import { practiceLessons } from '@/lib/learn/__fixtures__/home';
import { CAUSE_HINT, CAUSE_QUESTION, FIX_QUESTION, FIX_WHY, lessons } from '@/lib/learn/__fixtures__/lesson';
import { filledProfile } from '@/lib/learn/__fixtures__/profile';
import type { LearnAttemptLesson, PracticeLessons } from '@/lib/learn/learn.types';
import type { ContributeAttemptDetail } from '@/lib/workspace/contribute.types';
import { contributionMovesOf } from '@/lib/workspace/contribution-moves';

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

const PATH = `${BASE}/lesson`;
/** The pull request page's Lesson view and Settings' goal page: a Learn pull request's parts of the workspace. */
export const WORKSPACE_LESSON_SCREENS: Screen[] = [
  {
    id: 'settings-goal',
    title: 'Goal and level',
    area: 'workspace',
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
        id: 'filled',
        title: 'A goal saved: Save goes back to Settings',
        path: '/my/settings/goal',
        height: 1240,
        render: () => bare(<main className={SETTINGS_MAIN}>{<GoalSettingsScreen profile={filledProfile} />}</main>),
      },
    ],
  },
  {
    id: 'pull-request-lesson',
    title: 'A lesson: the Lesson view of its pull request',
    area: 'workspace',
    route: '/my/pull-requests/[owner]/[repo]/[issue]/lesson',
    sources: [
      'app/learn/components/lesson-view.tsx',
      'components/workspace/pull-request/pull-request-header.tsx',
      'components/workspace/pull-request/stage-line.ts',
      'components/workspace/view-tabs.tsx',
      'lib/learn/learn-view.ts',
      'app/learn/components/practice-lessons.tsx',
      'components/learn/lesson-flow.tsx',
      'components/learn/lesson-steps.tsx',
      'components/learn/question-card.tsx',
      'components/workspace/blocks/lesson-block.tsx',
      'components/workspace/blocks/diagram.tsx',
      'components/learn/lesson-summary.tsx',
      'app/learn/components/lesson-share.tsx',
      'lib/workspace/blocks/diagram-layout.ts',
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
    area: 'workspace',
    route: '/my/pull-requests/[owner]/[repo]/[issue]/lesson',
    sources: [
      'components/workspace/blocks/lesson-block.tsx',
      'components/workspace/blocks/diagram.tsx',
      'components/workspace/blocks/sequence-diagram.tsx',
      'components/workspace/blocks/compare-block.tsx',
      'components/workspace/blocks/code-excerpt.tsx',
      'components/workspace/blocks/case-table.tsx',
      'lib/workspace/blocks/diagram-layout.ts',
      'lib/workspace/blocks/sequence-layout.ts',
      'lib/workspace/blocks/line-diff.ts',
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
];
