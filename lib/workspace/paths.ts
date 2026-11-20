import type { Route } from 'next';

import type { ContributeSetListMode } from './contribute.types';

/**
 * The pages of the signed-in workspace, Contribute's and Learn's: the two front tabs, then everything under `/my`. Links
 * to them are built from here, so a page that moves changes this table and not its links.
 */
export const WORKSPACE_PATHS = {
  contribute: '/contribute' as Route,
  learn: '/learn' as Route,
  /** The user's pull requests, both sides. */
  pullRequests: '/my/pull-requests' as Route,
  /** The agents that work for the user: their own, and the hosted one on their Claude key. */
  agent: '/my/agent' as Route,
  agentConnect: '/my/agent/connect' as Route,
  agentKey: '/my/agent/key' as Route,
  agentModel: '/my/agent/model' as Route,
  agentBudget: '/my/agent/budget' as Route,
  agentRuns: '/my/agent/runs' as Route,
  settings: '/my/settings' as Route,
  /** GitHub's permission to open pull requests, for every account. */
  settingsGithub: '/my/settings/github' as Route,
  /** The limits on pull requests and attempts, which bind both agents. */
  settingsPullRequests: '/my/settings/pull-requests' as Route,
  settingsWork: '/my/settings/work' as Route,
  /** Learn's goal and level. */
  settingsGoal: '/my/settings/goal' as Route,
  /** Your progress: what the user has learned, and where their Learn pull requests landed. */
  progress: '/my/progress' as Route,
} as const;

/**
 * The rows other pages link to by what they are, wherever their page is now: the limit on open pull requests, attempts
 * at a time, the filters of what the user works on, Learn's goal, the Claude key, the budget.
 */
export const WORKSPACE_ANCHORS = {
  limitRow: `${WORKSPACE_PATHS.settingsPullRequests}#open` as Route,
  attemptsRow: `${WORKSPACE_PATHS.settingsPullRequests}#attempts` as Route,
  work: `${WORKSPACE_PATHS.settingsWork}#work` as Route,
  forLearning: WORKSPACE_PATHS.settingsGoal,
  agentKey: WORKSPACE_PATHS.agentKey,
  agentBudget: WORKSPACE_PATHS.agentBudget,
} as const;

/** GitHub's permission to open pull requests: its own Settings page, for every account. */
export const GITHUB_ACCESS_PATH = WORKSPACE_PATHS.settingsGithub;

/** Where a Claude key is connected over the one there is: the key's page shows the key itself otherwise. */
export const KEY_REPLACE_PATH = `${WORKSPACE_PATHS.agentKey}?replace=1` as Route;

/** A page's `searchParams` as the query the browser sent, every value of a repeated key kept. */
export function searchParamsOf(params: Record<string, string | string[] | undefined> | undefined): URLSearchParams {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    for (const one of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, one);
  }
  return query;
}

/** Matches the path, decoded as the router reads it, against `pattern`; a path that does not decode never matches. */
function decodedMatches(pathname: string, pattern: RegExp): boolean {
  try {
    return pattern.test(decodeURIComponent(pathname));
  } catch {
    return false;
  }
}

/** The pages under `/my`, in any spelling the router reads as them. A path that does not decode is matched on its start. */
export function isMyPath(pathname: string): boolean {
  try {
    return /^\/+my(?:[/\\]|$)/i.test(decodeURIComponent(pathname));
  } catch {
    return /^\/+my/i.test(pathname);
  }
}

/** The pages of Contribute and of the workspace under `/my`: a click there is moving around inside, not a step in. */
export const isInsidePath = (pathname: string): boolean => isContributePath(pathname) || isMyPath(pathname);

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

/** A lesson's slug: its title in kebab case and a few random characters; letters, digits and hyphens. */
export const LESSON_SLUG = '[A-Za-z0-9][A-Za-z0-9-]{0,99}';
/** A GitHub login: letters, digits and hyphens, up to 39 characters. It never holds a dot. */
export const GITHUB_LOGIN = '[A-Za-z0-9][A-Za-z0-9-]{0,38}';

const RESULT_PATH = new RegExp(`^/learn/lessons/${LESSON_SLUG}/passes/${GITHUB_LOGIN}$`);

/**
 * Whether the path is a lesson's result page, exactly as `lessonResultPath` writes it: no other spelling, nothing under
 * it. The light sign-in returns there too, with a reaction (`REACT_PARAM`).
 */
export const isLessonResultPath = (pathname: string): boolean => RESULT_PATH.test(pathname);

/** The query parameter a result page's reaction travels in through the sign-in: `?react=yes|no`. */
export const REACT_PARAM = 'react';

/** `?react=` as the API's reaction; null for anything but `yes` and `no`. */
export function reactionParamOf(value: unknown): 'YES' | 'NO' | null {
  if (value === 'yes') return 'YES';
  if (value === 'no') return 'NO';
  return null;
}

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
 * The steps of the flows that start Contribute and Learn (getting in, §5.3): a landing's one button leads into them,
 * and each step's page checks who opens it.
 */
export const GETTING_IN_PATHS = {
  /** Contribute, step 1: what you work on. */
  contributeWork: '/contribute/start' as Route,
  /** Contribute, step 2: who does the work, your own agent or a Claude key. */
  contributeAgent: '/contribute/start/agent' as Route,
  contributeAgentOwn: '/contribute/start/agent/own' as Route,
  contributeAgentKey: '/contribute/start/agent/key' as Route,
  /** Contribute, step 3: your first issue. */
  contributeIssue: '/contribute/start/issue' as Route,
  /** Learn, step 1: your goal. Step 3 is an issue's own start address (`learnStartPath`). */
  learnGoal: '/learn/start' as Route,
  /** Learn, step 2: pick an issue. */
  learnIssues: '/learn/start/issues' as Route,
} as const;

/** Whether the path is a step of Contribute's flow, `/contribute/start` or under it, in any spelling the router reads. */
export const isContributeFlowPath = (pathname: string): boolean =>
  decodedMatches(pathname, /^\/+contribute\/+start(?:[/\\]|$)/i);

/**
 * Whether the path is a page every visitor sees once Contribute is launched: the landing, the MCP docs, the questions
 * and the steps of Contribute's flow, in any spelling the router reads as them. Until then only the preview list sees
 * them.
 */
export const isOpenAtLaunchPath = (pathname: string): boolean =>
  isLandingPath(pathname) ||
  isContributeFlowPath(pathname) ||
  decodedMatches(pathname, /^\/+contribute\/+(?:mcp|faq|agents\.md)\/?$/i);

/**
 * Whether the path is one of the pages about Contribute or Learn rather than the user's workspace, which show no tabs:
 * Contribute's maintainers page and its report page, the ledger, the MCP docs, the questions and the agent sign-in's
 * consent page; the steps of Contribute's flow; how Learn works, Learn's page for maintainers, and a shared lesson with
 * its result pages.
 */
export const isTablessPath = (pathname: string): boolean =>
  decodedMatches(pathname, /^\/+contribute\/+(?:maintainers(?:\/+report)?|ledger|mcp|faq|authorize)\/?$/i) ||
  isContributeFlowPath(pathname) ||
  decodedMatches(pathname, /^\/+learn\/+(?:about|maintainers)\/?$/i) ||
  decodedMatches(pathname, /^\/+learn\/+lessons\/+[^/\\]+(?:[/\\].*)?$/i);

/** The workspace's pages: Contribute's and Learn's, and everything under `/my`, in any spelling the router reads. */
export const isWorkspacePath = (pathname: string): boolean =>
  isContributePath(pathname) || isMyPath(pathname) || decodedMatches(pathname, /^\/+learn(?:[/\\]|$)/i);

/**
 * Where a workspace page sends an account being set up: the two connect pages to their steps of Contribute's flow
 * (which say so in place and keep the query), any other page to Contribute's home, which says so too. Both read
 * themselves again until the account is ready.
 */
export function settingUpHomeOf(url: { pathname: string; search?: string }): string {
  if (decodedMatches(url.pathname, /^\/+my\/+agent\/+connect\/?$/i)) {
    return `${GETTING_IN_PATHS.contributeAgentOwn}${url.search ?? ''}`;
  }
  if (decodedMatches(url.pathname, /^\/+my\/+agent\/+key\/?$/i)) {
    return `${GETTING_IN_PATHS.contributeAgentKey}${url.search ?? ''}`;
  }
  return '/contribute';
}

/** The page for AI agents, in markdown: a route handler, so links to it are plain anchors, never the router's. */
export const AGENTS_DOC_PATH = '/contribute/agents.md';
/** Where an agent sends its person: an old address, sent on to the own-agent step of Contribute's flow. */
export const START_AGENT_PATH = '/contribute?start=agent' as Route;

/** Settings, a summary of every setting, and the pages each one is changed on. */
export const SETTINGS_PATHS = {
  summary: WORKSPACE_PATHS.settings,
  github: WORKSPACE_PATHS.settingsGithub,
  pullRequests: WORKSPACE_PATHS.settingsPullRequests,
  goal: WORKSPACE_PATHS.settingsGoal,
  work: WORKSPACE_PATHS.settingsWork,
  budget: WORKSPACE_PATHS.agentBudget,
  agent: WORKSPACE_PATHS.agentModel,
  keys: WORKSPACE_PATHS.agentKey,
  ownAgent: WORKSPACE_PATHS.agent,
};

/**
 * Where each section of the one long Settings page now lives, by its old `#anchor` (W1 §4.2): the spending limits and
 * pacing, the model and the key on the Agent tab's pages; the pull request limits on Settings' own page; what you work
 * on, its filters and ignored repos on the work page, whose dialogs open at their anchor. Links in the app use it, and
 * the summary sends an old link (a bookmark, a notice) on to it. Anchors not here (`#email`, `#danger`) stay on the
 * summary.
 */
const ANCHORS: Record<string, Route> = {
  limits: SETTINGS_PATHS.budget,
  pacing: `${SETTINGS_PATHS.budget}#pacing` as Route,
  'more-limits': `${SETTINGS_PATHS.budget}#more-limits` as Route,
  agent: SETTINGS_PATHS.agent,
  prs: SETTINGS_PATHS.pullRequests,
  access: SETTINGS_PATHS.keys,
  github: SETTINGS_PATHS.github,
  modes: `${SETTINGS_PATHS.work}#modes` as Route,
  work: `${SETTINGS_PATHS.work}#work` as Route,
  ignored: `${SETTINGS_PATHS.work}#ignored` as Route,
  rules: `${SETTINGS_PATHS.work}#rules` as Route,
  'own-agent': `${SETTINGS_PATHS.ownAgent}#own-agent` as Route,
  // Pause and autopilot were here: the hosted agent's level (with Resume, while a pause holds) and its Autopilot card.
  pause: `${WORKSPACE_PATHS.agent}#hosted-level` as Route,
  autopilot: `${WORKSPACE_PATHS.agent}#autopilot` as Route,
};

/** The guided switch to a mode with a list. */
export const switchPathOf = (mode: ContributeSetListMode): Route =>
  `${WORKSPACE_PATHS.settingsWork}/switch/${mode.toLowerCase()}` as Route;

/** The mode a switch page's segment names, or null for any other segment. */
export const switchModeOf = (segment: string): ContributeSetListMode | null =>
  segment === 'stack' ? 'STACK' : segment === 'repos' ? 'REPOS' : null;

/** The page an old Settings `#anchor` is on now, or null when it stays on the summary. */
export const movedAnchorOf = (anchor: string): Route | null =>
  Object.hasOwn(ANCHORS, anchor) ? ANCHORS[anchor] : null;

/** Where a Settings section is: its own page, or the summary at its anchor. */
export const settingsPathOf = (anchor: string): Route =>
  movedAnchorOf(anchor) ?? (`${SETTINGS_PATHS.summary}#${anchor}` as Route);

/**
 * The page of one attempt, by its id alone: `/my/pull-requests/by-attempt/<id>`, which finds the attempt and goes on to
 * its page, the query kept (`?resume=`, `?move=`, `?session=next`). `view: 'lesson'` asks for a Learn attempt's
 * lesson. Every row of a list links this way: a row is one attempt.
 */
export function pullRequestByAttemptPath(
  attemptId: string,
  opts: { view?: 'lesson'; query?: Record<string, string> } = {},
): Route {
  const path = `${WORKSPACE_PATHS.pullRequests}/by-attempt/${encodeURIComponent(attemptId)}`;
  const query = new URLSearchParams({ ...(opts.view ? { view: opts.view } : {}), ...(opts.query ?? {}) }).toString();
  return (query ? `${path}?${query}` : path) as Route;
}

/**
 * An issue the user worked on, as the pull request's page names it: `repo` is `owner/name`. `earlier` is the id of an
 * older first attempt on the issue (the person discarded one and started again): its page sits under `earlier/<id>`.
 */
export type IssueRef = { repo: string; issue: number; earlier?: string | null };

/**
 * The pull request's page, by repo and issue: `/my/pull-requests/<owner>/<repo>/<issue>`, or an earlier attempt's under
 * it. `view` names a session: a run's (`{ run }`), or the next step (`'next'`). The address by repo and issue is what
 * the browser ends on and what people share; a link that knows only an attempt's id uses `pullRequestByAttemptPath`.
 */
export function pullRequestPath(ref: IssueRef, view?: { run: string } | 'next'): Route {
  const [owner = '', name = ''] = ref.repo.split('/');
  const issue = `${WORKSPACE_PATHS.pullRequests}/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/${ref.issue}`;
  const base = ref.earlier ? `${issue}/earlier/${encodeURIComponent(ref.earlier)}` : issue;
  if (view === 'next') return `${base}?session=next` as Route;
  return (view ? `${base}/runs/${encodeURIComponent(view.run)}` : base) as Route;
}

/**
 * Where the person picks an issue, by side: the Contribute tab's issues, or Learn's.
 */
export const PICK_ISSUE_PATHS = {
  fix: '/contribute#issues' as Route,
  learn: `${WORKSPACE_PATHS.learn}#issues` as Route,
} as const;

/** An attempt's id as the API writes it: anything else names no attempt, for anyone. */
export const ATTEMPT_ID = /^[\w-]{1,64}$/;

/**
 * Whether the path is the address by attempt with a well-formed id, in any spelling the router reads as it. A malformed
 * id is a 404 for anyone, signed in or not.
 */
export const isByAttemptPath = (pathname: string): boolean =>
  decodedMatches(pathname, /^\/+my\/+pull-requests\/+by-attempt\/+[\w-]{1,64}\/?$/i);

/**
 * The Start page for one issue: `/my/start/<owner>/<repo>/<issue>`. `lesson` asks for its lesson mode (`?lesson=1`);
 * `from: 'contribute'` sends lesson mode's back link to Contribute's issues instead of Learn's.
 */
export function startPath(
  ref: Pick<IssueRef, 'repo' | 'issue'>,
  opts: { lesson?: boolean; from?: 'contribute' } = {},
): Route {
  const [owner = '', name = ''] = ref.repo.split('/');
  const path = `/my/start/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/${ref.issue}`;
  const query = new URLSearchParams({
    ...(opts.lesson ? { lesson: '1' } : {}),
    ...(opts.from ? { from: opts.from } : {}),
  });
  const text = query.toString();
  return (text ? `${path}?${text}` : path) as Route;
}

/** Learn's own start page for an issue of `repo` (`owner/name`): the Start page in lesson mode, at Learn's address. */
export function learnStartPath(repo: string, number: number): Route {
  const [owner, name] = repo.split('/');
  return `/learn/start/${encodeURIComponent(owner)}/${encodeURIComponent(name ?? '')}/${number}` as Route;
}

/** The Pull requests tab's table holds this many rows a page. */
export const PULL_REQUESTS_PAGE_SIZE = 20;

/** The Pull requests tab's filters: a state chip, a side ("Made with"), a page. */
export type PullRequestsFilter = { state?: 'open' | 'merged' | 'closed'; made?: 'contribute' | 'learn'; page?: number };

/** The Pull requests tab under its filters; the first page has no `?page`. */
export function pullRequestsPath(filter: PullRequestsFilter = {}): Route {
  const query = new URLSearchParams();
  if (filter.state) query.set('state', filter.state);
  if (filter.made) query.set('made', filter.made);
  if (filter.page && filter.page > 1) query.set('page', String(filter.page));
  const text = query.toString();
  return (text ? `${WORKSPACE_PATHS.pullRequests}?${text}` : WORKSPACE_PATHS.pullRequests) as Route;
}
