import type {
  BuildBar,
  BuildHome,
  BuildMine,
  BuildMineList,
  BuildProjectMine,
  BuildStart,
  BuildStepMine,
  BuildWaitingTest,
} from '../types';
import { mcpServerBase, mcpServerStep } from './project';
import { codingAgentCard, interpreterCard, jsonParserCard, keyValueDatabaseCard, webServerCard } from './projects';

/*
 * A person's builds as the approved designs show them, on the day of the boards (26 November): one build in progress,
 * one with the test left, built ones with each state of the gold test, and a person with two builds of one project.
 */

const MCP = { slug: 'mcp-server', name: 'Build an MCP server', thing: 'an MCP server' };

const slugsBefore = (number: number) => mcpServerBase.slice(0, number - 1).map((step) => step.slug);
const allSlugs = mcpServerBase.map((step) => step.slug);

/** The first project in TypeScript, at step 9 "Check the input", started two days ago. */
export const buildInProgress: BuildMine = {
  build: 'b-mcp-ts',
  project: MCP,
  language: 'typescript',
  state: { kind: 'in_progress', step: mcpServerStep(9), of: 16 },
  lastStepAt: '2026-11-26T09:40:00.000Z',
  stepsDone: slugsBefore(9),
  partStep: null,
  partsBuilt: [],
  partsOf: 1,
  answeredEveryStep: true,
};

/** Every base step done; the test is left. */
export const buildTestLeft: BuildMine = {
  ...buildInProgress,
  build: 'b-mcp-ts-test',
  state: { kind: 'test_left' },
  lastStepAt: '2026-11-26T11:10:00.000Z',
  stepsDone: allSlugs,
};

/** Built today with 9 of 10; the gold test opens in a week. */
export const buildBuilt: BuildMine = {
  ...buildTestLeft,
  build: 'b-mcp-ts-built',
  state: {
    kind: 'built',
    builtAt: '2026-11-26T11:30:00.000Z',
    score: 9,
    gold: { kind: 'opens_on', date: '2026-12-03' },
  },
};

/** Built a week ago or more: the gold test is open. */
export const buildGoldOpen: BuildMine = {
  ...buildBuilt,
  build: 'b-mcp-ts-gold-open',
  state: { kind: 'built', builtAt: '2026-11-12T15:00:00.000Z', score: 8, gold: { kind: 'open' } },
  lastStepAt: '2026-11-12T14:20:00.000Z',
};

/** Built, the gold test passed. */
export const buildGoldEarned: BuildMine = {
  ...buildBuilt,
  build: 'b-mcp-ts-gold',
  state: {
    kind: 'built',
    builtAt: '2026-11-03T10:00:00.000Z',
    score: 10,
    gold: { kind: 'earned', at: '2026-11-11T18:00:00.000Z' },
  },
  lastStepAt: '2026-11-03T09:30:00.000Z',
  partsBuilt: ['official-sdk'],
  answeredEveryStep: true,
};

/** Built, then on a step of the optional part. */
export const buildInPart: BuildMine = {
  ...buildBuilt,
  build: 'b-mcp-ts-part',
  partStep: {
    part: 'official-sdk',
    step: { slug: 'describe-a-tool-with-a-schema', title: 'Describe a tool with a schema', number: 3 },
    of: 6,
  },
};

/** The same project in Python, at step 4: the second of two builds. */
export const buildPythonSecond: BuildMine = {
  ...buildInProgress,
  build: 'b-mcp-py',
  language: 'python',
  state: { kind: 'in_progress', step: mcpServerStep(4), of: 16 },
  lastStepAt: '2026-11-25T20:15:00.000Z',
  stepsDone: slugsBefore(4),
  answeredEveryStep: false,
};

/** The key-value database in Python, at step 3 of 14. */
export const keyValueDatabaseInProgress: BuildMine = {
  build: 'b-kv-py',
  project: { slug: keyValueDatabaseCard.slug, name: keyValueDatabaseCard.name, thing: keyValueDatabaseCard.thing },
  language: 'python',
  state: { kind: 'in_progress', step: { slug: 'keep-it-on-disk', title: 'Keep it on disk', number: 3 }, of: 14 },
  lastStepAt: '2026-11-24T19:00:00.000Z',
  stepsDone: ['what-you-will-build', 'set-and-get'],
  partStep: null,
  partsBuilt: [],
  partsOf: 0,
  answeredEveryStep: true,
};

/** The coding agent in Python, at step 3 of 18. */
export const codingAgentInProgress: BuildMine = {
  build: 'b-agent-py',
  project: { slug: codingAgentCard.slug, name: codingAgentCard.name, thing: codingAgentCard.thing },
  language: 'python',
  state: { kind: 'in_progress', step: { slug: 'read-a-file', title: 'Read a file', number: 3 }, of: 18 },
  lastStepAt: '2026-11-22T17:30:00.000Z',
  stepsDone: ['what-you-will-build', 'talk-to-the-model'],
  partStep: null,
  partsBuilt: [],
  partsOf: 0,
  answeredEveryStep: true,
};

/** The key-value database with the test left. */
export const keyValueDatabaseTestLeft: BuildMine = {
  ...keyValueDatabaseInProgress,
  build: 'b-kv-py-test',
  state: { kind: 'test_left' },
};

/** The web server in TypeScript, built 12 November with 8 of 10; its gold test is open. */
export const webServerBuilt: BuildMine = {
  build: 'b-web-ts',
  project: { slug: webServerCard.slug, name: webServerCard.name, thing: webServerCard.thing },
  language: 'typescript',
  state: { kind: 'built', builtAt: '2026-11-12T16:00:00.000Z', score: 8, gold: { kind: 'open' } },
  lastStepAt: '2026-11-12T15:40:00.000Z',
  stepsDone: [],
  partStep: null,
  partsBuilt: [],
  partsOf: 0,
  answeredEveryStep: false,
};

/** The JSON parser, built 3 November in TypeScript with 10 of 10, the gold test passed. */
export const jsonParserBuiltTs: BuildMine = {
  build: 'b-json-ts',
  project: { slug: jsonParserCard.slug, name: jsonParserCard.name, thing: jsonParserCard.thing },
  language: 'typescript',
  state: {
    kind: 'built',
    builtAt: '2026-11-03T12:00:00.000Z',
    score: 10,
    gold: { kind: 'earned', at: '2026-11-10T12:00:00.000Z' },
  },
  lastStepAt: '2026-11-03T11:30:00.000Z',
  stepsDone: [],
  partStep: null,
  partsBuilt: [],
  partsOf: 0,
  answeredEveryStep: true,
};

/** The same parser, also built in Python. */
export const jsonParserBuiltPython: BuildMine = {
  ...jsonParserBuiltTs,
  build: 'b-json-py',
  language: 'python',
  state: {
    kind: 'built',
    builtAt: '2026-11-03T18:00:00.000Z',
    score: 10,
    gold: { kind: 'earned', at: '2026-11-11T09:00:00.000Z' },
  },
  lastStepAt: '2026-11-03T17:30:00.000Z',
};

const SAY = 'Build an MCP server with GitRanks';

/** The first project, for a person with one build of it. */
export const projectMineOne: BuildProjectMine = { builds: [buildInProgress], agentConnected: true, say: SAY };

/** The first project, for a person with two builds of it: TypeScript touched last. */
export const projectMineTwo: BuildProjectMine = {
  builds: [buildInProgress, buildPythonSecond],
  agentConnected: true,
  say: SAY,
};

/** The first project, for a person with no build of it and no agent connected yet. */
export const projectMineNone: BuildProjectMine = { builds: [], agentConnected: false, say: SAY };

/** Step 7 for the person with two builds: done in TypeScript, still to come in Python. */
export const stepMineTwo: BuildStepMine = {
  builds: [
    { language: 'typescript', status: 'done' },
    { language: 'python', status: 'to_come' },
  ],
};

/** Step 9 for the person with one build: the current one. */
export const stepMineCurrent: BuildStepMine = { builds: [{ language: 'typescript', status: 'current' }] };

/** The end test of the key-value database, waiting. */
export const keyValueDatabaseEndTest: BuildWaitingTest = {
  build: keyValueDatabaseTestLeft.build,
  kind: 'end',
  project: { slug: keyValueDatabaseCard.slug, name: keyValueDatabaseCard.name },
  language: 'python',
};

/** The gold test of the web server, open. */
export const webServerGoldTest: BuildWaitingTest = {
  build: webServerBuilt.build,
  kind: 'gold',
  project: { slug: webServerCard.slug, name: webServerCard.name },
  language: 'typescript',
};

/** Home for a builder: two builds in progress, no test, two projects to build next. */
export const homeBuilder: BuildHome = {
  builds: [buildInProgress, keyValueDatabaseInProgress],
  tests: [],
  next: [codingAgentCard, interpreterCard],
};

/** Home with a test that waits. */
export const homeTestWaits: BuildHome = {
  builds: [buildInProgress],
  tests: [keyValueDatabaseEndTest],
  next: [codingAgentCard, interpreterCard],
};

/** My builds, full: two tests, two builds in progress, three built. */
export const mineFull: BuildMineList = {
  tests: [keyValueDatabaseEndTest, webServerGoldTest],
  inProgress: [buildInProgress, codingAgentInProgress],
  built: [webServerBuilt, jsonParserBuiltPython, jsonParserBuiltTs],
};

/** My builds with one build in progress and nothing else. */
export const mineOne: BuildMineList = { tests: [], inProgress: [buildInProgress], built: [] };

/** Build's bar: a visitor or a person with no build. */
export const barNone: BuildBar = { hasBuild: false, tests: null };

/** Build's bar: a person with a build and no test waiting. */
export const barBuilder: BuildBar = { hasBuild: true, tests: null };

/** Build's bar: a person with two tests waiting. */
export const barTwoTests: BuildBar = { hasBuild: true, tests: 2 };

/** The start flow before anything: no agent connected, no build. */
export const startFresh: BuildStart = { agentConnected: false, build: null };

/** The start flow after the agent connected and started the build. */
export const startStarted: BuildStart = {
  agentConnected: true,
  build: { ...buildInProgress, state: { kind: 'in_progress', step: mcpServerStep(1), of: 16 }, stepsDone: [] },
};
