import type { Route } from 'next';

import { MAINTAINERS_PATH } from './contribute-path';
import { type PrRef, parsePrLink } from './pr-feedback';

/** Every pull request timeline lives under it. */
export const PR_TIMELINE_ROOT = '/contribute/pr';

const ATTEMPT_ID = /^[a-f\d]{24}$/;

/**
 * A pull request timeline's address, as the router reads it: the short one the footer links (`/contribute/pr/<attempt
 * id>`, which only redirects), the page (`/contribute/pr/<owner>/<repo>/<number>`), or its Markdown twin (the page's
 * address and `/timeline.md`). Null for any other path, and for parts no GitHub name or number can be.
 */
export type PrTimelineRoute =
  | { kind: 'short'; attemptId: string }
  | { kind: 'page'; pr: PrRef }
  | { kind: 'twin'; pr: PrRef };

export function prTimelineRouteOf(pathname: string): PrTimelineRoute | null {
  let path: string;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const match = /^\/+contribute\/+pr\/+([^/]+)(?:\/+([^/]+)\/+([^/]+)(\/+timeline\.md)?)?\/?$/i.exec(path);
  if (!match) return null;
  const [, first, repo, number, twin] = match;
  if (repo === undefined) return ATTEMPT_ID.test(first) ? { kind: 'short', attemptId: first } : null;
  if (twin && pathname.endsWith('/')) return null;
  const pr = parsePrLink(`${first}/${repo}#${number}`);
  if (!pr || String(pr.number) !== number) return null;
  return twin ? { kind: 'twin', pr } : { kind: 'page', pr };
}

/** Whether the path is a pull request timeline's, in any of its three forms. */
export const isPrTimelinePath = (pathname: string): boolean => prTimelineRouteOf(pathname) !== null;

/** The page's canonical address. */
export const prTimelinePath = ({ nameWithOwner, number }: PrRef): Route =>
  `${PR_TIMELINE_ROOT}/${nameWithOwner}/${number}` as Route;

/** The page's Markdown twin. */
export const prTimelineMarkdownPath = (pr: PrRef): Route => `${prTimelinePath(pr)}/timeline.md` as Route;

/** Where the short address goes when it has no page to show: the maintainers page, about that PR. */
export const prTimelineFallbackPath = (attemptId: string): Route =>
  `${MAINTAINERS_PATH}?${new URLSearchParams({ from: attemptId })}` as Route;
