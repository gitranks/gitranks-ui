import { parse } from 'graphql';
import type { Route } from 'next';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import type { ContributeView } from '@/lib/workspace/contribute.types';
import { claudeKeyOf, isOnboarded } from '@/lib/workspace/contribute-state';
import { GETTING_IN_PATHS, WORKSPACE_PATHS } from '@/lib/workspace/paths';
import type { ContributeAccess } from '@/lib/workspace/preview-gate';
import { sessionTokenOf } from '@/lib/workspace/session-token';
import type DocumentNode from '@/types/typed-document-node';

/** Whether Learn is open to the signed-in viewer. */
export const LearnOpenDocument = parse('query LearnOpen { learnOpen }') as DocumentNode<{ learnOpen: boolean }>;

/**
 * Whether GitRanks Learn is open to this GitHub login (the API's `learnOpen`). Closed without a login, and on any
 * failure: an API that does not know the field yet answers a schema error, and Learn stays closed until it does.
 */
export async function learnOpenFor(githubLogin: string | null | undefined): Promise<boolean> {
  if (!githubLogin) return false;
  try {
    const { learnOpen } = await graphqlDirect(LearnOpenDocument, undefined, { source: 'ssr', githubLogin });
    return learnOpen === true;
  } catch {
    return false;
  }
}

/**
 * Learn for the request's signed-in viewer, as the proxy reads it before a page renders: `open`, `closed`, or
 * `signed-out` when the request carries no session the server can read (none, or an expired one).
 */
export type LearnAccess = 'open' | 'closed' | 'signed-out';

/** The longest the proxy waits for `learnOpen`; no answer by then lets the request on to the page, which asks again. */
export const LEARN_ACCESS_TIMEOUT_MS = 2000;

export async function requestLearnAccess(
  req: { headers: Headers },
  timeoutMs = LEARN_ACCESS_TIMEOUT_MS,
): Promise<LearnAccess> {
  const token = await sessionTokenOf(req);
  if (!token?.githubLogin || token.error) return 'signed-out';
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(true), timeoutMs);
  });
  try {
    return (await Promise.race([learnOpenFor(token.githubLogin), late])) ? 'open' : 'closed';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Who the workspace is open to, and what they see: one answer for the tabs, the pages and the proxy.
 * - `signed-out`: no session.
 * - `hidden`: the API does not open the workspace to them (no profile, off the preview, or any failure): a 404.
 * - `setting-up`: a new account read for the first time; the home says so.
 * - `open`: `entered` once a way of contributing worked (a Claude key stored, or the own agent's first call; nothing
 *   clears it), `agents` what is connected now, `learnOpen` whether Learn is open to them (false on any failure).
 */
export type WorkspaceGate =
  | { kind: 'signed-out' }
  | { kind: 'hidden' }
  | { kind: 'setting-up' }
  | { kind: 'open'; entered: boolean; agents: { hosted: boolean; own: boolean }; learnOpen: boolean };

/** What the gate is decided from: the session's login, the API's answers for it, and the user's Contribute view. */
export type WorkspaceGateRead = {
  githubLogin: string | null | undefined;
  access: ContributeAccess;
  view: ContributeView | null | undefined;
  learnOpen: boolean;
};

/** The gate, from today's answers: Contribute's access and onboarding, and Learn's `learnOpen`. */
export function workspaceGateOf({ githubLogin, access, view, learnOpen }: WorkspaceGateRead): WorkspaceGate {
  if (!githubLogin) return { kind: 'signed-out' };
  if (access === 'setting-up') return { kind: 'setting-up' };
  if (access !== 'allowed') return { kind: 'hidden' };
  return {
    kind: 'open',
    entered: isOnboarded(view),
    agents: { hosted: !!claudeKeyOf(view), own: !!view?.ownAgent?.paths.mcp },
    learnOpen,
  };
}

export type WorkspaceTab = 'contribute' | 'learn' | 'pull-requests' | 'agent' | 'settings';

/** The tabs the gate shows: none until the user has entered; Learn only where it is open to them. */
export function tabsOf(gate: WorkspaceGate): WorkspaceTab[] {
  if (gate.kind !== 'open' || !gate.entered) return [];
  return gate.learnOpen
    ? ['contribute', 'learn', 'pull-requests', 'agent', 'settings']
    : ['contribute', 'pull-requests', 'agent', 'settings'];
}

/**
 * Where a signed-in account that has not entered the workspace yet is sent from a page under `/my`; null when the page
 * opens. The Agent and Settings pages open (someone mid-setup can revoke a token or delete their data), but for the
 * agent's connect page, whose step of Contribute's flow it goes to with its query. A Start page in Fix mode goes to the
 * flow's first step, one in lesson mode to Learn's step for the issue; every other page to Contribute's home, which
 * starts them.
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
    if (search?.get('lesson') !== '1') return GETTING_IN_PATHS.contributeWork;
    // A lesson's Start page: Learn's own step for the issue, at its start address.
    const issue = /^\/my\/start\/([^/]+\/[^/]+\/[^/]+)$/.exec(path);
    if (issue) return `${GETTING_IN_PATHS.learnGoal}/${issue[1]}` as Route;
  }
  return WORKSPACE_PATHS.contribute;
}
