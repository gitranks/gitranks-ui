import { describe, expect, it } from 'vitest';

import { lessons } from './__fixtures__/lesson';
import type { LearnStage } from './learn.types';
import { learnViewOf, lessonLineOf } from './learn-view';

describe('which view a link to a Learn attempt opens', () => {
  it('opens the lesson until the pull request is submitted, and when none comes', () => {
    for (const stage of [
      'AGENT_WORKING',
      'AGENT_REWRITING',
      'WARMUP',
      'LESSON',
      'BLOCKED',
      'READY_TO_APPROVE',
      'ENDED',
    ] satisfies LearnStage[]) {
      expect(learnViewOf(stage, false), stage).toBe('lesson');
    }
  });

  it('opens the pull request once it is open, and a hand-opened one once it is known', () => {
    expect(learnViewOf('PR_OPEN', true)).toBe('pr');
    expect(learnViewOf('HAND_PR', true)).toBe('pr');
    expect(learnViewOf('HAND_PR', false)).toBe('lesson');
    expect(learnViewOf(null, true)).toBe('pr');
  });
});

describe("the header's lesson line", () => {
  const said = (lesson: Parameters<typeof lessonLineOf>[0]) => {
    const line = lessonLineOf(lesson);
    return line ? [line.pill.label, ...line.facts].join(' · ') : null;
  };

  it('says the lesson is being written or rewritten', () => {
    expect(said(lessons.working)).toBe('Being written');
    expect(said({ ...lessons.working, stage: 'AGENT_REWRITING' })).toBe('Being rewritten');
  });

  it('says the step the learner is on, and whom it was written for', () => {
    expect(said(lessons.step)).toBe('Step 2 of 5 · written for TypeScript, some experience');
  });

  it('says questions that need a fix, and a pass with its day', () => {
    expect(said(lessons.blocked)).toBe('Needs a fix');
    expect(said(lessons.ready)).toBe('Passed 5 of 5 · Oct 28');
  });

  it('says once the pull request is open whether the lesson is public and how many passed it, or why it is not', () => {
    expect(said(lessons.prOpen)).toBe('Passed 5 of 5 · Oct 28 · public · 14 people passed it');
    expect(said({ ...lessons.prOpen, visibility: 'REMOVED' })).toBe('Passed 5 of 5 · Oct 28 · taken down');
    expect(said({ ...lessons.prOpen, visibility: 'HIDDEN' })).toBe('Passed 5 of 5 · Oct 28 · not available');
    expect(said({ ...lessons.prOpen, visibility: 'HELD' })).toBe('Passed 5 of 5 · Oct 28 · paused');
  });

  it('says nothing for an attempt that ended', () => {
    expect(lessonLineOf(lessons.ended)).toBeNull();
  });
});
