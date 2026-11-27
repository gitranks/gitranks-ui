import type { Route } from 'next';

import { buildsInProgressOf, placeWordsOf, stepOfBuild } from './home';
import { BUILD_TEST_NEED, BUILD_TEST_QUESTIONS, CONTINUE_SENTENCE } from './mine';
import { BUILD_HOME_PATH, BUILD_MINE_PATH, BUILD_PROJECTS_PATH, buildProjectPath, buildTestPath } from './paths';
import type { BuildHome, BuildMine } from './types';

/*
 * Build's card in the home page's block, beside Learn's and Contribute's: the same four parts in the same places (a
 * title, one line, where it leads, and "New" beside the name). It promotes Build to someone with no build; for someone
 * with one it says the first of these that is true: a test waits; the gold test is open; the build touched last and
 * its next step; the projects built and the next one to pick. It never shows a zero. Pure: the browser's reads come in.
 */

/** Build's card, as the block draws it. `isNew`: "New" beside the name, until the person starts a build. */
export type BuildCardWords = {
  title: string;
  line: string;
  action: string;
  href: Route;
  isNew: boolean;
  personal: boolean;
};

/**
 * What the browser read of the person's side: their home (builds in progress, tests that wait, projects to build
 * next), every build they have (the built ones included), and whether they have a build at all (Build's bar). Each null
 * when it was not read, or the read failed.
 */
export type BuildCardSide = { home: BuildHome | null; builds: BuildMine[] | null; hasBuild: boolean | null };

/** The promotion, the same for everyone. */
export const BUILD_CARD_PROMO: BuildCardWords = {
  title: 'Build a real thing, step by step',
  line: 'Pick a project, like an MCP server or a key-value database. Your coding agent writes it with you, one step at a time.',
  action: 'Start building',
  href: BUILD_HOME_PATH,
  isNew: true,
  personal: false,
};

/** The promotion for someone with a build when nothing more could be read: no "New", and it leads into Build. */
const USED_PROMO: BuildCardWords = { ...BUILD_CARD_PROMO, action: 'Open Build', isNew: false };

/** A title ended as a sentence: "Check the input." and "Why does it hang?" alike. */
const sentence = (text: string) => (/[.?!]$/.test(text) ? text : `${text}.`);

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** How many projects the person built, each counted once whatever its languages. */
function builtProjectsOf(builds: readonly BuildMine[] | null): number {
  if (!builds) return 0;
  return new Set(builds.filter((build) => build.state.kind === 'built').map((build) => build.project.slug)).size;
}

/** Whether the person has a build of any kind, from what was read. */
function hasBuildOf(side: BuildCardSide): boolean {
  if (side.hasBuild === true) return true;
  const { home, builds } = side;
  return (home?.builds.length ?? 0) > 0 || (home?.tests.length ?? 0) > 0 || (builds?.length ?? 0) > 0;
}

/** Build's card for what was read: the promotion for none (a visitor, no build, a failed read). */
export function buildCardOf(side: BuildCardSide | null): BuildCardWords {
  if (!side || !hasBuildOf(side)) return BUILD_CARD_PROMO;
  const { home } = side;
  if (!home) return USED_PROMO;
  const base = { ...USED_PROMO, personal: true };

  const endTest = home.tests.find((test) => test.kind === 'end');
  if (endTest) {
    return {
      ...base,
      title: 'Your test is waiting',
      line: `${endTest.project.name}: ${BUILD_TEST_QUESTIONS} questions, about 3 minutes.`,
      action: 'Take the test',
      href: buildTestPath(endTest.project.slug, 'end', endTest.language),
    };
  }
  const goldTest = home.tests.find((test) => test.kind === 'gold');
  if (goldTest) {
    return {
      ...base,
      title: 'Your gold test is open',
      line: `${goldTest.project.name}: ${BUILD_TEST_QUESTIONS} questions, and ${BUILD_TEST_NEED.gold} right earns the gold mark.`,
      action: 'Take the gold test',
      href: buildTestPath(goldTest.project.slug, 'gold', goldTest.language),
    };
  }

  // A built project with an optional part in hand is a build to go on with too.
  const going = buildsInProgressOf(home, side.builds).filter((build) => stepOfBuild(build) !== null);
  const last = going[0];
  const place = last ? stepOfBuild(last) : null;
  if (last && place) {
    const others = going.length - 1;
    const next = `Next: ${sentence(place.step.title)}`;
    return {
      ...base,
      title: `${last.project.name}: ${placeWordsOf(place)}`,
      line: others
        ? `${next} And ${plural(others, 'more build', 'more builds')} in progress.`
        : `${next} Say “${CONTINUE_SENTENCE}” in your agent.`,
      action: others ? 'Open your builds' : 'Open your build',
      href: others ? BUILD_MINE_PATH : buildProjectPath(last.project.slug),
    };
  }

  const built = builtProjectsOf(side.builds);
  if (built) {
    const next = home.next[0];
    return {
      ...base,
      title: `${plural(built, 'project built', 'projects built')}`,
      line: next ? `Next for you: ${sentence(next.name)}` : 'You built every project there is so far.',
      action: next ? 'Pick your next project' : 'Open your builds',
      href: next ? BUILD_PROJECTS_PATH : BUILD_MINE_PATH,
    };
  }
  return USED_PROMO;
}
