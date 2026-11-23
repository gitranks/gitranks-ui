import type { Route } from 'next';

import {
  FROM_LEARN,
  LEARN_COURSES_PATH,
  LEARN_HOME_PATH,
  LEARN_ISSUES_PATH,
  LEARN_PROGRESS_PATH,
  LEARN_PULL_REQUESTS_PATH,
  LEARN_REVIEW_PATH,
  LEARN_SETTINGS_PATH,
  LEARN_SETUP_PATH,
} from './paths';

/** What the API answers for Learn's bar: how far setup is, what is due, the person's pull requests. */
export type LearnBarRead = {
  setup: 'NONE' | 'WORKING' | 'GUESSED' | 'SAVED';
  due: number;
  pullRequests: boolean;
  pullRequestsNeedYou: number;
};

/**
 * Who looks at Learn's bar, as the board of page 7 draws it:
 * - `visitor`: not signed in (or not known yet): three tabs, nothing on the right;
 * - `setup`: signed in, Learn not set up: the three tabs and "Set up Learn";
 * - `learner`: five tabs; "Pull requests" once one was sent through GitRanks, with how many need them; "Review" with
 *   how many lessons are due.
 */
export type LearnBarState =
  | { kind: 'visitor' }
  | { kind: 'setup' }
  | { kind: 'learner'; due: number; pullRequests: boolean; pullRequestsNeedYou: number };

/** The bar's state for the API's answer; a visitor's bar for none. */
export function learnBarStateOf(read: LearnBarRead | null | undefined): LearnBarState {
  if (!read) return { kind: 'visitor' };
  if (read.setup !== 'SAVED') return { kind: 'setup' };
  return {
    kind: 'learner',
    due: Math.max(0, read.due),
    pullRequests: read.pullRequests,
    pullRequestsNeedYou: Math.max(0, read.pullRequestsNeedYou),
  };
}

/** The bar's tabs, in order. */
export type LearnBarTab = 'home' | 'courses' | 'issues' | 'progress' | 'settings';
/** What on the bar is the current place: a tab, or one of the items on the right. */
export type LearnBarPlace = LearnBarTab | 'pull-requests' | 'setup' | 'review';

export const LEARN_BAR_TABS: Record<LearnBarTab, { label: string; href: Route }> = {
  home: { label: 'Home', href: LEARN_HOME_PATH },
  courses: { label: 'Courses', href: LEARN_COURSES_PATH },
  issues: { label: 'Issues', href: LEARN_ISSUES_PATH },
  progress: { label: 'Progress', href: LEARN_PROGRESS_PATH },
  settings: { label: 'Settings', href: LEARN_SETTINGS_PATH },
};

export const LEARN_BAR_LINKS = {
  setup: LEARN_SETUP_PATH,
  review: LEARN_REVIEW_PATH,
  pullRequests: LEARN_PULL_REQUESTS_PATH,
} as const;

/** The tabs a state shows: three for everyone, Progress and Settings for a learner. */
export const learnBarTabsOf = (state: LearnBarState): LearnBarTab[] =>
  state.kind === 'learner' ? ['home', 'courses', 'issues', 'progress', 'settings'] : ['home', 'courses', 'issues'];

/** Matches the path, ending in a slash or not, against the address or anything under it. */
const under = (pathname: string, path: string) => pathname === path || pathname.startsWith(`${path}/`);
const at = (pathname: string, path: string) => pathname === path || pathname === `${path}/`;

/**
 * The current place for a path, as the board's table "Which tab is current" lists it. `from` is the page's `?from=`:
 * a page both products share (Settings, the pull requests) is Learn's place only when Learn opened it. A person's
 * public progress page (`/learn/progress/<login>`) is no tab: Progress is the person's own.
 */
export function learnBarPlaceOf(pathname: string, from: string | null = null): LearnBarPlace | null {
  if (at(pathname, LEARN_HOME_PATH)) return 'home';
  if (under(pathname, LEARN_COURSES_PATH)) return 'courses';
  if (under(pathname, LEARN_ISSUES_PATH)) return 'issues';
  if (at(pathname, LEARN_PROGRESS_PATH)) return 'progress';
  if (at(pathname, LEARN_SETUP_PATH)) return 'setup';
  if (under(pathname, LEARN_REVIEW_PATH)) return 'review';
  if (from !== FROM_LEARN) return null;
  if (under(pathname, '/my/settings')) return 'settings';
  if (under(pathname, '/my/pull-requests')) return 'pull-requests';
  return null;
}
