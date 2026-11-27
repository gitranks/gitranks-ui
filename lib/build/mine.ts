import type { Route } from 'next';

import { BUILD_EMAILS_BUILT } from './built-parts';
import { buildProjectPath, buildTestPath } from './paths';
import {
  type BuildGold,
  type BuildMine,
  type BuildMineList,
  type BuildTestKind,
  type BuildWaitingTest,
  isBuildLanguage,
  isBuildTestKind,
} from './types';
import { languageNameOf } from '@/lib/workspace/learn-question';

/*
 * My builds, as its page draws it: three lists, each shown only when it has something. The tests that wait first,
 * then the builds in progress (touched last first), then the built ones (built last first), in the API's own order.
 * Every date is a day in the person's own time zone, and every count of nothing is left out.
 */

/** How many questions a test has, and how many right answers pass each kind. */
export const BUILD_TEST_QUESTIONS = 10;
export const BUILD_TEST_NEED: Record<BuildTestKind, number> = { end: 7, gold: 8 };

/** The one sentence to say in the agent, in a build's folder, to go on with it. */
export const CONTINUE_SENTENCE = 'Continue my build';

/** A project as a row names it. */
export type MineProject = { slug: string; name: string };

/** A test that waits, as its row reads: the line under the project, and where its button leads. */
export type MineTestRow = {
  build: string;
  kind: BuildTestKind;
  project: MineProject;
  text: string;
  href: Route;
};

/** One square of a build's progress: a step passed, the step to do, or one to come. */
export type MineSquare = 'done' | 'current' | 'to_come';

/** A build in progress, as its row reads. */
export type MineProgressRow = {
  build: string;
  project: MineProject;
  language: string;
  step: number;
  of: number;
  /** "today", "yesterday", "2 days ago", "on 3 Nov"; null for a date that cannot be read. */
  lastStep: string | null;
  squares: MineSquare[];
  /** How many steps were passed, which removing the build forgets. */
  passed: number;
};

/** A built project, as its row reads. */
export type MineBuiltRow = {
  build: string;
  project: MineProject;
  /** The parts of the line under the name: the language, when it was built, the score, the optional parts. */
  meta: string[];
  /** The marks, gold first: "Repeated after a week", then "Answered every step". */
  repeated: boolean;
  answeredEveryStep: boolean;
  /** One line on the gold test; null once it is earned. */
  gold: string | null;
  /** The test's result page, for "Your answers". */
  answersHref: Route;
};

/** What the page draws once the person's builds are in. */
export type MineView = {
  tests: MineTestRow[];
  inProgress: MineProgressRow[];
  built: MineBuiltRow[];
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The day a moment falls on in a time zone (the browser's own when none is named), as `YYYY-MM-DD`; null if unread. */
export function dayKeyOf(moment: string | Date, timeZone?: string): string | null {
  const date = typeof moment === 'string' ? new Date(moment) : moment;
  if (Number.isNaN(date.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(date)
      .reduce<Record<string, string>>((all, part) => ({ ...all, [part.type]: part.value }), {});
    return `${parts.year}-${parts.month}-${parts.day}`;
  } catch {
    return null;
  }
}

const utcOf = (key: string): number | null => {
  const match = DAY_KEY.exec(key);
  return match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
};

/** "12 Nov" for a day of this year, "12 Nov 2025" for another; null for a day that cannot be read. */
export function shortDayOf(key: string, todayKey: string | null): string | null {
  const match = DAY_KEY.exec(key);
  if (!match) return null;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return null;
  const day = `${Number(match[3])} ${month}`;
  return todayKey && todayKey.slice(0, 4) !== match[1] ? `${day} ${match[1]}` : day;
}

/** "12 Nov" for a moment, in the person's own day. */
const shortDateOf = (moment: string, todayKey: string | null, timeZone?: string): string | null => {
  const key = dayKeyOf(moment, timeZone);
  return key ? shortDayOf(key, todayKey) : null;
};

/** When the last step was, counted in the person's days: "today", "yesterday", "5 days ago", then the day itself. */
export function lastStepOf(moment: string, now: Date, timeZone?: string): string | null {
  const key = dayKeyOf(moment, timeZone);
  const todayKey = dayKeyOf(now, timeZone);
  if (!key || !todayKey) return null;
  const days = Math.round(((utcOf(todayKey) ?? 0) - (utcOf(key) ?? 0)) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  const day = shortDayOf(key, todayKey);
  return day ? `on ${day}` : null;
}

/** The squares of a build in progress: the steps passed, the step to do, and the steps to come. */
export function squaresOf(step: number, of: number): MineSquare[] {
  const count = Math.max(0, Math.min(Math.floor(of), 100));
  return Array.from({ length: count }, (_, index) =>
    index < step - 1 ? 'done' : index === step - 1 ? 'current' : 'to_come',
  );
}

/** What "Remove" asks, in the row's place. A count of nothing is not said. */
export function removeQuestionOf(passed: number): string {
  if (passed <= 0) return 'Remove this build? The folder on your computer stays as it is.';
  const steps = passed === 1 ? 'Its passed step is' : `Its ${passed} passed steps are`;
  return `Remove this build? ${steps} forgotten, and the folder on your computer stays as it is.`;
}

/** The day `days` after a day, as `YYYY-MM-DD`; null for a day that cannot be read. */
export function dayAfter(key: string | null, days: number): string | null {
  const utc = key ? utcOf(key) : null;
  return utc === null ? null : new Date(utc + days * 86_400_000).toISOString().slice(0, 10);
}

/** What the gold test's line needs besides its state. */
export type GoldLineContext = {
  /** The gold test waits at the top of the page. */
  waits: boolean;
  /** The day the gold test first opens: a week after the person's day of Built. */
  firstDay: string | null;
  /** Whether the email on that morning is sent. */
  emails?: boolean;
};

/**
 * The line on the gold test of a built project; null once it is earned. The email goes once, on the day the test first
 * opens: a test that opens again after a failed try promises none.
 */
export function goldLineOf(gold: BuildGold, { waits, firstDay, emails = BUILD_EMAILS_BUILT }: GoldLineContext) {
  if (gold.kind === 'earned') return null;
  if (gold.kind === 'open') {
    return waits ? 'The gold test is open. It is at the top of this page.' : 'The gold test is open.';
  }
  const day = shortDayOf(gold.date, null);
  if (!day) return null;
  const email = emails && firstDay !== null && gold.date === firstDay;
  return `The gold test opens on ${day}.${email ? ' We will email you that day.' : ''}`;
}

/** The optional parts built, when any: "2 of 5 optional parts", or "the optional part built" when it is the one. */
function partsOf(build: BuildMine): string | null {
  const built = build.partsBuilt.length;
  if (built <= 0 || build.partsOf <= 0) return null;
  return build.partsOf === 1 ? 'the optional part built' : `${built} of ${build.partsOf} optional parts`;
}

const projectOf = (build: { project: MineProject }): MineProject => ({
  slug: build.project.slug,
  name: build.project.name,
});

/** The line under a test that waits. */
function testTextOf(
  test: BuildWaitingTest,
  builtAt: string | null,
  named: boolean,
  todayKey: string | null,
  tz?: string,
) {
  const language = languageNameOf(test.language);
  const need = BUILD_TEST_NEED[test.kind];
  if (test.kind === 'end') {
    return `${language}. Every step is done, and the test is left: ${BUILD_TEST_QUESTIONS} questions, about 3 minutes. ${need} right makes it Built.`;
  }
  const day = builtAt ? shortDateOf(builtAt, todayKey, tz) : null;
  const rule = `${BUILD_TEST_QUESTIONS} questions, and ${need} right earns the gold mark. One try a day.`;
  const opens = day ? `Built on ${day}. The gold test is open: ${rule}` : `The gold test is open: ${rule}`;
  // Two tests of one project wait (its two languages): the language tells them apart.
  return named ? `${language}. ${opens}` : opens;
}

/**
 * The page's three lists from the API's answer, in its order. A build whose test waits is in "Waiting for you" and not
 * again in "In progress"; a built project whose gold test is open is in both "Waiting for you" and "Built", the second
 * pointing up.
 */
export function mineViewOf(
  list: BuildMineList,
  now: Date,
  timeZone?: string,
  { emails = BUILD_EMAILS_BUILT }: { emails?: boolean } = {},
): MineView {
  const todayKey = dayKeyOf(now, timeZone);
  const waiting = new Set(list.tests.map((test) => test.build));
  const builtAtOf = new Map(
    list.built.flatMap((build) => (build.state.kind === 'built' ? [[build.build, build.state.builtAt] as const] : [])),
  );
  const projectsWaiting = list.tests.map((test) => test.project.slug);

  const tests = list.tests.map<MineTestRow>((test) => ({
    build: test.build,
    kind: test.kind,
    project: projectOf(test),
    text: testTextOf(
      test,
      builtAtOf.get(test.build) ?? null,
      projectsWaiting.filter((slug) => slug === test.project.slug).length > 1,
      todayKey,
      timeZone,
    ),
    href: buildTestPath(test.project.slug, test.kind, test.language),
  }));

  const inProgress = list.inProgress.flatMap<MineProgressRow>((build) => {
    if (build.state.kind !== 'in_progress' || waiting.has(build.build)) return [];
    const { step, of } = build.state;
    return [
      {
        build: build.build,
        project: projectOf(build),
        language: languageNameOf(build.language),
        step: step.number,
        of,
        lastStep: lastStepOf(build.lastStepAt, now, timeZone),
        squares: squaresOf(step.number, of),
        passed: build.stepsDone.length,
      },
    ];
  });

  const built = list.built.flatMap<MineBuiltRow>((build) => {
    if (build.state.kind !== 'built') return [];
    const { builtAt, score, gold } = build.state;
    const day = shortDateOf(builtAt, todayKey, timeZone);
    const meta = [
      languageNameOf(build.language),
      day ? `built ${day}` : null,
      `${score} of ${BUILD_TEST_QUESTIONS} in the test`,
      partsOf(build),
    ].filter((part): part is string => !!part);
    return [
      {
        build: build.build,
        project: projectOf(build),
        meta,
        repeated: gold.kind === 'earned',
        answeredEveryStep: build.answeredEveryStep,
        gold: goldLineOf(gold, {
          waits: waiting.has(build.build),
          firstDay: dayAfter(dayKeyOf(builtAt, timeZone), 7),
          emails,
        }),
        answersHref: buildTestPath(build.project.slug, 'end', build.language),
      },
    ];
  });

  return { tests, inProgress, built };
}

/** Whether the page has nothing to show: no test, no build in progress, nothing built. */
export const isEmptyMine = (view: MineView): boolean =>
  !view.tests.length && !view.inProgress.length && !view.built.length;

/** A project's page, where a row's name and "Open" lead. */
export const mineProjectHref = (project: MineProject): Route => buildProjectPath(project.slug);

/*
 * The route's answer, read defensively: a list the page can draw, or null for anything else.
 */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const isProject = (value: unknown): value is MineProject =>
  isRecord(value) && typeof value.slug === 'string' && typeof value.name === 'string';

function isWaitingTest(value: unknown): value is BuildWaitingTest {
  return (
    isRecord(value) &&
    typeof value.build === 'string' &&
    isBuildTestKind(value.kind) &&
    isProject(value.project) &&
    isBuildLanguage(value.language)
  );
}

function isBuild(value: unknown): value is BuildMine {
  if (!isRecord(value) || typeof value.build !== 'string' || !isProject(value.project)) return false;
  if (!isBuildLanguage(value.language) || !isRecord(value.state) || typeof value.lastStepAt !== 'string') return false;
  return Array.isArray(value.stepsDone) && Array.isArray(value.partsBuilt);
}

/** A state as the wire sends it: one object with every kind's fields, null where a kind has none. */
function stateOf(value: Record<string, unknown>): BuildMine['state'] | null {
  if (value.kind === 'test_left') return { kind: 'test_left' };
  if (value.kind === 'in_progress') {
    const step = value.step;
    if (!isRecord(step) || typeof step.number !== 'number' || typeof value.of !== 'number') return null;
    const ref = { slug: String(step.slug ?? ''), title: String(step.title ?? ''), number: step.number };
    return { kind: 'in_progress', step: ref, of: value.of };
  }
  if (value.kind !== 'built' || typeof value.builtAt !== 'string' || typeof value.score !== 'number') return null;
  const gold = isRecord(value.gold) ? value.gold : null;
  const read: BuildGold | null =
    gold?.kind === 'open'
      ? { kind: 'open' }
      : gold?.kind === 'opens_on' && typeof gold.date === 'string'
        ? { kind: 'opens_on', date: gold.date }
        : gold?.kind === 'earned' && typeof gold.at === 'string'
          ? { kind: 'earned', at: gold.at }
          : null;
  return read ? { kind: 'built', builtAt: value.builtAt, score: value.score, gold: read } : null;
}

function buildsOf(value: unknown): BuildMine[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isBuild(item)) return [];
    const state = stateOf(item.state as Record<string, unknown>);
    return state
      ? [
          {
            ...item,
            partsOf: typeof item.partsOf === 'number' ? item.partsOf : 0,
            answeredEveryStep: item.answeredEveryStep === true,
            state,
          },
        ]
      : [];
  });
}

/** My builds as the route answers them (`{ mine }`): null when the answer is not a list the page can draw. */
export function mineListOf(value: unknown): BuildMineList | null {
  if (!isRecord(value) || !Array.isArray(value.tests) || !Array.isArray(value.inProgress)) return null;
  if (!Array.isArray(value.built)) return null;
  return {
    tests: value.tests.filter(isWaitingTest),
    inProgress: buildsOf(value.inProgress),
    built: buildsOf(value.built),
  };
}

/** The list without one build: what the page shows once it was removed. */
export const withoutBuild = (list: BuildMineList, build: string): BuildMineList => ({
  tests: list.tests.filter((test) => test.build !== build),
  inProgress: list.inProgress.filter((each) => each.build !== build),
  built: list.built.filter((each) => each.build !== build),
});
