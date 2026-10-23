import { describe, expect, it } from 'vitest';

import { series } from './org-pulse.fixtures';
import {
  avatarSrc,
  countryRowLabel,
  formatSigned,
  hasLines,
  LARGE_CHANGE_SHARE,
  monthInflow,
  monthSnapshot,
  monthTicks,
  seriesColor,
  toContributorRows,
  toInflowRows,
  toSnapshotRows,
} from './org-pulse.utils';
import { OrgPulseCountryGroup } from '@/types/generated/graphql';

describe('chart rows', () => {
  it('reads the line matrices as [label][month]', () => {
    expect(toSnapshotRows(series)[2]).toEqual({ index: 2, month: '2026-09', s0: 1500, s1: 260 });
  });

  it('puts added lines above the axis and deleted lines below it', () => {
    expect(toInflowRows(series)[1]).toEqual({ index: 1, month: '2026-08', a0: 150, d0: -50, a1: 15, d1: -5 });
  });

  it('never stacks a month with nothing deleted as -0', () => {
    expect(Object.is(toInflowRows(series)[0].d1, 0)).toBe(true);
  });

  it('keeps first-time contributors null for the first 12 months of the window', () => {
    expect(toContributorRows(series).map((row) => row.newContributors)).toEqual([null, null, 3]);
    expect(toContributorRows(series)[2]).toMatchObject({ linked: 7, anonymous: 2 });
  });
});

describe('monthSnapshot', () => {
  it('lists the labels top band first, with the month total', () => {
    expect(monthSnapshot(series, 0)).toEqual({
      labels: [
        { label: 'Tests', index: 1, lines: 200 },
        { label: 'Code', index: 0, lines: 1000 },
      ],
      total: 1200,
    });
  });
});

describe('monthInflow', () => {
  it('gives per-label and month added, deleted and net', () => {
    const month = monthInflow(series, 1);

    expect(month.labels.map(({ label, net }) => [label, net])).toEqual([
      ['Tests', 10],
      ['Code', 100],
    ]);
    expect(month).toMatchObject({ added: 165, deleted: 55, net: 110, commits: 25, pullRequests: 8 });
  });

  it('names the largest single change only when its share is large', () => {
    expect(monthInflow(series, 1).largest).toBeNull();
    expect(monthInflow(series, 2).largest).toEqual({ lines: 500, share: 0.574 });
    expect(monthInflow(series, 0).largest).toEqual({ lines: 40, share: LARGE_CHANGE_SHARE });
  });

  it('reports lines of files crossing 100 KB', () => {
    expect(monthInflow(series, 2).crossLines).toBe(1200);
    expect(monthInflow(series, 0).crossLines).toBe(0);
  });
});

describe('hasLines', () => {
  it('is false with no months or only zero lines', () => {
    expect(hasLines(null)).toBe(false);
    expect(hasLines({ ...series, months: [] })).toBe(false);
    expect(hasLines({ ...series, snapshot: [[0, 0, 0]], added: [[0, 0, 0]], deleted: [[0, 0, 0]] })).toBe(false);
    expect(hasLines(series)).toBe(true);
  });
});

describe('monthTicks', () => {
  it('ticks Januaries on a long window and quarters on a short one', () => {
    const long = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(Date.UTC(2024, 6 + i, 1));
      return date.toISOString().slice(0, 7);
    });

    expect(monthTicks(long)).toEqual(['2025-01', '2026-01']);
    expect(monthTicks(series.months)).toEqual(['2026-07']);
  });
});

describe('formatters', () => {
  it('signs a net change', () => {
    expect(formatSigned(1234)).toBe('+1,234');
    expect(formatSigned(-56)).toBe('−56');
    expect(formatSigned(0.2)).toBe('0');
  });

  it('sizes an avatar with or without a query in its URL', () => {
    expect(avatarSrc('https://avatars.githubusercontent.com/u/1?v=4', 24)).toBe(
      'https://avatars.githubusercontent.com/u/1?v=4&s=48',
    );
    expect(avatarSrc('https://avatars.githubusercontent.com/u/2', 24)).toBe(
      'https://avatars.githubusercontent.com/u/2?s=48',
    );
  });

  it('names the countries groups', () => {
    expect(countryRowLabel({ group: OrgPulseCountryGroup.Country, country: 'Germany' })).toBe('Germany');
    expect(countryRowLabel({ group: OrgPulseCountryGroup.NoLocation })).toBe('No location on gitranks');
    expect(countryRowLabel({ group: OrgPulseCountryGroup.NotOnGitranks })).toBe('Not on gitranks');
  });

  it('gives Other and Other / unknown their own neutrals', () => {
    expect(seriesColor('Code', 0)).toBe('var(--series-1)');
    expect(seriesColor('Other', 1)).toBe('var(--series-other)');
    expect(seriesColor('Other / unknown', 2)).toBe('var(--series-unknown)');
  });
});
