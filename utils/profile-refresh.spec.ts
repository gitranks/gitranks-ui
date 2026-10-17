import { describe, expect, it } from 'vitest';

import {
  ExpiredRefreshStates,
  isGithubLogin,
  MAX_SPELLINGS_PER_STATUS,
  PROFILE_REFRESH_WINDOW,
  profileCacheTag,
  REPEAT_EXPIRY_AFTER,
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

    expect(states.claim('octocat', 'FETCHING@1', NOW)).toBe(true);
    expect(states.claim('octocat', 'FETCHING@1', NOW + 1_000)).toBe(false);
    expect(states.claim('octocat', 'COMPLETED@2', NOW + 2_000)).toBe(true);
    expect(states.claim('octocat', 'COMPLETED@2', NOW + 3_000)).toBe(false);
  });

  it('claims the same status again once the repeat delay has passed', () => {
    const states = new ExpiredRefreshStates();

    expect(states.claim('octocat', 'COMPLETED@2', NOW)).toBe(true);
    expect(states.claim('octocat', 'COMPLETED@2', NOW + REPEAT_EXPIRY_AFTER - 1)).toBe(false);
    expect(states.claim('octocat', 'COMPLETED@2', NOW + REPEAT_EXPIRY_AFTER)).toBe(true);
    expect(states.claim('octocat', 'COMPLETED@2', NOW + REPEAT_EXPIRY_AFTER + 1)).toBe(false);
  });

  it('keeps profiles apart', () => {
    const states = new ExpiredRefreshStates();

    expect(states.claim('octocat', 'FETCHING@1', NOW)).toBe(true);
    expect(states.claim('hubot', 'FETCHING@1', NOW)).toBe(true);
  });

  it('claims each spelling of a login on its own, up to a limit per status', () => {
    const states = new ExpiredRefreshStates();
    const spellings = ['OctoCat', 'octocat', 'OCTOCAT', 'oCTOCAT'];

    expect(spellings.length).toBeGreaterThan(MAX_SPELLINGS_PER_STATUS);
    expect(spellings.map((login) => states.claim(login, 'FETCHING@1', NOW))).toEqual([true, true, true, false]);
    expect(states.claim('OctoCat', 'FETCHING@1', NOW + 1_000)).toBe(false);
    expect(states.claim('oCTOCAT', 'COMPLETED@2', NOW + 2_000)).toBe(true);
  });

  it('always claims the stored spelling, without counting it against the limit', () => {
    const states = new ExpiredRefreshStates();
    const others = ['octocat', 'OCTOCAT', 'oCTOCAT'];

    expect(others.map((login) => states.claim(login, 'FETCHING@1', NOW, 'OctoCat'))).toEqual([true, true, true]);
    expect(states.claim('octoCat', 'FETCHING@1', NOW, 'OctoCat')).toBe(false);
    expect(states.claim('OctoCat', 'FETCHING@1', NOW, 'OctoCat')).toBe(true);
    expect(states.claim('OctoCat', 'FETCHING@1', NOW + 1_000, 'OctoCat')).toBe(false);
  });

  it('counts the stored spelling claimed first as no other spelling', () => {
    const states = new ExpiredRefreshStates();

    expect(states.claim('OctoCat', 'FETCHING@1', NOW, 'OctoCat')).toBe(true);
    expect(
      ['octocat', 'OCTOCAT', 'oCTOCAT', 'octoCat'].map((login) => states.claim(login, 'FETCHING@1', NOW, 'OctoCat')),
    ).toEqual([true, true, true, false]);
  });

  it('forgets the profile claimed longest ago once over the limit', () => {
    const states = new ExpiredRefreshStates(2);

    states.claim('a', 'FETCHING@1', NOW);
    states.claim('b', 'FETCHING@1', NOW);
    states.claim('a', 'COMPLETED@2', NOW);
    states.claim('c', 'FETCHING@1', NOW);

    expect(states.claim('a', 'COMPLETED@2', NOW)).toBe(false);
    expect(states.claim('c', 'FETCHING@1', NOW)).toBe(false);
    expect(states.claim('b', 'FETCHING@1', NOW)).toBe(true);
  });
});
