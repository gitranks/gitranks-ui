import { describe, expect, it } from 'vitest';

import type { ContributeAttempt, ContributeMcpToken, ContributeView } from './contribute.types';
import type { WorkspaceGate } from './gate';
import {
  type ContributeFlowFacts,
  type ContributeFlowStep,
  contributeFlowPlaceOf,
  contributeResumeOf,
  type FlowConnected,
  flowConnectedOf,
  hasAnyAttempt,
} from './getting-in';

const SIGNED_OUT: WorkspaceGate = { kind: 'signed-out' };
const SETTING_UP: WorkspaceGate = { kind: 'setting-up' };
const HIDDEN: WorkspaceGate = { kind: 'hidden' };
/** An open account: with the Contribute sign or not (null: not known, `entered` then decides). */
const open = (sign: boolean | null, entered = !!sign): WorkspaceGate => ({
  kind: 'open',
  entered,
  signs: { contribute: sign, learn: null },
  agents: { hosted: false, own: false },
});

const NONE: FlowConnected = { own: false, hosted: false };
const OWN: FlowConnected = { own: true, hosted: false };
const KEY: FlowConnected = { own: false, hosted: true };

const STEPS: ContributeFlowStep[] = ['agent', 'agent-own', 'agent-key', 'issue'];
const place = (step: ContributeFlowStep, facts: Partial<ContributeFlowFacts> & { gate: WorkspaceGate }) =>
  contributeFlowPlaceOf(step, { launched: true, hasAttempt: false, connected: NONE, ...facts });

describe('contributeFlowPlaceOf: who is sent where, row by row', () => {
  it('a visitor: the first step with its sign-in buttons; every other step sends them there', () => {
    expect(place('agent', { gate: SIGNED_OUT })).toEqual({ kind: 'page' });
    for (const step of ['agent-own', 'agent-key', 'issue'] as const) {
      expect(place(step, { gate: SIGNED_OUT }), step).toEqual({ kind: 'redirect', to: '/contribute/start' });
    }
  });

  it('a visitor keeps the way back when sent to the first step', () => {
    for (const step of ['agent-own', 'agent-key', 'issue'] as const) {
      expect(place(step, { gate: SIGNED_OUT, issue: 'q7k2m9xa' }), step).toEqual({
        kind: 'redirect',
        to: '/contribute/start?issue=q7k2m9xa',
      });
    }
  });

  it('before the launch a visitor gets the 404 on every step', () => {
    for (const step of STEPS)
      expect(place(step, { gate: SIGNED_OUT, launched: false }), step).toEqual({ kind: 'not-found' });
  });

  it('being set up, with no profile, or not open: the flow’s panel in the frame on every step', () => {
    for (const step of STEPS) {
      expect(place(step, { gate: SETTING_UP }), step).toEqual({ kind: 'setting-up' });
      expect(place(step, { gate: SETTING_UP, launched: false }), step).toEqual({ kind: 'setting-up' });
      expect(place(step, { gate: HIDDEN }), step).toEqual({ kind: 'no-profile' });
      expect(place(step, { gate: HIDDEN, launched: false }), step).toEqual({ kind: 'not-found' });
    }
  });

  it('signed in, no Contribute sign: the first step and both ways open', () => {
    for (const connected of [NONE, OWN, KEY]) {
      for (const step of ['agent', 'agent-own', 'agent-key'] as const) {
        expect(place(step, { gate: open(false), connected }), step).toEqual({ kind: 'page' });
      }
    }
  });

  it('signed in, no Contribute sign: the second step opens with something connected, else back to the first', () => {
    expect(place('issue', { gate: open(false), connected: OWN })).toEqual({ kind: 'page' });
    expect(place('issue', { gate: open(false), connected: KEY })).toEqual({ kind: 'page' });
    expect(place('issue', { gate: open(false) })).toEqual({ kind: 'redirect', to: '/contribute/start' });
    expect(place('issue', { gate: open(false), issue: 'q7k2m9xa' })).toEqual({
      kind: 'redirect',
      to: '/contribute/start?issue=q7k2m9xa',
    });
  });

  it('with the Contribute sign, no attempt: the first step opens; the ways and the second step as today', () => {
    expect(place('agent', { gate: open(true), connected: OWN })).toEqual({ kind: 'page' });
    expect(place('agent-own', { gate: open(true) })).toEqual({ kind: 'redirect', to: '/my/agent/connect' });
    expect(place('agent-own', { gate: open(true), query: 'from=agent' })).toEqual({
      kind: 'redirect',
      to: '/my/agent/connect?from=agent',
    });
    expect(place('agent-key', { gate: open(true), connected: KEY, issue: 'q7k2m9xa' })).toEqual({
      kind: 'redirect',
      to: '/contribute/start/issue?issue=q7k2m9xa',
    });
    expect(place('issue', { gate: open(true), connected: OWN })).toEqual({ kind: 'page' });
    expect(place('issue', { gate: open(true), connected: KEY })).toEqual({ kind: 'page' });
    expect(place('issue', { gate: open(true) })).toEqual({ kind: 'redirect', to: '/my/agent' });
  });

  it('with the Contribute sign and an attempt: the first step opens; the key and the second step go home', () => {
    const gate = open(true);
    expect(place('agent', { gate, hasAttempt: true, connected: OWN })).toEqual({ kind: 'page' });
    expect(place('agent-own', { gate, hasAttempt: true })).toEqual({ kind: 'redirect', to: '/my/agent/connect' });
    expect(place('agent-key', { gate, hasAttempt: true })).toEqual({ kind: 'redirect', to: '/contribute' });
    expect(place('issue', { gate, hasAttempt: true, connected: OWN })).toEqual({ kind: 'redirect', to: '/contribute' });
  });

  it('a sign that is not known keeps today’s rule: entered counts as the sign, nobody is sent back through', () => {
    expect(place('agent-key', { gate: open(null, true) })).toEqual({ kind: 'redirect', to: '/contribute/start/issue' });
    expect(place('agent-key', { gate: open(null, false) })).toEqual({ kind: 'page' });
    // The sign itself wins over `entered` once it is known.
    expect(place('agent-key', { gate: open(false, true) })).toEqual({ kind: 'page' });
  });
});

const token = (patch: Partial<ContributeMcpToken>) =>
  ({ id: 't1', name: 'Claude Code', lastUsedAt: null, kind: 'TOKEN', ...patch }) as unknown as ContributeMcpToken;

const view = (
  contributor: Partial<NonNullable<ContributeView['contributor']>> | null,
  mcp = false,
  tokens: ContributeMcpToken[] = [],
) =>
  ({
    contributor: contributor ? { credentials: [], onboardedAt: null, preferences: null, ...contributor } : null,
    ownAgent: { paths: { hosted: false, mcp }, tokens },
  }) as unknown as ContributeView;

describe('flowConnectedOf: what counts as connected', () => {
  const key = (state: string) => ({ provider: 'ANTHROPIC', state }) as never;

  it('a used token or a signed-in agent is connected; a token never used is not', () => {
    expect(flowConnectedOf(view({}, true, [token({})]))).toEqual(NONE);
    expect(flowConnectedOf(view({}, true, [token({ lastUsedAt: '2026-11-25T09:00:00.000Z' })]))).toEqual(OWN);
    expect(flowConnectedOf(view({}, true, [token({ kind: 'OAUTH' })]))).toEqual(OWN);
  });

  it('a saved key is connected unless it stopped working', () => {
    expect(flowConnectedOf(view({ credentials: [key('VALID')] }))).toEqual(KEY);
    expect(flowConnectedOf(view({ credentials: [key('EXHAUSTED')] }))).toEqual(KEY);
    expect(flowConnectedOf(view({ credentials: [key('INVALID')] }))).toEqual(NONE);
    expect(flowConnectedOf(null)).toEqual(NONE);
  });
});

describe('the step a landing resumes at, signed in', () => {
  it('Contribute: the agent’s connect step mid-setup, else the first step; saved preferences decide nothing', () => {
    expect(contributeResumeOf(null)).toBe('/contribute/start');
    expect(contributeResumeOf(view(null))).toBe('/contribute/start');
    expect(contributeResumeOf(view({}))).toBe('/contribute/start');
    const preferences = { languages: [], topicIds: [], kinds: [], maxSize: null };
    expect(contributeResumeOf(view({ preferences }))).toBe('/contribute/start');
    expect(contributeResumeOf(view({ preferences }, true))).toBe('/contribute/start/agent/own');
    expect(contributeResumeOf(view({}, true))).toBe('/contribute/start/agent/own');
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
