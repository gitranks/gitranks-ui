import { describe, expect, it } from 'vitest';

import { progressShareOf } from './progress-share';

describe('Your progress’ Share, from the Skills page', () => {
  it('shares the page while everyone can see it', () => {
    expect(progressShareOf('octocat', { state: 'PUBLIC' })).toEqual({
      state: 'public',
      path: '/profile/octocat/skills',
    });
  });

  it('leads to the page while only its owner can see it', () => {
    expect(progressShareOf('octocat', { state: 'HIDDEN' })).toEqual({
      state: 'hidden',
      path: '/profile/octocat/skills',
    });
  });

  it('says "not yet" while nothing is on the page', () => {
    expect(progressShareOf('octocat', { state: 'NEW' })?.state).toBe('not-yet');
    expect(progressShareOf('octocat', { state: 'NOTHING_YET' })?.state).toBe('not-yet');
  });

  it('stays out when the page could not be read', () => {
    expect(progressShareOf('octocat', null)).toBeNull();
    expect(progressShareOf('octocat', undefined)).toBeNull();
  });
});
