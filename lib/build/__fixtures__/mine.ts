import type { BuildMine, BuildMineList, BuildWaitingTest } from '../types';
import {
  buildInPart,
  buildInProgress,
  codingAgentInProgress,
  jsonParserBuiltPython,
  jsonParserBuiltTs,
  keyValueDatabaseEndTest,
  webServerBuilt,
  webServerGoldTest,
} from './builds';
import { mcpServerStep } from './project';

/*
 * My builds on the day its boards were drawn (Thursday 26 November 2026, noon UTC), one list for each state the boards
 * show: someone with several, the usual start, a built project in each state of the gold test, only built projects,
 * and nothing started. The page counts days in the person's zone: the specs and boards read them in UTC.
 */

/** The moment the boards were drawn. */
export const MINE_NOW = new Date('2026-11-26T12:00:00.000Z');

/** The first project in TypeScript, at step 9 of 16, its last step two days before. */
export const mineMcpInProgress: BuildMine = { ...buildInProgress, lastStepAt: '2026-11-24T18:20:00.000Z' };

/** The coding agent in Python, at step 3 of 18, its last step today. */
export const mineCodingAgent: BuildMine = { ...codingAgentInProgress, lastStepAt: '2026-11-26T08:05:00.000Z' };

/** The web server, built 12 November with every step answered; its gold test is open. */
export const mineWebServerBuilt: BuildMine = { ...webServerBuilt, answeredEveryStep: true };

/** The first project, built today with 9 of 10 and two of five optional parts; the gold test opens on 3 December. */
export const mineMcpBuilt: BuildMine = {
  ...buildInProgress,
  build: 'b-mcp-ts-built',
  state: {
    kind: 'built',
    builtAt: '2026-11-26T10:30:00.000Z',
    score: 9,
    gold: { kind: 'opens_on', date: '2026-12-03' },
  },
  lastStepAt: '2026-11-26T10:00:00.000Z',
  stepsDone: [],
  partsBuilt: ['official-sdk', 'resources'],
  partsOf: 5,
  answeredEveryStep: true,
};

/** A rate limiter in Python, built 20 November with 7 of 10, no mark; the gold test opens tomorrow. */
export const mineRateLimiterBuilt: BuildMine = {
  build: 'b-rate-py',
  project: { slug: 'rate-limiter', name: 'Build a rate limiter', thing: 'a rate limiter' },
  language: 'python',
  state: {
    kind: 'built',
    builtAt: '2026-11-20T15:00:00.000Z',
    score: 7,
    gold: { kind: 'opens_on', date: '2026-11-27' },
  },
  lastStepAt: '2026-11-20T14:40:00.000Z',
  stepsDone: [],
  partStep: null,
  partsBuilt: [],
  partsOf: 0,
  answeredEveryStep: false,
};

/** Someone with several: two tests wait, two builds are in progress, a project built in two languages and one more. */
export const mineBoardFull: BuildMineList = {
  tests: [keyValueDatabaseEndTest, webServerGoldTest],
  inProgress: [mineMcpInProgress, mineCodingAgent],
  built: [mineWebServerBuilt, jsonParserBuiltPython, jsonParserBuiltTs],
};

/** The usual start: one build in progress and nothing else. */
export const mineBoardOne: BuildMineList = { tests: [], inProgress: [mineMcpInProgress], built: [] };

/** A built project now on step 3 of 6 of its optional part, its last step this morning: in progress, and built. */
export const mineBoardBuiltInPart: BuildMineList = {
  tests: [],
  inProgress: [],
  built: [{ ...buildInPart, lastStepAt: '2026-11-26T09:40:00.000Z' }],
};

/** On a phone: a test that waits, a build in progress, a built project. */
export const mineBoardPhone: BuildMineList = {
  tests: [keyValueDatabaseEndTest],
  inProgress: [mineMcpInProgress],
  built: [jsonParserBuiltTs],
};

/** A build in progress beside the coding agent, for "Remove" pressed on the first. */
export const mineBoardTwoInProgress: BuildMineList = {
  tests: [],
  inProgress: [mineMcpInProgress, mineCodingAgent],
  built: [],
};

/** A built project whose gold test is not open yet. */
export const mineBoardGoldOpensOn: BuildMineList = { tests: [], inProgress: [], built: [mineMcpBuilt] };

/** A built project with no mark. */
export const mineBoardNoMark: BuildMineList = { tests: [], inProgress: [], built: [mineRateLimiterBuilt] };

/** A project built and repeated after a week, with every step answered. */
export const mineBoardRepeated: BuildMineList = { tests: [], inProgress: [], built: [jsonParserBuiltTs] };

/** Only built projects: no test waits and nothing is in progress. */
export const mineBoardOnlyBuilt: BuildMineList = {
  tests: [],
  inProgress: [],
  built: [jsonParserBuiltPython, jsonParserBuiltTs],
};

/** Nothing started: the address opened by hand. */
export const mineBoardEmpty: BuildMineList = { tests: [], inProgress: [], built: [] };

/** A project built in both languages, both gold tests open: the language tells the two tests apart. */
const jsonGoldTs: BuildWaitingTest = {
  build: jsonParserBuiltTs.build,
  kind: 'gold',
  project: { slug: jsonParserBuiltTs.project.slug, name: jsonParserBuiltTs.project.name },
  language: 'typescript',
};
const jsonParserOpenTs: BuildMine = {
  ...jsonParserBuiltTs,
  state: { kind: 'built', builtAt: '2026-11-03T12:00:00.000Z', score: 10, gold: { kind: 'open' } },
};
const jsonParserOpenPython: BuildMine = {
  ...jsonParserBuiltPython,
  state: { kind: 'built', builtAt: '2026-11-03T18:00:00.000Z', score: 9, gold: { kind: 'open' } },
};
export const mineBoardTwoGoldTests: BuildMineList = {
  tests: [jsonGoldTs, { ...jsonGoldTs, build: jsonParserBuiltPython.build, language: 'python' }],
  inProgress: [],
  built: [jsonParserOpenPython, jsonParserOpenTs],
};

/** The first project at its first step: nothing passed yet. */
export const mineMcpFirstStep: BuildMine = {
  ...mineMcpInProgress,
  build: 'b-mcp-ts-first',
  state: { kind: 'in_progress', step: mcpServerStep(1), of: 16 },
  stepsDone: [],
};
