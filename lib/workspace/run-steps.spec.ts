import { describe, expect, it } from 'vitest';

import { phaseTextOf } from './agent-runs';
import type { ContributeAgentRunPhase } from './contribute.types';
import { isLearnRun, RUN_STEPS, runKindOf, stepNameOf, stepsLabelOf, stepsOf } from './run-steps';
import { FOLLOW_UP, runOf, WORKING } from '@/lib/contribute/__fixtures__/agent-runs';

const ALL: ContributeAgentRunPhase[] = [
  'QUEUED',
  'CHECKING_ISSUE',
  'WORKING',
  'WRITING_LESSON',
  'ADDRESSING_REVIEW',
  'RUNNING_CHECKS',
  'WAITING_FOR_YOU',
  'SUBMITTING',
  'READY',
  'DONE',
  'STOPPED',
];

const fix = (phase: ContributeAgentRunPhase) => runOf({ phase, mode: 'FIX' });
const learn = (phase: ContributeAgentRunPhase) => runOf({ phase, mode: 'LEARN', runner: 'MCP' });
const followUp = (phase: ContributeAgentRunPhase) => runOf({ phase, kind: 'FOLLOW_UP' });

describe("a run's steps", () => {
  it('has one list per kind of run, with one name per step', () => {
    expect(RUN_STEPS).toEqual({
      fix: ['Queued', 'Checking the issue', 'Working', 'Checks', 'Ready for your review'],
      learn: ['Taking the issue', 'Fixing the issue', 'Writing your lesson', 'Checks', 'Lesson ready'],
      'follow-up': ['Queued', 'Addressing review', 'Checks', 'Ready for your review', 'Pushing'],
    });
  });

  it('has one rule for a Learn run', () => {
    expect(isLearnRun(learn('WORKING'))).toBe(true);
    expect(isLearnRun(runOf({ phase: 'WRITING_LESSON', mode: null }))).toBe(true);
    expect(isLearnRun(fix('WORKING'))).toBe(false);
  });

  it('knows the kind: a follow-up by its kind, a Learn run by its side or its lesson phase', () => {
    expect(runKindOf(WORKING)).toBe('fix');
    expect(runKindOf(learn('WORKING'))).toBe('learn');
    // From an API that does not say the side yet.
    expect(runKindOf(runOf({ phase: 'WRITING_LESSON' }))).toBe('learn');
    expect(runKindOf(FOLLOW_UP)).toBe('follow-up');
    expect(runKindOf(runOf({ kind: 'FOLLOW_UP', mode: 'LEARN' }))).toBe('follow-up');
  });

  it.each([
    [
      'fix',
      fix,
      {
        QUEUED: 0,
        CHECKING_ISSUE: 1,
        WORKING: 2,
        RUNNING_CHECKS: 3,
        READY: 4,
        WAITING_FOR_YOU: 4,
        SUBMITTING: 5,
        DONE: 5,
      },
    ],
    [
      'learn',
      learn,
      {
        CHECKING_ISSUE: 0,
        WORKING: 1,
        WRITING_LESSON: 2,
        RUNNING_CHECKS: 3,
        READY: 4,
        WAITING_FOR_YOU: 4,
        SUBMITTING: 5,
        DONE: 5,
      },
    ],
    [
      'follow-up',
      followUp,
      { QUEUED: 0, ADDRESSING_REVIEW: 1, RUNNING_CHECKS: 2, READY: 3, WAITING_FOR_YOU: 3, SUBMITTING: 4, DONE: 5 },
    ],
  ] as const)('places each phase of a %s run in one place', (_kind, of, places) => {
    for (const [phase, at] of Object.entries(places)) {
      expect(stepsOf(of(phase as ContributeAgentRunPhase)).at, phase).toBe(at);
    }
  });

  it('never reads "Ready for your review" for a first run being submitted: all steps are done then', () => {
    expect(stepNameOf(fix('SUBMITTING'))).toBeNull();
    expect(stepsLabelOf(fix('SUBMITTING'))).toBe('All steps done');
    expect(stepNameOf(learn('SUBMITTING'))).toBeNull();
    expect(stepNameOf(followUp('SUBMITTING'))).toBe('Pushing');
    for (const phase of ALL) {
      if (phase === 'READY' || phase === 'WAITING_FOR_YOU') continue;
      expect(stepNameOf(fix(phase)), phase).not.toBe('Ready for your review');
    }
  });

  it('says the step for a screen reader', () => {
    expect(stepsLabelOf(WORKING)).toBe('Step 3 of 5: Working');
    expect(stepsLabelOf(learn('WRITING_LESSON'))).toBe('Step 3 of 5: Writing your lesson');
  });

  it("is the row's status too, while an agent works: one name per step; the API's words otherwise", () => {
    expect(phaseTextOf(learn('CHECKING_ISSUE'))).toBe('Taking the issue');
    expect(phaseTextOf(learn('WORKING'))).toBe('Fixing the issue');
    expect(phaseTextOf(runOf({ phase: 'WORKING', label: 'Working on a fix' }))).toBe('Working');
    expect(phaseTextOf(followUp('ADDRESSING_REVIEW'))).toBe('Addressing review');
    expect(phaseTextOf(runOf({ phase: 'QUEUED', label: 'Queued, 1st in line' }))).toBe('Queued, 1st in line');
    expect(phaseTextOf(runOf({ phase: 'SUBMITTING', label: 'Opening the pull request' }))).toBe(
      'Opening the pull request',
    );
  });
});
