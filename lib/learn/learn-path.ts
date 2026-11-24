import type { Route } from 'next';

import { GITHUB_LOGIN as LOGIN, LESSON_SLUG as SLUG } from '@/lib/workspace/paths';

/** Learn home for a signed-in learner; the landing for everyone else. */
export const LEARN_PATH = '/learn' as Route;
/**
 * The way Learn worked before its courses: your agent fixes an issue and you take a lesson on the fix. Not indexed and
 * not in Learn's bar; Learn's new pages lead to Issues instead.
 */
export const LEARN_EARLIER_PATH = '/learn/earlier' as Route;
/** The earlier page's practice lessons: a state without the section shows its top. */
export const LEARN_PRACTICE_PATH = `${LEARN_EARLIER_PATH}#practice` as Route;
/** How Learn works: the landing, for a learner. */
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

/** How Learn works, `/learn/about`, in any spelling the router reads as it. */
export const isLearnAboutPath = (pathname: string): boolean => decodedMatches(pathname, /^\/+learn\/+about\/?$/i);

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

/** A person's public progress page: their public lessons and numbers, the link Share copies. */
export const publicProgressPath = (login: string, page = 1) =>
  `/learn/progress/${encodeURIComponent(login)}${page > 1 ? `?page=${page}` : ''}` as Route;

const PUBLIC_PROGRESS_ROUTE = new RegExp(`^/learn/progress/(${LOGIN})/?$`);

/** The login of a path as `publicProgressPath` writes it (a trailing slash allowed); null for any other path. */
export function publicProgressRouteOf(pathname: string): string | null {
  return PUBLIC_PROGRESS_ROUTE.exec(pathname)?.[1] ?? null;
}

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
