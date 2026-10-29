import { describe, expect, it } from 'vitest';

import { views } from './__fixtures__/contribute-views';
import { contributeNoticesOf, isPaused } from './contribute-state';

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
