import { beforeEach, describe, expect, it, vi } from 'vitest';

import { series } from '@/components/pulse/pulse.fixtures';
import {
  OrgActivityGroupBy,
  OrgPulseContributorSort,
  OrgPulsePeriod,
  RepoPulseContributorsDocument,
  RepoPulseFactsDocument,
  RepoPulseSeriesDocument,
} from '@/types/generated/graphql';

const { graphqlDirect, cacheTag, cacheLife } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));

vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('next/cache', () => ({ cacheTag, cacheLife }));

const { fetchRepoPulseContributors, fetchRepoPulseFacts, fetchRepoPulseSeries } = await import('./fetch-repo-pulse');

const page = { total: 0, unlinkedAuthors: 0, labels: [], items: [] };

describe('fetch repo pulse', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    cacheTag.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('reads the series by the lowercased repository, as a browser read', async () => {
    graphqlDirect.mockResolvedValueOnce({ repo: { pulseSeries: series } });

    await expect(fetchRepoPulseSeries('Octo-Org', 'Hello.World', OrgActivityGroupBy.Kind)).resolves.toBe(series);
    expect(graphqlDirect).toHaveBeenCalledWith(
      RepoPulseSeriesDocument,
      { owner: 'octo-org', name: 'hello.world', groupBy: OrgActivityGroupBy.Kind },
      { source: 'client' },
    );
    expect(cacheTag).toHaveBeenCalledWith('repo:octo-org/hello.world');
  });

  it('reads the whole contributors table by the lowercased repository, whatever page is wanted', async () => {
    graphqlDirect.mockResolvedValueOnce({ repo: { pulseContributors: page } });

    await expect(
      fetchRepoPulseContributors('Octo', 'Hello', OrgPulsePeriod.Last_3Months, OrgPulseContributorSort.Commits, 'Rust'),
    ).resolves.toBe(page);
    expect(graphqlDirect).toHaveBeenCalledWith(
      RepoPulseContributorsDocument,
      {
        owner: 'octo',
        name: 'hello',
        period: OrgPulsePeriod.Last_3Months,
        sortBy: OrgPulseContributorSort.Commits,
        label: 'Rust',
        first: 100,
        offset: 0,
      },
      { source: 'client' },
    );
  });

  it.each([
    ['no repository', null],
    ['no repo field', { repo: null }],
    ['no analytics', { repo: { pulseSeries: null, pulseContributors: null } }],
  ])('maps %s to null', async (_, data) => {
    graphqlDirect.mockResolvedValue(data);

    await expect(fetchRepoPulseSeries('o', 'n', OrgActivityGroupBy.Type)).resolves.toBeNull();
    await expect(
      fetchRepoPulseContributors('o', 'n', OrgPulsePeriod.Last_12Months, OrgPulseContributorSort.Lines, null),
    ).resolves.toBeNull();
  });

  it('reads the facts by the lowercased repository', async () => {
    const pulse = { lastMonth: '2026-09' };
    graphqlDirect.mockResolvedValueOnce({ repo: { pulse } });

    await expect(fetchRepoPulseFacts('Octo', 'Hello')).resolves.toEqual({ pulse, complete: true });
    expect(graphqlDirect).toHaveBeenCalledWith(RepoPulseFactsDocument, { owner: 'octo', name: 'hello' });
  });

  it('answers no facts, completely read, for a repository without them', async () => {
    graphqlDirect.mockResolvedValueOnce({ repo: { pulse: null } });

    await expect(fetchRepoPulseFacts('o', 'n')).resolves.toEqual({ pulse: null, complete: true });
  });

  it('answers no facts, marked incomplete, when the read fails', async () => {
    graphqlDirect.mockRejectedValueOnce(new Error('GraphQL error! Cannot query field "pulse"'));

    await expect(fetchRepoPulseFacts('o', 'n')).resolves.toEqual({ pulse: null, complete: false });
  });

  it('lets a series or contributors read error reach the route', async () => {
    graphqlDirect.mockRejectedValue(new Error('GraphQL error! 500'));

    await expect(fetchRepoPulseSeries('o', 'n', OrgActivityGroupBy.Type)).rejects.toThrow('500');
    await expect(
      fetchRepoPulseContributors('o', 'n', OrgPulsePeriod.Last_12Months, OrgPulseContributorSort.Lines, null),
    ).rejects.toThrow('500');
  });
});
