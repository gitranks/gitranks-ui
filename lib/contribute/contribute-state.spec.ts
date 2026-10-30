import { describe, expect, it } from 'vitest';

import { views } from './__fixtures__/contribute-views';
import {
  contributeHomeOf,
  contributeNoticesOf,
  isContributePageOpen,
  isMidSetup,
  isOnboarded,
  isPaused,
} from './contribute-state';

const kinds = (view: Parameters<typeof contributeNoticesOf>[0]) => contributeNoticesOf(view).map(({ kind }) => kind);

describe('contributeNoticesOf', () => {
  it('names what stands between the user and the next attempt, most pressing first', () => {
    expect(kinds(views.newcomer)).toEqual(['no-key', 'grant-missing']);
    expect(kinds(views.noKey)).toEqual(['no-key', 'grant-missing']);
    expect(kinds(views.keyInvalid)).toEqual(['key-invalid']);
    expect(kinds(views.exhausted)).toEqual(['exhausted']);
    expect(kinds(views.limitReached)).toEqual(['limit-reached']);
    expect(kinds(views.grantMissing)).toEqual(['grant-missing']);
    expect(kinds(views.paused)).toEqual(['paused']);
    expect(kinds(views.active)).toEqual([]);
  });

  it('carries the day a waiting key starts again', () => {
    expect(contributeNoticesOf(views.exhausted)[0]).toEqual({ kind: 'exhausted', until: '2026-11-14T00:00:00.000Z' });
  });

  it('says nothing about the grant, and reads the pause from the status, when the API does not answer them yet', () => {
    expect(kinds(views.fieldsMissing)).toEqual([]);
    expect(isPaused({ ...views.fieldsMissing, contributor: { ...views.active.contributor, status: 'PAUSED' } })).toBe(
      true,
    );
  });
});

describe('isOnboarded', () => {
  it('is the onboarded stamp, and nothing else', () => {
    expect(isOnboarded(views.active)).toBe(true);
    expect(isOnboarded(views.agentOnboarded)).toBe(true);
    // Onboarded once stays onboarded, the key removed and the tokens revoked.
    expect(isOnboarded(views.onboardedNoPath)).toBe(true);

    expect(isOnboarded(views.noKey)).toBe(false);
    // A token created and never used is setup, not onboarding.
    expect(isOnboarded(views.midSetup)).toBe(false);
    expect(isOnboarded(views.newcomer)).toBe(false);
    expect(isOnboarded(null)).toBe(false);
  });

  it('is false while the API does not answer the stamp', () => {
    expect(isOnboarded(views.onboardingMissing)).toBe(false);
  });
});

describe('isMidSetup', () => {
  it('is a live token and no stamp yet', () => {
    expect(isMidSetup(views.midSetup)).toBe(true);
    expect(isMidSetup(views.noKey)).toBe(false);
    expect(isMidSetup(views.agentOnboarded)).toBe(false);
    expect(isMidSetup(views.newcomer)).toBe(false);
  });
});

describe('contributeHomeOf', () => {
  it('is the landing until the user is onboarded, then the overview', () => {
    expect(contributeHomeOf(views.newcomer, {})).toEqual({ screen: 'landing', viewer: 'signed-in', preview: false });
    expect(contributeHomeOf(views.noKey, {})).toEqual({ screen: 'landing', viewer: 'signed-in', preview: false });
    expect(contributeHomeOf(views.midSetup, {})).toEqual({ screen: 'landing', viewer: 'mid-setup', preview: false });
    expect(contributeHomeOf(views.active, {})).toEqual({ screen: 'overview' });
  });

  it('shows an onboarded user the landing again from "How Contribute works"', () => {
    expect(contributeHomeOf(views.active, { about: '1' })).toEqual({
      screen: 'landing',
      viewer: 'signed-in',
      preview: false,
    });
    expect(contributeHomeOf(views.midSetup, { about: '1' }).screen).toBe('landing');
  });

  it("shows anyone the visitor's landing under ?as=visitor", () => {
    const visitor = { screen: 'landing', viewer: 'visitor', preview: true };

    expect(contributeHomeOf(views.active, { as: 'visitor' })).toEqual(visitor);
    expect(contributeHomeOf(views.midSetup, { as: ['visitor'] })).toEqual(visitor);
    expect(contributeHomeOf(views.newcomer, { as: 'visitor', about: '1' })).toEqual(visitor);
    expect(contributeHomeOf(views.active, { as: 'someone' })).toEqual({ screen: 'overview' });
  });
});

describe('isContributePageOpen', () => {
  it('opens Issues, My contributions and the reviews only once the user is onboarded', () => {
    for (const page of ['issues', 'me', 'attempt'] as const) {
      expect(isContributePageOpen(views.active, page)).toBe(true);
      expect(isContributePageOpen(views.agentOnboarded, page)).toBe(true);
      expect(isContributePageOpen(views.noKey, page)).toBe(false);
      expect(isContributePageOpen(views.midSetup, page)).toBe(false);
      expect(isContributePageOpen(views.newcomer, page)).toBe(false);
    }
  });

  it('opens Settings to any contributor, so one mid-setup can revoke a token or delete their data', () => {
    expect(isContributePageOpen(views.active, 'settings')).toBe(true);
    expect(isContributePageOpen(views.midSetup, 'settings')).toBe(true);
    expect(isContributePageOpen(views.noKey, 'settings')).toBe(true);
    expect(isContributePageOpen(views.newcomer, 'settings')).toBe(false);
  });
});
