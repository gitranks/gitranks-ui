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

/**
 * Sent on the window when the bar, having read again while our guess ran, finds it in (or the person's own setup):
 * a part of the page that shows the setup (Settings' "Languages and level") reads the page again.
 */
export const LEARN_SETUP_SETTLED_EVENT = 'gitranks:learn-setup-settled';

/**
 * What the API answers for Learn's bar: how far setup is, what is due, the person's pull requests. `onboarded` is the
 * Learn sign, which the bar's route reads beside it: true or false, null or missing when it cannot be read.
 */
export type LearnBarRead = {
  setup: 'NONE' | 'WORKING' | 'GUESSED' | 'SAVED';
  due: number;
  pullRequests: boolean;
  pullRequestsNeedYou: number;
  onboarded?: boolean | null;
};

/** What waits for the person, on the bar's right: lessons due, and their pull requests with how many need them. */
export type LearnBarWaiting = { due: number; pullRequests: boolean; pullRequestsNeedYou: number };

/**
 * How far "Set up Learn" is, for its look and what screen readers hear:
 * - `working`: our guess runs;
 * - `guessed`: our guess is in, ready to check;
 * - `open`: no guess to check (it could not start, or was dropped): the page is there to fill in.
 */
export type LearnBarSetup = 'working' | 'guessed' | 'open';

/**
 * Who looks at Learn's bar, as the boards of pages 5 and 7 draw it:
 * - `visitor`: not signed in (or not known yet): Home, Courses and Issues; nothing on the right;
 * - `setup`: signed in, without the Learn sign (Learn's onboarding not saved yet): a learner's tabs, and "Set up Learn"
 *   on the right with how far our guess is; then what waits for them, as a learner's;
 * - `learner`: Home, Courses, Issues, Progress and Settings; "Pull requests" once one was sent through GitRanks, with
 *   how many need them; "Review" with how many lessons are due.
 */
export type LearnBarState =
  | { kind: 'visitor' }
  | ({ kind: 'setup'; setup: LearnBarSetup } & LearnBarWaiting)
  | ({ kind: 'learner' } & LearnBarWaiting);

/**
 * The bar's state for the API's answer; a visitor's bar for none. "Set up Learn" shows until the Learn sign; when the
 * sign cannot be read, until a setup is saved, as before the sign. `guessing`: our guess is being started from this
 * page, so a setup with none yet shows the spinner too; once the page stops waiting for it, there is no guess to check.
 */
export function learnBarStateOf(read: LearnBarRead | null | undefined, guessing = false): LearnBarState {
  if (!read) return { kind: 'visitor' };
  const waiting = {
    due: Math.max(0, read.due),
    pullRequests: read.pullRequests,
    pullRequestsNeedYou: Math.max(0, read.pullRequestsNeedYou),
  };
  const onboarded = read.onboarded ?? read.setup === 'SAVED';
  if (onboarded) return { kind: 'learner', ...waiting };
  if (read.setup === 'GUESSED') return { kind: 'setup', setup: 'guessed', ...waiting };
  const working = read.setup === 'WORKING' || guessing;
  return { kind: 'setup', setup: working ? 'working' : 'open', ...waiting };
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

/** The tabs a state shows: Home, Courses and Issues for everyone; Progress and Settings for anyone signed in, set up or not. */
export const learnBarTabsOf = (state: LearnBarState): LearnBarTab[] =>
  state.kind === 'visitor' ? ['home', 'courses', 'issues'] : ['home', 'courses', 'issues', 'progress', 'settings'];

/** A fix's public page in either view: `/learn/fixes/<owner>/<repo>/<number>` and `/contribute/pr/<owner>/<repo>/<number>`. */
const FIX_VIEW = /^\/(?:learn\/fixes|contribute\/pr)\/[^/]+\/[^/]+\/\d+\/?$/;

/** A lesson's or a course's view of Issues, `/learn/lessons/<slug>/real-world` or `/learn/courses/<slug>/real-world`. */
const REAL_WORLD = /^\/learn\/(?:lessons|courses)\/[^/]+\/real-world\/?$/;

/** Matches the path, ending in a slash or not, against the address or anything under it. */
const under = (pathname: string, path: string) => pathname === path || pathname.startsWith(`${path}/`);
const at = (pathname: string, path: string) => pathname === path || pathname === `${path}/`;

/**
 * The current place for a path, as the board's table "Which tab is current" lists it. `from` is the page's `?from=`:
 * a page both products share (Settings, the pull requests) is Learn's place only when Learn opened it. Progress is
 * `/learn/progress` alone, never a path under it. A lesson's and a course's
 * view of Issues are Issues, and so is a fix's public page, in either view.
 */
export function learnBarPlaceOf(pathname: string, from: string | null = null): LearnBarPlace | null {
  if (at(pathname, LEARN_HOME_PATH)) return 'home';
  if (at(pathname, LEARN_ISSUES_PATH) || REAL_WORLD.test(pathname) || FIX_VIEW.test(pathname)) return 'issues';
  if (under(pathname, LEARN_COURSES_PATH)) return 'courses';
  if (at(pathname, LEARN_PROGRESS_PATH)) return 'progress';
  if (at(pathname, LEARN_SETUP_PATH)) return 'setup';
  if (under(pathname, LEARN_REVIEW_PATH)) return 'review';
  if (from !== FROM_LEARN) return null;
  if (under(pathname, '/my/settings')) return 'settings';
  if (under(pathname, '/my/pull-requests')) return 'pull-requests';
  return null;
}
