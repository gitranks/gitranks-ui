import { describe, expect, it } from 'vitest';

import { attempts, followUpAttempts, followUps } from './__fixtures__/contribute-attempts';
import type { ContributeFollowUpRound } from './contribute.types';
import {
  nextRoundOpen,
  nextRoundRecommended,
  nextRunNumberOf,
  runsLabelOf,
  sessionsOf,
  waitingThreadsOf,
} from './sessions';

const round = (patch: Partial<ContributeFollowUpRound> = {}): ContributeFollowUpRound => ({
  round: 1,
  attemptId: 'A_F1',
  by: 'user',
  trigger: 'recommended',
  reason: null,
  costUsd: 0.31,
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

describe("a contribution's sessions", () => {
  it('lists the first attempt alone before its pull request, as it stands', () => {
    const [card, ...rest] = sessionsOf(attempts.review);
    expect(rest).toEqual([]);
    expect(card).toMatchObject({
      title: 'First attempt',
      pill: { label: 'Ready for your review' },
      meta: 'Oct 28, 09:12 UTC · $2.36',
      note: '3 files changed',
      href: '/contribute/attempts/A_1',
    });
  });

  it('names the pull request on the first attempt once there is one, a state not known yet too', () => {
    expect(sessionsOf(attempts.merged)[0].pill).toEqual({ label: 'PR #1419 merged', tone: 'violet' });
    const draft = { ...attempts.prOpen, pullRequest: { ...attempts.prOpen.pullRequest!, state: 'DRAFT' as never } };
    expect(sessionsOf(draft)[0].pill).toEqual({ label: 'PR #1419', tone: 'neutral' });
  });

  it('lines the runs up after it, who started each and its cost, then the next one, recommended or not', () => {
    const first = {
      ...followUpAttempts.prNeedsYou,
      followUps: followUps({
        used: 2,
        recommended: true,
        history: [
          round({ by: 'autopilot', trigger: 'autopilot' }),
          round({ round: 2, attemptId: 'A_F2', state: 'DISCARDED', pushedSha: null, fixed: 0, costUsd: 0.12 }),
        ],
      }),
    };
    const cards = sessionsOf(first);
    expect(cards.map(({ key }) => key)).toEqual(['A_1', 'A_F1', 'A_F2', 'next']);
    expect(cards[1]).toMatchObject({ title: 'Run 1 · autopilot', pill: { label: 'Pushed 46de700' } });
    expect(cards[1].meta).toBe('Oct 28, 12:00 UTC · $0.31');
    expect(cards[1].note).toBe('5 fixed · 2 replied');
    expect(cards[2]).toMatchObject({ title: 'Run 2 · you', pill: { label: 'Discarded' } });
    expect(cards[2].href).toBe('/contribute/attempts/A_1/runs/A_F2');
    expect(cards[3]).toMatchObject({
      title: 'Run 3 · follow-up',
      pill: { label: 'Recommended', tone: 'violet' },
      meta: 'Not started',
      href: '/contribute/attempts/A_1?session=next',
      draft: true,
    });
    expect(runsLabelOf(first)).toBe('2 runs · $0.43');
  });

  it('offers a run on a pull request with nothing waiting too: the user’s call, any number of times', () => {
    const quiet = followUpAttempts.quiet;
    expect(nextRoundOpen(quiet)).toBe(true);
    expect(nextRoundRecommended(quiet)).toBe(false);
    expect(sessionsOf(quiet).at(-1)).toMatchObject({
      title: 'Run 3 · follow-up',
      pill: { label: 'Not started', tone: 'neutral' },
      meta: 'Your call',
    });
    // Only the user's moves wait (a bot's block, the repo's rules): the next is theirs.
    const blocked = {
      ...quiet,
      needsYou: {
        since: '',
        signals: [{ kind: 'BOT_BLOCKED' as const, at: '2026-10-28T11:00:00.000Z', detail: null }],
      },
    };
    expect(sessionsOf(blocked).at(-1)).toMatchObject({
      pill: { label: 'Your move', tone: 'amber' },
      meta: 'Waits for you',
    });
    const rules = { ...quiet, prIssues: [{ kind: 'TITLE' as const, check: null, message: '', suggestion: null }] };
    expect(sessionsOf(rules).at(-1)?.pill?.label).toBe('Your move');
    // Never on a pull request opened by hand: its branch is not one a run can add to.
    expect(nextRoundOpen({ ...quiet, openedBy: 'HAND' })).toBe(false);
    // One at a time.
    expect(nextRoundOpen({ ...quiet, followUps: followUps({ used: 2, currentAttemptId: 'A_F3' }) })).toBe(false);
  });

  it('adds a round the history does not list yet: the one read beside it, and the one under way', () => {
    const first = {
      ...followUpAttempts.prNeedsYou,
      followUps: followUps({ used: 1, currentAttemptId: 'A_F1' }),
    };
    expect(sessionsOf(first).map(({ key, pill }) => [key, pill?.label])).toEqual([
      ['A_1', 'PR #1419 open'],
      ['A_F1', 'Working'],
    ]);
    const shown = sessionsOf(first, followUpAttempts.review);
    expect(shown.map(({ key }) => key)).toEqual(['A_1', 'A_F1']);
    expect(shown[1]).toMatchObject({ pill: { label: 'Ready for you' }, href: '/contribute/attempts/A_1/runs/A_F1' });
  });

  it('numbers a run added without the history as the latest, and words a state it does not know', () => {
    const first = {
      ...followUpAttempts.prNeedsYou,
      followUps: followUps({ used: 3, currentAttemptId: 'A_F3' }),
    };
    expect(sessionsOf(first)[1].title).toBe('Run 3 · follow-up');
    // The run read on its own names who started it.
    const byAutopilot = { ...followUpAttempts.review, attemptId: 'A_F3', autopilot: true };
    expect(sessionsOf(first, byAutopilot)[1].title).toBe('Run 3 · autopilot');
    expect(nextRunNumberOf(followUpAttempts.quiet)).toBe(3);
    const odd = { ...first, followUps: followUps({ history: [round({ state: 'SHELVED' as never })] }) };
    expect(sessionsOf(odd)[1].pill).toEqual({ label: 'Shelved', tone: 'neutral' });
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
