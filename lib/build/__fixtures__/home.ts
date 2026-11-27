import type { BuildHomeSide } from '../home';
import type { BuildMine, BuildProjectCard, BuildWaitingTest } from '../types';
import {
  buildGoldEarned,
  buildGoldOpen,
  buildInProgress,
  buildTestLeft,
  keyValueDatabaseInProgress,
  keyValueDatabaseTestLeft,
} from './builds';
import {
  buildProjectsFew,
  codingAgentCard,
  gitCard,
  interpreterCard,
  jsonParserCard,
  keyValueDatabaseCard,
  mcpServerCard,
  webServerCard,
} from './projects';

/*
 * Home and Projects as the approved designs draw them: the landing, a builder's home, a test that waits, the other
 * cases, the fourteen projects of the long list, and a person's place on the cards.
 */

const card = (
  fields: Omit<BuildProjectCard, 'thing' | 'tags' | 'languages' | 'needs' | 'parts'>,
): BuildProjectCard => ({
  thing: fields.name.replace(/^Build /, ''),
  tags: [],
  languages: ['typescript', 'python'],
  needs: [],
  parts: 0,
  ...fields,
});

export const notesSearchCard = card({
  slug: 'notes-search',
  name: 'Build search over your notes',
  line: 'Ask a question, get the notes that answer it.',
  level: 1,
  subject: 'ai',
  minutes: 90,
  baseSteps: 14,
});
export const tokenizerCard = card({
  slug: 'tokenizer',
  name: 'Build a tokenizer',
  line: 'Turn text into the pieces a language model reads.',
  level: 1,
  subject: 'ai',
  minutes: 60,
  baseSteps: 12,
});
export const regexEngineCard = card({
  slug: 'regex-engine',
  name: 'Build a regex engine',
  line: 'Match text against a pattern, one small rule at a time.',
  level: 2,
  subject: 'languages',
  minutes: 120,
  baseSteps: 16,
});
export const sqlDatabaseCard = card({
  slug: 'sql-database',
  name: 'Build a SQL database',
  line: 'Tables, rows and a small select, stored in one file.',
  level: 3,
  subject: 'data',
  minutes: 180,
  baseSteps: 24,
});
export const rateLimiterCard = card({
  slug: 'rate-limiter',
  name: 'Build a rate limiter',
  line: 'Let some requests through and hold the rest back.',
  level: 1,
  subject: 'web',
  minutes: 60,
  baseSteps: 10,
});
export const shellCard = card({
  slug: 'shell',
  name: 'Build a shell',
  line: 'Run commands, pipe one into the next, keep a history.',
  level: 2,
  subject: 'tools',
  minutes: 120,
  baseSteps: 16,
});
export const testRunnerCard = card({
  slug: 'test-runner',
  name: 'Build a test runner',
  line: 'Find tests, run them, and report what failed and why.',
  level: 1,
  subject: 'tools',
  minutes: 60,
  baseSteps: 12,
});

/** The long list: fourteen projects, in our order (which is not the order of the groups). */
export const buildProjectsFourteen: BuildProjectCard[] = [
  mcpServerCard,
  codingAgentCard,
  interpreterCard,
  keyValueDatabaseCard,
  webServerCard,
  gitCard,
  jsonParserCard,
  notesSearchCard,
  tokenizerCard,
  regexEngineCard,
  sqlDatabaseCard,
  rateLimiterCard,
  shellCard,
  testRunnerCard,
];

/** Three projects: an odd number, the last card alone on the left. */
export const buildProjectsThree: BuildProjectCard[] = buildProjectsFew.slice(0, 3);

const project = (from: BuildProjectCard) => ({ slug: from.slug, name: from.name, thing: from.thing });

/** The web server, built with both marks: the gold test passed and every step's question answered. */
export const webServerBuiltMarked: BuildMine = {
  build: 'b-web-ts-marked',
  project: project(webServerCard),
  language: 'typescript',
  state: {
    kind: 'built',
    builtAt: '2026-11-05T16:00:00.000Z',
    score: 9,
    gold: { kind: 'earned', at: '2026-11-13T10:00:00.000Z' },
  },
  lastStepAt: '2026-11-05T15:40:00.000Z',
  stepsDone: [],
  partStep: null,
  partsBuilt: [],
  partsOf: 0,
  answeredEveryStep: true,
};

/** The JSON parser, built with no mark yet: its gold test opens next week. */
export const jsonParserBuiltPlain: BuildMine = {
  build: 'b-json-plain',
  project: project(jsonParserCard),
  language: 'python',
  state: {
    kind: 'built',
    builtAt: '2026-11-24T12:00:00.000Z',
    score: 7,
    gold: { kind: 'opens_on', date: '2026-12-01' },
  },
  lastStepAt: '2026-11-24T11:30:00.000Z',
  stepsDone: [],
  partStep: null,
  partsBuilt: [],
  partsOf: 0,
  answeredEveryStep: false,
};

/** A person's builds on Projects: a step, the test left, a built project with both marks, one with none. */
export const projectsMine: BuildMine[] = [
  buildInProgress,
  keyValueDatabaseTestLeft,
  webServerBuiltMarked,
  jsonParserBuiltPlain,
];

/** The end test of the first project, waiting. */
export const mcpServerEndTest: BuildWaitingTest = {
  build: buildTestLeft.build,
  kind: 'end',
  project: { slug: mcpServerCard.slug, name: mcpServerCard.name },
  language: 'typescript',
};

/** The gold test of the first project, open. */
export const mcpServerGoldTest: BuildWaitingTest = {
  build: buildGoldOpen.build,
  kind: 'gold',
  project: { slug: mcpServerCard.slug, name: mcpServerCard.name },
  language: 'typescript',
};

/** A visitor, or a person Build is not open to: nothing read. */
export const sideNone: BuildHomeSide = { home: null, builds: null, agentConnected: null };

/** Signed in, no build, no agent connected yet. */
export const sideNoBuild: BuildHomeSide = {
  home: { builds: [], tests: [], next: [mcpServerCard, codingAgentCard, interpreterCard] },
  builds: [],
  agentConnected: false,
};

/** Signed in, an agent connected, nothing started: the landing with "Pick a project". */
export const sideAgentConnected: BuildHomeSide = { ...sideNoBuild, agentConnected: true };

/** A builder: the first project at step 9, the key-value database at step 3, two projects to build next. */
export const sideBuilder: BuildHomeSide = {
  home: {
    builds: [buildInProgress, keyValueDatabaseInProgress],
    tests: [],
    next: [codingAgentCard, interpreterCard],
  },
  builds: [buildInProgress, keyValueDatabaseInProgress],
  agentConnected: null,
};

/** A test waits: the first project's test comes first, the key-value database below it. */
export const sideTestWaits: BuildHomeSide = {
  home: {
    builds: [keyValueDatabaseInProgress],
    tests: [mcpServerEndTest],
    next: [codingAgentCard, interpreterCard, webServerCard],
  },
  builds: [buildTestLeft, keyValueDatabaseInProgress],
  agentConnected: null,
};

/** The gold test of the first project is open, nothing in progress. */
export const sideGoldOpen: BuildHomeSide = {
  home: { builds: [], tests: [mcpServerGoldTest], next: [codingAgentCard, interpreterCard] },
  builds: [buildGoldOpen],
  agentConnected: null,
};

/** Built projects, nothing waits, nothing in progress: three of the five projects are left. */
export const sideNothingWaits: BuildHomeSide = {
  home: { builds: [], tests: [], next: [codingAgentCard, interpreterCard, keyValueDatabaseCard] },
  builds: [buildGoldEarned, webServerBuiltMarked],
  agentConnected: null,
};

const builtOf = (from: BuildProjectCard, index: number): BuildMine => ({
  ...webServerBuiltMarked,
  build: `b-all-${index}`,
  project: project(from),
});

/** Every one of the five projects is built. */
export const sideAllBuilt: BuildHomeSide = {
  home: { builds: [], tests: [], next: [] },
  builds: buildProjectsFew.map(builtOf),
  agentConnected: null,
};

/** A builder whose one build in progress has a step in hand and no other build or project to suggest. */
export const sideBuilderAlone: BuildHomeSide = {
  home: { builds: [buildInProgress], tests: [], next: [] },
  builds: [buildInProgress],
  agentConnected: null,
};
