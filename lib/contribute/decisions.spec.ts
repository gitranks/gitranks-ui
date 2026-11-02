import { describe, expect, it } from 'vitest';

import { decisionAttempts, detail, stopped } from './__fixtures__/contribute-attempts';
import { limitStopOf, runDecisionsOf, shownByDecisions } from './decisions';

describe('a stop at a limit, in words', () => {
  it("names the check's cap from the API's words, and what was spent", () => {
    expect(limitStopOf(decisionAttempts.ranOut)).toBe('Stopped at the $0.60 check limit after $0.61.');
    const late = detail({
      ...stopped('NO_GO', "No verdict before the check's 15-minute limit ran out, after 16 min."),
      costUsd: 0.4,
    });
    expect(limitStopOf(late)).toBe('Stopped at the 15-minute check limit after $0.40.');
  });

  it("says the check's limit plainly when the words do not name the cap", () => {
    const ranOut = (limit: 'budget' | 'time') =>
      detail({ ...stopped('NO_GO', 'No verdict.'), checkLimit: { limit, decided: false }, costUsd: 0.5 });
    expect(limitStopOf(ranOut('budget'))).toBe("Stopped at the check's budget limit after $0.50.");
    expect(limitStopOf(ranOut('time'))).toBe("Stopped at the check's time limit after $0.50.");
  });

  it("names the run's own budget and time limits, and nothing for any other end", () => {
    expect(limitStopOf(detail({ ...stopped('BUDGET'), budgetUsd: 3, costUsd: 3.02 }))).toBe(
      'Stopped at your $3 limit per run after $3.02.',
    );
    expect(limitStopOf(detail({ ...stopped('TIMEOUT'), costUsd: 2.1 }))).toBe(
      'Stopped at the two-hour limit per run after $2.10.',
    );
    expect(limitStopOf(decisionAttempts.noGo)).toBeNull();
    expect(limitStopOf(stopped('FAILED', 'session_failed'))).toBeNull();
    // A no-go the agent wrote at the cap is a decision, not a stop.
    const decided = detail({
      ...stopped('NO_GO', "Needs a GPU. Decided at the check's budget limit."),
      checkLimit: { limit: 'budget', decided: true },
    });
    expect(limitStopOf(decided)).toBeNull();
  });
});

describe("the agent's decisions on a run", () => {
  it("shows a no-go's reason once: its brief only repeats it", () => {
    expect(runDecisionsOf(decisionAttempts.noGo)).toMatchObject({
      goNoGo: { verdict: 'no_go' },
      stop: null,
      brief: null,
    });
  });

  it('keeps a go with its brief, and a limit note when the agent decided at the cap', () => {
    expect(runDecisionsOf(decisionAttempts.went)).toMatchObject({ goNoGo: { verdict: 'go' }, limitNote: null });
    expect(runDecisionsOf(decisionAttempts.went)?.brief).toMatch(/^Checked the layout cache/);
    const atCap = runDecisionsOf({
      ...decisionAttempts.noGo,
      goNoGo: { ...decisionAttempts.noGo.goNoGo!, decidedAtLimit: 'time' },
    });
    expect(atCap?.limitNote).toBe("Decided at the check's time limit, when the agent was told to wrap up.");
  });

  it('carries what the check was on when it ran out', () => {
    expect(runDecisionsOf(decisionAttempts.ranOut)?.stop).toEqual({
      text: 'Stopped at the $0.60 check limit after $0.61.',
      detail: expect.stringMatching(/^No verdict: it was on "Reading/),
    });
  });

  it('is nothing for a run that recorded none, an older API, or a blank brief', () => {
    expect(runDecisionsOf(detail())).toBeNull();
    expect(runDecisionsOf(detail({ goNoGo: null, brief: '  ' }))).toBeNull();
    expect(runDecisionsOf(decisionAttempts.followUp)).toMatchObject({ goNoGo: null, stop: null });
  });

  it("is nothing on an API that doesn't serve the decisions, a stop at a limit too", () => {
    expect(runDecisionsOf(stopped('BUDGET'))).toBeNull();
    expect(runDecisionsOf({ ...decisionAttempts.ranOut, goNoGo: undefined, brief: undefined })).toBeNull();
  });
});

describe('what the status box leaves to the decisions card', () => {
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
});
