import { formatDistanceStrict } from 'date-fns';

import { type TestStanding, testStandingOf } from './test';
import type { BuildHome, BuildMine, BuildProjectCard, BuildStepRef, BuildTest, BuildWaitingTest } from './types';
import { dayWordsIn } from './zone';

/*
 * Build's home: one address, two pages. The landing for a visitor and for a signed-in person with no build; the
 * person's own home once they have one: what to do now in one box (a test that waits first, then the build to go on
 * with), the other builds in progress, and the projects to build next. What is built is not on Home: it is on My
 * builds.
 */

/** The landing lists this many projects at the most, then one link to the Projects page. */
export const HOME_PROJECTS_SHOWN = 6;

/** How long Home stays hidden for a person's side: the stylesheet's `animate-build-reveal` shows it after as long. */
export const HOME_READ_WAIT_MS = 4_000;

/** The sentence a person says in their agent to go on with a build, in any chat, on any machine. */
export const CONTINUE_SENTENCE = 'Continue my build';

/** What the browser read of the person's side: each null when it was not read, or the read failed. */
export type BuildHomeSide = {
  home: BuildHome | null;
  /** Every build of every project they touched, the built ones included. */
  builds: BuildMine[] | null;
  /** Whether an agent of theirs ever connected; read only for a person with no build. */
  agentConnected: boolean | null;
  /** The test that waits first, as read: a run in progress or a failed try changes what the box says. */
  test?: BuildTest | null;
  /** The zone the person's days are counted in: every date of the page is written in it. */
  zone?: string;
};

/** What the box at the top asks the person to do now. */
export type BuildHomeBox =
  /**
   * A test waits: the end test, or a gold test that opened (with the day the project was built, when known), and where
   * it stands when it was read (a run in progress, a failed try; none for a test not started).
   */
  | { kind: 'test'; test: BuildWaitingTest; builtAt: string | null; standing: TestStanding | null }
  /** The build to go on with: the one touched last, on a step of the base or of an optional part (`part`). */
  | { kind: 'build'; build: BuildMine; step: BuildStepRef; of: number; part: boolean }
  /** Nothing waits and nothing is in progress: the projects left to build, how many (null: some, the number not known). */
  | { kind: 'pick'; left: number | null }
  /** Every project is built. */
  | { kind: 'all_built' };

/** Home, as it draws. */
export type BuildHomeView =
  | { kind: 'landing'; agentConnected: boolean }
  | { kind: 'home'; box: BuildHomeBox; others: BuildMine[]; next: BuildProjectCard[] };

/** A visitor's page: the landing with "Connect your agent". */
export const VISITOR_HOME: BuildHomeView = { kind: 'landing', agentConnected: false };

/** Where a build stands: a step of the base, or of an optional part (`part`), and of how many. */
export type BuildPlace = { step: BuildStepRef; of: number; part: boolean };

/** The step a build is on, and of how many: the base's step, or a part's after the base. None with the test left. */
export function stepOfBuild(build: BuildMine): BuildPlace | null {
  if (build.state.kind === 'in_progress') return { step: build.state.step, of: build.state.of, part: false };
  const part = build.partStep;
  return part?.step && typeof part.of === 'number' ? { step: part.step, of: part.of, part: true } : null;
}

/** Where a build stands in words: "step 9 of 16", or "optional part, step 3 of 6" for a step of a part. */
export const placeWordsOf = (place: { step: { number: number }; of: number; part: boolean }): string =>
  `${place.part ? 'optional part, step' : 'step'} ${place.step.number} of ${place.of}`;

/** When a moment was, as a number: later is larger; a moment that cannot be read is the earliest. */
const momentOf = (iso: string): number => {
  const at = Date.parse(iso);
  return Number.isNaN(at) ? Number.NEGATIVE_INFINITY : at;
};

/**
 * Every build to go on with, touched last first: the API's builds in progress (`home.builds`, the test left included)
 * and the built ones with an optional part in hand, which only the list of every build (`builds`) carries.
 */
export function buildsInProgressOf(home: BuildHome, builds: readonly BuildMine[] | null): BuildMine[] {
  const listed = new Set(home.builds.map((build) => build.build));
  const inPart = (builds ?? []).filter(
    (build) => build.state.kind === 'built' && build.partStep && !listed.has(build.build),
  );
  if (!inPart.length) return home.builds;
  return [...home.builds, ...inPart].sort((a, b) => momentOf(b.lastStepAt) - momentOf(a.lastStepAt));
}

/** Whether the person has a build of any kind: in progress, with a test waiting, or built. */
export function hasBuildOf(side: BuildHomeSide): boolean {
  const { home, builds } = side;
  return !!home && (home.builds.length > 0 || home.tests.length > 0 || (builds?.length ?? 0) > 0);
}

/**
 * How many projects the person has not touched, of the public list. When the list is not known (its read failed), the
 * API's next projects say only whether some are left, not how many (it names three at the most): null for some.
 */
function leftOf(side: BuildHomeSide, home: BuildHome, projects: readonly BuildProjectCard[]): number | null {
  if (!projects.length) return home.next.length ? null : 0;
  const touched = new Set([...home.builds, ...(side.builds ?? [])].map((build) => build.project.slug));
  return projects.filter((card) => !touched.has(card.slug)).length;
}

/**
 * The page for what was read: the landing while nothing says the person has a build (a visitor, Build not open to
 * them, a failed read), else their home. A test comes first in the box, then the build touched last; the other builds
 * in progress follow, one row each.
 */
export function homeViewOf(side: BuildHomeSide | null, projects: readonly BuildProjectCard[]): BuildHomeView {
  if (!side?.home || !hasBuildOf(side)) {
    return { kind: 'landing', agentConnected: side?.agentConnected === true };
  }
  const { home } = side;
  const test = home.tests[0] ?? null;
  const inProgress = buildsInProgressOf(home, side.builds);
  const going = test ? null : (inProgress.find((build) => stepOfBuild(build) !== null) ?? null);
  let box: BuildHomeBox;
  if (test) {
    const built = side.builds?.find((build) => build.build === test.build);
    const read = side.test;
    const same =
      read && read.kind === test.kind && read.project.slug === test.project.slug && read.language === test.language;
    box = {
      kind: 'test',
      test,
      builtAt: built?.state.kind === 'built' ? built.state.builtAt : null,
      standing: same ? testStandingOf(read) : null,
    };
  } else if (going) {
    const { step, of, part } = stepOfBuild(going) as BuildPlace;
    box = { kind: 'build', build: going, step, of, part };
  } else {
    const left = leftOf(side, home, projects);
    box = left === 0 ? { kind: 'all_built' } : { kind: 'pick', left };
  }
  // The box's build is not listed again; a build whose test is in the box still is while it is in an optional part,
  // since the part goes on in the agent.
  const others = inProgress.filter(
    (build) => build.build !== going?.build && (build.build !== test?.build || stepOfBuild(build)?.part === true),
  );
  return { kind: 'home', box, others, next: home.next };
}

/** A day as Build's boxes write it: "26 Nov", in the zone the person's days are counted in. */
export const dayWords = (iso: string, zone?: string): string => dayWordsIn(iso, zone);

/**
 * When a build with no step passed was started, as Home, a project's box and My builds all say it: "started 26 Nov",
 * the day in the zone the person's days are counted in. Empty for a moment that cannot be read.
 */
export function startedWords(iso: string, zone?: string): string {
  const day = dayWords(iso, zone);
  return day ? `started ${day}` : '';
}

/**
 * When a build last moved: "last step 2 days ago", "last step just now" under a minute. A build with no step passed
 * yet says the day it started instead (`startedWords`): its time is the start's.
 */
export function lastStepWords(iso: string, now: Date, started = false, zone?: string): string {
  if (started) return startedWords(iso, zone);
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '';
  if (now.getTime() - at.getTime() < 60_000) return 'last step just now';
  return `last step ${formatDistanceStrict(at, now, { addSuffix: true, roundingMethod: 'round' })}`;
}

/** The code of every project, in its public repository. */
export const BUILD_CODE_URL = 'https://github.com/gitranks/build';
