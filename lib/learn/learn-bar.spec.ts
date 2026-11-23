import { describe, expect, it } from 'vitest';

import { learnBarPlaceOf, learnBarStateOf, learnBarTabsOf } from './learn-bar';

const read = { setup: 'SAVED' as const, due: 6, pullRequests: true, pullRequestsNeedYou: 1 };

describe("Learn's bar", () => {
  it("is a visitor's without an answer, and asks for setup until it is saved", () => {
    expect(learnBarStateOf(null)).toEqual({ kind: 'visitor' });
    expect(learnBarStateOf(undefined)).toEqual({ kind: 'visitor' });
    for (const setup of ['NONE', 'WORKING', 'GUESSED'] as const) {
      expect(learnBarStateOf({ ...read, setup })).toEqual({ kind: 'setup' });
    }
    expect(learnBarStateOf(read)).toEqual({ kind: 'learner', due: 6, pullRequests: true, pullRequestsNeedYou: 1 });
    expect(learnBarStateOf({ ...read, due: -1, pullRequestsNeedYou: -2 })).toMatchObject({
      due: 0,
      pullRequestsNeedYou: 0,
    });
  });

  it('shows three tabs to everyone and five to a learner', () => {
    expect(learnBarTabsOf({ kind: 'visitor' })).toEqual(['home', 'courses', 'issues']);
    expect(learnBarTabsOf({ kind: 'setup' })).toEqual(['home', 'courses', 'issues']);
    expect(learnBarTabsOf(learnBarStateOf(read))).toEqual(['home', 'courses', 'issues', 'progress', 'settings']);
  });

  it.each([
    ['/learn', null, 'home'],
    ['/learn/', null, 'home'],
    ['/learn/courses', null, 'courses'],
    ['/learn/courses/algorithms', null, 'courses'],
    ['/learn/issues', null, 'issues'],
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
  ])('marks %s (from %s) as %s', (pathname, from, place) => {
    expect(learnBarPlaceOf(pathname, from)).toBe(place);
  });
});
