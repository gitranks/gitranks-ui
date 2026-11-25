import type { Route } from 'next';

import type { ContributeView } from '@/lib/workspace/contribute.types';
import { claudeKeyOf, isOnboarded } from '@/lib/workspace/contribute-state';
import { GETTING_IN_PATHS, PICK_ISSUE_PATHS, WORKSPACE_PATHS } from '@/lib/workspace/paths';
import type { ContributeAccess } from '@/lib/workspace/preview-gate';

/**
 * Who the workspace is open to, and what they see: one answer for the tabs, the pages and the proxy.
 * - `signed-out`: no session.
 * - `hidden`: the API does not open the workspace to them (no profile, off the preview, or any failure): a 404.
 * - `setting-up`: a new account read for the first time; the home says so.
 * - `open`: `entered` once a way of contributing worked (a Claude key stored, or the own agent's first call; nothing
 *   clears it), `signs` each product's onboarding gone through, `agents` what is connected now.
 */
export type WorkspaceGate =
  | { kind: 'signed-out' }
  | { kind: 'hidden' }
  | { kind: 'setting-up' }
  | { kind: 'open'; entered: boolean; signs: WorkspaceSigns; agents: { hosted: boolean; own: boolean } };

/**
 * The two signs: the person went through Contribute's onboarding, or Learn's. Each is set once and never cleared. Null
 * when it is not known (its read failed): a reader then keeps today's rule and sends nobody to an onboarding.
 */
export type WorkspaceSigns = { contribute: boolean | null; learn: boolean | null };

/** A sign from its stamp: set, not set, or not known (`undefined`, its read failed). */
const signOf = (at: string | null | undefined): boolean | null => (at === undefined ? null : !!at);

/** The two signs of a Contribute view; both not known without one. */
export const signsOf = (view: ContributeView | null | undefined): WorkspaceSigns => ({
  contribute: signOf(view?.contributor?.contributeOnboardedAt),
  learn: signOf(view?.contributor?.learnOnboardedAt),
});

/**
 * Whether the person has the Contribute sign, for the flow's pages: the sign itself, or, while it is not known, today's
 * rule ("entered"), so nobody is sent back through the onboarding by a failed read.
 */
export const hasContributeSign = (gate: Extract<WorkspaceGate, { kind: 'open' }>): boolean =>
  gate.signs.contribute ?? gate.entered;

/** What the gate is decided from: the session's login, the API's answers for it, and the user's Contribute view. */
export type WorkspaceGateRead = {
  githubLogin: string | null | undefined;
  access: ContributeAccess;
  view: ContributeView | null | undefined;
};

/** The gate, from today's answers: Contribute's access and onboarding. */
export function workspaceGateOf({ githubLogin, access, view }: WorkspaceGateRead): WorkspaceGate {
  if (!githubLogin) return { kind: 'signed-out' };
  if (access === 'setting-up') return { kind: 'setting-up' };
  if (access !== 'allowed') return { kind: 'hidden' };
  return {
    kind: 'open',
    entered: isOnboarded(view),
    signs: signsOf(view),
    agents: { hosted: !!claudeKeyOf(view), own: !!view?.ownAgent?.paths.mcp },
  };
}

/** The workspace's four tabs. Learn is not one of them: it is a door at the bar's right edge (`LearnDoor`). */
export type WorkspaceTab = 'contribute' | 'pull-requests' | 'agent' | 'settings';

/** The tabs the gate shows: none until the user has entered. */
export function tabsOf(gate: WorkspaceGate): WorkspaceTab[] {
  if (gate.kind !== 'open' || !gate.entered) return [];
  return ['contribute', 'pull-requests', 'agent', 'settings'];
}

/**
 * Where a signed-in account that has not entered the workspace yet is sent from a page under `/my`; null when the page
 * opens. The Agent and Settings pages open (someone mid-setup can revoke a token or delete their data), but for the
 * agent's connect page, whose step of Contribute's flow it goes to with its query. A Start page reached from Learn
 * (`?from=learn`) goes to Learn's Issues, where the issue is listed; any other Start page to the flow's first step, where
 * the agent gets connected; every other page to Contribute's home, which starts them.
 */
export function notEnteredTargetOf(pathname: string, search?: URLSearchParams): Route | null {
  const path = pathname.replace(/\/+$/, '');
  if (!/^\/my(?:\/|$)/.test(path)) return null;
  if (path === WORKSPACE_PATHS.agentConnect) {
    const query = search?.toString();
    return (query ? `${GETTING_IN_PATHS.contributeAgentOwn}?${query}` : GETTING_IN_PATHS.contributeAgentOwn) as Route;
  }
  if (/^\/my\/(?:agent|settings)(?:\/|$)/.test(path)) return null;
  if (/^\/my\/start\//.test(path)) {
    return search?.get('from') === 'learn' ? PICK_ISSUE_PATHS.learn : GETTING_IN_PATHS.contributeStart;
  }
  return WORKSPACE_PATHS.contribute;
}
