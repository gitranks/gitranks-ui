import { describe, expect, it } from 'vitest';

import { followUpAttempts } from './__fixtures__/contribute-attempts';
import type { CommentView } from './comment-actions';
import type { Move } from './contribution-moves';
import type { ActionId } from './hard-stop';
import {
  CONNECTION_FAILED,
  errorPlaceOf,
  mayStartOf,
  mergeMove,
  pickOf,
  runBatch,
  runLong,
  startArgsOf,
} from './session-head-logic';

const move = (card: Move['card'], kinds: Move['kinds']): Move =>
  ({ card, kinds, session: 'next', tone: 'amber', kindLine: '', title: card, chip: 'Next step', actions: [] }) as never;

const threads = (scope: { commentIds?: string[] }): CommentView['threads'] => ({
  choice: {},
  saving: new Set(),
  chosen: scope.commentIds ?? [],
  scope,
});

describe('the session head’s logic', () => {
  it('picks the held card a move names, any kind of a shared card, else the first', () => {
    const held = [move('rules', ['title', 'fix-failed']), move('dco', ['dco'])];
    expect(pickOf(held, 'dco').card).toBe('dco');
    expect(pickOf(held, 'fix-failed').card).toBe('rules');
    expect(pickOf(held, 'proof').card).toBe('rules');
    expect(pickOf(held, null).card).toBe('rules');
  });

  it('merges the move into the address, keeping the session and the grant’s resume', () => {
    expect(mergeMove('?session=next&resume=n1', 'dco')).toBe('?session=next&resume=n1&move=dco');
    expect(mergeMove('?session=next&move=title', 'dco')).toBe('?session=next&move=dco');
    expect(mergeMove('', 'review')).toBe('?move=review');
  });

  it('sends the chosen comments from the next-run card only', () => {
    expect(startArgsOf('next-run', threads({ commentIds: ['C_1', 'C_2'] }))).toEqual({ commentIds: ['C_1', 'C_2'] });
    // Every thread ignored, a changes signal: the run starts on the other signals.
    expect(startArgsOf('next-run', threads({}))).toEqual({});
    expect(startArgsOf('next-run', null)).toEqual({});
    expect(startArgsOf('try-run', threads({ commentIds: ['C_1'] }))).toEqual({});
    expect(startArgsOf('anyway', threads({ commentIds: ['C_1'] }))).toEqual({});
  });

  it('words a long action’s failure: none when through, a refusal in our words, a throw as the connection', async () => {
    expect(await runLong(async () => ({ ok: true, data: null }))).toBeNull();
    expect(await runLong(async () => ({ ok: false, error: 'NOT_FOUND' }))).toMatch(/gone|no longer/i);
    expect(
      await runLong(async () => ({ ok: false, error: 'INVALID', message: 'Give the pull request a title.' })),
    ).toBe('Give the pull request a title.');
    expect(
      await runLong(async () => {
        throw new Error('network');
      }),
    ).toBe(CONNECTION_FAILED);
  });

  it('places the submit’s error in its open dialog, the push’s in its confirm, the rest in the card', () => {
    expect(errorPlaceOf('submit', { dialogOpen: true })).toBe('dialog');
    expect(errorPlaceOf('submit', { dialogOpen: false })).toBe('card');
    expect(errorPlaceOf('push', { dialogOpen: false })).toBe('dialog');
    expect(errorPlaceOf('start', { dialogOpen: true })).toBe('card');
    expect(errorPlaceOf('discard-attempt', { dialogOpen: false })).toBe('card');
  });

  it('runs one action over several replies in turn, and says a partial failure', async () => {
    const all = await runBatch(['a', 'b'], async () => ({ ok: true, data: null }), 'Posted');
    expect(all).toEqual({ done: 2, failed: [], line: null });
    const ids = ['1', '2', '3', '4', '5', '6', '7'];
    const some = await runBatch(
      ids,
      async (id) => {
        if (id === '6') throw new Error('network');
        return id === '7' ? { ok: false, error: 'FAILED' } : { ok: true, data: null };
      },
      'Dismissed',
    );
    expect(some).toEqual({ done: 5, failed: ['6', '7'], line: 'Dismissed 5 of 7. Try again for the rest.' });
  });

  it('lets a run start only on an open PR of ours, none under way, and no stop on starts', () => {
    const quiet = followUpAttempts.quiet;
    expect(mayStartOf(quiet, new Set())).toBe(true);
    expect(mayStartOf(quiet, new Set<ActionId>(['start_run']))).toBe(false);
    expect(mayStartOf({ ...quiet, openedBy: 'HAND' }, new Set())).toBe(false);
    expect(mayStartOf(followUpAttempts.underWay, new Set())).toBe(false);
    expect(mayStartOf(undefined, new Set())).toBe(false);
  });
});
