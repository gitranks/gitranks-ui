import { describe, expect, it } from 'vitest';

const { notEnteredTargetOf, tabsOf, workspaceGateOf } = await import('./gate');
const { views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { isLearnPath } = await import('@/lib/learn/learn-path');

describe("Learn's paths", () => {
  it('takes /learn and everything under it as Learn, in the spellings the router reads', () => {
    for (const path of [
      '/learn',
      '/learn/',
      '/LEARN/profile',
      '//learn//attempts/A_1',
      '/%6Cearn/lessons',
      '/learn%',
      '/learn/start/driftwood-js/driftwood/934',
      '/Learn//Start/acme/router/1',
    ]) {
      expect(isLearnPath(path), path).toBe(true);
    }
    for (const path of ['/', '/learning', '/learners', '/contribute/learn', '/profile/learn']) {
      expect(isLearnPath(path), path).toBe(false);
    }
  });
});

describe("the workspace gate, over today's answers", () => {
  const read = { githubLogin: 'octocat', access: 'allowed' as const, view: views.active };

  it('is signed out without a login, whatever else is known', () => {
    expect(workspaceGateOf({ ...read, githubLogin: null })).toEqual({ kind: 'signed-out' });
    expect(workspaceGateOf({ ...read, githubLogin: '' })).toEqual({ kind: 'signed-out' });
  });

  it("is hidden or setting up as Contribute's access says", () => {
    expect(workspaceGateOf({ ...read, access: 'hidden' })).toEqual({ kind: 'hidden' });
    expect(workspaceGateOf({ ...read, access: 'setting-up' })).toEqual({ kind: 'setting-up' });
  });

  it('is open with what the user has entered and connected', () => {
    expect(workspaceGateOf(read)).toEqual({
      kind: 'open',
      entered: true,
      agents: { hosted: true, own: false },
    });
    expect(workspaceGateOf({ ...read, view: views.agentOnboarded })).toEqual({
      kind: 'open',
      entered: true,
      agents: { hosted: false, own: true },
    });
    // Entered once, and everything revoked since: still entered, nothing connected.
    expect(workspaceGateOf({ ...read, view: views.onboardedNoPath })).toMatchObject({
      entered: true,
      agents: { hosted: false, own: false },
    });
    expect(workspaceGateOf({ ...read, view: views.midSetup })).toMatchObject({ entered: false });
    expect(workspaceGateOf({ ...read, view: null })).toMatchObject({ entered: false });
  });

  it('shows every tab once entered', () => {
    expect(tabsOf(workspaceGateOf(read))).toEqual(['contribute', 'learn', 'pull-requests', 'agent', 'settings']);
    expect(tabsOf(workspaceGateOf({ ...read, view: views.midSetup }))).toEqual([]);
    expect(tabsOf({ kind: 'signed-out' })).toEqual([]);
    expect(tabsOf({ kind: 'hidden' })).toEqual([]);
    expect(tabsOf({ kind: 'setting-up' })).toEqual([]);
  });
});

describe('where an account that has not entered goes from a page under /my', () => {
  it('opens the Agent and Settings pages, as someone mid-setup may need them', () => {
    for (const path of ['/my/agent', '/my/agent/', '/my/agent/key', '/my/agent/runs', '/my/settings/work']) {
      expect(notEnteredTargetOf(path), path).toBeNull();
    }
  });

  it('sends the agent’s connect page to the own-agent step of Contribute’s flow, the query kept', () => {
    expect(notEnteredTargetOf('/my/agent/connect')).toBe('/contribute/start/agent/own');
    expect(notEnteredTargetOf('/my/agent/connect/', new URLSearchParams('from=agent'))).toBe(
      '/contribute/start/agent/own?from=agent',
    );
  });

  it('sends a Start page in Fix mode to the flow’s first step', () => {
    expect(notEnteredTargetOf('/my/start/acme/widgets/42')).toBe('/contribute/start');
    expect(notEnteredTargetOf('/my/start/acme/widgets/42', new URLSearchParams('from=contribute'))).toBe(
      '/contribute/start',
    );
  });

  it("sends a lesson's Start page to Learn's step for the issue", () => {
    expect(notEnteredTargetOf('/my/start/acme/widgets/42', new URLSearchParams('lesson=1'))).toBe(
      '/learn/start/acme/widgets/42',
    );
    expect(notEnteredTargetOf('/my/start/acme/widgets/42/', new URLSearchParams('lesson=1&from=contribute'))).toBe(
      '/learn/start/acme/widgets/42',
    );
  });

  it("sends every other page to Contribute's home", () => {
    for (const path of ['/my/pull-requests', '/my/pull-requests/acme/widgets/42', '/my']) {
      expect(notEnteredTargetOf(path), path).toBe('/contribute');
    }
  });

  it('decides nothing outside /my', () => {
    for (const path of ['/contribute', '/learn', '/my-agent', '/myself'])
      expect(notEnteredTargetOf(path), path).toBeNull();
  });
});
