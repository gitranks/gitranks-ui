import { describe, expect, it } from 'vitest';

import type { OrgPulseContributorRow } from './org-pulse.utils';
import {
  type ContributorsPage,
  type ContributorsTableState,
  canShowMore,
  currentLabels,
  DEFAULT_QUERY,
  initialTableState,
  contributorsTableReducer as reduce,
  tableStatus,
} from './org-pulse-contributors-table.state';
import { OrgPulseContributorSort, OrgPulsePeriod } from '@/types/generated/graphql';

const row = (i: number): OrgPulseContributorRow => ({
  githubId: String(i),
  login: `dev-${i}`,
  hasProfile: true,
  avatarUrl: `https://avatars.githubusercontent.com/u/${i}`,
  linesAdded: 1000 - i,
  linesDeleted: 0,
  commits: 1,
  pullRequests: 0,
  activeMonths: 1,
  topLabels: [],
});
const rows = (from: number, count: number) => Array.from({ length: count }, (_, i) => row(from + i));
const page = (items: OrgPulseContributorRow[], total = 100, labels = ['Rust']): ContributorsPage => ({
  total,
  unlinkedAuthors: 3,
  labels,
  items,
});

/** The server rows: the facts' top 10. */
const server = initialTableState(rows(0, 10), 7);

const pendingId = (state: ContributorsTableState) => state.pending?.id ?? -1;

describe('contributorsTableReducer', () => {
  it('starts from the server rows with nothing loading', () => {
    expect(server).toMatchObject({ visible: 10, live: false, pending: null, total: null });
    expect(tableStatus(server)).toBe('idle');
    expect(canShowMore(server)).toBe(true);
  });

  it('offers no more rows when the server rows are fewer than the facts hold', () => {
    expect(canShowMore(initialTableState(rows(0, 4), 0))).toBe(false);
  });

  it('loads the first "Show more" from the top, 35 rows, and replaces the cached rows', () => {
    const asked = reduce(server, { type: 'showMore' });

    expect(asked.pending).toMatchObject({ offset: 0, first: 35, replace: true, query: DEFAULT_QUERY });
    expect(asked.visible).toBe(35);

    const loaded = reduce(asked, { type: 'loaded', id: pendingId(asked), page: page(rows(100, 35)) });
    expect(loaded.items.map((r) => r.login)).toEqual(rows(100, 35).map((r) => r.login));
    expect(loaded).toMatchObject({ live: true, total: 100, unlinkedAuthors: 3, pending: null });
    expect(currentLabels(loaded)).toEqual(['Rust']);
  });

  it('appends the next page once the rows are live', () => {
    const first = reduce(server, { type: 'showMore' });
    const loaded = reduce(first, { type: 'loaded', id: pendingId(first), page: page(rows(0, 35)) });
    const next = reduce(loaded, { type: 'showMore' });

    expect(next.pending).toMatchObject({ offset: 35, first: 25, replace: false });

    const appended = reduce(next, { type: 'loaded', id: pendingId(next), page: page(rows(35, 25)) });
    expect(appended.items).toHaveLength(60);
    expect(appended.visible).toBe(60);
  });

  it('drops rows a live page repeats', () => {
    const first = reduce(server, { type: 'showMore' });
    const loaded = reduce(first, { type: 'loaded', id: pendingId(first), page: page(rows(0, 35)) });
    const next = reduce(loaded, { type: 'showMore' });
    const appended = reduce(next, { type: 'loaded', id: pendingId(next), page: page(rows(30, 25)) });

    expect(appended.items).toHaveLength(55);
    expect(new Set(appended.items.map((r) => r.githubId)).size).toBe(55);
  });

  it('shows already-loaded rows without a request', () => {
    const first = reduce(server, { type: 'showMore' });
    const loaded = reduce(first, { type: 'loaded', id: pendingId(first), page: page(rows(0, 35), 35) });
    const shorter = { ...loaded, visible: 10 };
    const more = reduce(shorter, { type: 'showMore' });

    expect(more.pending).toBeNull();
    expect(more.visible).toBe(35);
    expect(canShowMore(more)).toBe(false);
  });

  it('handles "Show more" before the first page returns: asks again for all rows, the first answer is ignored', () => {
    const first = reduce(server, { type: 'showMore' });
    const second = reduce(first, { type: 'showMore' });

    expect(second.pending).toMatchObject({ offset: 0, first: 60, replace: true });
    expect(second.visible).toBe(60);

    const stale = reduce(second, { type: 'loaded', id: pendingId(first), page: page(rows(0, 35)) });
    expect(stale).toBe(second);

    const loaded = reduce(second, { type: 'loaded', id: pendingId(second), page: page(rows(0, 60)) });
    expect(loaded.items).toHaveLength(60);
  });

  it('ignores a response for an old query that arrives last', () => {
    const byCommits = reduce(server, {
      type: 'query',
      query: { ...DEFAULT_QUERY, sortBy: OrgPulseContributorSort.Commits },
    });
    const byPrs = reduce(byCommits, {
      type: 'query',
      query: { ...DEFAULT_QUERY, sortBy: OrgPulseContributorSort.PullRequests },
    });
    const prsRows = rows(500, 25);
    const loaded = reduce(byPrs, { type: 'loaded', id: pendingId(byPrs), page: page(prsRows) });
    const late = reduce(loaded, { type: 'loaded', id: pendingId(byCommits), page: page(rows(900, 25)) });

    expect(late).toBe(loaded);
    expect(late.items).toEqual(prsRows);
    expect(late.query.sortBy).toBe(OrgPulseContributorSort.PullRequests);
  });

  it('ignores a failure of a superseded request', () => {
    const byCommits = reduce(server, {
      type: 'query',
      query: { ...DEFAULT_QUERY, sortBy: OrgPulseContributorSort.Commits },
    });
    const byPrs = reduce(byCommits, {
      type: 'query',
      query: { ...DEFAULT_QUERY, sortBy: OrgPulseContributorSort.PullRequests },
    });

    expect(reduce(byPrs, { type: 'failed', id: pendingId(byCommits) })).toBe(byPrs);
  });

  it('keeps the rows on a failed page and retries the same request', () => {
    const asked = reduce(server, { type: 'showMore' });
    const failed = reduce(asked, { type: 'failed', id: pendingId(asked) });

    expect(tableStatus(failed)).toBe('error');
    expect(failed.items).toBe(server.items);

    const retried = reduce(failed, { type: 'retry' });
    expect(retried.pending).toMatchObject({ offset: 0, first: 35, replace: true });
    expect(pendingId(retried)).toBeGreaterThan(pendingId(asked));
    expect(tableStatus(retried)).toBe('loading');
  });

  it('dims the table for a query and resets the rows shown', () => {
    const asked = reduce(server, { type: 'query', query: { ...DEFAULT_QUERY, label: 'Rust' } });

    expect(tableStatus(asked)).toBe('loading');
    expect(asked.visible).toBe(25);
    expect(asked.pending).toMatchObject({ offset: 0, first: 25, replace: true });
  });

  it('loads labels in the background: no dimming, no table error', () => {
    const asked = reduce(server, { type: 'labelsRequested' });

    expect(asked.labelsStatus).toBe('loading');
    expect(tableStatus(asked)).toBe('idle');

    const failed = reduce(asked, { type: 'labelsFailed', period: OrgPulsePeriod.Last_12Months });
    expect(failed.labelsStatus).toBe('error');
    expect(tableStatus(failed)).toBe('idle');

    const loaded = reduce(reduce(failed, { type: 'labelsRequested' }), {
      type: 'labelsLoaded',
      period: OrgPulsePeriod.Last_12Months,
      labels: ['Go'],
    });
    expect(currentLabels(loaded)).toEqual(['Go']);
    expect(reduce(loaded, { type: 'labelsRequested' })).toBe(loaded);
  });

  it("ignores another period's labels and drops them when the period changes", () => {
    const asked = reduce(server, { type: 'labelsRequested' });
    const moved = reduce(asked, { type: 'query', query: { ...DEFAULT_QUERY, period: OrgPulsePeriod.Last_3Months } });

    expect(moved.labelsStatus).toBe('idle');
    expect(reduce(moved, { type: 'labelsLoaded', period: OrgPulsePeriod.Last_12Months, labels: ['Go'] })).toBe(moved);
    expect(currentLabels(moved)).toBeNull();
  });
});
