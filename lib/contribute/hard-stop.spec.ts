import { describe, expect, it } from 'vitest';

import { detail } from './__fixtures__/contribute-attempts';
import { prNotes } from './__fixtures__/maintainers';
import type { ContributeAttemptDetail } from './contribute.types';
import { type ActionId, hardStopOf } from './hard-stop';

const ALL: ActionId[] = [
  'start_run',
  'push',
  'discard_run',
  'post_reply',
  'sign_off',
  'retitle',
  'edit_description',
  'fix_changelog',
  'fix_link',
  'post_proof',
  'retry_proof',
  'proof_reply',
  'proof_fix',
  'retry',
  'resolve_threads',
];

const STOPPED = prNotes({ stopped: { login: 'sam-w', at: '2026-10-28T11:04:00.000Z' } });

/** A first attempt whose pull request has a `REPO_OUT` signal with `detail`, or no signal at all. */
const firstWith = (detail_?: string | null): ContributeAttemptDetail =>
  detail({
    state: 'PR_OPEN',
    needsYou:
      detail_ === undefined
        ? null
        : {
            since: '2026-10-28T09:00:00.000Z',
            signals: [{ kind: 'REPO_OUT', at: '2026-10-28T09:00:00.000Z', detail: detail_ }],
          },
  });

describe('hardStopOf', () => {
  it('stops every control once a maintainer stopped GitRanks work on the PR', () => {
    const stop = hardStopOf({ first: firstWith(), prNotes: STOPPED });

    expect(stop?.kind).toBe('maintainer_stopped');
    expect([...(stop?.blocked ?? [])].sort()).toEqual([...ALL].sort());
  });

  it('stops only a new run where the repo said no to AI-made PRs, or asked us to stay away', () => {
    for (const reason of ['closed_no_ai', 'hostile_close']) {
      const stop = hardStopOf({ first: firstWith(reason), prNotes: prNotes() });
      expect(stop?.kind).toBe('repo_said_no');
      expect([...(stop?.blocked ?? [])]).toEqual(['start_run']);
    }
  });

  it('is no stop for a repo out for unanswered PRs, an out with no reason, or no signal', () => {
    expect(hardStopOf({ first: firstWith('pr_misses'), prNotes: prNotes() })).toBeNull();
    expect(hardStopOf({ first: firstWith(null), prNotes: prNotes() })).toBeNull();
    expect(hardStopOf({ first: firstWith(), prNotes: prNotes() })).toBeNull();
  });

  it("lets the maintainer's stop win over the repo's no", () => {
    expect(hardStopOf({ first: firstWith('closed_no_ai'), prNotes: STOPPED })?.kind).toBe('maintainer_stopped');
  });

  it("leaves it to the maintainers' say when the first attempt is not known", () => {
    expect(hardStopOf({ prNotes: STOPPED })?.kind).toBe('maintainer_stopped');
    expect(hardStopOf({ prNotes: prNotes() })).toBeNull();
    expect(hardStopOf({})).toBeNull();
  });

  it('is no stop without the maintainers’ say and without signals', () => {
    expect(hardStopOf({ first: detail({ needsYou: undefined }) })).toBeNull();
  });
});
