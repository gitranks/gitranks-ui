import { describe, expect, it } from 'vitest';

import { buildInProgress, buildPythonSecond, buildTestLeft } from './__fixtures__/builds';
import { mcpServerProject, mcpServerSdkPart, smallProject } from './__fixtures__/project';
import {
  builtInHttpPart,
  builtOnePart,
  endTestFailedNow,
  httpPart,
  jsonParserProject,
  mcpServerFiveParts,
  mineTestLeft,
  resourcesPart,
  testLeftOnePart,
} from './__fixtures__/project-page';
import { endTestOpen, endTestPassed, goldTestReady, testRun } from './__fixtures__/test';
import { buildCoursePath } from './paths';
import {
  baseWordsOf,
  boxBuildOf,
  boxTestOf,
  dayOf,
  dayYearOf,
  durationWordsOf,
  goldWordsOf,
  languagesWordsOf,
  levelWordOf,
  needRowsOf,
  nextPartOf,
  otherBuildLineOf,
  partHrefOf,
  partStandingOf,
  projectFactsOf,
  squaresOf,
  startSentenceOf,
  stepMarksOf,
  whatNextOf,
} from './project';

describe("a project's facts", () => {
  it('read as the boards write them', () => {
    expect(projectFactsOf(mcpServerProject)).toEqual([
      'Easy',
      '16 steps, about an hour and a half',
      'TypeScript or Python',
    ]);
    expect(projectFactsOf(jsonParserProject)[1]).toBe('12 steps, about an hour');
    expect(levelWordOf(2)).toBe('Medium');
    expect(levelWordOf(3)).toBe('Hard');
    expect(languagesWordsOf(['python'])).toBe('Python');
  });

  it('round the time to the nearest half hour, in words', () => {
    expect(durationWordsOf(60)).toBe('about an hour');
    expect(durationWordsOf(90)).toBe('about an hour and a half');
    expect(durationWordsOf(120)).toBe('about two hours');
    expect(durationWordsOf(150)).toBe('about two and a half hours');
    expect(durationWordsOf(180)).toBe('about three hours');
    expect(durationWordsOf(30)).toBe('about 30 minutes');
    expect(durationWordsOf(0)).toBe('');
    expect(baseWordsOf({ baseSteps: 1, minutes: 0 })).toBe('1 step');
  });

  it('give the sentence that starts the project', () => {
    expect(startSentenceOf(mcpServerProject)).toBe('Teach me how to build an MCP server with GitRanks');
  });

  it('write days in UTC, a date alone as that day', () => {
    expect(dayOf('2026-11-26T23:30:00.000Z')).toBe('26 Nov');
    expect(dayOf('2026-12-03')).toBe('3 Dec');
    expect(dayYearOf('2026-11-26T11:30:00.000Z')).toBe('26 Nov 2026');
    expect(dayOf('not a date')).toBe('');
  });
});

describe('where a build stands on the steps', () => {
  it('marks the passed steps and the step in hand, in the base', () => {
    const marks = stepMarksOf(buildInProgress);
    expect(marks.get('read-one-message')).toBe('done');
    expect(marks.get('check-the-input')).toBe('current');
    expect(marks.has('a-tool-that-fails-well')).toBe(false);
    const squares = squaresOf(mcpServerProject.base, marks);
    expect(squares.filter((square) => square === 'done')).toHaveLength(8);
    expect(squares[8]).toBe('current');
    expect(squares.slice(9).every((square) => square === 'todo')).toBe(true);
  });

  it('marks the step in hand of a part, and nothing for a visitor', () => {
    expect(stepMarksOf(builtInHttpPart).get('answer-a-message-over-http')).toBe('current');
    expect(stepMarksOf(null).size).toBe(0);
  });

  it('says a part is built, or how many of its steps are passed, never none', () => {
    expect(partStandingOf(mcpServerSdkPart, builtOnePart)).toEqual({ built: true, done: null });
    expect(partStandingOf(httpPart, builtInHttpPart)).toEqual({ built: false, done: 2 });
    expect(partStandingOf(resourcesPart, builtInHttpPart)).toEqual({ built: false, done: null });
    expect(partStandingOf(httpPart, null)).toEqual({ built: false, done: null });
  });

  it('goes on with the part in progress, else the first part not built', () => {
    expect(nextPartOf(mcpServerFiveParts, builtInHttpPart)?.slug).toBe('http');
    expect(nextPartOf(mcpServerFiveParts, testLeftOnePart)?.slug).toBe('resources');
    expect(nextPartOf(mcpServerProject, builtOnePart)).toBeNull();
    expect(nextPartOf(smallProject, buildTestLeft)).toBeNull();
  });

  it("leads a part's link to its first step not passed", () => {
    expect(partHrefOf(mcpServerFiveParts, httpPart, builtInHttpPart)).toBe(
      '/build/mcp-server/answer-a-message-over-http',
    );
    expect(partHrefOf(mcpServerFiveParts, httpPart, null)).toBe('/build/mcp-server/one-address-one-post');
  });

  it("names the person's other build in one line", () => {
    expect(otherBuildLineOf(buildPythonSecond)).toBe('Your Python build: step 4 of 16.');
    expect(otherBuildLineOf(buildTestLeft)).toBe('Your TypeScript build: every step done, the test left.');
    expect(otherBuildLineOf(builtOnePart)).toBe('Your TypeScript build: built on 26 Nov.');
  });

  it('finds the build the page is about only once the side came', () => {
    expect(boxBuildOf({ kind: 'pending' })).toBeNull();
    expect(boxBuildOf({ kind: 'person', mine: mineTestLeft, test: null })).toBe(testLeftOnePart);
  });

  it('reads where the waiting test stands only for a build it waits for', () => {
    expect(boxTestOf({ kind: 'person', mine: mineTestLeft, test: endTestFailedNow })).toEqual({
      kind: 'failed',
      right: 6,
      count: 10,
      need: 7,
    });
    expect(boxTestOf({ kind: 'person', mine: mineTestLeft, test: endTestOpen })).toEqual({
      kind: 'going',
      answered: 3,
      count: 10,
    });
    expect(boxTestOf({ kind: 'person', mine: mineTestLeft, test: endTestPassed })).toBeNull();
    expect(boxTestOf({ kind: 'person', mine: mineTestLeft, test: null })).toBeNull();
    // A gold test does not wait for a build with the test left.
    const goldGoing = { ...goldTestReady, open: testRun, canStart: false };
    expect(boxTestOf({ kind: 'person', mine: mineTestLeft, test: goldGoing })).toBeNull();
    expect(boxTestOf({ kind: 'visitor' })).toBeNull();
  });
});

describe('the gold test, in words', () => {
  it('opens a week after the build, or again the day after a failed try', () => {
    expect(goldWordsOf({ kind: 'opens_on', date: '2026-12-03' }, '2026-11-26T11:30:00.000Z')).toBe(
      'The gold test opens on 3 Dec, a week after you built it: 10 questions, and 8 right earns the gold mark.',
    );
    expect(goldWordsOf({ kind: 'opens_on', date: '2026-11-27' }, '2026-11-19T10:00:00.000Z')).toBe(
      'The gold test opens again on 27 Nov: 10 questions, and 8 right earns the gold mark.',
    );
    expect(goldWordsOf({ kind: 'open' }, '2026-11-12T15:00:00.000Z')).toContain('One try a day.');
    expect(goldWordsOf({ kind: 'earned', at: '2026-11-11T18:00:00.000Z' }, '2026-11-03T10:00:00.000Z')).toBeNull();
  });

  it("reads the day it was built in the zone the API counted the gold test's day in", () => {
    // Built late on 26 Nov in New York, which is 27 Nov in UTC: the gold test opens on 3 Dec, a week after.
    const builtAt = '2026-11-27T02:00:00.000Z';
    expect(goldWordsOf({ kind: 'opens_on', date: '2026-12-03' }, builtAt, 'America/New_York')).toBe(
      'The gold test opens on 3 Dec, a week after you built it: 10 questions, and 8 right earns the gold mark.',
    );
    expect(dayYearOf(builtAt, 'America/New_York')).toBe('26 Nov 2026');
    expect(dayYearOf(builtAt, 'UTC')).toBe('27 Nov 2026');
    expect(dayOf('2026-12-03', 'Asia/Tokyo')).toBe('3 Dec');
  });

  it('counts calendar days in the zone across a change of the clocks: the gold day is the day of Built plus 7', () => {
    const NY = 'America/New_York';
    const FIRST = ', a week after you built it: 10 questions, and 8 right earns the gold mark.';
    // Built at 23:30 on 7 Mar 2027, a week before the clocks go forward: the API answers 14 Mar.
    expect(goldWordsOf({ kind: 'opens_on', date: '2027-03-14' }, '2027-03-08T04:30:00.000Z', NY)).toBe(
      `The gold test opens on 14 Mar${FIRST}`,
    );
    // Built at 00:30 on 1 Nov 2027, a week before the clocks go back: the API answers 8 Nov.
    expect(goldWordsOf({ kind: 'opens_on', date: '2027-11-08' }, '2027-11-01T04:30:00.000Z', NY)).toBe(
      `The gold test opens on 8 Nov${FIRST}`,
    );
    // A day later than that is a failed try's next day.
    expect(goldWordsOf({ kind: 'opens_on', date: '2027-03-15' }, '2027-03-08T04:30:00.000Z', NY)).toMatch(
      /^The gold test opens again on 15 Mar/,
    );
  });
});

describe('what next, for a built project', () => {
  it('opens the four doors the boards draw, but the issues: the next part, the next project, a course', () => {
    expect(whatNextOf(mcpServerFiveParts, builtOnePart)).toEqual([
      {
        label: 'Go on with this project',
        title: 'Resources: data your agent can read',
        line: 'The next optional part · 5 steps · 4 parts left',
        href: '/build/mcp-server/what-a-resource-is',
      },
      {
        label: 'Build next',
        title: 'Build a coding agent',
        line: 'An agent that reads files, edits them and runs commands · 18 steps',
        href: '/build/coding-agent',
      },
      {
        label: 'Go deeper',
        title: 'Building MCP servers and clients',
        line: 'A Learn course',
        href: buildCoursePath('mcp'),
      },
    ]);
  });

  it('names the first part when none is built, and the only part as the optional part', () => {
    const [part] = whatNextOf(mcpServerFiveParts, { ...builtOnePart, partsBuilt: [], stepsDone: [] });
    expect(part.line).toBe('The first of 5 optional parts · 6 steps');
    const [only] = whatNextOf(mcpServerProject, { ...builtOnePart, partsBuilt: [], stepsDone: [] });
    expect(only.line).toBe('The optional part · 6 steps');
  });

  it('leaves out a door with nothing behind it', () => {
    const doors = whatNextOf(smallProject, builtOnePart);
    expect(doors.map((door) => door.label)).toEqual(['Build next']);
    expect(whatNextOf({ ...smallProject, next: [] }, builtOnePart)).toEqual([]);
  });
});

describe('what you need', () => {
  it('puts the runtimes in one row, then the rest with why', () => {
    expect(needRowsOf(mcpServerProject)).toEqual([
      { name: 'Node 22 or newer, or Python 3.12 or newer', why: 'Your agent checks this before the first step.' },
      { name: 'An agent with a shell', why: 'Claude Code, Codex, Cursor, Gemini CLI or VS Code.' },
      { name: 'git', why: 'Wanted, not required. With it each step is one download and one commit of your own.' },
    ]);
    expect(needRowsOf({ ...mcpServerProject, needsFull: [] })).toEqual([]);
  });
});
