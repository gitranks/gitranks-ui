import { describe, expect, it } from 'vitest';

import { learnBarPlaceOf, learnBarStateOf, learnBarTabsOf } from './learn-bar';

const read = { setup: 'SAVED' as const, due: 6, pullRequests: true, pullRequestsNeedYou: 1 };

describe("Learn's bar", () => {
  it("is a visitor's without an answer, and asks for setup until it is saved", () => {
    expect(learnBarStateOf(null)).toEqual({ kind: 'visitor' });
    expect(learnBarStateOf(undefined)).toEqual({ kind: 'visitor' });
    const waiting = { due: 6, pullRequests: true, pullRequestsNeedYou: 1 };
    expect(learnBarStateOf({ ...read, setup: 'GUESSED' })).toEqual({ kind: 'setup', setup: 'guessed', ...waiting });
    expect(learnBarStateOf({ ...read, setup: 'WORKING' })).toEqual({ kind: 'setup', setup: 'working', ...waiting });
    // No guess to check: it could not start, or it was dropped.
    expect(learnBarStateOf({ ...read, setup: 'NONE' })).toEqual({ kind: 'setup', setup: 'open', ...waiting });
    expect(learnBarStateOf(read)).toEqual({ kind: 'learner', ...waiting });
    expect(learnBarStateOf({ ...read, due: -1, pullRequestsNeedYou: -2 })).toMatchObject({
      due: 0,
      pullRequestsNeedYou: 0,
    });
  });

  it('asks for the onboarding until the Learn sign, whatever the setup', () => {
    const waiting = { due: 6, pullRequests: true, pullRequestsNeedYou: 1 };
    expect(learnBarStateOf({ ...read, onboarded: false })).toEqual({ kind: 'setup', setup: 'open', ...waiting });
    expect(learnBarStateOf({ ...read, setup: 'GUESSED', onboarded: false })).toMatchObject({ setup: 'guessed' });
    expect(learnBarStateOf({ ...read, setup: 'GUESSED', onboarded: true })).toEqual({ kind: 'learner', ...waiting });
    expect(learnBarStateOf({ ...read, setup: 'NONE', onboarded: true })).toEqual({ kind: 'learner', ...waiting });
  });

  it('keeps the rule from before the sign when it cannot be read: asked until the setup is saved', () => {
    expect(learnBarStateOf({ ...read, onboarded: null })).toMatchObject({ kind: 'learner' });
    expect(learnBarStateOf({ ...read, setup: 'GUESSED', onboarded: null })).toMatchObject({ kind: 'setup' });
  });

  it('shows the spinner while our guess runs from the page, and only before it is in', () => {
    expect(learnBarStateOf({ ...read, setup: 'NONE' }, true)).toMatchObject({ kind: 'setup', setup: 'working' });
    expect(learnBarStateOf({ ...read, setup: 'WORKING' }, true)).toMatchObject({ kind: 'setup', setup: 'working' });
    expect(learnBarStateOf({ ...read, setup: 'GUESSED' }, true)).toMatchObject({ kind: 'setup', setup: 'guessed' });
    expect(learnBarStateOf(read, true)).toMatchObject({ kind: 'learner' });
  });

  it('shows Home, Courses and Issues to everyone', () => {
    expect(learnBarTabsOf({ kind: 'visitor' })).toEqual(['home', 'courses', 'issues']);
  });

  it('shows Progress and Settings too to anyone signed in', () => {
    const all = ['home', 'courses', 'issues', 'progress', 'settings'];
    // Setting up is not required: a person who keeps our guess has their progress and settings all the same.
    for (const setup of ['NONE', 'WORKING', 'GUESSED'] as const) {
      expect(learnBarTabsOf(learnBarStateOf({ ...read, setup }))).toEqual(all);
    }
    expect(learnBarTabsOf(learnBarStateOf(read))).toEqual(all);
  });

  it.each([
    ['/learn', null, 'home'],
    ['/learn/', null, 'home'],
    ['/learn/courses', null, 'courses'],
    ['/learn/courses/algorithms', null, 'courses'],
    ['/learn/issues', null, 'issues'],
    ['/learn/issues/', null, 'issues'],
    ['/learn/lessons/binary-search/real-world', null, 'issues'],
    ['/learn/courses/algorithms/real-world', null, 'issues'],
    ['/learn/courses/algorithms/real-world/more', null, 'courses'],
    ['/learn/lessons/binary-search', null, null],
    ['/learn/progress', null, 'progress'],
    ['/learn/progress/octocat', null, null],
    ['/learn/setup', null, 'setup'],
    ['/learn/review', null, 'review'],
    ['/learn/coursesx', null, null],
    ['/my/settings', 'learn', 'settings'],
    ['/my/settings', null, null],
    ['/my/settings', 'contribute', null],
    ['/my/pull-requests', 'learn', 'pull-requests'],
    ['/my/pull-requests/octo/hello/12', 'learn', 'pull-requests'],
    ['/my/agent', 'learn', null],
    ['/contribute', 'learn', null],
    ['/learn/fixes/harbor-kit/relay/58', null, 'issues'],
    ['/contribute/pr/harbor-kit/relay/58', null, 'issues'],
    ['/learn/fixes/harbor-kit/relay/58/walkthrough', null, null],
  ])('marks %s (from %s) as %s', (pathname, from, place) => {
    expect(learnBarPlaceOf(pathname, from)).toBe(place);
  });
});
