import type { Route } from 'next';

import type { BuildLanguage, BuildTestKind } from './types';

/**
 * Every address of Build's pages, of the routes the browser reads a person's side from, and Build's cache tags, built
 * here and nowhere else.
 */

/** Build's home: the landing for a visitor and for a person with no build, the person's own home once they have one. */
export const BUILD_HOME_PATH = '/build' as Route;
/** All projects. */
export const BUILD_PROJECTS_PATH = '/build/projects' as Route;
/** The signed-in person's builds. */
export const BUILD_MINE_PATH = '/build/mine' as Route;
/** The start flow: connect an agent, then start a project. */
export const BUILD_START_PATH = '/build/start' as Route;
/** "How Build works": the landing, kept reachable for a person with a build. */
export const BUILD_ABOUT_PATH = '/build/about' as Route;

/** The query a link from Build adds to a page every product shares (Settings), so the page shows Build's bar. */
export const FROM_BUILD = 'build';
/** Settings, reached from Build. */
export const BUILD_SETTINGS_PATH = `/my/settings?from=${FROM_BUILD}` as Route;
/** A person's Skills page, where their built projects show too. */
export const buildSkillsPath = (login: string) => `/profile/${encodeURIComponent(login)}/skills` as Route;

/** The test's two kinds in an address: the end test at `/test`, the gold test at `/test/gold`. */
const TEST_SEGMENT: Record<BuildTestKind, string> = { end: 'test', gold: 'test/gold' };

const languageQuery = (language: BuildLanguage | null | undefined) =>
  language ? `?language=${encodeURIComponent(language)}` : '';

/** A project's page. */
export const buildProjectPath = (project: string) => `/build/${encodeURIComponent(project)}` as Route;
/** A step's page. */
export const buildStepPath = (project: string, step: string) =>
  `${buildProjectPath(project)}/${encodeURIComponent(step)}` as Route;
/** The start flow, for one project when it was opened from that project's page. */
export const buildStartPath = (project: string | null = null) =>
  (project ? `${BUILD_START_PATH}?project=${encodeURIComponent(project)}` : BUILD_START_PATH) as Route;
/**
 * A project's test of either kind. With two builds of the project waiting for it, the page opens the one touched last,
 * and `language` names the other.
 */
export const buildTestPath = (project: string, kind: BuildTestKind = 'end', language: BuildLanguage | null = null) =>
  `${buildProjectPath(project)}/${TEST_SEGMENT[kind]}${languageQuery(language)}` as Route;
/** A Learn course that helps with a project, as a project's page links it. */
export const buildCoursePath = (course: string) => `/learn/courses/${encodeURIComponent(course)}` as Route;

/*
 * Where the browser reads the signed-in person's side of each page, and sends their writes. Every route answers for
 * the session's own person and is never kept.
 */

/** Whether Build is open to the signed-in person. */
export const BUILD_OPEN_MINE_PATH = '/api/me/build/open';
/** Build's bar. */
export const BUILD_BAR_MINE_PATH = '/api/me/build/bar';
/** Build's home: the builds in progress, the tests that wait, the projects to build next. */
export const BUILD_HOME_MINE_PATH = '/api/me/build/home';
/** The person's builds, for their place on each project's card. */
export const BUILD_PROJECTS_MINE_PATH = '/api/me/build/projects';
/** The person's side of one project. */
export const buildProjectMinePath = (project: string) => `${BUILD_PROJECTS_MINE_PATH}/${encodeURIComponent(project)}`;
/** The person's side of one step: for each of their builds of the project, whether the step is done. */
export const buildStepMinePath = (project: string, step: string) =>
  `${buildProjectMinePath(project)}/steps/${encodeURIComponent(step)}`;
/** My builds. */
export const BUILD_MINE_MINE_PATH = '/api/me/build/mine';
/** The start flow's state, for one project or none. */
export const buildStartMinePath = (project: string | null = null) =>
  project ? `/api/me/build/start?project=${encodeURIComponent(project)}` : '/api/me/build/start';
/** A test of the person's build of a project: the run in progress, the last result, whether a new one can start. */
export const buildTestMinePath = (
  project: string,
  kind: BuildTestKind,
  language: BuildLanguage | null = null,
  { plain = false }: { plain?: boolean } = {},
) => {
  const query = new URLSearchParams({ project, kind });
  if (language) query.set('language', language);
  // A box outside the test reads only where it stands: the code is not highlighted for it.
  if (plain) query.set('plain', '1');
  return `/api/me/build/test?${query}`;
};
/** Starts a run of a test (`POST`, `{ project, kind, language }`). */
export const BUILD_TEST_START_MINE_PATH = '/api/me/build/test/start';
/** Answers one question of a run (`POST`, `{ run, question, pick }`). */
export const BUILD_TEST_ANSWER_MINE_PATH = '/api/me/build/test/answer';
/** Removes a build in progress (`POST`, `{ build }`). */
export const BUILD_REMOVE_MINE_PATH = '/api/me/build/remove';
/** Turns Build's reminders on or off (`POST`, `{ reminders }`). */
export const BUILD_SETTINGS_SAVE_MINE_PATH = '/api/me/build/settings/save';
/** The time zone the person's days are counted in, which every date of Build is written in. */
export const BUILD_ZONE_MINE_PATH = '/api/me/build/zone';
/** The doors into Build for a course, or for the course of an issue's lesson: its projects and the person's builds. */
export const buildDoorsMinePath = (of: { course: string } | { lesson: string }) =>
  `/api/me/build/doors?${new URLSearchParams(of)}`;

/*
 * Cache tags. The public pages are kept for hours under them, and the API expires them when the content changes.
 */

/** Every page that lists the projects. */
export const BUILD_PROJECTS_TAG = 'build:projects';
/** A project's page. */
export const buildProjectTag = (project: string) => `build:project:${project}`;
/** A step's page. */
export const buildStepTag = (project: string, step: string) => `build:step:${project}:${step}`;

const BUILD_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MAX_LENGTH = 100;

/** The slugs no project may have: Build's own pages sit at those addresses. */
export const RESERVED_PROJECT_SLUGS: ReadonlySet<string> = new Set(['projects', 'mine', 'start', 'about', 'test']);
/** The slugs no step may have: a project's tests sit at those addresses. */
export const RESERVED_STEP_SLUGS: ReadonlySet<string> = new Set(['test', 'gold']);

/** Whether a slug has the shape a project's or a step's slug has: asked of the API only then. */
export const isBuildSlug = (slug: string): boolean => slug.length <= SLUG_MAX_LENGTH && BUILD_SLUG.test(slug);
/** Whether a slug can be a project's: of the shape, and not one of Build's own pages. */
export const isBuildProjectSlug = (slug: string): boolean => isBuildSlug(slug) && !RESERVED_PROJECT_SLUGS.has(slug);
/** Whether a slug can be a step's: of the shape, and not one of a project's tests. */
export const isBuildStepSlug = (slug: string): boolean => isBuildSlug(slug) && !RESERVED_STEP_SLUGS.has(slug);

/** Whether a tag is one of Build's, as the API sends it to be expired. */
export function isBuildTag(tag: string): boolean {
  if (tag === BUILD_PROJECTS_TAG) return true;
  const project = /^build:project:(.*)$/s.exec(tag)?.[1];
  if (project !== undefined) return isBuildProjectSlug(project);
  const step = /^build:step:([^:]*):(.*)$/s.exec(tag);
  return !!step && isBuildProjectSlug(step[1]) && isBuildStepSlug(step[2]);
}

/** Whether a path is one of Build's pages: `/build` and everything under it, which the proxy's gate closes. */
export const isBuildPath = (pathname: string): boolean => /^\/build(?:\/|$)/.test(pathname);
