import { describe, expect, it } from 'vitest';

import { myAttempt } from './__fixtures__/home';
import { emptyProfile, filledProfile } from './__fixtures__/profile';
import type { LearnStage } from './learn.types';
import {
  attemptTitleOf,
  currentOf,
  goalViewOf,
  IN_PROGRESS_STAGES,
  isInProgress,
  levelFor,
  levelPhraseOf,
  sameGoal,
  wantedOf,
} from './learn-home';
import { LEARN_ABOUT_PATH, LEARN_PRACTICE_PATH } from './learn-path';
import { LEARN_ABOUT_METADATA } from './lesson-seo';
import { learnStartPath, PICK_ISSUE_PATHS } from '@/lib/workspace/paths';

describe("Learn's lesson in progress", () => {
  it('counts a Learn attempt as in progress from the claim to the approval, never after', () => {
    const all: LearnStage[] = [...IN_PROGRESS_STAGES, 'PR_OPEN', 'HAND_PR', 'ENDED'];
    expect(all.filter(isInProgress)).toEqual([
      'AGENT_WORKING',
      'AGENT_REWRITING',
      'WARMUP',
      'LESSON',
      'BLOCKED',
      'READY_TO_APPROVE',
    ]);
    expect(isInProgress(null)).toBe(false);
    // An attempt the API names as current that is not in progress any more is not one.
    expect(currentOf({ current: myAttempt({ stage: 'ENDED' }), lastPullRequest: null })).toBeNull();
    expect(currentOf(undefined)).toBeNull();
  });
});

describe("Learn's words", () => {
  it('names an issue by owner/repo#n until its title is stored', () => {
    expect(attemptTitleOf(myAttempt())).toBe('Route params lose their type after a redirect');
    expect(attemptTitleOf(myAttempt({ title: null }))).toBe('driftwood-js/driftwood#934');
    expect(attemptTitleOf(myAttempt({ title: ' ', repo: null }))).toBe('Issue #934');
  });

  it('pre-sets the level Goal and level would show for a language', () => {
    expect(levelFor(emptyProfile, 'JavaScript')).toBe(2);
    expect(levelFor(emptyProfile, 'typescript')).toBe(1);
    expect(levelFor(emptyProfile, 'Rust')).toBe(0);
    expect(levelFor(null, 'Go')).toBe(0);
  });

  it("names the saved goal and its level, for a language from the user's levels", () => {
    expect(goalViewOf(filledProfile)).toEqual({ kind: 'language', value: 'TypeScript', level: 'Some' });
    expect(goalViewOf({ ...filledProfile, goalKind: 'PROJECT', goalValue: 'vercel/next.js' })).toEqual({
      kind: 'project',
      value: 'vercel/next.js',
      level: null,
    });
    expect(goalViewOf(emptyProfile)).toBeNull();
  });

  it('says who a lesson was made for, and whether it was the same goal', () => {
    expect(levelPhraseOf('Some')).toBe('some experience');
    expect(levelPhraseOf('New to it')).toBe('new to it');
    expect(wantedOf({ kind: 'language', value: 'TypeScript' })).toBe('who wanted to learn');
    expect(wantedOf({ kind: 'project', value: 'a/b' }, true)).toBe('who also wanted to work on');
    const goal = { kind: 'language', value: 'TypeScript', level: 'Some' };
    expect(sameGoal({ kind: 'LANGUAGE', value: 'typescript' }, goal)).toBe(true);
    // TypeScript and JavaScript are separate goals.
    expect(sameGoal({ kind: 'language', value: 'JavaScript' }, goal)).toBe(false);
    expect(sameGoal(null, goal)).toBe(false);
  });
});

describe("Learn's addresses", () => {
  it('starts a lesson at /learn/start/<owner>/<repo>/<number>', () => {
    expect(learnStartPath('driftwood-js/driftwood', 934)).toBe('/learn/start/driftwood-js/driftwood/934');
    expect(learnStartPath('a b/c', 1)).toBe('/learn/start/a%20b/c/1');
    expect([PICK_ISSUE_PATHS.learn, LEARN_PRACTICE_PATH, LEARN_ABOUT_PATH]).toEqual([
      '/learn/issues',
      '/learn/earlier#practice',
      '/learn/about',
    ]);
  });

  it('points /learn/about at /learn and keeps it out of search engines', () => {
    expect(LEARN_ABOUT_METADATA.alternates).toEqual({ canonical: '/learn' });
    expect(LEARN_ABOUT_METADATA.robots).toEqual({ index: false, follow: false });
  });
});
