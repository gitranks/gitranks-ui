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

/** Where a maintainer reports one of our PRs, or says it helped: open to every visitor too. */
export const MAINTAINERS_REPORT_PATH = '/contribute/maintainers/report';

/** The paths the maintainers page's own sign-in may return to. */
export const MAINTAINER_RETURN_PATHS: readonly string[] = [MAINTAINERS_PATH, MAINTAINERS_REPORT_PATH];

/**
 * Whether the path is the maintainers page or its report page, in any spelling the router reads as them; nothing else
 * under them, and no path that does not decode, is.
 */
export function isMaintainersPath(pathname: string): boolean {
  try {
    return /^\/+contribute\/+maintainers(?:\/+report)?\/?$/i.test(decodeURIComponent(pathname));
  } catch {
    return false;
  }
}

/**
 * Where an agent's sign-in to the MCP server asks the user to allow it (`?request=<id>`). Open to every visitor, like
 * the page for maintainers: signed out it offers the sign-in, and off the preview it says Contribute is not open yet.
 */
export const AUTHORIZE_PATH = '/contribute/authorize';

/** Whether the path is the sign-in's consent page, in any spelling the router reads as it; nothing under it is. */
export function isAuthorizePath(pathname: string): boolean {
  try {
    return /^\/+contribute\/+authorize\/?$/i.test(decodeURIComponent(pathname));
  } catch {
    return false;
  }
}

/** The Contribute ledger (ledger design 2026-11-03): its own switch, not the preview's. */
export const LEDGER_PATH: Route = '/contribute/ledger';

export function isLedgerPath(pathname: string): boolean {
  try {
    return /^\/+contribute\/+ledger\/?$/i.test(decodeURIComponent(pathname));
  } catch {
    return false;
  }
}

/** The MCP server's docs: setup per client, the tools, the token, the limits and what is sent. Everyone's once launched. */
export const MCP_DOCS_PATH = '/contribute/mcp' as Route;

/** The questions people ask before they start. Everyone's once launched. */
export const FAQ_PATH = '/contribute/faq' as Route;

/** The landing for anyone, members too (a member's `/contribute` is their overview). */
export const ABOUT_PATH = '/contribute?about=1' as Route;

/** Contribute's section of the Terms of service. */
export const CONTRIBUTE_TERMS_PATH = '/terms#contribute' as Route;

/** Matches the path, decoded as the router reads it, against `pattern`; a path that does not decode never matches. */
function decodedMatches(pathname: string, pattern: RegExp): boolean {
  try {
    return pattern.test(decodeURIComponent(pathname));
  } catch {
    return false;
  }
}

/**
 * Whether the path is a page every visitor sees once Contribute is launched: the landing, the MCP docs and the
 * questions, in any spelling the router reads as them. Until then only the preview list sees them.
 */
export const isOpenAtLaunchPath = (pathname: string): boolean =>
  isLandingPath(pathname) || decodedMatches(pathname, /^\/+contribute\/+(?:mcp|faq)\/?$/i);

/**
 * Whether the path is one of the pages about Contribute rather than the user's workspace, which show no tabs: the
 * maintainers page and its report page, the ledger, the MCP docs, the questions and the agent sign-in's consent page.
 */
export const isTablessPath = (pathname: string): boolean =>
  decodedMatches(pathname, /^\/+contribute\/+(?:maintainers(?:\/+report)?|ledger|mcp|faq|authorize)\/?$/i);

/** Where each way of contributing starts: a Claude key we run the agent on, or the user's own agent. */
export const CONNECT_KEY_PATH: Route = '/contribute/connect';
export const CONNECT_AGENT_PATH = '/contribute/connect?path=agent' as Route;

/** Every agent run: the live ones, then the history. The robot tab and Right now's "All runs" lead there. */
export const RUNS_PATH: Route = '/contribute/runs';
