import { describe, expect, it } from 'vitest';

import { myAttempt, myLearnAttempts } from './__fixtures__/home';
import { emptyProfile, filledProfile } from './__fixtures__/profile';
import type { LearnStage } from './learn.types';
import {
  attemptTitleOf,
  currentOf,
  goalViewOf,
  IN_PROGRESS_STAGES,
  isInProgress,
  issueSizeOf,
  learnHomeStateOf,
  levelFor,
  levelPhraseOf,
  ownCardOf,
  ownLessonKeyOf,
  pathMarksOf,
  prNumberOf,
  roomWordsOf,
  sameGoal,
  wantedOf,
} from './learn-home';
import { LEARN_ABOUT_PATH, LEARN_PRACTICE_PATH } from './learn-path';
import { LEARN_ISSUES_PATH, learnStartPath } from './learn-start';
import { LEARN_ABOUT_METADATA } from './lesson-seo';

const state = (attempts = myLearnAttempts.none, profile = filledProfile, settingUp = false) =>
  learnHomeStateOf({ settingUp, profile, attempts });

describe("Learn home's state", () => {
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

  it('decides the states in order: setting up, no goal, the own lesson, the pull request, the goal set', () => {
    expect(state(myLearnAttempts.working, filledProfile, true).kind).toBe('setting-up');
    expect(state(myLearnAttempts.working, emptyProfile).kind).toBe('no-goal');
    expect(state(myLearnAttempts.working, { ...filledProfile, goalValue: '  ' }).kind).toBe('no-goal');
    expect(state(myLearnAttempts.working)).toMatchObject({ kind: 'own', card: 'working' });
    // A lesson in progress comes before the last pull request.
    expect(state({ current: myAttempt(), lastPullRequest: myLearnAttempts.prOpen.lastPullRequest }).kind).toBe('own');
    expect(state(myLearnAttempts.prOpen).kind).toBe('pull-request');
    expect(state(myLearnAttempts.none).kind).toBe('goal-set');
    // The attempts unread: the goal set, with its issues.
    expect(learnHomeStateOf({ settingUp: false, profile: filledProfile, attempts: undefined }).kind).toBe('goal-set');
  });

  it('words the own lesson by its stage, and the approval by whether it is submitting', () => {
    const card = (stage: LearnStage, attemptState = 'REVIEW' as const) => ownCardOf({ stage, state: attemptState });
    expect(card('AGENT_WORKING')).toBe('working');
    expect(card('AGENT_REWRITING')).toBe('working');
    expect(card('WARMUP')).toBe('ready');
    expect(card('LESSON')).toBe('ready');
    expect(card('BLOCKED')).toBe('blocked');
    expect(card('READY_TO_APPROVE')).toBe('approve');
    expect(ownCardOf({ stage: 'READY_TO_APPROVE', state: 'SUBMITTING' })).toBe('submitting');
  });

  it('marks the path: the goal, then the agent (working), then passing and the pull request', () => {
    expect(pathMarksOf(state(myLearnAttempts.none, emptyProfile))).toEqual(['now', 'next', 'next']);
    expect(pathMarksOf(state())).toEqual(['done', 'now', 'next']);
    expect(pathMarksOf(state(myLearnAttempts.working))).toEqual(['done', 'working', 'next']);
    expect(pathMarksOf(state(myLearnAttempts.ready))).toEqual(['done', 'done', 'now']);
    expect(pathMarksOf(state(myLearnAttempts.approve))).toEqual(['done', 'done', 'now']);
    expect(pathMarksOf(state(myLearnAttempts.prOpen))).toEqual(['done', 'done', 'done']);
  });

  it('reads the page again only when what it shows moved', () => {
    const working = ownLessonKeyOf(myLearnAttempts.working);
    expect(ownLessonKeyOf(myLearnAttempts.working)).toBe(working);
    expect(ownLessonKeyOf(myLearnAttempts.ready)).not.toBe(working);
    expect(ownLessonKeyOf(myLearnAttempts.submitting)).not.toBe(ownLessonKeyOf(myLearnAttempts.approve));
    expect(
      ownLessonKeyOf({ current: myAttempt({ latestEvent: { state: 'CHECKS', detail: null, at: 'later' } }) } as never),
    ).not.toBe(working);
    expect(ownLessonKeyOf(myLearnAttempts.prOpen)).not.toBe(ownLessonKeyOf(myLearnAttempts.none));
  });
});

describe("Learn home's words", () => {
  it('names an issue by owner/repo#n until its title is stored', () => {
    expect(attemptTitleOf(myAttempt())).toBe('Route params lose their type after a redirect');
    expect(attemptTitleOf(myAttempt({ title: null }))).toBe('driftwood-js/driftwood#934');
    expect(attemptTitleOf(myAttempt({ title: ' ', repo: null }))).toBe('Issue #934');
  });

  it('reads a pull request number from its address', () => {
    expect(prNumberOf('https://github.com/a/b/pull/961')).toBe(961);
    expect(prNumberOf('https://github.com/a/b/pull/961/files')).toBe(961);
    expect(prNumberOf('https://github.com/a/b/issues/961')).toBeNull();
    expect(prNumberOf(null)).toBeNull();
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

  it('words each limit that leaves no room for a new lesson, with where it is held', () => {
    expect(roomWordsOf({ limit: 'open_prs_at_a_time', value: 2 })).toEqual({
      text: '2 of your pull requests are waiting on maintainers. A new lesson can start when one is merged or closed.',
      link: { href: '/learn/lessons', label: 'My lessons' },
    });
    expect(roomWordsOf({ limit: 'open_prs_at_a_time', value: 1 })?.text).toMatch(/^1 of your pull requests is/);
    expect(roomWordsOf({ limit: 'attempts_at_a_time', value: 1 })).toEqual({
      text: 'Your agent is working on another issue. A new lesson can start when that one is done.',
      link: { href: '/contribute/me', label: 'My contributions' },
    });
    // A limit this page doesn't know is worded as the attempts' one, as the start page does.
    expect(roomWordsOf({ limit: 'something_else', value: 1 }).text).toMatch(/^Your agent is working/);
  });

  it("words an issue's size as Contribute's row does", () => {
    expect(issueSizeOf({ size: 'S' })).toBe('Size small');
    expect(issueSizeOf({ size: 'M' })).toBe('Size medium');
    expect(issueSizeOf({ size: null })).toBeNull();
  });
});

describe("Learn home's addresses", () => {
  it('starts a lesson at /learn/start/<owner>/<repo>/<number>', () => {
    expect(learnStartPath('driftwood-js/driftwood', 934)).toBe('/learn/start/driftwood-js/driftwood/934');
    expect(learnStartPath('a b/c', 1)).toBe('/learn/start/a%20b/c/1');
    expect([LEARN_ISSUES_PATH, LEARN_PRACTICE_PATH, LEARN_ABOUT_PATH]).toEqual([
      '/learn#issues',
      '/learn#practice',
      '/learn/about',
    ]);
  });

  it('points /learn/about at /learn and keeps it out of search engines', () => {
    expect(LEARN_ABOUT_METADATA.alternates).toEqual({ canonical: '/learn' });
    expect(LEARN_ABOUT_METADATA.robots).toEqual({ index: false, follow: false });
  });
});
