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
            { kind: 'FIXED', count: 1 },
            { kind: 'OLD', count: 1 },
          ],
        }),
      ),
    ).toBe(
      '14 open issues, none pass our checks: 9 too short or unclear, 3 no maintainer go-ahead, 1 already fixed or has a PR, 1 other',
    );
  });

  it('says when some are still being sorted, and when all are', () => {
    expect(setRepoEmptyLineOf(active({ open: 3, waiting: 1, skipped: [{ kind: 'FIXED', count: 2 }] }))).toBe(
      '3 open issues, none ready yet: 2 already fixed or have a PR, 1 still being sorted',
    );
    expect(setRepoEmptyLineOf(active({ open: 2, waiting: 2, skipped: [] }))).toBe('2 open issues, still being sorted');
  });

  it('reads one issue and none plainly', () => {
    expect(setRepoEmptyLineOf(active({ open: 1, waiting: 0, skipped: [{ kind: 'TAKEN', count: 1 }] }))).toBe(
      "1 open issue, it doesn't pass our checks: 1 taken by someone",
    );
    expect(setRepoEmptyLineOf(active({ open: 0, waiting: 0, skipped: [] }))).toBe('No open issues right now');
  });

  it('sums unknown kinds and uncounted issues as other, so the parts add up to the open count', () => {
    const unknown = { kind: 'SOMETHING_NEW' as never, count: 4 };
    expect(setRepoEmptyLineOf(active({ open: 6, waiting: 0, skipped: [unknown, { kind: 'OLD', count: 2 }] }))).toBe(
      '6 open issues, none pass our checks: 2 too old or quiet, 4 other',
    );
    expect(setRepoEmptyLineOf(active({ open: 5, waiting: 0, skipped: [{ kind: 'FIXED', count: 2 }] }))).toBe(
      '5 open issues, none pass our checks: 2 already fixed or have a PR, 3 other',
    );
    expect(setRepoEmptyLineOf(active({ open: 5, waiting: 2, skipped: [] }))).toBe(
      '5 open issues, none ready yet: 3 other, 2 still being sorted',
    );
    expect(setRepoEmptyLineOf(active({ open: 5, waiting: 0, skipped: [] }))).toBe(
      '5 open issues, none pass our checks',
    );
  });

  it('names a duplicate apart from a fix', () => {
    expect(setRepoEmptyLineOf(active({ open: 2, waiting: 0, skipped: [{ kind: 'DUPLICATE', count: 2 }] }))).toBe(
      '2 open issues, none pass our checks: 2 marked duplicate',
    );
  });

  it('names repo-rule declines with the maintainers', () => {
    expect(setRepoEmptyLineOf(active({ open: 2, waiting: 0, skipped: [{ kind: 'DECLINED', count: 2 }] }))).toBe(
      "2 open issues, none pass our checks: 2 declined by maintainers or the repo's rules",
    );
  });

  it('says nothing without the API’s answer or for a repo that is not active', () => {
    expect(setRepoEmptyLineOf(active(null))).toBeNull();
    expect(setRepoEmptyLineOf({ status: 'ACTIVE' })).toBeNull();
    expect(setRepoEmptyLineOf({ status: 'FAILED', issues: { open: 1, waiting: 0, skipped: [] } })).toBeNull();
  });
});
