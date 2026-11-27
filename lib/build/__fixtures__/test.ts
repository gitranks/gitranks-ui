import type { BuildStepRef, BuildTest, BuildTestItem, BuildTestResult, BuildTestRun } from '../types';
import { mcpServerStep } from './project';
import type { LearnQuestion } from '@/lib/workspace/learn-question';

/*
 * The end test of the first project as the approved designs show it: ten questions from its steps, a run in progress,
 * a passed result (9 of 10) and a failed one (6 of 10, one "I don't know").
 */

type Option = { text: string; right: boolean; why: string };
type Keyed = { id: string; step: number; prompt: string; options: Option[] };

const KEYED: Keyed[] = [
  {
    id: 't-stderr',
    step: 12,
    prompt: 'Your server prints a log line with console.log. What goes wrong?',
    options: [
      { text: 'Nothing, logs are fine anywhere', right: false, why: 'stdout is where the messages go.' },
      {
        text: 'The agent reads the log line as a message and fails',
        right: true,
        why: 'The agent reads every line on stdout as a message. Logs belong on stderr.',
      },
      { text: 'The log line is lost', right: false, why: 'It is not lost: the agent reads it, which is worse.' },
      { text: 'The server stops', right: false, why: 'The server goes on; the agent is the one that breaks.' },
    ],
  },
  {
    id: 't-description',
    step: 7,
    prompt: 'What does your agent read to decide when to use a tool?',
    options: [
      { text: 'Only the name of the tool', right: false, why: 'A name alone rarely says when to use it.' },
      {
        text: 'The description in the list',
        right: true,
        why: 'The description is written for the agent; it says what the tool is for.',
      },
      { text: 'The code of the tool', right: false, why: 'The agent never sees your code.' },
    ],
  },
  {
    id: 't-hello',
    step: 4,
    prompt: 'What must the answer to the hello message carry?',
    options: [
      {
        text: 'The version of the protocol, what the server can do and its name',
        right: true,
        why: 'The agent needs all three before it asks for anything else.',
      },
      { text: 'Only the name of the server', right: false, why: 'Without the version the agent can not go on.' },
      { text: 'The list of tools', right: false, why: 'The list comes later, when the agent asks for it.' },
    ],
  },
  {
    id: 't-unknown',
    step: 5,
    prompt: 'The agent sends a message your server does not know. What should it answer?',
    options: [
      { text: 'Nothing', right: false, why: 'The agent would wait for an answer that never comes.' },
      {
        text: 'An error that says the method is not found',
        right: true,
        why: 'A clear error lets the agent go on without that feature.',
      },
      { text: 'An empty result', right: false, why: 'An empty result says it worked, which is not true.' },
    ],
  },
  {
    id: 't-input',
    step: 9,
    prompt: 'roll_dice gets "sides": "six". What should the server do?',
    options: [
      { text: 'Roll a six-sided dice anyway', right: false, why: 'Guessing hides the mistake from the agent.' },
      {
        text: 'Answer with an error that names the bad field',
        right: true,
        why: 'The agent reads the error and sends the call again with a number.',
      },
      { text: 'Stop the server', right: false, why: 'One bad call should not end the server for every other call.' },
    ],
  },
  {
    id: 't-fails-well',
    step: 10,
    prompt: 'A tool fails while it runs. How does a server tell the agent?',
    options: [
      {
        text: 'A result marked as an error, with a line that says why',
        right: true,
        why: 'The agent sees the tool ran and failed, and can tell the person why.',
      },
      { text: 'A protocol error', right: false, why: 'A protocol error says the message was wrong, not the tool.' },
      { text: 'It says nothing', right: false, why: 'The agent would wait and then give up.' },
    ],
  },
  {
    id: 't-one-message',
    step: 2,
    prompt: 'How does your server know where one message ends?',
    options: [
      {
        text: 'Each message is one line',
        right: true,
        why: 'Messages are JSON on one line, so a line break ends one.',
      },
      { text: 'It waits a second', right: false, why: 'Time says nothing about where a message ends.' },
      { text: 'Each message starts with its length', right: false, why: 'That is another protocol, not this one.' },
    ],
  },
  {
    id: 't-list-changed',
    step: 13,
    prompt: 'You add a tool while the agent is connected. What lets the agent see it?',
    options: [
      { text: 'Nothing, it asks again on its own', right: false, why: 'The agent keeps the list it has.' },
      {
        text: 'A note that the list changed',
        right: true,
        why: 'The note makes the agent ask for the list again.',
      },
      { text: 'Starting the agent again', right: false, why: 'That works, but the note does it without a restart.' },
    ],
  },
  {
    id: 't-stop',
    step: 14,
    prompt: 'When should your server stop?',
    options: [
      { text: 'When its input ends', right: true, why: 'The agent closes the input when it is done with the server.' },
      { text: 'After each answer', right: false, why: 'The agent sends many messages to one running server.' },
      { text: 'Never', right: false, why: 'A server left running after its agent is gone wastes the machine.' },
    ],
  },
  {
    id: 't-test',
    step: 15,
    prompt: 'What does a test for a message check?',
    options: [
      {
        text: 'The answer to one message sent in',
        right: true,
        why: 'Each test sends one message and reads the one answer.',
      },
      { text: 'That the code has no typos', right: false, why: 'A compiler or a linter checks that.' },
      { text: 'How fast the server is', right: false, why: 'Speed is not what these tests are about.' },
    ],
  },
];

const questionOf = (keyed: Keyed, withKey: boolean): LearnQuestion => ({
  id: keyed.id,
  type: 'PICK_ONE',
  prompt: keyed.prompt,
  example: null,
  visual: null,
  codes: [],
  content: {
    options: keyed.options.map((option) => (withKey ? option : { text: option.text })),
  },
});

/** The ten questions without their keys, as a run gives them. */
export const testQuestionsKeyless: LearnQuestion[] = KEYED.map((keyed) => questionOf(keyed, false));

/** The ten questions with their keys and reasons, as a result gives them. */
export const testQuestionsKeyed: LearnQuestion[] = KEYED.map((keyed) => questionOf(keyed, true));

const rightPick = (keyed: Keyed) => keyed.options.findIndex((option) => option.right);
const wrongPick = (keyed: Keyed) => keyed.options.findIndex((option) => !option.right);
const stepOf = (keyed: Keyed): BuildStepRef => mcpServerStep(keyed.step);

/** A result: each question picked right, except those named wrong (a wrong option) or unknown (null). */
const resultOf = (run: string, wrong: number[], unknown: number[] = []): BuildTestResult => {
  const items: BuildTestItem[] = KEYED.map((keyed, index) => ({
    question: testQuestionsKeyed[index],
    pick: unknown.includes(index + 1) ? null : wrong.includes(index + 1) ? wrongPick(keyed) : rightPick(keyed),
    step: stepOf(keyed),
  }));
  const right = KEYED.length - wrong.length - unknown.length;
  return { run, right, passed: right >= 7, items };
};

/** A run in progress, three questions answered. */
export const testRun: BuildTestRun = { run: 'r-mcp-ts-1', questions: testQuestionsKeyless, answered: 3 };

/** A run not answered yet. */
export const testRunFresh: BuildTestRun = { ...testRun, run: 'r-mcp-ts-2', answered: 0 };

/** Passed: 9 of 10, only question 2 wrong. */
export const passedResult: BuildTestResult = resultOf('r-mcp-ts-1', [2]);

/** Failed: 6 of 10, questions 2, 5 and 9 wrong and question 8 "I don't know". */
export const failedResult: BuildTestResult = resultOf('r-mcp-ts-0', [2, 5, 9], [8]);

const TEST_BASE = {
  kind: 'end',
  project: { slug: 'mcp-server', name: 'Build an MCP server' },
  language: 'typescript',
  need: 7,
} as const;

/** The end test before a first try. */
export const endTestReady: BuildTest = { ...TEST_BASE, open: null, last: null, canStart: true, nextTryAt: null };

/** The end test with a run in progress. */
export const endTestOpen: BuildTest = { ...TEST_BASE, open: testRun, last: null, canStart: false, nextTryAt: null };

/** The end test after a failed try: the end test has no wait, so it can be started again at once. */
export const endTestFailed: BuildTest = {
  ...TEST_BASE,
  open: null,
  last: failedResult,
  canStart: true,
  nextTryAt: null,
};

/** The end test passed. */
export const endTestPassed: BuildTest = {
  ...TEST_BASE,
  open: null,
  last: passedResult,
  canStart: false,
  nextTryAt: null,
};

/** The gold test, open, before a try: 8 right answers pass. */
export const goldTestReady: BuildTest = {
  ...TEST_BASE,
  kind: 'gold',
  need: 8,
  open: null,
  last: null,
  canStart: true,
  nextTryAt: null,
};
