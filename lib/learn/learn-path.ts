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

/** The Learn pages that show no tabs: the ones open to every visitor. */
export const isLearnTablessPath = isLearnOpenPath;
