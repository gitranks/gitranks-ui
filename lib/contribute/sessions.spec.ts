import { describe, expect, it } from 'vitest';

import { attempts, followUpAttempts, followUps } from './__fixtures__/contribute-attempts';
import type { ContributeFollowUpRound } from './contribute.types';
import { nextRoundOpen, sessionsOf, waitingThreadsOf } from './sessions';

const round = (patch: Partial<ContributeFollowUpRound> = {}): ContributeFollowUpRound => ({
  round: 1,
  attemptId: 'A_F1',
  state: 'DONE',
  endReason: null,
  pushedSha: '46de700aa1',
  fixed: 5,
  skipped: 0,
  needsYou: 0,
  replied: 2,
  resolved: 0,
  at: '2026-10-28T12:00:00.000Z',
  ...patch,
});

const at = (id: string) => ({ attemptId: id, next: false });

describe("a contribution's sessions", () => {
  it('lists the first attempt alone before its pull request, as it stands', () => {
    const [card, ...rest] = sessionsOf(attempts.review, at('A_1'));
    expect(rest).toEqual([]);
    expect(card).toMatchObject({
      title: 'First attempt',
      pill: { label: 'Ready for your review' },
      meta: 'Oct 28, 09:12 UTC · $2.36',
      note: '3 files changed',
      current: true,
      href: '/contribute/attempts/A_1',
    });
  });

  it('names the pull request on the first attempt once there is one, a state not known yet too', () => {
    expect(sessionsOf(attempts.merged, at('A_1'))[0].pill).toEqual({ label: 'PR #1419 merged', tone: 'violet' });
    const draft = { ...attempts.prOpen, pullRequest: { ...attempts.prOpen.pullRequest!, state: 'DRAFT' as never } };
    expect(sessionsOf(draft, at('A_1'))[0].pill).toEqual({ label: 'PR #1419', tone: 'neutral' });
  });

  it('lines the rounds up after it, then the next one while one may start', () => {
    const first = {
      ...followUpAttempts.prNeedsYou,
      followUps: followUps({
        used: 2,
        left: 1,
        max: 3,
        history: [round(), round({ round: 2, attemptId: 'A_F2', state: 'DISCARDED', pushedSha: null, fixed: 0 })],
      }),
    };
    const cards = sessionsOf(first, at('A_F2'));
    expect(cards.map(({ key }) => key)).toEqual(['A_1', 'A_F1', 'A_F2', 'next']);
    expect(cards[1]).toMatchObject({ title: 'Round 1 · follow-up', pill: { label: 'Pushed 46de700' } });
    expect(cards[1].note).toBe('5 fixed · 2 replied');
    expect(cards[2]).toMatchObject({ pill: { label: 'Discarded' }, current: true });
    expect(cards[3]).toMatchObject({
      title: 'Round 3 · follow-up',
      meta: 'The last round',
      href: '/contribute/attempts/A_1?session=next',
      draft: true,
      current: false,
    });
    expect(sessionsOf(first, { attemptId: 'A_1', next: true }).at(-1)?.current).toBe(true);
  });

  it('adds a round the history does not list yet: the one shown, and the one under way', () => {
    const first = {
      ...followUpAttempts.prNeedsYou,
      followUps: followUps({ used: 1, left: 1, currentAttemptId: 'A_F1' }),
    };
    expect(sessionsOf(first, at('A_1')).map(({ key, pill }) => [key, pill?.label])).toEqual([
      ['A_1', 'PR #1419 open'],
      ['A_F1', 'Working'],
    ]);
    const shown = sessionsOf(first, at('A_F1'), followUpAttempts.review);
    expect(shown.map(({ key }) => key)).toEqual(['A_1', 'A_F1']);
    expect(shown[1]).toMatchObject({ pill: { label: 'Ready for you' }, current: true });
  });

  it('numbers a round added without the history as the latest, and words a state it does not know', () => {
    const first = {
      ...followUpAttempts.prNeedsYou,
      followUps: followUps({ used: 3, left: 0, max: 3, currentAttemptId: 'A_F3' }),
    };
    expect(sessionsOf(first, at('A_F3'))[1].title).toBe('Round 3 · follow-up');
    const odd = { ...first, followUps: followUps({ history: [round({ state: 'SHELVED' as never })] }) };
    expect(sessionsOf(odd, at('A_1'))[1].pill).toEqual({ label: 'Shelved', tone: 'neutral' });
  });

  it('says every round is used once none is left', () => {
    const cards = sessionsOf(followUpAttempts.handedOff, at('A_1'));
    expect(cards.at(-1)).toMatchObject({ key: 'handed-off', href: null, title: 'No rounds left' });
    expect(nextRoundOpen(followUpAttempts.handedOff)).toBe(false);
  });

  it('counts only the threads that wait, on an open pull request', () => {
    const thread = { threadId: 'T', commentId: 'C', author: 'bot', bot: true, path: null, line: null, excerpt: 'x' };
    const feedback = {
      readAt: null,
      threads: [
        { ...thread, url: null, createdAt: null, ignored: false },
        { ...thread, commentId: 'C2', url: null, createdAt: null, ignored: true },
      ],
    };
    expect(waitingThreadsOf({ ...followUpAttempts.prNeedsYou, reviewFeedback: feedback })).toHaveLength(1);
    expect(waitingThreadsOf({ ...attempts.merged, reviewFeedback: feedback })).toHaveLength(0);
  });
});
