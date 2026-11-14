import type { Route } from 'next';

/** Learn's front door, and how Learn works. */
export const LEARN_PATH = '/learn' as Route;
/** The user's lessons: their Learn attempts and the shared lessons they passed. */
export const MY_LESSONS_PATH = '/learn/lessons' as Route;
/** The user's goal and level. */
export const LEARN_PROFILE_PATH = '/learn/profile' as Route;
/** What a Learn pull request is, for maintainers. Open to everyone. */
export const LEARN_MAINTAINERS_PATH = '/learn/maintainers' as Route;

/** A Learn attempt's page: the lesson, then the pull request. */
export const learnAttemptPath = (attemptId: string) => `/learn/attempts/${encodeURIComponent(attemptId)}` as Route;

/**
 * Whether Learn's front door is open to visitors without a session. Off while Learn is open only to the people the API
 * lets in: the proxy answers a visitor's `/learn` with a 404, and the home page leaves out its Learn section. Turning it
 * on opens both: the proxy lets visitors through to `/learn`, which shows them its visitor version, and the home page
 * shows the section that links there. Learn's other closed pages stay closed to visitors.
 */
export const LEARN_OPEN_TO_VISITORS = false as boolean;

/** Matches the path, decoded as the router reads it, against `pattern`; a path that does not decode never matches. */
function decodedMatches(pathname: string, pattern: RegExp): boolean {
  try {
    return pattern.test(decodeURIComponent(pathname));
  } catch {
    return false;
  }
}

/**
 * Learn's pages: `/learn` and everything under it, in any spelling the router reads as them (percent-encoded, doubled
 * slashes, upper case). A path that does not decode is matched on its start alone, so it is kept out, not let through.
 */
export function isLearnPath(pathname: string): boolean {
  try {
    return /^\/+learn(?:[/\\]|$)/i.test(decodeURIComponent(pathname));
  } catch {
    return /^\/+learn/i.test(pathname);
  }
}

/**
 * The Learn pages open to every visitor: a shared lesson and its result pages (`/learn/lessons/<slug>…`, which pull
 * requests link to), and the page for maintainers. `/learn/lessons` itself is the user's own list, so it is not.
 */
export const isLearnOpenPath = (pathname: string): boolean =>
  decodedMatches(pathname, /^\/+learn\/+maintainers\/?$/i) ||
  decodedMatches(pathname, /^\/+learn\/+lessons\/+[^/\\]+(?:[/\\].*)?$/i);

/** Learn's front door, `/learn`, in any spelling the router reads as it. */
export const isLearnHomePath = (pathname: string): boolean => decodedMatches(pathname, /^\/+learn\/?$/i);

/** The Learn pages that show no tabs: the ones open to every visitor. */
export const isLearnTablessPath = isLearnOpenPath;

/** A lesson's slug: its title in kebab case and a few random characters; letters, digits and hyphens. */
const SLUG = '[A-Za-z0-9][A-Za-z0-9-]{0,99}';
/** A GitHub login: letters, digits and hyphens, up to 39 characters. It never holds a dot. */
const LOGIN = '[A-Za-z0-9][A-Za-z0-9-]{0,38}';

const SLUG_RE = new RegExp(`^${SLUG}$`);
const LOGIN_RE = new RegExp(`^${LOGIN}$`);

/** The slug when it has a slug's shape; null for anything else. */
export const lessonSlugOf = (value: unknown): string | null =>
  typeof value === 'string' && SLUG_RE.test(value) ? value : null;

/** The login when it has a GitHub login's shape; null for anything else. */
export const githubLoginOf = (value: unknown): string | null =>
  typeof value === 'string' && LOGIN_RE.test(value) ? value : null;

/** A shared lesson's page: anyone reads it, a signed-in user takes it. */
export const lessonPath = (slug: string) => `/learn/lessons/${encodeURIComponent(slug)}` as Route;

/** One login's result on a lesson: the link in the pull request, and the proof of the pass. */
export const lessonResultPath = (slug: string, login: string) =>
  `/learn/lessons/${encodeURIComponent(slug)}/passes/${encodeURIComponent(login)}` as Route;

const RESULT_PATH = new RegExp(`^/learn/lessons/${SLUG}/passes/${LOGIN}$`);
const RESULT_JSON_PATH = new RegExp(`^/learn/lessons/(${SLUG})/passes/(${LOGIN})\\.json$`);

/** Whether the path is a result page, exactly as `lessonResultPath` writes it: no other spelling, nothing under it. */
export const isLessonResultPath = (pathname: string): boolean => RESULT_PATH.test(pathname);

/**
 * Where `/learn/lessons/<slug>/passes/<login>.json` is answered: the route handler over the result page's read (a page
 * and a route handler cannot share the `[login]` segment). Null for any other path. A login holds no dot, so the
 * ending is never part of one.
 */
export function lessonResultJsonRouteOf(pathname: string): string | null {
  const match = RESULT_JSON_PATH.exec(pathname);
  return match ? `/api/learn/lessons/${match[1]}/passes/${match[2]}` : null;
}

/** The query parameter a result page's reaction travels in through the sign-in: `?react=yes|no`. */
export const REACT_PARAM = 'react';

/** `?react=` as the API's reaction; null for anything but `yes` and `no`. */
export function reactionParamOf(value: unknown): 'YES' | 'NO' | null {
  if (value === 'yes') return 'YES';
  if (value === 'no') return 'NO';
  return null;
}
