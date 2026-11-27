import { describe, expect, it } from 'vitest';

import {
  buildBuilt,
  buildInPart,
  buildInProgress,
  buildPythonSecond,
  buildTestLeft,
  projectMineNone,
  projectMineOne,
  projectMineTwo,
  stepMineCurrent,
  stepMineTwo,
} from './__fixtures__/builds';
import { mcpServerProject, mcpServerStep } from './__fixtures__/project';
import { listTheToolsStep } from './__fixtures__/step';
import { bigStep, partStep, smallStep } from './__fixtures__/step-cases';
import {
  agentRowOf,
  buildFileUrlOf,
  buildSayOf,
  buildTreeUrlOf,
  filesWordsOf,
  isFirstStep,
  minutesWordsOf,
  needLinesOf,
  openFilesOf,
  paragraphsOf,
  personalLanguageOf,
  placeWordsOf,
  playgroundWordsOf,
  playItemOf,
  type StepPersonal,
  standingLineOf,
  standingOf,
  startLanguageOf,
  stepDescriptionOf,
  stepFilesOf,
  stepSideOf,
  stripSquaresOf,
  stripStepsOf,
} from './step-page';
import type { BuildStepPage } from './types';
import { shownLanguageOf } from './use-build-language';

const step9 = { ...listTheToolsStep, step: mcpServerStep(9) };
const two: StepPersonal = { step: stepMineTwo, project: projectMineTwo };
const current: StepPersonal = { step: stepMineCurrent, project: projectMineOne };

describe("a step's files", () => {
  it('reads each changed file of a language, with its counts, and falls back to the first language', () => {
    const files = stepFilesOf(stepSideOf(bigStep, 'typescript'));
    expect(files.map((file) => [file.path, file.status, file.added, file.removed])).toEqual([
      ['tools/roll-dice.ts', 'added', 14, 0],
      ['tools/flip-coin.ts', 'added', 10, 0],
      ['server.ts', 'changed', 11, 15],
      ['tools/tool.ts', 'added', 6, 0],
      ['server.test.ts', 'changed', 11, 0],
    ]);
    expect(stepSideOf(bigStep, null)?.language).toBe('typescript');
    expect(stepFilesOf(null)).toEqual([]);
    expect(filesWordsOf(1)).toBe('1 file');
    expect(filesWordsOf(5)).toBe('5 files');
  });

  it('opens the first three files of a big step and folds the rest; one file always opens', () => {
    expect(openFilesOf(stepFilesOf(stepSideOf(bigStep, 'typescript')))).toEqual([true, true, true, false, false]);
    expect(openFilesOf(stepFilesOf(stepSideOf(smallStep, 'typescript')))).toEqual([true]);
  });

  it('links a file and the whole project at the step’s commit in the public repository', () => {
    expect(buildFileUrlOf('abc', 'tools/roll dice.ts')).toBe(
      'https://github.com/gitranks/build/blob/abc/tools/roll%20dice.ts',
    );
    expect(buildTreeUrlOf('abc')).toBe('https://github.com/gitranks/build/tree/abc');
  });
});

describe("the strip's squares", () => {
  it('draws one square for each base step, this page ringed, nothing of the person’s for a visitor', () => {
    const squares = stripSquaresOf(stripStepsOf(listTheToolsStep, mcpServerProject), listTheToolsStep, null);
    expect(squares).toHaveLength(16);
    expect(squares.filter((square) => square.here).map((square) => square.step.number)).toEqual([7]);
    expect(squares.every((square) => square.kind === 'plain')).toBe(true);
  });

  it('fills the steps passed and outlines where the build stands', () => {
    const squares = stripSquaresOf(mcpServerProject.base, listTheToolsStep, buildInProgress);
    expect(squares.map((square) => square.kind[0]).join('')).toBe('ddddddddcppppppp');
  });

  it('draws the part’s steps for a step of a part, the build’s step in the part outlined', () => {
    const steps = stripStepsOf(partStep, mcpServerProject);
    expect(steps.map((step) => step.number)).toEqual([1, 2, 3, 4, 5, 6]);
    const squares = stripSquaresOf(steps, partStep, buildInPart);
    expect(squares.map((square) => square.kind[0]).join('')).toBe('ppcppp');
    expect(squares[2].here).toBe(true);
  });

  it('draws no square when the project could not be read', () => {
    expect(stripStepsOf(listTheToolsStep, null)).toEqual([]);
  });

  it('says the step’s place', () => {
    expect(placeWordsOf(listTheToolsStep)).toBe('Step 7 of 16');
    expect(placeWordsOf(partStep)).toBe('Step 3 of 6');
  });
});

describe('the row under the title', () => {
  it('is a visitor’s with no person, and for a person with no build of the project', () => {
    expect(agentRowOf(null, 'typescript')).toEqual({ kind: 'visitor' });
    expect(agentRowOf({ step: { builds: [] }, project: projectMineNone }, 'typescript')).toEqual({ kind: 'visitor' });
  });

  it('follows the person’s one build whatever language the code is shown in', () => {
    expect(agentRowOf(current, 'python')).toEqual({ kind: 'current', language: 'typescript' });
    expect(personalLanguageOf(current, 'python')).toBe('typescript');
    expect(personalLanguageOf(two, 'python')).toBe('python');
    expect(personalLanguageOf(two, null)).toBe('typescript');
    expect(personalLanguageOf(null, 'python')).toBeNull();
  });

  it('says the build is on this step, or past it with where it stands, or that the step comes later', () => {
    expect(agentRowOf(current, 'typescript')).toEqual({ kind: 'current', language: 'typescript' });
    expect(agentRowOf(two, 'typescript')).toEqual({
      kind: 'done',
      language: 'typescript',
      standing: { kind: 'step', step: mcpServerStep(9), part: false },
    });
    expect(agentRowOf(two, 'python')).toEqual({
      kind: 'to_come',
      language: 'python',
      standing: { kind: 'step', step: mcpServerStep(4), part: false },
    });
  });

  it('knows where a build stands: a step, a part’s step, the test, built', () => {
    expect(standingOf(buildTestLeft)).toEqual({ kind: 'test' });
    expect(standingOf(buildBuilt)).toEqual({ kind: 'built' });
    expect(standingOf(buildInPart)).toMatchObject({ kind: 'step', part: true, step: { number: 3 } });
    expect(standingOf(null)).toEqual({ kind: 'unknown' });
  });

  it('says where to go on from there', () => {
    const links = {
      step: (slug: string) => `/build/mcp-server/${slug}` as never,
      test: '/t' as never,
      mine: '/m' as never,
    };
    expect(standingLineOf(standingOf(buildInProgress), links)).toEqual({
      text: 'Your build is now on step 9, Check the input.',
      link: { label: 'Go to step 9', href: '/build/mcp-server/check-the-input' },
    });
    expect(standingLineOf(standingOf(buildInPart), links).text).toBe(
      'Your build is now on step 3 of the part, Describe a tool with a schema.',
    );
    expect(standingLineOf({ kind: 'test' }, links).link).toEqual({ label: 'Take the test', href: '/t' });
    expect(standingLineOf({ kind: 'built' }, links).text).toBe('You built this project.');
    expect(standingLineOf({ kind: 'unknown' }, links).link?.href).toBe('/m');
  });

  it('starts the language switch at the build touched last', () => {
    expect(startLanguageOf(two)).toBe('typescript');
    expect(startLanguageOf({ step: { builds: [{ language: 'python', status: 'current' }] }, project: null })).toBe(
      'python',
    );
    expect(startLanguageOf(null)).toBeNull();
    expect(projectMineTwo.builds[1]).toBe(buildPythonSecond);
  });
});

describe('the language a page shows', () => {
  it('is the one picked last, else the build’s, else the first the step has', () => {
    expect(shownLanguageOf(['typescript', 'python'], 'python', 'typescript')).toBe('python');
    expect(shownLanguageOf(['typescript', 'python'], null, 'python')).toBe('python');
    expect(shownLanguageOf(['typescript'], 'python', 'python')).toBe('typescript');
    expect(shownLanguageOf([], null, null)).toBeNull();
  });
});

describe("a step's words", () => {
  it('says the sentence to start a project', () => {
    expect(buildSayOf(mcpServerProject.thing)).toBe('Teach me how to build an MCP server with GitRanks');
  });

  it('says how long the base takes', () => {
    expect(minutesWordsOf(90)).toBe('About an hour and a half');
    expect(minutesWordsOf(60)).toBe('About an hour');
    expect(minutesWordsOf(40)).toBe('About 40 minutes');
    expect(minutesWordsOf(150)).toBe('About 2 and a half hours');
    expect(minutesWordsOf(0)).toBeNull();
  });

  it('lists what a project needs: the runtimes in one line, then the rest with why', () => {
    expect(needLinesOf(mcpServerProject.needsFull)).toEqual([
      { name: 'Node 22 or newer, or Python 3.12 or newer', why: 'Your agent checks this before the first step.' },
      { name: 'An agent with a shell', why: 'Claude Code, Codex, Cursor, Gemini CLI or VS Code.' },
      { name: 'git', why: 'Wanted, not required. With it each step is one download and one commit of your own.' },
    ]);
    expect(needLinesOf([])).toEqual([]);
  });

  it('splits a text into paragraphs, and a thing to try into its words and the line to type', () => {
    expect(paragraphsOf('One.\n\nTwo\nlines.\r\n\r\n')).toEqual(['One.', 'Two\nlines.']);
    expect(paragraphsOf('')).toEqual([]);
    expect(playItemOf('Use the new tool.\nFlip a coin with my-server')).toEqual({
      text: 'Use the new tool.',
      type: 'Flip a coin with my-server',
    });
    expect(playItemOf('Close your agent.')).toEqual({ text: 'Close your agent.', type: null });
  });

  it('says where the project is played with', () => {
    expect(playgroundWordsOf(mcpServerProject.playground)).toBe(
      'The playground of this project is your own agent, with your server connected to it.',
    );
    expect(playgroundWordsOf('MCP Inspector')).toBe('The playground of this project is MCP Inspector.');
    expect(playgroundWordsOf('')).toBeNull();
  });

  it('knows the first step of the base, and describes a step from its first paragraph', () => {
    const first: BuildStepPage = { ...listTheToolsStep, step: mcpServerStep(1) };
    expect(isFirstStep(first)).toBe(true);
    expect(isFirstStep(listTheToolsStep)).toBe(false);
    expect(isFirstStep({ ...partStep, step: { ...partStep.step, number: 1 } })).toBe(false);
    const description = stepDescriptionOf(listTheToolsStep);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(description).toMatch(
      /^Before an agent uses a server, it asks what the server can do\. That question is the message tools\/list\./,
    );
    expect(stepDescriptionOf(step9)).toBe(stepDescriptionOf(listTheToolsStep));
  });
});
