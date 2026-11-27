import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import {
  BackToProject,
  type BuildTestProject,
  TestDoneEnd,
  TestFrame,
  TestMessage,
  TestQuestion,
  TestResult,
} from '@/components/build/test/test-parts';
import { Header } from '@/components/header/header';
import { PlayerRunEnd } from '@/components/workspace/player/player-strip';
import type { LearnAnswer } from '@/components/workspace/question/use-learn-answer';
import { buildBuilt, buildGoldEarned, buildInProgress, buildTestLeft } from '@/lib/build/__fixtures__/builds';
import { endTestOpen, endTestPassed, failedResult } from '@/lib/build/__fixtures__/test';
import {
  endTestAllRight,
  endTestClosed,
  endTestCode,
  endTestFailedAgain,
  endTestFailedCode,
  goldTestClosed,
  goldTestFailed,
  goldTestPassed,
  testRunLast,
} from '@/lib/build/__fixtures__/test-pages';
import { buildTestPath } from '@/lib/build/paths';
import {
  answerGroupsOf,
  type BuildTestResultShown,
  type BuildTestRunShown,
  type BuildTestShown,
  closedWordsOf,
  scoreTextOf,
  scoreTitleOf,
  testBoxOf,
} from '@/lib/build/test';
import type { BuildMine, BuildTest, BuildTestResult } from '@/lib/build/types';
import { answerAfter } from '@/lib/workspace/__fixtures__/learn-question';
import { canSendOf, type LearnAnswerAction } from '@/lib/workspace/learn-answer';
import type { LearnQuestion } from '@/lib/workspace/learn-question';
import { type PlayerRun, runWordsOf, squaresOf } from '@/lib/workspace/player';

const noop = () => {};

const PROJECT: BuildTestProject = { slug: 'mcp-server', name: 'Build an MCP server' };

/** A fixed day, the day the boards were drawn, so "a week from today" and "tomorrow" never move. */
const NOW = new Date('2026-11-26T12:00:00.000Z');

/** The day the gold test was taken, so its next try reads "tomorrow" as on the board. */
const GOLD_DAY = new Date('2026-12-03T10:00:00.000Z');

/** An answer that stands still in a state, as the engine would have moved it there. */
function answerOf(question: LearnQuestion, actions: LearnAnswerAction[]): LearnAnswer {
  const state = answerAfter(question, actions);
  return {
    state,
    language: 'typescript',
    canSend: canSendOf(question, state),
    pick: noop,
    extra: noop,
    myth: noop,
    move: noop,
    step: noop,
    main: noop,
  };
}

/** The run at a question: the ones before it answered. */
const runAt = (at: number, count = 10): PlayerRun => ({
  at,
  count,
  results: Array.from({ length: at }, () => 'answered' as const),
});

/** A question of the test under the site's header and its strip. */
function Question({
  test,
  at,
  actions = [],
  hints = true,
}: {
  test: BuildTestShown;
  at: number;
  actions?: LearnAnswerAction[];
  hints?: boolean;
}) {
  const run: BuildTestRunShown | null = test.open ?? endTestOpen.open;
  if (!run) throw new Error('A question needs a run');
  const question = run.questions[at];
  const position = runAt(at, run.questions.length);
  return (
    <>
      <Header />
      <TestFrame
        project={PROJECT}
        kind={test.kind}
        layout="question"
        end={<PlayerRunEnd squares={squaresOf(position)} words={runWordsOf('Question', position)} />}
      >
        <TestQuestion
          test={test}
          question={question}
          answer={answerOf(question, actions)}
          count={run.questions.length}
          last={at === run.questions.length - 1}
          highlighted={run.highlighted?.[question.id]}
          hints={hints}
          project={PROJECT}
        />
      </TestFrame>
    </>
  );
}

/** A result as the page draws it, with the person's build as read. */
function Result({
  test,
  result,
  build,
  header = true,
  now = NOW,
}: {
  test: BuildTest;
  result: BuildTestResultShown;
  build: BuildMine | null;
  header?: boolean;
  now?: Date;
}) {
  const groups = answerGroupsOf(result, test.language);
  const body = (
    <TestResult
      title={scoreTitleOf(test, result)}
      passed={result.passed}
      text={scoreTextOf(test, result, PROJECT)}
      box={testBoxOf(test, result, build, now, 'UTC')}
      project={PROJECT}
      goldHref={buildTestPath(PROJECT.slug, 'gold')}
      wrong={groups.wrong}
      right={groups.right}
      onAgain={noop}
    />
  );
  if (!header) return <div className="flex flex-col gap-8 px-5 py-6">{body}</div>;
  return (
    <>
      <Header />
      <TestFrame project={PROJECT} kind={test.kind} layout="page" end={<TestDoneEnd count={result.items.length} />}>
        {body}
      </TestFrame>
    </>
  );
}

/** A page with no question, under its header and strip. */
function Closed({ test, build }: { test: BuildTestShown; build: BuildMine | null }) {
  const words = closedWordsOf(test, build);
  return (
    <>
      <Header />
      <TestFrame project={PROJECT} kind={test.kind} layout="page">
        <TestMessage state="closed" title={words.title} text={words.text}>
          <BackToProject project={PROJECT} main />
        </TestMessage>
      </TestFrame>
    </>
  );
}

/** One case on the board of cases: its name, then the part that differs. */
function Case({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <span className="text-sm font-semibold">{title}</span>
      <div className="overflow-hidden rounded-xl border bg-background">{children}</div>
    </section>
  );
}

const SOURCES = [
  'app/(build-player)/build/[project]/test/page.tsx',
  'app/(build-player)/build/[project]/test/gold/page.tsx',
  'components/build/test/build-test-live.tsx',
  'components/build/test/test-parts.tsx',
  'lib/build/test.ts',
];

const passed = endTestPassed.last as BuildTestResult;

/** The test and the gold test: a question, a question with code, passed, failed, the other cases, the phone. */
export const BUILD_TEST_SCREENS: Screen[] = [
  {
    id: 'build-test',
    title: 'Build · The test, and the gold test',
    area: 'build',
    route: '/build/[project]/test',
    sources: SOURCES,
    states: [
      {
        id: 'question',
        title: 'A question: the rule above the card, no right or wrong, “I don’t know”',
        path: '/build/mcp-server/test',
        height: 800,
        render: () => <Question test={endTestOpen} at={3} />,
      },
      {
        id: 'code',
        title: 'A question with code, a pick that can change until the person goes on',
        path: '/build/mcp-server/test',
        height: 960,
        render: () => <Question test={endTestCode} at={6} actions={[{ type: 'pick', at: 0 }]} />,
      },
      {
        id: 'passed',
        title: 'Passed: 9 of 10, it is Built, the gold test in a week',
        path: '/build/mcp-server/test',
        height: 900,
        render: () => <Result test={endTestPassed} result={passed} build={buildBuilt} />,
      },
      {
        id: 'failed',
        title:
          'Failed: 5 of 10, the wrong ones first with their steps, a code question with its code, the right ones folded',
        path: '/build/mcp-server/test',
        height: 1560,
        render: () => (
          <Result test={endTestFailedCode} result={endTestFailedCode.last ?? failedResult} build={buildTestLeft} />
        ),
      },
      {
        id: 'cases',
        title: 'The other cases: the gold test passed and not passed, the last question, not open yet, all right',
        path: '/build/mcp-server/test/gold',
        height: 3400,
        render: () => (
          <main className="mx-auto flex w-full max-w-[920px] flex-col gap-10 px-4 pt-8 pb-16">
            <Case title="1 · The gold test, passed">
              <Result
                test={goldTestPassed}
                result={goldTestPassed.last as BuildTestResult}
                build={buildGoldEarned}
                header={false}
              />
            </Case>
            <Case title="2 · The gold test, not passed: the next try opens tomorrow">
              <Result
                test={goldTestFailed}
                result={goldTestFailed.last as BuildTestResult}
                build={buildBuilt}
                header={false}
                now={GOLD_DAY}
              />
            </Case>
            <Case title="3 · The last question, with “I don’t know” picked: “Finish the test”">
              <Question test={{ ...endTestOpen, open: testRunLast }} at={9} actions={[{ type: 'extra' }]} />
            </Case>
            <Case title="4 · The gold test opened before its day">
              <Closed test={goldTestClosed} build={buildBuilt} />
            </Case>
            <Case title="5 · The steps are not all done">
              <Closed test={endTestClosed} build={buildInProgress} />
            </Case>
            <Case title="6 · Every answer right: no list to look at again">
              <Result
                test={endTestAllRight}
                result={endTestAllRight.last as BuildTestResult}
                build={buildBuilt}
                header={false}
              />
            </Case>
          </main>
        ),
      },
      {
        id: 'phone-question',
        title: 'Phone: a question',
        path: '/build/mcp-server/test',
        width: 390,
        height: 900,
        render: () => <Question test={endTestOpen} at={3} hints={false} />,
      },
      {
        id: 'phone',
        title: 'Phone: the result',
        path: '/build/mcp-server/test',
        width: 390,
        height: 1700,
        render: () => (
          <Result test={endTestFailedAgain} result={endTestFailedAgain.last ?? failedResult} build={buildTestLeft} />
        ),
      },
    ],
  },
];
