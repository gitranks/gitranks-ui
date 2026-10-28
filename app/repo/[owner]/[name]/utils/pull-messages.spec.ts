import type { Session } from 'next-auth';
import { describe, expect, it } from 'vitest';

import {
  allowanceAfter,
  PULL_MESSAGES,
  PULL_TOASTS,
  pullCheckOf,
  pullErrorOutcomeOf,
  pullLabelOf,
  pullModeOf,
  pullOutcomeOf,
  refreshNoteOf,
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

  it('reloads after a refresh, with the note on badges for the page after it', () => {
    expect(pullOutcomeOf({ status: 'refreshed', stars: 171, nextAt: IN_2H }, 'daily', NOW)).toEqual({
      kind: 'reload',
      note: 'Updated. Badges are cached for 24 hours, so the ones in your README can take up to a day to show it.',
    });
  });

  it('says when the full star history is read again, when the answer knows', () => {
    expect(pullOutcomeOf({ status: 'refreshed', stars: 171, historyUntil: IN_2H }, 'daily', NOW)).toEqual({
      kind: 'reload',
      note:
        'Updated. Badges are cached for 24 hours, so the ones in your README can take up to a day to show it. ' +
        'The full star history is read again in 2 h.',
    });
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

describe('refreshNoteOf', () => {
  it('is the note on badges alone after a fetch, which knows no next read', () => {
    expect(refreshNoteOf()).toBe(PULL_TOASTS.updated);
  });

  it('adds the time left until the full star history is read again', () => {
    expect(refreshNoteOf('2026-10-26T23:20:00.000Z', NOW)).toBe(
      `${PULL_TOASTS.updated} The full star history is read again in 13 h 20 min.`,
    );
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

describe('pullLabelOf', () => {
  it('reads Refresh while the session loads, signed out, or with an unknown allowance', () => {
    expect(pullLabelOf('loading', null)).toBe('Refresh');
    expect(pullLabelOf('signed-out', null)).toBe('Refresh');
    expect(pullLabelOf('daily', null)).toBe('Refresh');
    expect(pullLabelOf('token', null)).toBe('Refresh');
  });

  it("counts a daily visitor's unused free fetch", () => {
    expect(pullLabelOf('daily', allowance({ available: true, nextAt: null }))).toBe('Refresh · 1 left');
    expect(pullLabelOf('daily', allowance({ available: false, nextAt: IN_2H }))).toBe('Refresh');
  });

  it('counts the fetches a token visitor has left', () => {
    expect(
      pullLabelOf('token', allowance({ available: false, nextAt: null }, { used: 3, limit: 20, nextAt: null })),
    ).toBe('Refresh · 17 left');
    expect(
      pullLabelOf('token', allowance({ available: false, nextAt: null }, { used: 21, limit: 20, nextAt: IN_2H })),
    ).toBe('Refresh · 0 left');
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

  it('marks the free fetch of the day used, so the button no longer counts it', () => {
    const after = allowanceAfter({ status: 'started', pullId: 'p1', nextAt: IN_2H }, 'daily', before);

    expect(after).toEqual(allowance({ available: false, nextAt: IN_2H }, before.token));
    expect(pullLabelOf('daily', after)).toBe('Refresh');
  });

  it('marks the free fetch of the day used after a refresh too', () => {
    expect(allowanceAfter({ status: 'refreshed', stars: 171, nextAt: IN_2H }, 'daily', before)).toEqual(
      allowance({ available: false, nextAt: IN_2H }, before.token),
    );
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
    expect(allowanceAfter({ status: 'refreshed', stars: 171, nextAt: IN_2H }, 'token', before)).toBe(before);
    expect(allowanceAfter({ status: 'refreshed', stars: 171 }, 'daily', before)).toBe(before);
  });
});
