import { describe, expect, it } from 'vitest';

import { myAttempt, myLearnAttempts } from './__fixtures__/home';
import { emptyProfile, filledProfile } from './__fixtures__/profile';
import type { MyLearnAttempts } from './learn.types';
import {
  grownTo,
  headPartOf,
  LEARN_ISSUES_MAX,
  learnTabStateOf,
  learnTilesOf,
  PRACTICE_MAX,
  pathMarksOf,
  pathStepsOf,
  stepThreeOf,
} from './learn-tab';
import type { LearnProgressCounts } from './progress/progress.types';

const state = (attempts: MyLearnAttempts | undefined = myLearnAttempts.none, profile = filledProfile, held = false) =>
  learnTabStateOf({ held, settingUp: false, profile, attempts });

const COUNTS: LearnProgressCounts = { lessonsPassed: 7, newThings: 19, reposHelped: 2, prsMerged: 2, prsOpened: 3 };

describe("The Learn tab's state", () => {
  it('decides the states in order: held, setting up, no goal, the agent working, the lesson waiting, ready', () => {
    expect(learnTabStateOf({ held: true, settingUp: true, profile: null, attempts: undefined }).kind).toBe('held');
    expect(state(myLearnAttempts.working, emptyProfile, true).kind).toBe('held');
    expect(learnTabStateOf({ held: false, settingUp: true, profile: filledProfile, attempts: undefined }).kind).toBe(
      'setting-up',
    );
    expect(state(myLearnAttempts.working, emptyProfile).kind).toBe('no-goal');
    expect(state(myLearnAttempts.working, { ...filledProfile, goalValue: '  ' }).kind).toBe('no-goal');
    expect(state(myLearnAttempts.working).kind).toBe('working');
    expect(state({ current: myAttempt({ stage: 'AGENT_REWRITING' }), lastPullRequest: null }).kind).toBe('working');
    for (const attempts of [
      myLearnAttempts.ready,
      myLearnAttempts.blocked,
      myLearnAttempts.approve,
      myLearnAttempts.submitting,
    ]) {
      expect(state(attempts).kind).toBe('lesson');
    }
    expect(state(myLearnAttempts.none).kind).toBe('ready');
    // A pull request opened before is no state of its own: its count is on the Pull requests tab.
    expect(state(myLearnAttempts.prOpen).kind).toBe('ready');
    // The attempts unread: ready, and the page reads no issue.
    expect(state(undefined).kind).toBe('ready');
  });

  it('marks the path: the goal, then the agent (working), then the lesson', () => {
    const marks = (attempts: MyLearnAttempts, goal = true) => pathMarksOf({ goal, current: attempts.current });
    expect(marks(myLearnAttempts.none, false)).toEqual(['now', 'next', 'next']);
    expect(marks(myLearnAttempts.none)).toEqual(['done', 'now', 'next']);
    expect(marks(myLearnAttempts.working)).toEqual(['done', 'working', 'next']);
    expect(marks(myLearnAttempts.ready)).toEqual(['done', 'done', 'now']);
    expect(marks(myLearnAttempts.blocked)).toEqual(['done', 'done', 'now']);
    expect(marks(myLearnAttempts.submitting)).toEqual(['done', 'done', 'now']);
  });

  it('makes step 3 the link to the lesson by its stage, and a line while the pull request is opened', () => {
    const lesson = '/my/pull-requests/by-attempt/A_1?view=lesson';
    expect(stepThreeOf(null)).toBeNull();
    expect(stepThreeOf(myLearnAttempts.working.current)).toBeNull();
    expect(stepThreeOf(myAttempt({ stage: 'AGENT_REWRITING' }))).toBeNull();
    expect(stepThreeOf(myLearnAttempts.ready.current)).toEqual({
      kind: 'link',
      label: 'Take your lesson',
      href: lesson,
    });
    expect(stepThreeOf(myAttempt({ stage: 'LESSON', state: 'REVIEW' }))).toMatchObject({ label: 'Take your lesson' });
    expect(stepThreeOf(myLearnAttempts.blocked.current)).toEqual({
      kind: 'link',
      label: 'Open your lesson',
      href: lesson,
    });
    expect(stepThreeOf(myLearnAttempts.approve.current)).toEqual({
      kind: 'link',
      label: 'Submit your pull request',
      href: lesson,
    });
    expect(stepThreeOf(myLearnAttempts.submitting.current)).toEqual({
      kind: 'status',
      text: 'Opening your pull request…',
    });
    expect(stepThreeOf(myAttempt({ stage: 'READY_TO_APPROVE', state: 'PENDING_AUTOSUBMIT' }))?.kind).toBe('status');
  });

  it("names the lesson's length on step 3 once it is known", () => {
    expect(pathStepsOf(null)[2].where).toBe('3 · Here');
    expect(pathStepsOf({ lessonMinutes: null })[2].where).toBe('3 · Here');
    expect(pathStepsOf({ lessonMinutes: 10 })[2].where).toBe('3 · Here, 10 minutes');
    expect(pathStepsOf({ lessonMinutes: 10 })[0].where).toBe('1 · Here, one minute');
  });

  it('shows the path before the first Learn pull request, the numbers after it', () => {
    expect(headPartOf({ counts: { ...COUNTS, prsOpened: 0 }, attempts: myLearnAttempts.none })).toBe('path');
    expect(headPartOf({ counts: COUNTS, attempts: myLearnAttempts.ready })).toBe('tiles');
    // The numbers unread: the path while a lesson is in progress or the attempts are unread too, else nothing.
    expect(headPartOf({ counts: undefined, attempts: myLearnAttempts.working })).toBe('path');
    expect(headPartOf({ counts: undefined, attempts: undefined })).toBe('path');
    expect(headPartOf({ counts: undefined, attempts: myLearnAttempts.none })).toBe('none');
  });

  it('links each number to its view of Your progress', () => {
    expect(learnTilesOf({ ...COUNTS, newThings: 1204 })).toEqual([
      { label: 'lessons passed', value: '7', href: '/my/progress' },
      { label: 'new things learned', value: '1,204', href: '/my/progress?view=learned' },
      { label: 'repos helped', value: '2', href: '/my/progress?view=repos' },
      { label: 'pull requests merged', value: '2', href: '/my/progress?view=merged' },
    ]);
  });

  it('grows the issues by 10 up to 100, and practice from 3 by 10 up to 93', () => {
    expect([10, 20, 90, 95].map((shown) => grownTo(shown, LEARN_ISSUES_MAX))).toEqual([20, 30, 100, 100]);
    expect([3, 13, 83, 93].map((shown) => grownTo(shown, PRACTICE_MAX))).toEqual([13, 23, 93, 93]);
  });
});
