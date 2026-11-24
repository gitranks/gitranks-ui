import { describe, expect, it } from 'vitest';

import type { Move } from './contribution-moves';
import type { ActionId } from './hard-stop';
import { CONNECTION_FAILED, CONNECTION_FAILED_OF, mayStartOf, pickOf, runLong } from './session-head-logic';
import { followUpAttempts } from '@/lib/contribute/__fixtures__/contribute-attempts';

const move = (card: Move['card'], kinds: Move['kinds']): Move =>
  ({ card, kinds, session: 'next', tone: 'amber', kindLine: '', title: card, chip: 'Next step', actions: [] }) as never;

describe('the session head’s logic', () => {
  it('picks the held card a move names, any kind of a shared card, else the first', () => {
    const held = [move('rules', ['title', 'fix-failed']), move('dco', ['dco'])];
    expect(pickOf(held, 'dco').card).toBe('dco');
    expect(pickOf(held, 'fix-failed').card).toBe('rules');
    expect(pickOf(held, 'proof').card).toBe('rules');
    expect(pickOf(held, null).card).toBe('rules');
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

  it('says a lost connection in each long action’s own words', async () => {
    const lost = (source: keyof typeof CONNECTION_FAILED_OF) =>
      runLong(async () => {
        throw new Error('network');
      }, CONNECTION_FAILED_OF[source]);
    expect(await lost('submit')).toBe(CONNECTION_FAILED);
    expect(await lost('push')).toBe(
      'The push could not be sent: the connection failed. Nothing was pushed or posted. Try again.',
    );
    expect(await lost('discard-run')).toBe('The run could not be discarded: the connection failed. Try again.');
    expect(await lost('discard-attempt')).toBe('It could not be discarded: the connection failed. Try again.');
    expect(await lost('send-back')).toMatch(/^It could not be sent back: the connection failed\./);
    expect(new Set(Object.values(CONNECTION_FAILED_OF)).size).toBe(Object.keys(CONNECTION_FAILED_OF).length);
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
