import { beforeEach, describe, expect, it, vi } from 'vitest';

import { series } from '@/components/pulse/pulse.fixtures';
import {
  OrgActivityGroupBy,
  OrgPulseContributorSort,
  OrgPulseContributorsDocument,
  OrgPulsePeriod,
  OrgPulseSeriesDocument,
} from '@/types/generated/graphql';

const { graphqlClient } = vi.hoisted(() => ({ graphqlClient: vi.fn() }));

vi.mock('@/lib/graphql/graphql-client', () => ({ graphqlClient }));

const { orgPulseLoaders } = await import('./org-pulse-loaders');

const query = { period: OrgPulsePeriod.Last_60Months, sortBy: OrgPulseContributorSort.Lines, label: null };
const page = { total: 1, unlinkedAuthors: 2, labels: ['Go'], items: [] };

describe('orgPulseLoaders', () => {
  beforeEach(() => {
    graphqlClient.mockReset();
  });

  it("reads a grouping's series", async () => {
    graphqlClient.mockResolvedValueOnce({ organization: { pulseSeries: series } });

    await expect(orgPulseLoaders('acme').loadSeries(OrgActivityGroupBy.Language)).resolves.toBe(series);
    expect(graphqlClient).toHaveBeenCalledWith(OrgPulseSeriesDocument, {
      login: 'acme',
      groupBy: OrgActivityGroupBy.Language,
    });
  });

  it('reads a contributors page', async () => {
    graphqlClient.mockResolvedValueOnce({ organization: { pulseContributors: page } });

    await expect(orgPulseLoaders('acme').loadContributors(query, 25, 50)).resolves.toBe(page);
    expect(graphqlClient).toHaveBeenCalledWith(OrgPulseContributorsDocument, {
      login: 'acme',
      period: OrgPulsePeriod.Last_60Months,
      sortBy: OrgPulseContributorSort.Lines,
      label: null,
      first: 50,
      offset: 25,
    });
  });

  it.each([
    ['no data', null],
    ['no organization', { organization: null }],
    ['no analytics', { organization: { pulseSeries: null, pulseContributors: null } }],
  ])('maps %s to null', async (_, data) => {
    graphqlClient.mockResolvedValue(data);

    const { loadSeries, loadContributors } = orgPulseLoaders('acme');

    await expect(loadSeries(OrgActivityGroupBy.Type)).resolves.toBeNull();
    await expect(loadContributors(query, 0, 25)).resolves.toBeNull();
  });

  it('passes a failed read on, so the section shows its error', async () => {
    graphqlClient.mockRejectedValue(new Error('GraphQL proxy request failed (502)'));

    const { loadSeries, loadContributors } = orgPulseLoaders('acme');

    await expect(loadSeries(OrgActivityGroupBy.Type)).rejects.toThrow('502');
    await expect(loadContributors(query, 0, 25)).rejects.toThrow('502');
  });
});
