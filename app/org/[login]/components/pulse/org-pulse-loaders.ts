import type { LoadContributorsPage } from '@/components/pulse/pulse-contributors-table.state';
import type { LoadPulseSeries } from '@/components/pulse/pulse-series-provider';
import { graphqlClient } from '@/lib/graphql/graphql-client';
import { OrgPulseContributorsDocument, OrgPulseSeriesDocument } from '@/types/generated/graphql';

/** The organization's series and contributor pages, read through the GraphQL proxy. */
export function orgPulseLoaders(login: string) {
  const loadSeries: LoadPulseSeries = (groupBy) =>
    graphqlClient(OrgPulseSeriesDocument, { login, groupBy }).then((data) => data?.organization?.pulseSeries ?? null);
  const loadContributors: LoadContributorsPage = (query, offset, first) =>
    graphqlClient(OrgPulseContributorsDocument, {
      login,
      period: query.period,
      sortBy: query.sortBy,
      label: query.label,
      first,
      offset,
    }).then((response) => response?.organization?.pulseContributors ?? null);

  return { loadSeries, loadContributors };
}
