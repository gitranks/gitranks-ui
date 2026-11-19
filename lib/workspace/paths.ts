import type { Route } from 'next';

import type { ContributeSetListMode } from './contribute.types';

/**
 * The pages of the signed-in workspace, Contribute's and Learn's, at today's addresses. Links to them are built from
 * here, so a page that moves changes this table and not its links.
 */
export const WORKSPACE_PATHS = {
  contribute: '/contribute' as Route,
  learn: '/learn' as Route,
  /** The user's pull requests, both sides. */
  pullRequests: '/contribute/me' as Route,
  /** The own agent's part of Settings. */
  agent: '/contribute/settings/own-agent' as Route,
  agentConnect: '/contribute/connect?path=agent' as Route,
  agentKey: '/contribute/settings/keys' as Route,
  agentModel: '/contribute/settings/agent' as Route,
  agentBudget: '/contribute/settings/budget' as Route,
  agentRuns: '/contribute/runs' as Route,
  settings: '/contribute/settings' as Route,
  settingsWork: '/contribute/settings/work' as Route,
  /** Learn's goal and level. */
  settingsGoal: '/learn/profile' as Route,
  /** The user's lessons. */
  progress: '/learn/lessons' as Route,
} as const;

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

/** The MCP server's docs: setup per client, the tools, sign-in and tokens, the limits, what is sent. Everyone's once launched. */
export const MCP_DOCS_PATH = '/contribute/mcp' as Route;

/** The questions people ask before they start. Everyone's once launched. */
export const FAQ_PATH = '/contribute/faq' as Route;

/** The landing for anyone, members too (a member's `/contribute` is their overview). */
export const ABOUT_PATH = '/contribute?about=1' as Route;

/** Contribute's section of the Terms of service. */
export const CONTRIBUTE_TERMS_PATH = '/terms#contribute' as Route;

/**
 * Whether the path is a contribution's or a lesson's own page (`/contribute/attempts/<id>`, a run under it,
 * `/learn/attempts/<id>`), in any spelling the router reads as it: the review link an agent hands its person. A visitor
 * without a session is let through to it, and the page asks them to sign in and comes back to itself; a signed-in user
 * whose attempt it isn't still gets the 404.
 */
export const isAttemptPagePath = (pathname: string): boolean =>
  decodedMatches(pathname, /^\/+(?:contribute|learn)\/+attempts\/+[^/]+(?:\/+runs\/+[^/]+)?\/?$/i);

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
  isLandingPath(pathname) || decodedMatches(pathname, /^\/+contribute\/+(?:mcp|faq|agents\.md)\/?$/i);

/**
 * Whether the path is one of the pages about Contribute rather than the user's workspace, which show no tabs: the
 * maintainers page and its report page, the ledger, the MCP docs, the questions and the agent sign-in's consent page.
 */
export const isTablessPath = (pathname: string): boolean =>
  decodedMatches(pathname, /^\/+contribute\/+(?:maintainers(?:\/+report)?|ledger|mcp|faq|authorize)\/?$/i);

/**
 * Where a Contribute page sends an account being set up: Contribute's home, which says so and reads itself again until
 * the account is ready, carrying the way of contributing the user picked (`start`), so the home goes on to its first
 * step then.
 */
export function settingUpHomeOf(url: { pathname: string; searchParams: URLSearchParams }): string {
  if (!/^\/+contribute\/+connect\/?$/i.test(url.pathname)) return '/contribute';
  return url.searchParams.get('path') === 'agent' ? '/contribute?start=agent' : '/contribute?start=key';
}

/** Where each way of contributing starts: a Claude key we run the agent on, or the user's own agent. */
export const CONNECT_KEY_PATH: Route = '/contribute/connect';
export const CONNECT_AGENT_PATH: Route = WORKSPACE_PATHS.agentConnect;

/** Every agent run: the live ones, then the history. The robot tab and Right now's "All runs" lead there. */
export const RUNS_PATH: Route = WORKSPACE_PATHS.agentRuns;

/** The page for AI agents, in markdown: a route handler, so links to it are plain anchors, never the router's. */
export const AGENTS_DOC_PATH = '/contribute/agents.md';
/** Where an agent sends its person: the landing with the own-agent sign-in open (signed in: the connect step). */
export const START_AGENT_PATH = '/contribute?start=agent' as Route;

/** Settings, a summary of every setting, and the pages each one is changed on. */
export const SETTINGS_PATHS = {
  summary: WORKSPACE_PATHS.settings,
  work: WORKSPACE_PATHS.settingsWork,
  budget: WORKSPACE_PATHS.agentBudget,
  agent: WORKSPACE_PATHS.agentModel,
  keys: WORKSPACE_PATHS.agentKey,
  ownAgent: WORKSPACE_PATHS.agent,
};

/**
 * Where each section of the one long Settings page now lives, by its old `#anchor`. Links in the app use it, and the
 * summary sends an old link (a bookmark, a notice) on to it. Anchors not here stay on the summary: what you work on
 * (`#modes`), and the filters (`#work`), rules and ignored repos, whose dialogs open at their anchor.
 */
const ANCHORS: Record<string, Route> = {
  limits: SETTINGS_PATHS.budget,
  pacing: `${SETTINGS_PATHS.budget}#pacing` as Route,
  'more-limits': `${SETTINGS_PATHS.budget}#more-limits` as Route,
  agent: SETTINGS_PATHS.agent,
  prs: `${SETTINGS_PATHS.agent}#prs` as Route,
  access: SETTINGS_PATHS.keys,
  'own-agent': SETTINGS_PATHS.ownAgent,
};

/** The guided switch to a mode with a list. */
export const switchPathOf = (mode: ContributeSetListMode): Route =>
  `/contribute/settings/switch/${mode.toLowerCase()}` as Route;

/** The mode a switch page's segment names, or null for any other segment. */
export const switchModeOf = (segment: string): ContributeSetListMode | null =>
  segment === 'stack' ? 'STACK' : segment === 'repos' ? 'REPOS' : null;

/** The page an old Settings `#anchor` is on now, or null when it stays on the summary. */
export const movedAnchorOf = (anchor: string): Route | null =>
  Object.hasOwn(ANCHORS, anchor) ? ANCHORS[anchor] : null;

/** Where a Settings section is: its own page, or the summary at its anchor. */
export const settingsPathOf = (anchor: string): Route =>
  movedAnchorOf(anchor) ?? (`${SETTINGS_PATHS.summary}#${anchor}` as Route);

/** A Learn attempt's page: the lesson, then the pull request. */
export const learnAttemptPath = (attemptId: string) => `/learn/attempts/${encodeURIComponent(attemptId)}` as Route;

/**
 * The page of one attempt, by its id alone: today Contribute's attempt page, which sends a Learn attempt on to its
 * lesson; `view: 'lesson'` asks for the lesson. `query` is kept on the address.
 */
export function pullRequestByAttemptPath(
  attemptId: string,
  opts: { view?: 'lesson'; query?: Record<string, string> } = {},
): Route {
  const path =
    opts.view === 'lesson' ? learnAttemptPath(attemptId) : `/contribute/attempts/${encodeURIComponent(attemptId)}`;
  const query = new URLSearchParams(opts.query ?? {}).toString();
  return (query ? `${path}?${query}` : path) as Route;
}
