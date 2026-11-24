import type { Route } from 'next';

import type { ContributeView } from '@/lib/workspace/contribute.types';
import { claudeKeyOf, isOnboarded } from '@/lib/workspace/contribute-state';
import { GETTING_IN_PATHS, WORKSPACE_PATHS } from '@/lib/workspace/paths';
import type { ContributeAccess } from '@/lib/workspace/preview-gate';

/**
 * Who the workspace is open to, and what they see: one answer for the tabs, the pages and the proxy.
 * - `signed-out`: no session.
 * - `hidden`: the API does not open the workspace to them (no profile, off the preview, or any failure): a 404.
 * - `setting-up`: a new account read for the first time; the home says so.
 * - `open`: `entered` once a way of contributing worked (a Claude key stored, or the own agent's first call; nothing
 *   clears it), `agents` what is connected now.
 */
export type WorkspaceGate =
  | { kind: 'signed-out' }
  | { kind: 'hidden' }
  | { kind: 'setting-up' }
  | { kind: 'open'; entered: boolean; agents: { hosted: boolean; own: boolean } };

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
    agents: { hosted: !!claudeKeyOf(view), own: !!view?.ownAgent?.paths.mcp },
  };
}

export type WorkspaceTab = 'contribute' | 'learn' | 'pull-requests' | 'agent' | 'settings';

/** The tabs the gate shows: none until the user has entered. */
export function tabsOf(gate: WorkspaceGate): WorkspaceTab[] {
  if (gate.kind !== 'open' || !gate.entered) return [];
  return ['contribute', 'learn', 'pull-requests', 'agent', 'settings'];
}

/**
 * Where a signed-in account that has not entered the workspace yet is sent from a page under `/my`; null when the page
 * opens. The Agent and Settings pages open (someone mid-setup can revoke a token or delete their data), but for the
 * agent's connect page, whose step of Contribute's flow it goes to with its query. A Start page, in either mode, goes to
 * the flow's first step, where the agent gets connected; every other page to Contribute's home, which starts them.
 */
export function notEnteredTargetOf(pathname: string, search?: URLSearchParams): Route | null {
  const path = pathname.replace(/\/+$/, '');
  if (!/^\/my(?:\/|$)/.test(path)) return null;
  if (path === WORKSPACE_PATHS.agentConnect) {
    const query = search?.toString();
    return (query ? `${GETTING_IN_PATHS.contributeAgentOwn}?${query}` : GETTING_IN_PATHS.contributeAgentOwn) as Route;
  }
  if (/^\/my\/(?:agent|settings)(?:\/|$)/.test(path)) return null;
  if (/^\/my\/start\//.test(path)) return GETTING_IN_PATHS.contributeWork;
  return WORKSPACE_PATHS.contribute;
}
