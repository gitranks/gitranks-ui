import { describe, expect, it } from 'vitest';

import { OrgActivityGroupBy, OrgPulseContributorSort, OrgPulsePeriod } from '@/types/generated/graphql';
import {
  getRepoPulseContributorsUrl,
  getRepoPulseSeriesUrl,
  PULSE_MAX_LABEL_LENGTH,
  PULSE_MAX_ROWS,
  parseRepoPulseContributorsParams,
  parseRepoPulseSeriesParams,
} from '@/utils/repo-pulse';

const searchOf = (url: string) => new URL(url, 'https://gitranks.com').searchParams;

const query = {
  period: OrgPulsePeriod.Last_3Months,
  sortBy: OrgPulseContributorSort.Commits,
  label: 'C++',
  first: 25,
  offset: 50,
};

describe('repo pulse urls', () => {
  it('escapes the owner and name in the path', () => {
    expect(getRepoPulseSeriesUrl('octo-org', 'hello.world', OrgActivityGroupBy.Kind)).toBe(
      '/api/repo/octo-org/hello.world/pulse/series?groupBy=KIND',
    );
    expect(getRepoPulseSeriesUrl('a b', 'c/d', OrgActivityGroupBy.Type)).toMatch(/^\/api\/repo\/a%20b\/c%2Fd\//);
  });

  it('reads back the series grouping it writes', () => {
    for (const groupBy of Object.values(OrgActivityGroupBy)) {
      expect(parseRepoPulseSeriesParams(searchOf(getRepoPulseSeriesUrl('o', 'n', groupBy)))).toBe(groupBy);
    }
  });

  it('reads back the contributors query it writes, label included', () => {
    const url = getRepoPulseContributorsUrl('o', 'n', query);

    expect(url.startsWith('/api/repo/o/n/pulse/contributors?')).toBe(true);
    expect(parseRepoPulseContributorsParams(searchOf(url))).toEqual(query);
  });

  it('leaves out an empty label', () => {
    const url = getRepoPulseContributorsUrl('o', 'n', { ...query, label: null });

    expect(url).not.toContain('label');
    expect(parseRepoPulseContributorsParams(searchOf(url))?.label).toBeNull();
  });
});

describe('parseRepoPulseSeriesParams', () => {
  it.each([null, '', 'type', 'REPO'])('refuses the grouping %s', (groupBy) => {
    const search = new URLSearchParams(groupBy === null ? {} : { groupBy });
    expect(parseRepoPulseSeriesParams(search)).toBeNull();
  });
});

describe('parseRepoPulseContributorsParams', () => {
  const parse = (params: Record<string, string>) =>
    parseRepoPulseContributorsParams(
      new URLSearchParams({ period: OrgPulsePeriod.Last_12Months, sortBy: OrgPulseContributorSort.Lines, ...params }),
    );

  it('defaults to the first page', () => {
    expect(parse({})).toEqual({
      period: OrgPulsePeriod.Last_12Months,
      sortBy: OrgPulseContributorSort.Lines,
      label: null,
      first: 25,
      offset: 0,
    });
  });

  it.each([
    ['period', 'LAST_7_DAYS'],
    ['sortBy', 'STARS'],
    ['first', '-1'],
    ['first', '2.5'],
    ['offset', 'ten'],
    ['offset', '1e3'],
    ['label', 'x'.repeat(PULSE_MAX_LABEL_LENGTH + 1)],
  ])('refuses %s=%s', (key, value) => {
    expect(parse({ [key]: value })).toBeNull();
  });

  it('caps the rows at what the API holds', () => {
    expect(parse({ first: '500', offset: '900' })).toMatchObject({ first: PULSE_MAX_ROWS, offset: PULSE_MAX_ROWS });
  });

  it('accepts a page of no rows, which asks for the labels alone', () => {
    expect(parse({ first: '0' })?.first).toBe(0);
  });
});
