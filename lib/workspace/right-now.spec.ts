import { describe, expect, it } from 'vitest';

import type { ContributeAgentRunPhase } from './contribute.types';
import { lastCallOf, rightNowOf, runPrOf, runSideOf, workingLabelOf } from './right-now';
import { runOf } from '@/lib/contribute/__fixtures__/agent-runs';

const ids = (runs: { attemptId: string }[]) => runs.map(({ attemptId }) => attemptId);

describe('Right now', () => {
  it('shows only the runs an agent works on now: not queued, the autopilot hour, submitting or settled', () => {
    const phases: ContributeAgentRunPhase[] = [
      'QUEUED',
      'CHECKING_ISSUE',
      'WORKING',
      'ADDRESSING_REVIEW',
      'RUNNING_CHECKS',
      'WAITING_FOR_YOU',
      'SUBMITTING',
      'READY',
      'DONE',
      'STOPPED',
    ];
    const runs = phases.map((phase) => runOf({ attemptId: phase, phase, mode: 'FIX' }));
    expect(ids(rightNowOf(runs, 'fix').hosted)).toEqual([
      'CHECKING_ISSUE',
      'WORKING',
      'ADDRESSING_REVIEW',
      'RUNNING_CHECKS',
    ]);
  });

  it("shows each tab its own side's runs, a lane each", () => {
    const hosted = runOf({ attemptId: 'hosted', mode: 'FIX' });
    const own = runOf({ attemptId: 'own', runner: 'MCP', mode: 'FIX' });
    const lesson = runOf({ attemptId: 'lesson', runner: 'MCP', mode: 'LEARN' });
    const writing = runOf({ attemptId: 'writing', runner: 'MCP', phase: 'WRITING_LESSON', mode: 'LEARN' });
    const followUp = runOf({
      attemptId: 'follow-up',
      kind: 'FOLLOW_UP',
      runner: 'MCP',
      phase: 'ADDRESSING_REVIEW',
      mode: 'LEARN',
    });
    const all = [hosted, own, lesson, writing, followUp];
    expect(rightNowOf(all, 'fix')).toEqual({ hosted: [hosted], own: [own] });
    expect(rightNowOf(all, 'learn')).toEqual({ hosted: [], own: [lesson, writing, followUp] });
    // A run from an API that does not say its side: Contribute's, unless it writes a lesson.
    expect(runSideOf(runOf({ mode: null }))).toBe('fix');
    expect(runSideOf(runOf({ phase: 'WRITING_LESSON' }))).toBe('learn');
  });

  it('says how many work, when the own agent last called, and a follow-up’s pull request', () => {
    expect(workingLabelOf(1)).toBe('1 agent working');
    expect(workingLabelOf(2)).toBe('2 agents working');
    const readAt = '2026-10-31T12:00:00.000Z';
    expect(
      lastCallOf([{ lastCallAt: '2026-10-31T09:00:00.000Z' }, { lastCallAt: '2026-10-31T11:00:00.000Z' }], readAt),
    ).toBe('last call 1 hour ago');
    expect(lastCallOf([{ lastCallAt: null }], readAt)).toBeNull();
    expect(runPrOf({ prUrl: 'https://github.com/acme/widgets/pull/77' })).toEqual({
      number: 77,
      url: 'https://github.com/acme/widgets/pull/77',
    });
    expect(runPrOf({ prUrl: null })).toBeNull();
  });
});
