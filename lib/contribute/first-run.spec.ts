import { describe, expect, it } from 'vitest';

import { firstSpend, key, NOW, views } from './__fixtures__/contribute-views';
import type { ContributeIssuePage, ContributeView } from './contribute.types';
import type { ContributeNotice } from './contribute-state';
import { firstRunNoticesOf, firstRunStepOf, isFirstRun } from './first-run';

const ISSUE = {
  issueId: 'I_1',
  repositoryId: 'R_1',
  nameWithOwner: 'fern-lang/fern',
  number: 2481,
  url: 'https://github.com/fern-lang/fern/issues/2481',
  title: 'Formatter drops a trailing comment',
  labels: [],
  language: 'RUST' as const,
  kind: 'BUG' as const,
  size: 'S' as const,
  score: 0.9,
  rank: 1,
  why: 'you write Rust',
};
const page: ContributeIssuePage = { items: [ISSUE], next: null, total: 1, computedAt: '2026-10-28T11:59:00.000Z' };

const base = views.firstKey;
const withContributor = (patch: Partial<NonNullable<ContributeView['contributor']>>, view: ContributeView = base) => ({
  ...view,
  contributor: { ...base.contributor, ...patch },
});
const kind = (view: ContributeView, feed: ContributeIssuePage | null | undefined = page) =>
  firstRunStepOf(view, feed, NOW).kind;

describe('isFirstRun', () => {
  it('is an onboarded contributor with a key and no attempt yet', () => {
    expect(isFirstRun(base, [])).toBe(true);
    expect(isFirstRun(base, [{ attemptId: 'A_1' } as never])).toBe(false);
    // The attempts not answered say nothing.
    expect(isFirstRun(base, undefined)).toBe(false);
    // Their own agent's first run is its own screen.
    expect(isFirstRun(views.agentOnboarded, [])).toBe(false);
    expect(isFirstRun(views.noKey, [])).toBe(false);
  });
});

describe('firstRunStepOf', () => {
  it('takes the first state that holds, in order', () => {
    expect(kind({ ...base, attemptsOpen: false, paused: true })).toBe('closed');
    expect(kind({ ...withContributor({ status: 'PAUSED' }), paused: true })).toBe('paused');
    expect(kind(withContributor({ credentials: [key({ state: 'INVALID' })] }))).toBe('key-invalid');
    expect(
      kind(withContributor({ credentials: [key({ state: 'EXHAUSTED', blockedUntil: '2026-11-14T00:00:00.000Z' })] })),
    ).toBe('key-waiting');
    expect(kind(withContributor({ spend: { ...firstSpend, nextAttemptAt: null } }))).toBe('no-room');
    expect(kind(withContributor({ spend: { ...firstSpend, nextAttemptAt: '2026-10-30T09:00:00.000Z' } }))).toBe(
      'paced',
    );
    expect(kind(base, { ...page, items: [], total: 0 })).toBe('no-issues');
    expect(kind(base, null)).toBe('no-issues');
    expect(kind(base)).toBe('soon');
  });

  it('carries the day a waiting key spends again, and the time a paced one starts', () => {
    expect(
      firstRunStepOf(
        withContributor({ credentials: [key({ state: 'LIMIT_REACHED', blockedUntil: '2026-11-01T00:00:00.000Z' })] }),
        page,
        NOW,
      ),
    ).toEqual({ kind: 'key-waiting', reason: 'LIMIT_REACHED', until: '2026-11-01T00:00:00.000Z' });
    expect(
      firstRunStepOf(
        withContributor({ spend: { ...firstSpend, nextAttemptAt: '2026-10-30T09:00:00.000Z' } }),
        page,
        NOW,
      ),
    ).toEqual({ kind: 'paced', at: '2026-10-30T09:00:00.000Z' });
  });

  it('does not call the feed empty while the API does not answer it, nor attempts closed while it does not say', () => {
    expect(kind(base, undefined)).toBe('soon');
    expect(kind({ ...base, attemptsOpen: undefined })).toBe('soon');
  });
});

describe('firstRunNoticesOf', () => {
  const all: ContributeNotice[] = [{ kind: 'exhausted', until: null }, { kind: 'paused' }];
  const kinds = (notices: ContributeNotice[], step: Parameters<typeof firstRunNoticesOf>[1]) =>
    firstRunNoticesOf(notices, step).map(({ kind }) => kind);

  it('leaves out only the notice step 1 restates', () => {
    expect(kinds(all, { kind: 'paused' })).toEqual(['exhausted']);
    expect(kinds(all, { kind: 'key-waiting', reason: 'EXHAUSTED', until: null })).toEqual(['paused']);
    expect(
      kinds([{ kind: 'limit-reached', until: null }], { kind: 'key-waiting', reason: 'LIMIT_REACHED', until: null }),
    ).toEqual([]);
    expect(kinds([{ kind: 'key-invalid' }, { kind: 'paused' }], { kind: 'key-invalid' })).toEqual(['paused']);
  });

  it('keeps every block while step 1 says something else, attempts closed among them', () => {
    expect(kinds(all, { kind: 'closed' })).toEqual(['exhausted', 'paused']);
    expect(kinds(all, { kind: 'soon' })).toEqual(['exhausted', 'paused']);
  });
});
