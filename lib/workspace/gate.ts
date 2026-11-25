import type { Route } from 'next';

import type { ContributeView } from '@/lib/workspace/contribute.types';
import { claudeKeyOf, isOnboarded } from '@/lib/workspace/contribute-state';
import { GETTING_IN_PATHS, learnSetupHrefOf, WORKSPACE_PATHS } from '@/lib/workspace/paths';
import type { ContributeAccess } from '@/lib/workspace/preview-gate';

/**
 * Who the workspace is open to, and what they see: one answer for the tabs, the pages and the proxy.
 * - `signed-out`: no session.
 * - `hidden`: the API does not open the workspace to them (no profile, off the preview, or any failure): a 404.
 * - `setting-up`: a new account read for the first time; the home says so.
 * - `open`: `signs` each product's onboarding gone through, `agents` what is connected now.
 */
export type WorkspaceGate =
  | { kind: 'signed-out' }
  | { kind: 'hidden' }
  | { kind: 'setting-up' }
  | { kind: 'open'; signs: WorkspaceSigns; agents: { hosted: boolean; own: boolean } };

/**
 * The two signs: the person went through Contribute's onboarding, or Learn's. Each is set once and never cleared. Null
 * when it is not known (its read failed): a reader then keeps today's rule and sends nobody to an onboarding.
 */
export type WorkspaceSigns = { contribute: boolean | null; learn: boolean | null };

/** A sign from its stamp: set, not set, or not known (`undefined`, its read failed). */
const signOf = (at: string | null | undefined): boolean | null => (at === undefined ? null : !!at);

/**
 * The two signs of a Contribute view, as read: both not known without one; both not set when it names no contributor
 * (a new account has no row until its first write, so it has been through neither onboarding).
 */
export const signsOf = (view: ContributeView | null | undefined): WorkspaceSigns =>
  view?.contributor === null
    ? { contribute: false, learn: false }
    : {
        contribute: signOf(view?.contributor?.contributeOnboardedAt),
        learn: signOf(view?.contributor?.learnOnboardedAt),
      };

/**
 * The gate's signs. A Contribute sign that is not known takes the rule from before the signs where that rule says yes
 * (a way of contributing worked once, `isOnboarded`), so a failed read never sends a person who is in back through the
 * onboarding; otherwise it stays not known.
 */
const gateSignsOf = (view: ContributeView | null | undefined): WorkspaceSigns => {
  const signs = signsOf(view);
  return { ...signs, contribute: signs.contribute ?? (isOnboarded(view) || null) };
};

/** Whether the person has the Contribute sign (with the rule from before it while it is not known). */
export const hasContributeSign = (gate: Extract<WorkspaceGate, { kind: 'open' }>): boolean =>
  gate.signs.contribute === true;

/**
 * Whether the person has either sign, for the pages both products share: the Contribute sign, or the Learn sign. A
 * Learn sign that is not known closes nothing.
 */
export const hasEitherSign = (gate: Extract<WorkspaceGate, { kind: 'open' }>): boolean =>
  hasContributeSign(gate) || gate.signs.learn !== false;

/** What the gate is decided from: the session's login, the API's answers for it, and the user's Contribute view. */
export type WorkspaceGateRead = {
  githubLogin: string | null | undefined;
  access: ContributeAccess;
  view: ContributeView | null | undefined;
};

/** The gate, from the API's answers: Contribute's access, the signs, and what is connected. */
export function workspaceGateOf({ githubLogin, access, view }: WorkspaceGateRead): WorkspaceGate {
  if (!githubLogin) return { kind: 'signed-out' };
  if (access === 'setting-up') return { kind: 'setting-up' };
  if (access !== 'allowed') return { kind: 'hidden' };
  return {
    kind: 'open',
    signs: gateSignsOf(view),
    agents: { hosted: !!claudeKeyOf(view), own: !!view?.ownAgent?.paths.mcp },
  };
}

/** The workspace's four tabs. Learn is not one of them: it is a door at the bar's right edge (`LearnDoor`). */
export type WorkspaceTab = 'contribute' | 'pull-requests' | 'agent' | 'settings';

/** The tabs the gate shows: none without the Contribute sign. */
export function tabsOf(gate: WorkspaceGate): WorkspaceTab[] {
  if (gate.kind !== 'open' || !hasContributeSign(gate)) return [];
  return ['contribute', 'pull-requests', 'agent', 'settings'];
}

/**
 * Whether the workspace's one poll runs for the person (`ChangesProvider`): with either sign. The tabs mount it; a
 * person with the Learn sign only has no tabs and gets the poll alone, so the shared pages under `/my` still move on.
 */
export const pollsOf = (gate: WorkspaceGate | null | undefined): boolean =>
  gate?.kind === 'open' && hasEitherSign(gate);

/** A Start page: `/my/start/…`. */
const START_PAGE = /^\/my\/start\//;

/** The pages under `/my` that open with either sign: the Agent tab's runs and the pull requests. */
const SHARED_PAGE = /^\/my\/(?:agent\/runs|pull-requests)(?:\/|$)/;

/** The pages under `/my` open to anyone with an account: the Agent tab, Settings, and the page of one issue. */
const OPEN_PAGE = /^\/my\/(?:agent|settings|issues)(?:\/|$)/;

/** The address with its query. */
const withSearch = (path: string, search?: URLSearchParams): string => {
  const query = search?.toString();
  return query ? `${path}?${query}` : path;
};

/**
 * Where a page past Settings sends a person without either sign: Learn's onboarding with the way back to the page when
 * Learn opened it (`?from=learn`), else `/contribute`, which starts Contribute.
 */
export function closedPageTargetOf(path: string, search?: URLSearchParams): Route {
  return search?.get('from') === 'learn' ? learnSetupHrefOf(withSearch(path, search)) : WORKSPACE_PATHS.contribute;
}

/**
 * Where a signed-in person is sent from a page under `/my` by the signs they have; null when the page opens.
 * - The agent's connect page opens with either sign; without one it is the own-agent step of Contribute's flow, the
 *   query kept. The key page opens unless the Contribute sign is known to be missing: then the flow's key step.
 * - The Agent tab's runs and the pull requests open with either sign; without one, `closedPageTargetOf`.
 * - The rest of the Agent tab, Settings and the page of one issue open to anyone with an account, so a person part way
 *   through can revoke a token or delete their data.
 * - A Start page from Learn (`?from=learn` or `?lesson=1`) opens with the Learn sign (or one not known), else Learn's
 *   onboarding with the way back to it. From Contribute it opens with the Contribute sign, else the flow's first step.
 * - Any other page opens with either sign, else `/contribute`.
 */
export function signTargetOf(
  pathname: string,
  search: URLSearchParams | undefined,
  signs: WorkspaceSigns,
): Route | null {
  const path = pathname.replace(/\/+$/, '');
  if (!/^\/my(?:\/|$)/.test(path)) return null;
  const either = signs.contribute === true || signs.learn !== false;
  if (path === WORKSPACE_PATHS.agentConnect) {
    return either ? null : (withSearch(GETTING_IN_PATHS.contributeAgentOwn, search) as Route);
  }
  // The hosted agent works for Contribute only: its key page waits for the Contribute sign (a sign not known opens it).
  if (path === WORKSPACE_PATHS.agentKey) {
    return signs.contribute === false ? (withSearch(GETTING_IN_PATHS.contributeAgentKey, search) as Route) : null;
  }
  if (SHARED_PAGE.test(path)) return either ? null : closedPageTargetOf(path, search);
  if (OPEN_PAGE.test(path)) return null;
  if (START_PAGE.test(path)) {
    if (search?.get('from') === 'learn' || search?.get('lesson') === '1') {
      return signs.learn === false ? learnSetupHrefOf(withSearch(path, search)) : null;
    }
    return signs.contribute === true ? null : GETTING_IN_PATHS.contributeStart;
  }
  return either ? null : WORKSPACE_PATHS.contribute;
}
