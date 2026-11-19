import { describe, expect, it, vi } from 'vitest';

import type { IssueStart } from './issue-start';
import { hostedStartOutcomeOf } from './start-action';

const REF = { repo: 'acme/widgets', issue: 42 };
const answer = (patch: Partial<IssueStart>): IssueStart => ({
  attempt: null,
  started: false,
  refusal: null,
  value: null,
  holder: null,
  until: null,
  ...patch,
});

describe("a row's hosted Start", () => {
  it("opens the run's pull request page, started now or already under way, as the answer names it", async () => {
    const readAttempt = vi.fn();
    const run = { id: 'A_1', repo: 'Acme/Widgets', number: 42, state: 'CLAIMING' as const };
    for (const started of [true, false]) {
      expect(
        await hostedStartOutcomeOf({ ok: true, data: answer({ started, attempt: run }) }, REF, readAttempt),
      ).toEqual({
        kind: 'open',
        href: '/my/pull-requests/Acme/Widgets/42',
      });
    }
    expect(readAttempt).not.toHaveBeenCalled();
  });

  it('words a refusal, and reads nothing more', async () => {
    const readAttempt = vi.fn();
    const outcome = await hostedStartOutcomeOf({ ok: true, data: answer({ refusal: 'TAKEN' }) }, REF, readAttempt);
    expect(outcome).toMatchObject({ kind: 'refused', refusal: { code: 'TAKEN', row: 'folds' } });
    expect(readAttempt).not.toHaveBeenCalled();
  });

  it('after a timeout or a failed call, reads the attempt once and opens a run it finds', async () => {
    const readAttempt = vi.fn(async () => ({ ok: true as const, data: { id: 'A_9' } }));
    expect(await hostedStartOutcomeOf({ ok: false, error: 'FAILED' }, REF, readAttempt)).toEqual({
      kind: 'open',
      href: '/my/pull-requests/acme/widgets/42',
    });
    expect(await hostedStartOutcomeOf(null, REF, readAttempt)).toMatchObject({ kind: 'open' });
    expect(readAttempt).toHaveBeenCalledTimes(2);
  });

  it('says something went wrong only when no run is found, or the read fails too', async () => {
    for (const read of [
      async () => ({ ok: true as const, data: null }),
      async () => ({ ok: false as const, error: 'FAILED' as const }),
      async () => {
        throw new Error('offline');
      },
    ]) {
      expect(await hostedStartOutcomeOf({ ok: false, error: 'FAILED' }, REF, read)).toMatchObject({
        kind: 'refused',
        refusal: { code: 'FAILED', text: 'Something went wrong. Try again in a minute.', action: { retry: true } },
      });
    }
  });
});
