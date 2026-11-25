import { describe, expect, it } from 'vitest';

const { closedPageTargetOf, hasContributeSign, hasEitherSign, pollsOf, signTargetOf, tabsOf, workspaceGateOf } =
  await import('./gate');
const { contributor, views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { isLearnPath } = await import('@/lib/learn/learn-path');

import type { WorkspaceGate, WorkspaceSigns } from './gate';

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

const AT = '2026-11-25T09:00:00.000Z';

/** A view with the two signs as the API answered them (`undefined`: not known) and the stamp from before them. */
const viewWith = (
  contributeOnboardedAt: string | null | undefined,
  learnOnboardedAt: string | null | undefined,
  onboardedAt: string | null = AT,
) => ({ ...views.active, contributor: contributor({ contributeOnboardedAt, learnOnboardedAt, onboardedAt }) });

/** An open gate with these signs, as `workspaceGateOf` gives them. */
const open = (signs: WorkspaceSigns): Extract<WorkspaceGate, { kind: 'open' }> => ({
  kind: 'open',
  signs,
  agents: { hosted: false, own: false },
});

/** The states every row is checked in, by the gate's signs (a visitor never has an open gate). */
const STATES = {
  none: { contribute: false, learn: false },
  contribute: { contribute: true, learn: false },
  learn: { contribute: false, learn: true },
  both: { contribute: true, learn: true },
  // Not known, and the rule from before the signs says no: the gate leaves the Contribute sign not known.
  unknown: { contribute: null, learn: null },
  // Not known, set up under the rule from before the signs: the gate fills the Contribute sign in.
  unknownSetUp: { contribute: true, learn: null },
} as const satisfies Record<string, WorkspaceSigns>;

type State = keyof typeof STATES;

describe("the workspace gate, over the API's answers", () => {
  const read = { githubLogin: 'octocat', access: 'allowed' as const, view: views.active };

  it('is signed out without a login, whatever else is known', () => {
    expect(workspaceGateOf({ ...read, githubLogin: null })).toEqual({ kind: 'signed-out' });
    expect(workspaceGateOf({ ...read, githubLogin: '' })).toEqual({ kind: 'signed-out' });
  });

  it("is hidden or setting up as Contribute's access says", () => {
    expect(workspaceGateOf({ ...read, access: 'hidden' })).toEqual({ kind: 'hidden' });
    expect(workspaceGateOf({ ...read, access: 'setting-up' })).toEqual({ kind: 'setting-up' });
  });

  it('is open with the signs and what is connected, and no `entered`', () => {
    expect(workspaceGateOf({ ...read, view: viewWith(AT, null) })).toEqual({
      kind: 'open',
      signs: { contribute: true, learn: false },
      agents: { hosted: true, own: false },
    });
    expect(workspaceGateOf({ ...read, view: views.agentOnboarded })).toMatchObject({
      agents: { hosted: false, own: true },
    });
    expect(workspaceGateOf({ ...read, view: views.onboardedNoPath })).toMatchObject({
      agents: { hosted: false, own: false },
    });
  });

  it('carries each sign as read: set, not set', () => {
    expect(workspaceGateOf({ ...read, view: viewWith(AT, AT) })).toMatchObject({ signs: STATES.both });
    expect(workspaceGateOf({ ...read, view: viewWith(null, AT) })).toMatchObject({ signs: STATES.learn });
    // The sign wins over the stamp from before it once it is known.
    expect(workspaceGateOf({ ...read, view: viewWith(null, null) })).toMatchObject({ signs: STATES.none });
  });

  it('reads both signs as not set for an account with no contributor yet', () => {
    const gate = workspaceGateOf({ ...read, view: views.newcomer });
    expect(gate).toMatchObject({ signs: STATES.none });
    if (gate.kind !== 'open') throw new Error('expected an open gate');
    expect(tabsOf(gate)).toEqual([]);
    expect(signTargetOf('/my/agent/connect', undefined, gate.signs)).toBe('/contribute/start/agent/own');
    expect(signTargetOf('/my/agent/key', undefined, gate.signs)).toBe('/contribute/start/agent/key');
    expect(signTargetOf('/my/start/acme/widgets/42', new URLSearchParams('from=learn'), gate.signs)).toBe(
      `/learn/setup?back=${encodeURIComponent('/my/start/acme/widgets/42?from=learn')}`,
    );
    expect(signTargetOf('/my/start/acme/widgets/42', undefined, gate.signs)).toBe('/contribute/start');
  });

  it('fills a Contribute sign that is not known from the rule before it when that says yes, else leaves it not known', () => {
    expect(workspaceGateOf({ ...read, view: viewWith(undefined, undefined) })).toMatchObject({
      signs: STATES.unknownSetUp,
    });
    expect(workspaceGateOf({ ...read, view: viewWith(undefined, undefined, null) })).toMatchObject({
      signs: STATES.unknown,
    });
    expect(workspaceGateOf({ ...read, view: views.midSetup })).toMatchObject({ signs: { contribute: null } });
    expect(workspaceGateOf({ ...read, view: null })).toMatchObject({ signs: STATES.unknown });
  });
});

describe('the signs the readers ask for', () => {
  it.each<[State, boolean, boolean]>([
    ['none', false, false],
    ['contribute', true, true],
    ['learn', false, true],
    ['both', true, true],
    // A Learn sign not known closes nothing; a Contribute sign not known is not one.
    ['unknown', false, true],
    ['unknownSetUp', true, true],
  ])('%s: the Contribute sign %s, either sign %s', (state, contribute, either) => {
    expect(hasContributeSign(open(STATES[state]))).toBe(contribute);
    expect(hasEitherSign(open(STATES[state]))).toBe(either);
  });
});

describe('the tabs and the poll', () => {
  it.each<[string, WorkspaceGate | null, number, boolean]>([
    ['a visitor', { kind: 'signed-out' }, 0, false],
    ['hidden', { kind: 'hidden' }, 0, false],
    ['setting up', { kind: 'setting-up' }, 0, false],
    ['the gate unread', null, 0, false],
    ['no sign', open(STATES.none), 0, false],
    ['the Contribute sign only', open(STATES.contribute), 4, true],
    ['the Learn sign only: the poll, no tabs', open(STATES.learn), 0, true],
    ['both signs', open(STATES.both), 4, true],
    ['the signs not known', open(STATES.unknown), 0, true],
    ['the signs not known, set up before them', open(STATES.unknownSetUp), 4, true],
  ])('%s: %i tabs, poll %s', (_who, gate, tabs, poll) => {
    expect(gate ? tabsOf(gate) : []).toHaveLength(tabs);
    expect(pollsOf(gate)).toBe(poll);
  });

  it('draws the four tabs in their order', () => {
    expect(tabsOf(open(STATES.contribute))).toEqual(['contribute', 'pull-requests', 'agent', 'settings']);
  });
});

describe('where a page under /my sends a person by their signs', () => {
  const target = (path: string, state: State, query = '') =>
    signTargetOf(path, new URLSearchParams(query), STATES[state]);
  const ALL = Object.keys(STATES) as State[];

  it('opens the Agent tab and Settings to anyone with an account, so a person part way through can leave', () => {
    for (const path of ['/my/agent', '/my/agent/', '/my/agent/budget', '/my/settings/work']) {
      for (const state of ALL) expect(target(path, state), `${path} ${state}`).toBeNull();
    }
  });

  it('opens the page of one issue to anyone signed in', () => {
    for (const state of ALL) {
      expect(target('/my/issues/q7k2m9xa', state)).toBeNull();
      expect(target('/my/issues/q7k2m9xa', state, 'from=learn')).toBeNull();
    }
  });

  it("opens the agent's connect page with either sign; without one, the own-agent step of the flow, the query kept", () => {
    for (const state of ['contribute', 'learn', 'both', 'unknown', 'unknownSetUp'] as const) {
      expect(target('/my/agent/connect', state), state).toBeNull();
    }
    expect(target('/my/agent/connect', 'none')).toBe('/contribute/start/agent/own');
    expect(target('/my/agent/connect/', 'none', 'from=agent')).toBe('/contribute/start/agent/own?from=agent');
  });

  it("opens the key page unless the Contribute sign is known to be missing, else Contribute's key step", () => {
    for (const state of ['contribute', 'both', 'unknown', 'unknownSetUp'] as const) {
      expect(target('/my/agent/key', state, 'replace=1'), state).toBeNull();
    }
    for (const state of ['none', 'learn'] as const) {
      expect(target('/my/agent/key', state), state).toBe('/contribute/start/agent/key');
      expect(target('/my/agent/key/', state, 'replace=1'), state).toBe('/contribute/start/agent/key?replace=1');
    }
  });

  it("opens the Agent tab's runs and the pull requests with either sign", () => {
    for (const path of ['/my/agent/runs', '/my/pull-requests', '/my/pull-requests/acme/widgets/42']) {
      for (const state of ['contribute', 'learn', 'both', 'unknown', 'unknownSetUp'] as const) {
        expect(target(path, state), `${path} ${state}`).toBeNull();
        expect(target(path, state, 'from=learn'), `${path} ${state}`).toBeNull();
      }
    }
  });

  it("sends them to /contribute without either sign, or to Learn's onboarding with the way back when Learn opened them", () => {
    expect(target('/my/agent/runs', 'none')).toBe('/contribute');
    expect(target('/my/pull-requests', 'none', 'from=contribute')).toBe('/contribute');
    expect(target('/my/pull-requests', 'none', 'from=learn')).toBe(
      `/learn/setup?back=${encodeURIComponent('/my/pull-requests?from=learn')}`,
    );
    expect(target('/my/pull-requests/acme/widgets/42/', 'none', 'from=learn')).toBe(
      `/learn/setup?back=${encodeURIComponent('/my/pull-requests/acme/widgets/42?from=learn')}`,
    );
    expect(target('/my/agent/runs', 'none', 'from=learn&outcome=merged')).toBe(
      `/learn/setup?back=${encodeURIComponent('/my/agent/runs?from=learn&outcome=merged')}`,
    );
  });

  it('opens a Start page from Contribute with the Contribute sign, else the flow’s first step', () => {
    for (const query of ['', 'from=contribute', 'from=email']) {
      for (const state of ['contribute', 'both', 'unknownSetUp'] as const) {
        expect(target('/my/start/acme/widgets/42', state, query), `${state} ${query}`).toBeNull();
      }
      for (const state of ['none', 'learn', 'unknown'] as const) {
        expect(target('/my/start/acme/widgets/42', state, query), `${state} ${query}`).toBe('/contribute/start');
      }
    }
  });

  it("opens a Start page from Learn with the Learn sign (or one not known), else Learn's onboarding with the way back", () => {
    for (const query of ['from=learn', 'lesson=1', 'lesson=1&from=contribute']) {
      for (const state of ['learn', 'both', 'unknown', 'unknownSetUp'] as const) {
        expect(target('/my/start/acme/widgets/42', state, query), `${state} ${query}`).toBeNull();
      }
      for (const state of ['none', 'contribute'] as const) {
        expect(target('/my/start/acme/widgets/42/', state, query), `${state} ${query}`).toBe(
          `/learn/setup?back=${encodeURIComponent(`/my/start/acme/widgets/42?${query}`)}`,
        );
      }
    }
  });

  it('opens any other page under /my with either sign, else /contribute', () => {
    expect(target('/my', 'none')).toBe('/contribute');
    expect(target('/my/progress', 'none')).toBe('/contribute');
    for (const state of ['contribute', 'learn', 'both', 'unknown'] as const) expect(target('/my', state)).toBeNull();
  });

  it('decides nothing outside /my', () => {
    for (const path of ['/contribute', '/learn', '/my-agent', '/myself']) {
      expect(target(path, 'none'), path).toBeNull();
    }
  });

  it('takes the way back only where Learn opened the page', () => {
    expect(closedPageTargetOf('/my/pull-requests')).toBe('/contribute');
    expect(closedPageTargetOf('/my/pull-requests', new URLSearchParams('from=contribute'))).toBe('/contribute');
    expect(closedPageTargetOf('/my/pull-requests', new URLSearchParams('from=learn'))).toBe(
      `/learn/setup?back=${encodeURIComponent('/my/pull-requests?from=learn')}`,
    );
  });
});
