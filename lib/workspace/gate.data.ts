import { cache } from 'react';

import { loadContribute, loadContributeSetup, viewerLogin } from './contribute.data';
import { learnOpenFor, type WorkspaceGate, workspaceGateOf } from './gate';

/**
 * Whether Learn is open to the signed-in viewer; closed signed out and on any failure. Read once per request: the gate
 * and Learn's pages share it (`lib/learn/learn.data.ts` re-exports it).
 */
export const loadLearnOpen = cache(async (): Promise<boolean> => learnOpenFor(await viewerLogin()));

/**
 * The gate for this request's viewer (`workspaceGateOf`), read once per request: the tabs and the pages share it. A
 * read of the user's Contribute view that fails throws, as the pages' own reads do, so an outage shows "try again"
 * and never reads as "hidden".
 */
export const loadWorkspaceGate = cache(async (): Promise<WorkspaceGate> => {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { kind: 'signed-out' };
  const [view, learnOpen] = await Promise.all([loadContribute(), loadLearnOpen()]);
  const access = view ? 'allowed' : (await loadContributeSetup()) ? 'setting-up' : 'hidden';
  return workspaceGateOf({ githubLogin, access, view, learnOpen });
});
