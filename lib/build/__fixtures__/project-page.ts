import type { BuildMine, BuildPart, BuildProjectMine, BuildProjectPage, BuildStepRef, BuildTest } from '../types';
import {
  buildBuilt,
  buildGoldEarned,
  buildGoldOpen,
  buildInProgress,
  buildPythonSecond,
  buildTestLeft,
  projectMineNone,
} from './builds';
import { mcpServerBase, mcpServerProject, mcpServerSdkPart, smallProject } from './project';
import { jsonParserCard } from './projects';
import { failedResult } from './test';

/*
 * A project's page in every state the approved designs draw: the first project with the boards' five optional parts,
 * the small project, and the person's side of the project in each state of the box.
 */

const refs = (steps: [slug: string, title: string][]): BuildStepRef[] =>
  steps.map(([slug, title], index) => ({ slug, title, number: index + 1 }));

/** The optional part on reading data. */
export const resourcesPart: BuildPart = {
  slug: 'resources',
  name: 'Resources: data your agent can read',
  line: 'Files and records the agent can ask for by address.',
  steps: refs([
    ['what-a-resource-is', 'What a resource is'],
    ['list-the-resources', 'List the resources'],
    ['read-one-resource', 'Read one resource'],
    ['a-template-for-many', 'A template for many'],
    ['tell-the-agent-a-resource-changed', 'Tell the agent a resource changed'],
  ]),
};

/** The optional part on HTTP, with the steps the boards name. */
export const httpPart: BuildPart = {
  slug: 'http',
  name: 'Serve it over HTTP',
  line: 'One server for many people, not one process for each.',
  steps: refs([
    ['one-address-one-post', 'One address, one POST for each message'],
    ['start-an-http-server', 'Start an HTTP server'],
    ['answer-a-message-over-http', 'Answer a message over HTTP'],
    ['the-headers-every-request-needs', 'The headers every request needs'],
    ['keep-stdio-working-too', 'Keep stdio working too'],
    ['several-agents-at-once', 'Several agents at once'],
    ['try-it-from-another-machine', 'Try it from another machine'],
  ]),
};

/** The optional part on sign-in. */
export const signInPart: BuildPart = {
  slug: 'sign-in',
  name: 'Sign-in for an HTTP server',
  line: 'Who is calling, and what they may do.',
  steps: refs([
    ['who-is-calling', 'Who is calling'],
    ['a-key-in-a-header', 'A key in a header'],
    ['refuse-a-missing-key', 'Refuse a missing key'],
    ['tools-for-some-callers', 'Tools for some callers'],
    ['keys-that-expire', 'Keys that expire'],
    ['sign-in-from-your-agent', 'Sign in from your agent'],
  ]),
};

/** The optional part on publishing. */
export const publishPart: BuildPart = {
  slug: 'publish',
  name: 'Publish it so others can run it',
  line: 'A package, a config line to paste, and a listing.',
  steps: refs([
    ['a-package-of-your-own', 'A package of your own'],
    ['run-it-with-one-command', 'Run it with one command'],
    ['a-config-line-to-paste', 'A config line to paste'],
    ['a-readme-that-shows-it', 'A README that shows it'],
    ['list-it', 'List it'],
  ]),
};

/** The first project as the boards draw it: 16 base steps and five optional parts. */
export const mcpServerFiveParts: BuildProjectPage = {
  ...mcpServerProject,
  parts: 5,
  partsFull: [mcpServerSdkPart, resourcesPart, httpPart, signInPart, publishPart],
};

/** The small project: the JSON parser, 12 steps, no optional part, no course. */
export const jsonParserProject: BuildProjectPage = {
  ...smallProject,
  ...jsonParserCard,
  line: 'Turn text into data, one character at a time, and say clearly where the text is wrong.',
  minutes: 60,
  parts: 0,
  about: [
    'A parser that reads any JSON text and points at the exact place of a mistake.',
    'A prompt where you paste text and see what the parser made of it.',
  ],
  needsFull: smallProject.needsFull.filter((need) => need.name !== 'git'),
  base: refs([
    ['what-you-will-build', 'What you will build'],
    ['a-prompt-to-paste-text-into', 'A prompt to paste text into'],
    ['read-true-false-and-null', 'Read true, false and null'],
    ['read-a-number', 'Read a number'],
    ['read-a-string', 'Read a string'],
    ['escapes-inside-a-string', 'Escapes inside a string'],
    ['skip-spaces-and-new-lines', 'Skip spaces and new lines'],
    ['read-a-list', 'Read a list'],
    ['read-an-object', 'Read an object'],
    ['lists-and-objects-inside-each-other', 'Lists and objects inside each other'],
    ['say-where-the-text-is-wrong', 'Say where the text is wrong'],
    ['run-it-on-real-files', 'Run it on real files'],
  ]),
};

const SDK_SLUGS = mcpServerSdkPart.steps.map((step) => step.slug);
const BASE_SLUGS = mcpServerBase.map((step) => step.slug);

/** The sentence a person with an agent and no build says. */
export const START_SAY = 'Teach me how to build an MCP server with GitRanks';

/** Every base step done, the optional part on the official SDK built; the test left. */
export const testLeftOnePart: BuildMine = {
  ...buildTestLeft,
  stepsDone: [...BASE_SLUGS, ...SDK_SLUGS],
  partsBuilt: ['official-sdk'],
  partsOf: 5,
};

/** Built today, the part on the official SDK built too; the gold test opens in a week. */
export const builtOnePart: BuildMine = {
  ...buildBuilt,
  stepsDone: [...BASE_SLUGS, ...SDK_SLUGS],
  partsBuilt: ['official-sdk'],
  partsOf: 5,
};

/** Built, then on step 3 of 7 of the part on HTTP. */
export const builtInHttpPart: BuildMine = {
  ...builtOnePart,
  build: 'b-mcp-ts-http',
  stepsDone: [...builtOnePart.stepsDone, httpPart.steps[0].slug, httpPart.steps[1].slug],
  partStep: { part: 'http', step: httpPart.steps[2], of: 7 },
};

/** Built with 8 of 10 a week ago, the gold test failed today: it opens again tomorrow. */
export const builtGoldFailedToday: BuildMine = {
  ...buildBuilt,
  build: 'b-mcp-ts-gold-again',
  state: {
    kind: 'built',
    builtAt: '2026-11-19T10:00:00.000Z',
    score: 8,
    gold: { kind: 'opens_on', date: '2026-11-27' },
  },
};

/** The end test after a failed try, 6 of 10: it can be taken again at once. */
export const endTestFailedNow: BuildTest = {
  kind: 'end',
  project: { slug: 'mcp-server', name: 'Build an MCP server' },
  language: 'typescript',
  need: 7,
  open: null,
  last: failedResult,
  canStart: true,
  nextTryAt: null,
};

const mineOf = (builds: BuildMine[]): BuildProjectMine => ({ builds, agentConnected: true, say: START_SAY });

/** Signed in, no agent ever connected, nothing started. */
export const mineNoAgent: BuildProjectMine = { ...projectMineNone, say: START_SAY };
/** Signed in, an agent connected, nothing started. */
export const mineAgentNoBuild: BuildProjectMine = mineOf([]);
/** A build on step 9 of 16. */
export const mineInProgress: BuildProjectMine = mineOf([buildInProgress]);
/** Every step done, one optional part built, the test left. */
export const mineTestLeft: BuildProjectMine = mineOf([testLeftOnePart]);
/** Built, the gold test opens on a date. */
export const mineBuilt: BuildProjectMine = mineOf([builtOnePart]);
/** Built, the gold test open. */
export const mineGoldOpen: BuildProjectMine = mineOf([buildGoldOpen]);
/** Built and repeated: the gold test earned. */
export const mineGoldEarned: BuildProjectMine = mineOf([buildGoldEarned]);
/** Built, now in an optional part. */
export const mineInPart: BuildProjectMine = mineOf([builtInHttpPart]);
/** Built, the gold test failed today. */
export const mineGoldFailedToday: BuildProjectMine = mineOf([builtGoldFailedToday]);
/** Two builds of the project: TypeScript on step 9, touched last; Python on step 4. */
export const mineTwoBuilds: BuildProjectMine = mineOf([buildInProgress, buildPythonSecond]);
/** Two builds, the one touched last built: TypeScript built, Python on step 4. */
export const mineTwoBuildsOneBuilt: BuildProjectMine = mineOf([builtOnePart, buildPythonSecond]);

/** Built, the gold test open, and on step 3 of 7 of the part on HTTP. */
export const builtInPartGoldOpen: BuildMine = {
  ...builtInHttpPart,
  build: 'b-mcp-ts-http-gold-open',
  state: buildGoldOpen.state,
};
/** Built, the gold test open, now in an optional part. */
export const mineInPartGoldOpen: BuildProjectMine = mineOf([builtInPartGoldOpen]);
/** Two builds, the one touched last built; the Python one has its test left. */
export const mineTwoBuildsOtherTestLeft: BuildProjectMine = mineOf([
  builtOnePart,
  { ...buildPythonSecond, state: { kind: 'test_left' } },
]);
