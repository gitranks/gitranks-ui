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
  /** The build to go on with: the one touched last. */
  | { kind: 'build'; build: BuildMine; step: BuildStepRef; of: number }
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

/** The step a build is on, and of how many: the base's step, or a part's after the base. None with the test left. */
export function stepOfBuild(build: BuildMine): { step: BuildStepRef; of: number } | null {
  if (build.state.kind === 'in_progress') return { step: build.state.step, of: build.state.of };
  return build.partStep ? { step: build.partStep.step, of: build.partStep.of } : null;
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
  const going = test ? null : (home.builds.find((build) => stepOfBuild(build) !== null) ?? null);
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
    const { step, of } = stepOfBuild(going) as { step: BuildStepRef; of: number };
    box = { kind: 'build', build: going, step, of };
  } else {
    const left = leftOf(side, home, projects);
    box = left === 0 ? { kind: 'all_built' } : { kind: 'pick', left };
  }
  const inBox = test?.build ?? going?.build ?? null;
  return { kind: 'home', box, others: home.builds.filter((build) => build.build !== inBox), next: home.next };
}

/**
 * When a build last moved: "last step 2 days ago", "last step just now" under a minute. A build with no step passed
 * yet says when it started ("started 5 minutes ago"): its time is the start's.
 */
export function lastStepWords(iso: string, now: Date, started = false): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '';
  const what = started ? 'started' : 'last step';
  if (now.getTime() - at.getTime() < 60_000) return `${what} just now`;
  return `${what} ${formatDistanceStrict(at, now, { addSuffix: true, roundingMethod: 'round' })}`;
}

/** A day as Build's boxes write it: "26 Nov", in the zone the person's days are counted in. */
export const dayWords = (iso: string, zone?: string): string => dayWordsIn(iso, zone);

/** The code of every project, in its public repository. */
export const BUILD_CODE_URL = 'https://github.com/gitranks/build';
