import type { Route } from 'next';

/**
 * Contribute's pages: `/contribute` and everything under it. Matched on the decoded path, as the router matches it,
 * so a percent-encoded, doubled-slash or upper-case spelling of it is matched too. A path that does not decode is
 * matched on its start alone, so a malformed one is kept out rather than let through.
 */
export function isContributePath(pathname: string): boolean {
  try {
    return /^\/+contribute(?:[/\\]|$)/i.test(decodeURIComponent(pathname));
  } catch {
    return /^\/+contribute/i.test(pathname);
  }
}

/**
 * Whether the path is the landing, `/contribute` itself, in any spelling the router reads as it: the one page a visitor
 * without a session sees once Contribute is launched (onboarding design §9.3). Nothing under it, and no path that does
 * not decode, is.
 */
export function isLandingPath(pathname: string): boolean {
  try {
    return /^\/+contribute\/?$/i.test(decodeURIComponent(pathname));
  } catch {
    return false;
  }
}

/** The page for maintainers: open to every visitor, outside the preview. */
export const MAINTAINERS_PATH = '/contribute/maintainers';

/**
 * Whether the path is the maintainers page itself, in any spelling the router reads as it; nothing under it, and no
 * path that does not decode, is.
 */
export function isMaintainersPath(pathname: string): boolean {
  try {
    return /^\/+contribute\/+maintainers\/?$/i.test(decodeURIComponent(pathname));
  } catch {
    return false;
  }
}

/** Where each way of contributing starts: a Claude key we run the agent on, or the user's own agent. */
export const CONNECT_KEY_PATH: Route = '/contribute/connect';
export const CONNECT_AGENT_PATH = '/contribute/connect?path=agent' as Route;
