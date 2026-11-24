import { cache } from 'react';

import { loadContribute, loadContributeSetup, viewerLogin } from './contribute.data';
import { type WorkspaceGate, workspaceGateOf } from './gate';

/**
 * The gate for this request's viewer (`workspaceGateOf`), read once per request: the tabs and the pages share it. A
 * read of the user's Contribute view that fails throws, as the pages' own reads do, so an outage shows "try again"
 * and never reads as "hidden".
 */
export const loadWorkspaceGate = cache(async (): Promise<WorkspaceGate> => {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { kind: 'signed-out' };
  const view = await loadContribute();
  const access = view ? 'allowed' : (await loadContributeSetup()) ? 'setting-up' : 'hidden';
  return workspaceGateOf({ githubLogin, access, view });
});
