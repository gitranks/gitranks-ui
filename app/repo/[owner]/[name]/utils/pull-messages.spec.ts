import type { Session } from 'next-auth';
import { describe, expect, it } from 'vitest';

import {
  allowanceAfter,
  PULL_MESSAGES,
  PULL_TOASTS,
  pullCheckOf,
  pullErrorOutcomeOf,
  pullHintOf,
  pullModeOf,
  pullOutcomeOf,
  TOKEN_PULLS_PER_DAY,
} from './pull-messages';
import type { RepoPullAllowance, RepoPullState } from '@/types/repo-pull.types';

const NOW = Date.parse('2026-10-26T10:00:00.000Z');
const IN_2H = '2026-10-26T12:00:00.000Z';
const AGO_1H = '2026-10-26T09:00:00.000Z';

const session = (authMode?: 'identity' | 'token'): Session => ({
  user: { githubLogin: 'octocat', authMode },
  expires: '2099-01-01T00:00:00.000Z',
});

const allowance = (
  daily: RepoPullAllowance['daily'],
  token: RepoPullAllowance['token'] = { used: 0, limit: 20, nextAt: null },
) => ({ daily, token });

describe('pullModeOf', () => {
  it('waits for the session', () => {
    expect(pullModeOf(session('token'), 'loading')).toBe('loading');
  });

  it('reads a visitor without a login as signed out', () => {
    expect(pullModeOf(null, 'unauthenticated')).toBe('signed-out');
    expect(pullModeOf({ user: {}, expires: '' } as Session, 'authenticated')).toBe('signed-out');
  });

  it('splits signed-in visitors by how they signed in', () => {
    expect(pullModeOf(session('token'), 'authenticated')).toBe('token');
    expect(pullModeOf(session('identity'), 'authenticated')).toBe('daily');
    expect(pullModeOf(session(), 'authenticated')).toBe('daily');
  });
});

describe('pullOutcomeOf', () => {
  it('waits for a started fetch, thanking a daily visitor for the star', () => {
    expect(pullOutcomeOf({ status: 'started', pullId: 'p1', nextAt: IN_2H }, 'daily', NOW)).toEqual({
      kind: 'poll',
      toast: PULL_TOASTS.startedDaily,
    });
    expect(pullOutcomeOf({ status: 'started', pullId: 'p1' }, 'token', NOW)).toEqual({
      kind: 'poll',
      toast: PULL_TOASTS.started,
    });
  });

  it('waits for a fetch that is already running, without a toast', () => {
    expect(pullOutcomeOf({ status: 'running' }, 'token', NOW)).toEqual({ kind: 'poll' });
  });

  it.each([
    [{ status: 'not_eligible' } as const, PULL_TOASTS.notEligible],
    [{ status: 'up_to_date' } as const, PULL_TOASTS.upToDate],
    [{ status: 'busy' } as const, PULL_TOASTS.busy],
    [
      { status: 'not_ready', until: IN_2H } as const,
      'The star history was fetched lately. The next fetch opens in 2 h.',
    ],
    [{ status: 'quota', nextAt: IN_2H } as const, 'You used all your fetches of today. The next one is in 2 h.'],
  ])('tells %o in a toast', (result, text) => {
    expect(pullOutcomeOf(result, 'token', NOW)).toEqual({ kind: 'toast', tone: 'info', text });
  });

  it.each([
    [{ status: 'not_starred' } as const, { kind: 'dialog', dialog: 'needStar' }],
    [{ status: 'used', nextAt: IN_2H } as const, { kind: 'dialog', dialog: 'used', until: IN_2H }],
    [{ status: 'blocked', until: IN_2H } as const, { kind: 'dialog', dialog: 'blocked', until: IN_2H }],
  ])('explains %o in a dialog', (result, outcome) => {
    expect(pullOutcomeOf(result, 'daily', NOW)).toEqual(outcome);
  });
});

describe('pullErrorOutcomeOf', () => {
  it('offers the sign-in on 401', () => {
    expect(pullErrorOutcomeOf(401)).toEqual({ kind: 'dialog', dialog: 'signIn' });
  });

  it.each([
    [403, PULL_TOASTS.refused],
    [400, PULL_TOASTS.invalid],
    [502, PULL_TOASTS.failed],
    [0, PULL_TOASTS.failed],
  ])('shows an error toast on %i', (status, text) => {
    expect(pullErrorOutcomeOf(status)).toEqual({ kind: 'toast', tone: 'error', text });
  });
});

describe('pullHintOf', () => {
  it('says nothing while the session loads', () => {
    expect(pullHintOf('loading', null, NOW)).toBeNull();
  });

  it('asks a signed-out visitor to sign in and star', () => {
    expect(pullHintOf('signed-out', null, NOW)).toBe(
      'Sign in with GitHub and star our repo to get one free fetch a day.',
    );
  });

  it('explains the star deal to a daily visitor with a fetch left or an unknown allowance', () => {
    const starDeal = 'Starring gitranks/gitranks-ui on GitHub unlocks one free fetch a day.';

    expect(pullHintOf('daily', null, NOW)).toBe(starDeal);
    expect(pullHintOf('daily', allowance({ available: true, nextAt: null }), NOW)).toBe(starDeal);
    expect(pullHintOf('daily', allowance({ available: false, nextAt: AGO_1H }), NOW)).toBe(starDeal);
  });

  it('tells a daily visitor when the next free fetch opens', () => {
    expect(pullHintOf('daily', allowance({ available: false, nextAt: IN_2H }), NOW)).toBe(
      'Your next free fetch is in 2 h.',
    );
  });

  it('counts the fetches a token visitor has left', () => {
    expect(pullHintOf('token', null, NOW)).toBe(
      `Uses your own GitHub access, up to ${TOKEN_PULLS_PER_DAY} fetches a day.`,
    );
    expect(
      pullHintOf('token', allowance({ available: false, nextAt: null }, { used: 3, limit: 20, nextAt: null }), NOW),
    ).toBe('Uses your own GitHub access: 17 of 20 fetches left today.');
    expect(
      pullHintOf('token', allowance({ available: false, nextAt: null }, { used: 20, limit: 20, nextAt: IN_2H }), NOW),
    ).toBe('You used all 20 fetches of today. The next one is in 2 h.');
  });
});

describe('PULL_MESSAGES', () => {
  it('names the daily token limit from its constant', () => {
    expect(PULL_MESSAGES.signIn.closing[0]).toContain(`up to ${TOKEN_PULLS_PER_DAY} fetches a day`);
    expect(PULL_MESSAGES.used.paragraphs[1]).toContain(`up to ${TOKEN_PULLS_PER_DAY} fetches a day`);
  });
});

describe('pullCheckOf', () => {
  const state = (id: string, status: RepoPullState['status']) => ({
    pull: { id, status, requestedAt: AGO_1H, finishedAt: status === 'running' ? null : AGO_1H },
    allowance: null,
  });

  it('waits on while the fetch runs or the read fails', () => {
    expect(pullCheckOf(state('p1', 'running'), 'p1')).toBe('continue');
    expect(pullCheckOf(state('p1', 'running'), null)).toBe('continue');
    expect(pullCheckOf(null, 'p1')).toBe('continue');
  });

  it('stops without a reload when there is no fetch', () => {
    expect(pullCheckOf({ pull: null, allowance: null }, 'p1')).toBe('stop');
    expect(pullCheckOf({ pull: null, allowance: null }, null)).toBe('stop');
  });

  it('stops with an error when the fetch failed', () => {
    expect(pullCheckOf(state('p1', 'failed'), 'p1')).toBe('stopFailed');
    expect(pullCheckOf(state('p1', 'failed'), null)).toBe('stopFailed');
  });

  it('reloads when the fetch is done', () => {
    expect(pullCheckOf(state('p1', 'done'), 'p1')).toBe('reload');
    expect(pullCheckOf(state('p1', 'done'), null)).toBe('reload');
  });

  it('waits on while the answer is about an earlier fetch than the one started', () => {
    expect(pullCheckOf(state('p0', 'done'), 'p1')).toBe('continue');
    expect(pullCheckOf(state('p0', 'failed'), 'p1')).toBe('continue');
  });
});

describe('allowanceAfter', () => {
  const before = allowance({ available: true, nextAt: null }, { used: 2, limit: 20, nextAt: null });

  it('marks the free fetch of the day used, so the line under the button names the next one', () => {
    const after = allowanceAfter({ status: 'started', pullId: 'p1', nextAt: IN_2H }, 'daily', before);

    expect(after).toEqual(allowance({ available: false, nextAt: IN_2H }, before.token));
    expect(pullHintOf('daily', after, NOW)).toBe('Your next free fetch is in 2 h.');
  });

  it('fills in the token part when no allowance was read yet', () => {
    expect(allowanceAfter({ status: 'started', pullId: 'p1', nextAt: IN_2H }, 'daily', null)).toEqual(
      allowance({ available: false, nextAt: IN_2H }, { used: 0, limit: TOKEN_PULLS_PER_DAY, nextAt: null }),
    );
  });

  it('keeps the allowance for any other answer, a token press or a start without nextAt', () => {
    expect(allowanceAfter({ status: 'running' }, 'daily', before)).toBe(before);
    expect(allowanceAfter({ status: 'started', pullId: 'p1', nextAt: IN_2H }, 'token', before)).toBe(before);
    expect(allowanceAfter({ status: 'started', pullId: 'p1' }, 'daily', before)).toBe(before);
  });
});
