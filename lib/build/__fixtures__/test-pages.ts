import type { BuildTestResultShown, BuildTestRunShown, BuildTestShown } from '../test';
import type { BuildProjectMine, BuildTestItem, BuildTestResult } from '../types';
import { buildBuilt, buildGoldEarned, buildGoldOpen, buildInProgress, buildTestLeft } from './builds';
import { mcpServerStep } from './project';
import { testQuestionsKeyed, testQuestionsKeyless, testRun } from './test';
import { plainCodeOf } from '@/lib/workspace/code-tokens';
import type { LearnQuestion } from '@/lib/workspace/learn-question';

/*
 * The states of the two tests' pages as the approved designs draw them, beside the frame's fixtures: a question with
 * code, the gold test passed, failed and not open yet, a test not open before the last step, every answer right, and
 * none right.
 */

const PREDICT_OPTIONS = [
  {
    text: 'A list with no tools: the server works and offers nothing',
    right: true,
    why: 'An empty list is a fine answer: the agent sees a server with nothing to offer yet.',
  },
  { text: 'An error, because a server must have a tool', right: false, why: 'A server may have no tools at all.' },
  { text: 'The list it got the last time', right: false, why: 'The agent keeps nothing between two asks.' },
];

const PREDICT_BASE = {
  id: 't-empty-list',
  type: 'PREDICT_OUTPUT',
  prompt: 'Your server has this branch. What does an agent get when it asks for the list?',
  example: null,
  visual: null,
  codes: [
    {
      language: 'typescript',
      code: 'if (msg.method === "tools/list") {\n  return reply(msg.id, { tools: [] });\n}',
    },
    { language: 'python', code: 'if msg["method"] == "tools/list":\n    return reply(msg["id"], {"tools": []})' },
  ],
} as const;

/** A question with a few lines of code, without its key, as a run gives it. */
export const predictQuestion: LearnQuestion = {
  ...PREDICT_BASE,
  codes: [...PREDICT_BASE.codes],
  content: { options: PREDICT_OPTIONS.map(({ text }) => ({ text })) },
};

/** The same question with its key, as a result gives it. */
export const predictQuestionKeyed: LearnQuestion = { ...predictQuestion, content: { options: PREDICT_OPTIONS } };

/** A run at question 7, which shows code, highlighted (plain here: the catalogue draws no colours of its own). */
export const testRunCode: BuildTestRunShown = {
  run: 'r-mcp-ts-3',
  questions: testQuestionsKeyless.map((question, index) => (index === 6 ? predictQuestion : question)),
  answered: 6,
  highlighted: { [predictQuestion.id]: predictQuestion.codes.map(plainCodeOf) },
};

/** The run at its last question. */
export const testRunLast: BuildTestRunShown = { ...testRun, run: 'r-mcp-ts-4', answered: 9 };

const rightPick = (question: LearnQuestion) =>
  (question.content as { options: { right: boolean }[] }).options.findIndex((option) => option.right);
const wrongPick = (question: LearnQuestion) =>
  (question.content as { options: { right: boolean }[] }).options.findIndex((option) => !option.right);

const STEPS = [12, 7, 4, 5, 9, 10, 2, 13, 14, 15];

/** A result of ten: each picked right, except those named wrong (a wrong option) or unknown (null), from 1. */
export function testResultOf(run: string, wrong: number[], unknown: number[] = [], need = 7): BuildTestResult {
  const items: BuildTestItem[] = testQuestionsKeyed.map((question, index) => ({
    question,
    pick: unknown.includes(index + 1) ? null : wrong.includes(index + 1) ? wrongPick(question) : rightPick(question),
    step: mcpServerStep(STEPS[index]),
  }));
  const right = items.length - wrong.length - unknown.length;
  return { run, right, passed: right >= need, items };
}

const END = {
  kind: 'end',
  project: { slug: 'mcp-server', name: 'Build an MCP server' },
  language: 'typescript',
  need: 7,
} as const;

const GOLD = { ...END, kind: 'gold', need: 8 } as const;

/** The end test with a run at question 7, which shows code. */
export const endTestCode: BuildTestShown = { ...END, open: testRunCode, last: null, canStart: false, nextTryAt: null };

/** The end test failed, 6 of 10: it can be taken again at once. */
export const endTestFailedAgain: BuildTestShown = {
  ...END,
  open: null,
  last: testResultOf('r-mcp-ts-0', [2, 5, 9], [8]),
  canStart: true,
  nextTryAt: null,
};

/** A failed result, 5 of 10, whose question 7, wrong, asks what code prints: its row draws the code, as its card did. */
const failedCodeResult = ((): BuildTestResultShown => {
  const result = testResultOf('r-mcp-ts-7', [2, 5, 9], [8]);
  const items = result.items.map((item, index) =>
    index === 6 ? { ...item, question: predictQuestionKeyed, pick: wrongPick(predictQuestionKeyed) } : item,
  );
  return {
    ...result,
    right: result.right - 1,
    items,
    highlighted: { [predictQuestion.id]: predictQuestion.codes.map(plainCodeOf) },
  };
})();

/** The end test failed with a code question among the wrong answers: it can be taken again at once. */
export const endTestFailedCode: BuildTestShown = {
  ...END,
  open: null,
  last: failedCodeResult,
  canStart: true,
  nextTryAt: null,
};

/** The end test passed with every answer right: no list of wrong answers. */
export const endTestAllRight: BuildTestShown = {
  ...END,
  open: null,
  last: testResultOf('r-mcp-ts-5', []),
  canStart: false,
  nextTryAt: null,
};

/** The end test with no answer right: the score is never a zero, and there is no row of right answers. */
export const endTestNoneRight: BuildTestShown = {
  ...END,
  open: null,
  last: testResultOf('r-mcp-ts-6', [1, 2, 3, 4, 5, 6, 7, 8, 9], [10]),
  canStart: true,
  nextTryAt: null,
};

/** The end test before the last step: no run, no result, and none can start. */
export const endTestClosed: BuildTestShown = { ...END, open: null, last: null, canStart: false, nextTryAt: null };

/** The gold test passed, 8 of 10. */
export const goldTestPassed: BuildTestShown = {
  ...GOLD,
  open: null,
  last: testResultOf('r-mcp-ts-g1', [2, 5], [], 8),
  canStart: false,
  nextTryAt: null,
};

/** The gold test not passed, 7 of 10: the next try opens the next day. */
export const goldTestFailed: BuildTestShown = {
  ...GOLD,
  open: null,
  last: testResultOf('r-mcp-ts-g0', [2, 5, 9], [], 8),
  canStart: false,
  nextTryAt: '2026-12-04T09:14:00.000Z',
};

/** The gold test opened before its day: no questions. */
export const goldTestClosed: BuildTestShown = {
  ...GOLD,
  open: null,
  last: null,
  canStart: false,
  nextTryAt: '2026-12-03T11:30:00.000Z',
};

const SAY = 'Build an MCP server with GitRanks';
const mineOf = (...builds: BuildProjectMine['builds']): BuildProjectMine => ({
  builds,
  agentConnected: true,
  say: SAY,
});

/** The person's side of the project, a build in each state the tests read. */
export const mineInProgress = mineOf(buildInProgress);
export const mineTestLeft = mineOf(buildTestLeft);
export const mineBuilt = mineOf(buildBuilt);
export const mineGoldOpen = mineOf(buildGoldOpen);
export const mineGoldEarned = mineOf(buildGoldEarned);
