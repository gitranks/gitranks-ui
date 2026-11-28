import type { Route } from 'next';

import { durationWordsOf } from './duration';
import { buildCoursePath, buildProjectPath, buildStepPath } from './paths';
import { type TestStanding, testStandingOf } from './test';
import type {
  BuildGold,
  BuildLanguage,
  BuildLevel,
  BuildMine,
  BuildPart,
  BuildProjectMine,
  BuildProjectPage,
  BuildStepRef,
  BuildTest,
} from './types';
import { dayKeyIn, daysFromTo, dayWordsIn } from './zone';

/*
 * A project's page, as the approved designs draw it: the words of its facts, where the person stands on each step and
 * part, the box "what to do now" and the doors of "What next". Pure: the page and its specs read the same answers.
 */

/** How a project's level reads. */
const LEVEL_WORDS: Record<BuildLevel, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

/** A project's level in a word: Easy, Medium or Hard. */
export const levelWordOf = (level: BuildLevel): string => LEVEL_WORDS[level] ?? 'Easy';

/** The languages' names as a person reads them. */
const LANGUAGE_NAMES: Record<BuildLanguage, string> = { typescript: 'TypeScript', python: 'Python' };

/** A language's name: "TypeScript", "Python". */
export const languageNameOf = (language: BuildLanguage): string => LANGUAGE_NAMES[language] ?? language;

/** A list of names joined as a sentence says them: "A", "A or B", "A, B or C". */
function orList(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}

/** A project's languages as one phrase: "TypeScript or Python". */
export const languagesWordsOf = (languages: readonly BuildLanguage[]): string => orList(languages.map(languageNameOf));

/** "16 steps", "1 step". */
export const stepsWordsOf = (count: number): string => `${count} ${count === 1 ? 'step' : 'steps'}`;

/** The base's length and time: "16 steps, about an hour and a half". */
export function baseWordsOf(project: Pick<BuildProjectPage, 'baseSteps' | 'minutes'>): string {
  const time = durationWordsOf(project.minutes);
  return time ? `${stepsWordsOf(project.baseSteps)}, ${time}` : stepsWordsOf(project.baseSteps);
}

/** The facts under a project's name: its level, its base's length and time, its languages. */
export function projectFactsOf(project: BuildProjectPage): string[] {
  return [levelWordOf(project.level), baseWordsOf(project), languagesWordsOf(project.languages)].filter(Boolean);
}

/** What a person with no build says in their agent to start the project. */
export const startSentenceOf = (project: Pick<BuildProjectPage, 'thing'>): string =>
  `Teach me how to build ${project.thing} with GitRanks`;

/**
 * A day as the page writes it: "26 Nov", the day a moment falls on in the zone the person's days are counted in. A
 * date alone (`2026-12-03`) is that day.
 */
export const dayOf = (iso: string, zone?: string): string => dayWordsIn(iso, zone);

/** A day with its year: "26 Nov 2026". */
export const dayYearOf = (iso: string, zone?: string): string => dayWordsIn(iso, zone, { year: true });

/* ------------------------------------------------------------------------------------------------------------------ */
/* Where the person stands                                                                                            */
/* ------------------------------------------------------------------------------------------------------------------ */

/**
 * Who reads the page: not known yet; a visitor; a session whose side did not come (a failed read); or a person with their side of the project and, when their build has the test left, that test.
 */
export type ProjectSide =
  | { kind: 'pending' }
  | { kind: 'visitor' }
  | { kind: 'session' }
  | {
      kind: 'person';
      mine: BuildProjectMine;
      /** The test that waits for the build the page is about (the end test, or a gold test that is open), when read. */
      test: BuildTest | null;
      /** The zone the person's days are counted in: every date of the box is written in it. */
      zone?: string;
    };

/** The build the page is about: the one touched last. None before the side comes, and for a person with none. */
export const boxBuildOf = (side: ProjectSide): BuildMine | null =>
  side.kind === 'person' ? (side.mine.builds[0] ?? null) : null;

/** A step as a row marks it: passed, the one the build stands on, or neither. */
export type StepMark = 'done' | 'current';

/** The marks of every step for one build: its passed steps, then the step it stands on, in the base or in a part. */
export function stepMarksOf(build: BuildMine | null): Map<string, StepMark> {
  const marks = new Map<string, StepMark>();
  if (!build) return marks;
  for (const slug of build.stepsDone) marks.set(slug, 'done');
  if (build.state.kind === 'in_progress') marks.set(build.state.step.slug, 'current');
  if (build.partStep) marks.set(build.partStep.step.slug, 'current');
  return marks;
}

/** One square of a build's progress: passed, the step in hand, or to come. */
export type ProgressSquare = 'done' | 'current' | 'todo';

/** A list of steps as squares, from the marks. */
export const squaresOf = (steps: readonly BuildStepRef[], marks: ReadonlyMap<string, StepMark>): ProgressSquare[] =>
  steps.map((step) => marks.get(step.slug) ?? 'todo');

/** Where a part stands for a build: built, or how many of its steps are passed (none drawn as nothing). */
export type PartStanding = { built: boolean; done: number | null };

export function partStandingOf(part: BuildPart, build: BuildMine | null): PartStanding {
  if (!build) return { built: false, done: null };
  if (build.partsBuilt.includes(part.slug)) return { built: true, done: null };
  const done = part.steps.filter((step) => build.stepsDone.includes(step.slug)).length;
  return { built: false, done: done > 0 ? done : null };
}

/** The part a build goes on with: the one in progress, else the first one not built. None when every part is built. */
export function nextPartOf(project: BuildProjectPage, build: BuildMine | null): BuildPart | null {
  const parts = project.partsFull;
  if (build?.partStep) {
    const current = parts.find((part) => part.slug === build.partStep?.part);
    if (current) return current;
  }
  return parts.find((part) => !build?.partsBuilt.includes(part.slug)) ?? null;
}

/** Where a part's link leads: its first step the build has not passed, else its first step. */
export function partHrefOf(project: { slug: string }, part: BuildPart, build: BuildMine | null): Route | null {
  const step = part.steps.find((each) => !build?.stepsDone.includes(each.slug)) ?? part.steps[0];
  return step ? buildStepPath(project.slug, step.slug) : null;
}

/** How many parts a build has built, of how many. */
export function partsBuiltOf(project: BuildProjectPage, build: BuildMine): { built: number; of: number } {
  const of = project.partsFull.length;
  const built = project.partsFull.filter((part) => build.partsBuilt.includes(part.slug)).length;
  return { built, of };
}

/** The name of a part by its slug; none when the project has no such part today. */
export const partNameOf = (project: BuildProjectPage, slug: string): string | null =>
  project.partsFull.find((part) => part.slug === slug)?.name ?? null;

/** A build's place in one short phrase, for the line that names a person's other build: "step 4 of 16". */
export function standingWordsOf(build: BuildMine, zone?: string): string {
  const { state } = build;
  if (state.kind === 'in_progress') return `step ${state.step.number} of ${state.of}`;
  if (state.kind === 'test_left') return 'every step done, the test left';
  return `built on ${dayOf(state.builtAt, zone)}`;
}

/** The line that names the person's other build of the project: "Your Python build: step 4 of 16." */
export const otherBuildLineOf = (build: BuildMine, zone?: string): string =>
  `Your ${languageNameOf(build.language)} build: ${standingWordsOf(build, zone)}.`;

/**
 * Where the test that waits for the box's build stands: a run in progress, or a failed end test. None when nothing was
 * read, and for a test that is not the one waiting (an end test once Built, a gold test that is not open).
 */
export function boxTestOf(side: ProjectSide): TestStanding | null {
  if (side.kind !== 'person' || !side.test) return null;
  const state = side.mine.builds[0]?.state;
  const waits =
    side.test.kind === 'end' ? state?.kind === 'test_left' : state?.kind === 'built' && state.gold.kind === 'open';
  return waits ? testStandingOf(side.test) : null;
}

/**
 * What a built project's box says of its gold test: when it opens, a week after the build was built; that it is
 * open; nothing once earned. A gold test that failed opens again the next day: more than a week after. The day the
 * project was built is read in the zone the API counted the gold test's day in, so the two agree.
 */
export function goldWordsOf(gold: BuildGold, builtAt: string, zone?: string): string | null {
  if (gold.kind === 'earned') return null;
  if (gold.kind === 'open')
    return 'The gold test is open: 10 questions, and 8 right earns the gold mark. One try a day.';
  const days = daysFromTo(dayKeyIn(builtAt, zone), dayKeyIn(gold.date, zone));
  if (days === null) return `The gold test opens on ${dayOf(gold.date)}.`;
  return days > 7
    ? `The gold test opens again on ${dayOf(gold.date)}: 10 questions, and 8 right earns the gold mark.`
    : `The gold test opens on ${dayOf(gold.date)}, a week after you built it: 10 questions, and 8 right earns the gold mark.`;
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* What next                                                                                                          */
/* ------------------------------------------------------------------------------------------------------------------ */

/** One door of "What next": what it is, where it leads, and a line about it. */
export type WhatNextDoor = { label: string; title: string; line: string; href: Route };

/**
 * The doors of a built project: its next optional part, the next project, a Learn course. A door with nothing behind
 * it is not drawn, so a project may have one door, or none.
 */
export function whatNextOf(project: BuildProjectPage, build: BuildMine): WhatNextDoor[] {
  const doors: WhatNextDoor[] = [];
  const part = nextPartOf(project, build);
  const partHref = part ? partHrefOf(project, part, build) : null;
  if (part && partHref) {
    const { built, of } = partsBuiltOf(project, build);
    const left = of - built;
    const steps = stepsWordsOf(part.steps.length);
    // The part in progress says where the person is in it.
    const at = build.partStep?.part === part.slug ? build.partStep : null;
    const line = at
      ? `You are on step ${at.step.number} of ${at.of}`
      : of === 1
        ? `The optional part · ${steps}`
        : built === 0
          ? `The first of ${of} optional parts · ${steps}`
          : `The next optional part · ${steps} · ${left} ${left === 1 ? 'part' : 'parts'} left`;
    doors.push({
      label: 'Go on with this project',
      title: part.name,
      line,
      href: partHref,
    });
  }
  const next = project.next[0];
  if (next) {
    doors.push({
      label: 'Build next',
      title: next.name,
      line: `${next.line.replace(/\.$/, '')} · ${stepsWordsOf(next.baseSteps)}`,
      href: buildProjectPath(next.slug),
    });
  }
  const course = project.courses[0];
  if (course) {
    doors.push({ label: 'Go deeper', title: course.name, line: 'A Learn course', href: buildCoursePath(course.slug) });
  }
  return doors;
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* What you need                                                                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

/** One row of "What you need". */
export type NeedRow = { name: string; why: string | null };

/** What the agent says it checks about a runtime. */
export const RUNTIME_CHECKED = 'Your agent checks this before the first step.';

/**
 * The rows of "What you need": the languages' runtimes in one row ("Node 22 or newer, or Python 3.12 or newer"), then
 * everything else, each with why.
 */
export function needRowsOf(project: BuildProjectPage): NeedRow[] {
  const runtimes = project.needsFull
    .filter((need) => need.language !== null)
    .map((need) => (need.version ? `${need.name} ${need.version} or newer` : need.name));
  const rows: NeedRow[] = runtimes.length ? [{ name: runtimes.join(', or '), why: RUNTIME_CHECKED }] : [];
  for (const need of project.needsFull) {
    if (need.language === null) rows.push({ name: need.name, why: need.why });
  }
  return rows;
}
