import type { Route } from 'next';

import {
  BUILD_ABOUT_PATH,
  BUILD_HOME_PATH,
  BUILD_MINE_PATH,
  BUILD_PROJECTS_PATH,
  BUILD_SETTINGS_PATH,
  FROM_BUILD,
  isBuildPath,
  RESERVED_PROJECT_SLUGS,
} from './paths';
import type { BuildBar } from './types';

/*
 * Build's bar, as the approved designs draw it: Home and Projects for everyone; My builds and Settings for a person
 * with a build; "Test" on the right, with how many, when a test waits. A step, a test and the start flow have no bar.
 */

/** The bar's tabs, in order. */
export type BuildBarTab = 'home' | 'projects' | 'mine' | 'settings';

export const BUILD_BAR_TABS: Record<BuildBarTab, { label: string; href: Route }> = {
  home: { label: 'Home', href: BUILD_HOME_PATH },
  projects: { label: 'Projects', href: BUILD_PROJECTS_PATH },
  mine: { label: 'My builds', href: BUILD_MINE_PATH },
  settings: { label: 'Settings', href: BUILD_SETTINGS_PATH },
};

/**
 * Where "Test" leads: My builds, where every test that waits is first. The bar's answer says how many wait, not which,
 * so one link serves one test and several.
 */
export const BUILD_BAR_TEST_HREF: Route = BUILD_MINE_PATH;

/** What the bar draws: its tabs, and the count on "Test" (null when no test waits: never a zero). */
export type BuildBarView = { tabs: BuildBarTab[]; tests: number | null };

/** A visitor's bar, and a bar whose read failed: Home and Projects, nothing on the right. */
export const VISITOR_BUILD_BAR: BuildBarView = { tabs: ['home', 'projects'], tests: null };

/** A count of tests as the bar shows it: a whole number above zero, else none. */
const testsOf = (tests: number | null | undefined): number | null =>
  typeof tests === 'number' && Number.isFinite(tests) && tests >= 1 ? Math.floor(tests) : null;

/** The bar for the API's answer; a visitor's for none (signed out, or a failed read). */
export function buildBarViewOf(read: BuildBar | null | undefined): BuildBarView {
  if (!read) return VISITOR_BUILD_BAR;
  return {
    tabs: read.hasBuild ? ['home', 'projects', 'mine', 'settings'] : ['home', 'projects'],
    tests: testsOf(read.tests),
  };
}

/** Matches the path, ending in a slash or not. */
const at = (pathname: string, path: string) => pathname === path || pathname === `${path}/`;

/** The first segment under `/build`, decoded; null for `/build` itself and for a segment that cannot be decoded. */
function firstSegmentOf(pathname: string): string | null {
  const segment = /^\/build\/([^/]+)\/?$/.exec(pathname)?.[1];
  if (segment === undefined) return null;
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/**
 * The current tab for a path, as the designs' table "Which tab of the bar is current" lists it: Home on Build's home
 * and on "How Build works"; Projects on the list and on a project; My builds on My builds; Settings on Settings and
 * the Agent page when Build opened them (`from` is the page's `?from=`). None anywhere else: a step and a test have no
 * bar, and "Test" is never the current place.
 */
export function buildBarPlaceOf(pathname: string, from: string | null = null): BuildBarTab | null {
  if (isBuildPath(pathname)) {
    if (at(pathname, BUILD_HOME_PATH) || at(pathname, BUILD_ABOUT_PATH)) return 'home';
    if (at(pathname, BUILD_MINE_PATH)) return 'mine';
    if (at(pathname, BUILD_PROJECTS_PATH)) return 'projects';
    const project = firstSegmentOf(pathname);
    return project && !RESERVED_PROJECT_SLUGS.has(project) ? 'projects' : null;
  }
  if (from !== FROM_BUILD) return null;
  if (/^\/my\/(?:settings|agent)(?:\/|$)/.test(pathname)) return 'settings';
  return null;
}
