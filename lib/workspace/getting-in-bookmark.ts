import type { Route } from 'next';

import { LAST_CLICK_DAYS } from './click-tracking';
import type { FlowSide } from './getting-in';
import { GETTING_IN_PATHS } from './paths';

/**
 * The browser's bookmark of the flows (getting in, §6.3): the last step each flow was on in this browser, so a landing's
 * button resumes there. One record in `localStorage`, `{ contribute?: { href, at }, learn?: { href, at } }`; it holds
 * a step's path and query at most (languages, kinds, a level, an issue's address), never anything of the account.
 */
export const BOOKMARK_KEY = 'gitranks:getting-in:v1';

/** Kept as long as the click log's remembered click. */
export const BOOKMARK_DAYS = LAST_CLICK_DAYS;

const BOOKMARK_MS = BOOKMARK_DAYS * 24 * 60 * 60 * 1000;

type Mark = { href: string; at: number };
type Bookmarks = Partial<Record<FlowSide, Mark>>;

const FLOW_ROOTS: Record<FlowSide, string> = {
  contribute: GETTING_IN_PATHS.contributeWork,
  learn: GETTING_IN_PATHS.learnGoal,
};

/** Any origin: an address is accepted only when it stays on it. */
const HERE = 'https://flow.invalid';

/**
 * Whether `href` is a step of `side`'s flow: a path on this site, `/contribute/start` or `/learn/start` or under it.
 * Anything else (another site, another page, a protocol-relative address) is never followed.
 */
export function isFlowHref(side: FlowSide, href: string): boolean {
  if (typeof href !== 'string' || !href.startsWith('/') || href.startsWith('//') || href.includes('\\')) return false;
  try {
    const url = new URL(href, HERE);
    const root = FLOW_ROOTS[side];
    return url.origin === HERE && (url.pathname === root || url.pathname.startsWith(`${root}/`));
  } catch {
    return false;
  }
}

/** Learn's step 3: an issue's own start address, under `/learn/start/` but neither of the other two steps. */
export function isLearnIssueHref(href: string): boolean {
  if (!isFlowHref('learn', href)) return false;
  const { pathname } = new URL(href, HERE);
  return /^\/learn\/start\/[^/]+\/[^/]+\/[^/]+\/?$/.test(pathname);
}

/** The record's sides that are whole, recent and a step of their own flow; a broken record is none. */
function marksOf(stored: string | null, now: number): Bookmarks {
  if (!stored) return {};
  try {
    const value = JSON.parse(stored) as Record<string, Partial<Mark>> | null;
    if (!value || typeof value !== 'object') return {};
    const marks: Bookmarks = {};
    for (const side of Object.keys(FLOW_ROOTS) as FlowSide[]) {
      const mark = value[side];
      if (typeof mark?.href !== 'string' || typeof mark.at !== 'number') continue;
      const age = now - mark.at;
      if (age >= 0 && age <= BOOKMARK_MS && isFlowHref(side, mark.href)) marks[side] = { href: mark.href, at: mark.at };
    }
    return marks;
  } catch {
    return {};
  }
}

/** The step `side`'s flow was last on in this browser, when it is under 30 days old; null otherwise. */
export function bookmarkOf(stored: string | null, side: FlowSide, now: number): Route | null {
  return (marksOf(stored, now)[side]?.href as Route | undefined) ?? null;
}

/** The record with `side` on `href` now; the other side kept when it is still good, anything older dropped. */
export function withBookmark(stored: string | null, side: FlowSide, href: string, now: number): string {
  const marks = marksOf(stored, now);
  if (isFlowHref(side, href)) marks[side] = { href, at: now };
  return JSON.stringify(marks);
}

const recordOf = (marks: Bookmarks): string | null => (Object.keys(marks).length ? JSON.stringify(marks) : null);

/** The record without `side` (its person left that flow into the workspace); null when nothing is left. */
export function withoutBookmark(stored: string | null, side: FlowSide, now: number): string | null {
  const { [side]: _left, ...rest } = marksOf(stored, now);
  return recordOf(rest);
}

/** The record with what is too old or broken removed, each good side as it was; null when nothing is left. */
export const keptBookmarks = (stored: string | null, now: number): string | null => recordOf(marksOf(stored, now));

/**
 * Where a landing's button leads (§4.1): a visitor resumes at the bookmark when there is one; a signed-in person at the
 * server's step, whatever the bookmark says (it may be older than what the account holds, or another person's). One
 * exception: on Learn, when the server says Pick an issue and the bookmark is an issue's step, the bookmark wins, so
 * the picked issue is found again.
 */
export function resumeHrefOf({
  side,
  server,
  signedIn,
  bookmark,
}: {
  side: FlowSide;
  server: Route;
  signedIn: boolean;
  bookmark: Route | null;
}): Route {
  if (!bookmark) return server;
  if (!signedIn) return bookmark;
  const pickedIssue = side === 'learn' && server === GETTING_IN_PATHS.learnIssues && isLearnIssueHref(bookmark);
  return pickedIssue ? bookmark : server;
}
