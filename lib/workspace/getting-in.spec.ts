import { describe, expect, it } from 'vitest';

import type { ContributeAttempt, ContributeView } from './contribute.types';
import type { WorkspaceGate } from './gate';
import {
  type ContributeFlowStep,
  contributeFlowPlaceOf,
  contributeResumeOf,
  hasAnyAttempt,
  learnFlowPlaceOf,
  learnResumeOf,
} from './getting-in';

const SIGNED_OUT: WorkspaceGate = { kind: 'signed-out' };
const SETTING_UP: WorkspaceGate = { kind: 'setting-up' };
const HIDDEN: WorkspaceGate = { kind: 'hidden' };
const open = (entered: boolean, agents = { hosted: false, own: entered }, learnOpen = true): WorkspaceGate => ({
  kind: 'open',
  entered,
  agents,
  learnOpen,
});

const STEPS: ContributeFlowStep[] = ['work', 'agent', 'agent-own', 'agent-key', 'issue'];
const contribute = (step: ContributeFlowStep, gate: WorkspaceGate, launched = true, hasAttempt = false) =>
  contributeFlowPlaceOf(step, { gate, launched, hasAttempt });

describe('contributeFlowPlaceOf: who belongs on which step of Contribute', () => {
  it('a visitor sees the steps open to them, and the sign-in card on the ones that need an account', () => {
    expect(contribute('work', SIGNED_OUT)).toEqual({ kind: 'page' });
    expect(contribute('agent', SIGNED_OUT)).toEqual({ kind: 'page' });
    for (const step of ['agent-own', 'agent-key', 'issue'] as const) {
      expect(contribute(step, SIGNED_OUT), step).toEqual({ kind: 'sign-in' });
    }
  });

  it('before the launch a visitor gets the 404 on every step', () => {
    for (const step of STEPS) expect(contribute(step, SIGNED_OUT, false), step).toEqual({ kind: 'not-found' });
  });

  it('an account being set up waits in the frame on every step, before the launch and after', () => {
    for (const step of STEPS) {
      expect(contribute(step, SETTING_UP), step).toEqual({ kind: 'setting-up' });
      expect(contribute(step, SETTING_UP, false), step).toEqual({ kind: 'setting-up' });
    }
  });

  it('an account with no profile sees the no-profile panel once launched, and the 404 off the preview before it', () => {
    for (const step of STEPS) {
      expect(contribute(step, HIDDEN), step).toEqual({ kind: 'no-profile' });
      expect(contribute(step, HIDDEN, false), step).toEqual({ kind: 'not-found' });
    }
  });

  it('signed in and not entered: every step but the first issue, which sends them back to step 2', () => {
    for (const step of ['work', 'agent', 'agent-own', 'agent-key'] as const) {
      expect(contribute(step, open(false)), step).toEqual({ kind: 'page' });
    }
    expect(contribute('issue', open(false))).toEqual({ kind: 'redirect', to: '/contribute/start/agent' });
  });

  it('entered with no attempt yet: on to the first issue; the first issue itself shows', () => {
    for (const step of ['work', 'agent', 'agent-key'] as const) {
      expect(contribute(step, open(true)), step).toEqual({ kind: 'redirect', to: '/contribute/start/issue' });
    }
    expect(contribute('issue', open(true))).toEqual({ kind: 'page' });
    expect(contribute('issue', open(true, { hosted: true, own: false }))).toEqual({ kind: 'page' });
  });

  it('entered: the own-agent step goes to the Agent tab’s connect page, the query kept', () => {
    for (const hasAttempt of [false, true]) {
      expect(
        contributeFlowPlaceOf('agent-own', { gate: open(true), launched: true, hasAttempt, query: 'from=agent' }),
      ).toEqual({ kind: 'redirect', to: '/my/agent/connect?from=agent' });
    }
    expect(contribute('agent-own', open(true, { hosted: false, own: false }))).toEqual({
      kind: 'redirect',
      to: '/my/agent/connect',
    });
  });

  it('entered with an attempt: every other step goes to the Contribute tab', () => {
    for (const step of STEPS.filter((each) => each !== 'agent-own')) {
      expect(contribute(step, open(true), true, true), step).toEqual({ kind: 'redirect', to: '/contribute' });
    }
  });

  it('entered with nothing connected now: the first issue goes to the Agent tab', () => {
    expect(contribute('issue', open(true, { hosted: false, own: false }))).toEqual({
      kind: 'redirect',
      to: '/my/agent',
    });
  });
});

const learn = (
  step: 'goal' | 'issues' | 'issue',
  gate: WorkspaceGate,
  facts: Partial<{
    openToEveryone: boolean;
    goalSaved: boolean;
    goalInAddress: boolean;
    launched: boolean;
    learnOpen: boolean;
  }> = {},
) =>
  learnFlowPlaceOf(step, {
    gate,
    launched: facts.launched ?? true,
    learnOpen: facts.learnOpen ?? true,
    openToEveryone: facts.openToEveryone ?? true,
    goalSaved: facts.goalSaved ?? false,
    goalInAddress: facts.goalInAddress ?? false,
    issue: { repo: 'acme/widgets', issue: 42 },
  });

describe('learnFlowPlaceOf: who belongs on which step of Learn', () => {
  it('a visitor sees every step while Learn is open to everyone, and the 404 otherwise', () => {
    for (const step of ['goal', 'issues', 'issue'] as const) {
      expect(learn(step, SIGNED_OUT, { goalInAddress: true }), step).toEqual({ kind: 'page' });
      expect(learn(step, SIGNED_OUT, { openToEveryone: false }), step).toEqual({ kind: 'not-found' });
    }
  });

  it('a visitor on Pick an issue with no goal in the address is asked it first; the other steps need none', () => {
    expect(learn('issues', SIGNED_OUT)).toEqual({ kind: 'redirect', to: '/learn/start' });
    expect(learn('goal', SIGNED_OUT)).toEqual({ kind: 'page' });
    expect(learn('issue', SIGNED_OUT)).toEqual({ kind: 'page' });
  });

  it('an account being set up waits; one with no profile sees its panel once launched, a 404 before', () => {
    expect(learn('goal', SETTING_UP)).toEqual({ kind: 'setting-up' });
    expect(learn('issues', HIDDEN)).toEqual({ kind: 'no-profile' });
    expect(learn('issues', HIDDEN, { launched: false })).toEqual({ kind: 'not-found' });
  });

  it('an account Learn is not open to gets the 404', () => {
    expect(learn('goal', open(false, undefined, false))).toEqual({ kind: 'not-found' });
    expect(learn('issue', open(true, undefined, false))).toEqual({ kind: 'not-found' });
  });

  it('being set up or with no profile, an account Learn is not open to gets the 404, never a Learn panel', () => {
    for (const step of ['goal', 'issues', 'issue'] as const) {
      expect(learn(step, SETTING_UP, { learnOpen: false }), step).toEqual({ kind: 'not-found' });
      expect(learn(step, HIDDEN, { learnOpen: false }), step).toEqual({ kind: 'not-found' });
    }
  });

  it('signed in and not entered: Pick an issue with no goal saved and none in the address goes to step 1', () => {
    expect(learn('goal', open(false))).toEqual({ kind: 'page' });
    expect(learn('issues', open(false))).toEqual({ kind: 'redirect', to: '/learn/start' });
    expect(learn('issues', open(false), { goalSaved: true })).toEqual({ kind: 'page' });
    expect(learn('issues', open(false), { goalInAddress: true })).toEqual({ kind: 'page' });
    expect(learn('issue', open(false))).toEqual({ kind: 'page' });
  });

  it('entered: the Learn tab, or the issue’s Start page in lesson mode; a goal only the address has is saved first', () => {
    expect(learn('goal', open(true))).toEqual({ kind: 'redirect', to: '/learn' });
    expect(learn('goal', open(true), { goalInAddress: true })).toEqual({ kind: 'redirect', to: '/learn' });
    expect(learn('issues', open(true), { goalSaved: true })).toEqual({ kind: 'redirect', to: '/learn' });
    expect(learn('issues', open(true), { goalInAddress: true })).toEqual({ kind: 'apply-then', to: '/learn' });
    expect(learn('issue', open(true), { goalSaved: true, goalInAddress: true })).toEqual({
      kind: 'redirect',
      to: '/my/start/acme/widgets/42?lesson=1',
    });
    expect(learn('issue', open(true), { goalInAddress: true })).toEqual({
      kind: 'apply-then',
      to: '/my/start/acme/widgets/42?lesson=1',
    });
  });
});

const view = (contributor: Partial<NonNullable<ContributeView['contributor']>> | null, mcp = false) =>
  ({
    contributor: contributor ? { credentials: [], onboardedAt: null, preferences: null, ...contributor } : null,
    ownAgent: { paths: { hosted: false, mcp }, tokens: [] },
  }) as unknown as ContributeView;

describe('the step a landing resumes at, signed in', () => {
  it('Contribute: the agent’s connect step mid-setup, step 2 once preferences are saved, else step 1', () => {
    expect(contributeResumeOf(null)).toBe('/contribute/start');
    expect(contributeResumeOf(view(null))).toBe('/contribute/start');
    expect(contributeResumeOf(view({}))).toBe('/contribute/start');
    const preferences = { languages: [], topicIds: [], kinds: [], maxSize: null };
    expect(contributeResumeOf(view({ preferences }))).toBe('/contribute/start/agent');
    expect(contributeResumeOf(view({ preferences }, true))).toBe('/contribute/start/agent/own');
    expect(contributeResumeOf(view({}, true))).toBe('/contribute/start/agent/own');
  });

  it('Learn: step 2 once a goal is saved, else step 1', () => {
    expect(learnResumeOf(true)).toBe('/learn/start/issues');
    expect(learnResumeOf(false)).toBe('/learn/start');
  });
});

describe('hasAnyAttempt', () => {
  const attempt = (mode: 'FIX' | 'LEARN') => ({ attemptId: 'a1', mode }) as unknown as ContributeAttempt;

  it('counts an attempt of either mode, and a failed read as one', () => {
    expect(hasAnyAttempt([attempt('FIX')])).toBe(true);
    expect(hasAnyAttempt([attempt('LEARN')])).toBe(true);
    expect(hasAnyAttempt([])).toBe(false);
    expect(hasAnyAttempt(undefined)).toBe(true);
  });
});
