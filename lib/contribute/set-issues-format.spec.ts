import { describe, expect, it } from 'vitest';

import type { ContributeSetRepoIssues } from './contribute.types';
import { setRepoEmptyLineOf } from './set-issues-format';

const active = (issues: ContributeSetRepoIssues | null) => ({ status: 'ACTIVE' as const, issues });

describe('setRepoEmptyLineOf', () => {
  it('says why an active repo gives no issues, the three biggest kinds first', () => {
    expect(
      setRepoEmptyLineOf(
        active({
          open: 14,
          waiting: 0,
          skipped: [
            { kind: 'UNCLEAR', count: 9 },
            { kind: 'NO_GO_AHEAD', count: 3 },
            { kind: 'HAS_PR', count: 1 },
            { kind: 'OLD', count: 1 },
          ],
        }),
      ),
    ).toBe(
      '14 open issues, none pass our checks: 9 too short or unclear, 3 no maintainer go-ahead, 1 already has a PR, 1 other',
    );
  });

  it('says when some are still being sorted, and when all are', () => {
    expect(setRepoEmptyLineOf(active({ open: 3, waiting: 1, skipped: [{ kind: 'HAS_PR', count: 2 }] }))).toBe(
      '3 open issues, none ready yet: 2 already have a PR, 1 still being sorted',
    );
    expect(setRepoEmptyLineOf(active({ open: 2, waiting: 2, skipped: [] }))).toBe('2 open issues, still being sorted');
  });

  it('reads one issue and none plainly', () => {
    expect(setRepoEmptyLineOf(active({ open: 1, waiting: 0, skipped: [{ kind: 'TAKEN', count: 1 }] }))).toBe(
      "1 open issue, it doesn't pass our checks: 1 taken by someone",
    );
    expect(setRepoEmptyLineOf(active({ open: 0, waiting: 0, skipped: [] }))).toBe('No open issues right now');
  });

  it('says nothing without the API’s answer or for a repo that is not active', () => {
    expect(setRepoEmptyLineOf(active(null))).toBeNull();
    expect(setRepoEmptyLineOf({ status: 'ACTIVE' })).toBeNull();
    expect(setRepoEmptyLineOf({ status: 'FAILED', issues: { open: 1, waiting: 0, skipped: [] } })).toBeNull();
  });
});
