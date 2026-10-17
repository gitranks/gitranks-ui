import { describe, expect, it } from 'vitest';

import {
  ExpiredRefreshStates,
  isGithubLogin,
  PROFILE_REFRESH_WINDOW,
  profileCacheTag,
  recentRefreshState,
} from './profile-refresh';

const NOW = Date.UTC(2026, 9, 17, 12);

describe('isGithubLogin', () => {
  it('accepts logins, legacy hyphens included', () => {
    expect(isGithubLogin('octocat')).toBe(true);
    expect(isGithubLogin('-Jerry-')).toBe(true);
    expect(isGithubLogin('a'.repeat(39))).toBe(true);
  });

  it('refuses anything that is not a login', () => {
    expect(isGithubLogin('')).toBe(false);
    expect(isGithubLogin('a'.repeat(40))).toBe(false);
    expect(isGithubLogin('profile:octocat')).toBe(false);
    expect(isGithubLogin('octo/cat')).toBe(false);
    expect(isGithubLogin(42)).toBe(false);
    expect(isGithubLogin(undefined)).toBe(false);
  });
});

describe('profileCacheTag', () => {
  it('keeps the login as given', () => {
    expect(profileCacheTag('OctoCat')).toBe('profile:OctoCat');
  });
});

describe('recentRefreshState', () => {
  it('keys a status that changed within the window', () => {
    expect(recentRefreshState({ fetchingStatus: 'FETCHING', fetchingUpdatedAt: NOW - 1_000 }, NOW)).toBe(
      `FETCHING@${NOW - 1_000}`,
    );
    expect(
      recentRefreshState({ fetchingStatus: 'COMPLETED', fetchingUpdatedAt: NOW - PROFILE_REFRESH_WINDOW }, NOW),
    ).toBe(`COMPLETED@${NOW - PROFILE_REFRESH_WINDOW}`);
  });

  it('gives nothing once the window has passed', () => {
    expect(
      recentRefreshState({ fetchingStatus: 'COMPLETED', fetchingUpdatedAt: NOW - PROFILE_REFRESH_WINDOW - 1 }, NOW),
    ).toBeNull();
  });

  it('gives nothing for a profile that was never refreshed or does not exist', () => {
    expect(recentRefreshState({ fetchingStatus: null, fetchingUpdatedAt: null }, NOW)).toBeNull();
    expect(recentRefreshState({ fetchingStatus: 'COMPLETED' }, NOW)).toBeNull();
    expect(recentRefreshState(null, NOW)).toBeNull();
    expect(recentRefreshState(undefined, NOW)).toBeNull();
  });
});

describe('ExpiredRefreshStates', () => {
  it('claims each status of a profile once', () => {
    const states = new ExpiredRefreshStates();

    expect(states.claim('octocat', 'FETCHING@1')).toBe(true);
    expect(states.claim('octocat', 'FETCHING@1')).toBe(false);
    expect(states.claim('octocat', 'COMPLETED@2')).toBe(true);
    expect(states.claim('octocat', 'COMPLETED@2')).toBe(false);
  });

  it('keeps profiles apart', () => {
    const states = new ExpiredRefreshStates();

    expect(states.claim('octocat', 'FETCHING@1')).toBe(true);
    expect(states.claim('hubot', 'FETCHING@1')).toBe(true);
  });

  it('forgets the profile claimed longest ago once over the limit', () => {
    const states = new ExpiredRefreshStates(2);

    states.claim('a', 'FETCHING@1');
    states.claim('b', 'FETCHING@1');
    states.claim('a', 'COMPLETED@2');
    states.claim('c', 'FETCHING@1');

    expect(states.claim('a', 'COMPLETED@2')).toBe(false);
    expect(states.claim('c', 'FETCHING@1')).toBe(false);
    expect(states.claim('b', 'FETCHING@1')).toBe(true);
  });
});
