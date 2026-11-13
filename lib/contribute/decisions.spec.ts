import { describe, expect, it } from 'vitest';

import { attempt, attempts, decisionAttempts, detail, followUp, stopped } from './__fixtures__/contribute-attempts';
import { NOW } from './__fixtures__/contribute-views';
import type { ContributeGoNoGo } from './contribute.types';
import { agentDidOf, shownByDecisions } from './decisions';

const AT = '2026-10-28T09:15:00.000Z';
const go = (reason = 'Reproduced it.'): ContributeGoNoGo => ({ verdict: 'go', reason, decidedAtLimit: null, at: AT });
const noGo = (reason: string): ContributeGoNoGo => ({ verdict: 'no_go', reason, decidedAtLimit: null, at: AT });

describe('what the agent did', () => {
  it('a done change: its verdict, risk, summary, what is worth a look, and its notes', () => {
    const did = agentDidOf(decisionAttempts.went);
    expect(did?.verdict).toMatchObject({ label: 'Done', tone: 'green' });
    expect(did?.risk).toEqual({ label: 'Low risk', tone: 'green' });
    expect(did?.text.kind).toBe('summary');
    expect(did?.worthALook).toBe('normalizePath keeps the case of the path as it is.');
    expect(did?.notes?.brief).toMatch(/^Checked the layout cache/);
    expect(did?.notes?.goReason).toMatch(/^Reproduced it/);
  });

  it('a no-go: its reason, no risk, and no notes when the brief only repeats it', () => {
    const did = agentDidOf(decisionAttempts.noGo);
    expect(did?.verdict).toMatchObject({ label: 'No-go', tone: 'amber' });
    expect(did?.risk).toBeNull();
    expect(did?.text.kind).toBe('no_go');
    expect(did?.notes).toBeNull();
  });

  it("a no-go decided at the check's cap carries the note", () => {
    const did = agentDidOf({
      ...decisionAttempts.noGo,
      goNoGo: { ...decisionAttempts.noGo.goNoGo!, decidedAtLimit: 'budget' },
    });
    expect(did?.limitNote).toBe("Decided at the check's budget limit, when the agent was told to wrap up.");
    expect(agentDidOf(decisionAttempts.noGo)?.limitNote).toBeNull();
  });

  it('a no-go with a blank reason says the agent gave none', () => {
    const did = agentDidOf({ ...decisionAttempts.noGo, goNoGo: noGo('  '), brief: null });
    expect(did?.text).toEqual({ kind: 'no_go', words: 'The agent gave no reason.', muted: true });
  });

  it('a check that ran out: no verdict, what it was on as the API words it', () => {
    const did = agentDidOf(decisionAttempts.ranOut);
    expect(did?.verdict).toBeNull();
    expect(did?.text.kind).toBe('ran_out');
    expect(did?.text.words).toBe(decisionAttempts.ranOut.endDetail);
  });

  it("a run's brief goes behind the notes", () => {
    const did = agentDidOf(decisionAttempts.followUp);
    expect(did?.verdict?.label).toBe('Done');
    expect(did?.text.kind).toBe('summary');
    expect(did?.notes?.brief).toMatch(/^Read the review/);
  });

  it('a brief alone is the paragraph, the go reason behind the notes', () => {
    const did = agentDidOf(detail({ ...stopped('BUDGET'), goNoGo: go(), brief: 'x' }));
    expect(did?.verdict?.label).toBe('Go');
    expect(did?.text.kind).toBe('brief');
    expect(did?.notes).toEqual({ brief: null, goReason: 'Reproduced it.' });
    expect(agentDidOf(detail({ ...stopped('BUDGET'), goNoGo: go(''), brief: 'x' }))?.notes).toBeNull();
  });

  it.each(['BUDGET', 'TIMEOUT', 'FAILED', 'KEY_INVALID'] as const)(
    'a go that stopped at %s with nothing else says its reason',
    (reason) => {
      const did = agentDidOf(detail({ ...stopped(reason), goNoGo: go(), brief: null }));
      expect(did?.verdict?.label).toBe('Go');
      expect(did?.text).toEqual({ kind: 'go', words: 'Reproduced it.', muted: false });
      expect(did?.notes).toBeNull();
      expect(agentDidOf(detail({ ...stopped(reason), goNoGo: go(''), brief: null }))).toBeNull();
    },
  );

  it('a session at work with a known go: the go, the waiting words, the reason behind the notes', () => {
    const did = agentDidOf({ ...attempts.running, goNoGo: go() });
    expect(did?.verdict?.label).toBe('Go');
    expect(did?.text.kind).toBe('waiting');
    expect(did?.notes?.goReason).toBe('Reproduced it.');
  });

  it('a no-go over a result wins the paragraph and the pill; the risk only from its own no-go result', () => {
    const over = agentDidOf(detail({ goNoGo: noGo('Fixed on main.') }));
    expect(over?.verdict?.label).toBe('No-go');
    expect(over?.risk).toBeNull();
    expect(over?.text.kind).toBe('no_go');
    const own = agentDidOf(
      detail({ goNoGo: noGo('Fixed on main.'), result: { ...attempts.review.result!, verdict: 'NO_GO' } }),
    );
    expect(own?.risk?.label).toBe('Low risk');
  });

  it('a result with no verdict: the go when known, else no pill; the risk still', () => {
    const result = { ...attempts.review.result!, verdict: null };
    expect(agentDidOf(detail({ result, goNoGo: go() }))?.verdict?.label).toBe('Go');
    const none = agentDidOf(detail({ result, goNoGo: null }));
    expect(none?.verdict).toBeNull();
    expect(none?.risk?.label).toBe('Low risk');
    expect(agentDidOf(detail({ result: { ...result, risk: null } }))?.risk).toEqual({
      label: 'Risk not rated',
      tone: 'neutral',
    });
  });

  it('says it is not ready while the agent works: the hosted agent and your own', () => {
    expect(agentDidOf(attempts.running)?.text).toEqual({
      kind: 'waiting',
      words: "The agent's summary isn't ready yet. It shows here when the agent is done.",
      muted: true,
    });
    expect(agentDidOf({ ...attempts.running, runner: 'MCP' })?.text.words).toBe(
      "Your agent hasn't submitted yet. Its summary shows here when it does.",
    );
  });

  it('says the summary is not available on an API gap', () => {
    expect(agentDidOf(attempts.bare)?.text).toEqual({
      kind: 'missing',
      words: "The agent's summary is not available yet.",
      muted: true,
    });
  });

  it('is not drawn for an ended session with nothing to say, or an API that does not serve the decisions', () => {
    expect(agentDidOf(stopped('NO_GO', 'needs a design decision'))).toBeNull();
    expect(agentDidOf(stopped('BUDGET'))).toBeNull();
    expect(agentDidOf({ ...stopped('BUDGET'), goNoGo: null, brief: null })).toBeNull();
    expect(agentDidOf({ ...decisionAttempts.ranOut, goNoGo: undefined, brief: undefined })).toBeNull();
  });

  it('names your own agent as it reported itself, and how long the issue is held for it', () => {
    const own = agentDidOf(
      detail({
        runner: 'MCP',
        agent: { name: 'CODEX', model: 'gpt-5.5-codex' },
        leaseUntil: new Date(NOW.getTime() + 5 * 60 * 60 * 1000).toISOString(),
      }),
      NOW,
    );
    expect(own?.ownAgent).toEqual({ agent: 'Codex (gpt-5.5-codex)' });
    expect(agentDidOf(detail())?.ownAgent).toBeNull();
  });

  it('words a verdict and a risk this UI does not know yet', () => {
    const did = agentDidOf(
      detail({
        result: {
          ...attempts.review.result!,
          verdict: 'MAYBE' as unknown as 'DONE',
          risk: 'EXTREME' as unknown as 'LOW',
        },
      }),
    );
    expect(did?.verdict).toMatchObject({ label: 'Maybe', tone: 'neutral' });
    expect(did?.risk).toEqual({ label: 'Extreme', tone: 'neutral' });
  });
});

describe('what the status box leaves to the card', () => {
  it("leaves a no-go's reason, and the note that it was decided at the check's cap", () => {
    expect(shownByDecisions(decisionAttempts.noGo)).toEqual({ noGoDetail: true, limitNote: false });
    expect(
      shownByDecisions({
        ...decisionAttempts.noGo,
        checkLimit: { limit: 'budget', decided: true },
        goNoGo: { ...decisionAttempts.noGo.goNoGo!, decidedAtLimit: 'budget' },
      }),
    ).toEqual({ noGoDetail: true, limitNote: true });
    expect(shownByDecisions(decisionAttempts.ranOut)).toEqual({ noGoDetail: true, limitNote: false });
  });

  it('leaves nothing on an older API', () => {
    expect(shownByDecisions(stopped('NO_GO', 'needs a design decision'))).toEqual({
      noGoDetail: false,
      limitNote: false,
    });
  });

  it("leaves a run's brief-only no-go, and keeps the reason when the card shows a summary", () => {
    const briefOnly = followUp({
      state: 'STOPPED',
      endReason: 'NO_GO',
      endDetail: 'Fixed on main already.',
      result: null,
      goNoGo: null,
      brief: 'Fixed on main already.',
    });
    expect(shownByDecisions(briefOnly)).toEqual({ noGoDetail: true, limitNote: false });
    const summary = detail({ state: 'STOPPED', endReason: 'NO_GO', endDetail: 'x', goNoGo: null });
    expect(shownByDecisions(summary)).toEqual({ noGoDetail: false, limitNote: false });
  });

  it("reads a list's attempt, with none of the session's own fields", () => {
    expect(shownByDecisions(attempt({ state: 'STOPPED', endReason: 'NO_GO', endDetail: 'x' }))).toEqual({
      noGoDetail: false,
      limitNote: false,
    });
  });
});
