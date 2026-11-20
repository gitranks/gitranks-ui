import type { Route } from 'next';

import { GITHUB_LOGIN as LOGIN, LESSON_SLUG as SLUG } from '@/lib/workspace/paths';

/** Learn home for a signed-in learner; the front door for a visitor. */
export const LEARN_PATH = '/learn' as Route;
/** Learn home's practice lessons: a state without the section shows its top (the issues: `LEARN_ISSUES_PATH`). */
export const LEARN_PRACTICE_PATH = '/learn#practice' as Route;
/** The front door for a signed-in learner: how Learn works. */
export const LEARN_ABOUT_PATH = '/learn/about' as Route;
/** What a Learn pull request is, for maintainers. Open to everyone. */
export const LEARN_MAINTAINERS_PATH = '/learn/maintainers' as Route;

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
 * requests link to), and the page for maintainers. `/learn/lessons` itself is not: it goes on to Your progress.
 */
export const isLearnOpenPath = (pathname: string): boolean =>
  decodedMatches(pathname, /^\/+learn\/+maintainers\/?$/i) ||
  decodedMatches(pathname, /^\/+learn\/+lessons\/+[^/\\]+(?:[/\\].*)?$/i);

/** Learn's front door, `/learn`, in any spelling the router reads as it. */
export const isLearnHomePath = (pathname: string): boolean => decodedMatches(pathname, /^\/+learn\/?$/i);

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

const RESULT_JSON_PATH = new RegExp(`^/learn/lessons/(${SLUG})/passes/(${LOGIN})\\.json$`);

/**
 * Where `/learn/lessons/<slug>/passes/<login>.json` is answered: the route handler over the result page's read (a page
 * and a route handler cannot share the `[login]` segment). Null for any other path. A login holds no dot, so the
 * ending is never part of one.
 */
export function lessonResultJsonRouteOf(pathname: string): string | null {
  const match = RESULT_JSON_PATH.exec(pathname);
  return match ? `/api/learn/lessons/${match[1]}/passes/${match[2]}` : null;
}

const LESSON_PAGE_ROUTE = new RegExp(`^/learn/lessons/(${SLUG})/?$`);
const RESULT_PAGE_ROUTE = new RegExp(`^/learn/lessons/(${SLUG})/passes/(${LOGIN})/?$`);

/** A shared lesson's page (no `login`) or one of its result pages. */
export type LessonRoute = { slug: string; login?: string };

/**
 * The lesson, and the login for a result page, of a path as `lessonPath` and `lessonResultPath` write it (a trailing
 * slash allowed); null for any other path, including other spellings the router also reads as one.
 */
export function lessonRouteOf(pathname: string): LessonRoute | null {
  const result = RESULT_PAGE_ROUTE.exec(pathname);
  if (result) return { slug: result[1], login: result[2] };
  const lesson = LESSON_PAGE_ROUTE.exec(pathname);
  return lesson ? { slug: lesson[1] } : null;
}
