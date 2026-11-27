import type { LearnQuestion } from '@/lib/workspace/learn-question';

/*
 * What the API answers about Build, field for field: the public reads (the projects, a project, a step) and the
 * signed-in person's own (their builds, their tests). A step's and a test's question is the shared question shape
 * (`LearnQuestion`), so the shared question card draws it unchanged. Dates are ISO strings.
 */

/** The languages a project is built in. */
export const BUILD_LANGUAGES = ['typescript', 'python'] as const;
export type BuildLanguage = (typeof BUILD_LANGUAGES)[number];

/** Whether a value is one of the languages a project is built in. */
export const isBuildLanguage = (value: unknown): value is BuildLanguage =>
  (BUILD_LANGUAGES as readonly unknown[]).includes(value);

/** What a project is about, for the groups of the list of projects. */
export type BuildSubject = 'ai' | 'tools' | 'languages' | 'data' | 'web' | 'fun';

/** A project's level: 1 is easy, 3 is hard. */
export type BuildLevel = 1 | 2 | 3;

/** The test at the end of a project, and the gold test a week after it was built. */
export const BUILD_TEST_KINDS = ['end', 'gold'] as const;
export type BuildTestKind = (typeof BUILD_TEST_KINDS)[number];

/** Whether a value is one of the two kinds of test. */
export const isBuildTestKind = (value: unknown): value is BuildTestKind =>
  (BUILD_TEST_KINDS as readonly unknown[]).includes(value);

/** A project as a card shows it, on Home and on Projects. `needs`: what a person needs, one short line each. */
export type BuildProjectCard = {
  slug: string;
  name: string;
  /** How Skills and the doors name what was built: "an MCP server". */
  thing: string;
  line: string;
  level: BuildLevel;
  subject: BuildSubject;
  tags: string[];
  languages: BuildLanguage[];
  /** The base, start to end. */
  minutes: number;
  baseSteps: number;
  parts: number;
  needs: string[];
};

/**
 * One thing a project needs, as its page lists it: a language's runtime with its lowest version and the command that
 * prints it (`language` set), or anything else (`language` null), each with why.
 */
export type BuildNeed = {
  language: BuildLanguage | null;
  name: string;
  version: string | null;
  command: string | null;
  why: string | null;
};

/** A step as a link names it. `number` counts through the base, then through each part from 1. */
export type BuildStepRef = { slug: string; title: string; number: number };

/** An optional part of a project: its steps, after the whole base. */
export type BuildPart = { slug: string; name: string; line: string; steps: BuildStepRef[] };

/** A project's page, the same for everyone. */
export type BuildProjectPage = BuildProjectCard & {
  about: string[];
  /** Where the person talks to the thing they build. */
  playground: string;
  needsFull: BuildNeed[];
  base: BuildStepRef[];
  partsFull: BuildPart[];
  /** Learn courses that help; one Learn does not list is left out. */
  courses: { slug: string; name: string }[];
  next: BuildProjectCard[];
};

/** How a step changed a file. */
export type BuildFileStatus = 'added' | 'changed' | 'removed';

/** One language's side of a step: what changed, with the diff, and every file of the project after it. */
export type BuildStepLanguage = {
  language: BuildLanguage;
  note: string | null;
  /** The step's commit in the public repository of the projects' code. */
  commit: string;
  changed: { path: string; status: BuildFileStatus; diff: string }[];
  files: { path: string; text: string }[];
};

/** A step's page, the same for everyone, in both languages. Its question carries its key and reasons. */
export type BuildStepPage = {
  project: { slug: string; name: string };
  step: BuildStepRef;
  /** How many steps the step's list has: the base's, or its part's. */
  of: number;
  /** The part the step is in; null for the base. */
  part: { slug: string; name: string } | null;
  say: string;
  more: string;
  play: string[];
  sketch: string | null;
  question: LearnQuestion;
  languages: BuildStepLanguage[];
  before: BuildStepRef | null;
  after: BuildStepRef | null;
};

/** Whether a project's or a step's address is there: live, removed, or never there (a draft project included). */
export type BuildAddress = { state: 'live' | 'removed' | 'missing' };

/** Where the gold test of a built project stands. */
export type BuildGold = { kind: 'opens_on'; date: string } | { kind: 'open' } | { kind: 'earned'; at: string };

/**
 * Where a build stands, from its own record: a step of the base to do; every base step done and the test left; or
 * Built, with the end test's score and the gold test. A part in progress is told beside it (`BuildMine.partStep`).
 */
export type BuildState =
  | { kind: 'in_progress'; step: BuildStepRef; of: number }
  | { kind: 'test_left' }
  | { kind: 'built'; builtAt: string; score: number; gold: BuildGold };

/** One build: one person, one project, one language. */
export type BuildMine = {
  build: string;
  project: { slug: string; name: string; thing: string };
  language: BuildLanguage;
  state: BuildState;
  lastStepAt: string;
  /** The slugs of the steps passed. */
  stepsDone: string[];
  partStep: { part: string; step: BuildStepRef; of: number } | null;
  /** The slugs of the parts built. */
  partsBuilt: string[];
  partsOf: number;
  answeredEveryStep: boolean;
};

/** The person's side of one project: their builds of it, the one touched last first. */
export type BuildProjectMine = {
  builds: BuildMine[];
  /** Whether an agent of theirs ever connected to GitRanks. */
  agentConnected: boolean;
  /** The sentence to say in the agent. */
  say: string;
};

/** Where one step stands for each of the person's builds of its project. A step added before their place is done. */
export type BuildStepMine = { builds: { language: BuildLanguage; status: 'done' | 'current' | 'to_come' }[] };

/** Build's bar: whether the person has a build, and how many tests wait for them (null, never 0, for none). */
export type BuildBar = { hasBuild: boolean; tests: number | null };

/** A test that waits for the person: the end test of a build with the test left, or a gold test that opened. */
export type BuildWaitingTest = {
  build: string;
  kind: BuildTestKind;
  project: { slug: string; name: string };
  language: BuildLanguage;
};

/** Build's home for a person with a build: the builds in progress (touched last first), the tests, what to build next. */
export type BuildHome = { builds: BuildMine[]; tests: BuildWaitingTest[]; next: BuildProjectCard[] };

/**
 * My builds: the tests that wait, the builds in progress (touched last first), and the built ones (built last first,
 * with the end test's score, the marks and the gold test in their state).
 */
export type BuildMineList = { tests: BuildWaitingTest[]; inProgress: BuildMine[]; built: BuildMine[] };

/** The start flow's state: whether an agent of the person's connected, and their build of the project once started. */
export type BuildStart = { agentConnected: boolean; build: BuildMine | null };

/** A run of a test in progress: its questions without their keys, options in the run's order. */
export type BuildTestRun = { run: string; questions: LearnQuestion[]; answered: number };

/** One question of a run that ended: the person's pick by its place in the run's order (null: "I don't know"). */
export type BuildTestItem = { question: LearnQuestion; pick: number | null; step: BuildStepRef };

/** A run that ended with a result. Each question carries its key and the reason of each option. */
export type BuildTestResult = { run: string; right: number; passed: boolean; items: BuildTestItem[] };

/** A test of one build, as reading it answers: it writes nothing. */
export type BuildTest = {
  kind: BuildTestKind;
  project: { slug: string; name: string };
  language: BuildLanguage;
  /** How many right answers pass: 7 for the end test, 8 for the gold test. */
  need: 7 | 8;
  open: BuildTestRun | null;
  last: BuildTestResult | null;
  canStart: boolean;
  nextTryAt: string | null;
};

/** What an answer of a test gives back: the run, and with the tenth answer its result too. */
export type BuildTestAnswer = { run: BuildTestRun; result: BuildTestResult | null };

/**
 * The person's Build settings, as Settings reads them: `reminders`, Build's two emails (the gold test is open; a build
 * stands still), one switch for both, on from the first build until turned off. Only a person with a build has them:
 * the API answers none for a person with no build yet, and Settings then shows no row.
 */
export type BuildSettings = { reminders: boolean };

/**
 * What the doors into Build on Learn's and Contribute's pages read, for one course: the projects that name it, in our
 * order, and the person's builds of those projects (the one touched last first).
 */
export type BuildDoors = { projects: BuildProjectCard[]; builds: BuildMine[] };
