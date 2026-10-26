import { cacheLife, cacheTag } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import {
  type OrgActivityGroupBy,
  type OrgPulseContributorSort,
  type OrgPulsePeriod,
  RepoPulseContributorsDocument,
  RepoPulseSeriesDocument,
} from '@/types/generated/graphql';
import { getRepoCacheTag } from '@/utils/repo-paths';

export const fetchRepoPulseSeries = async (owner: string, name: string, groupBy: OrgActivityGroupBy) => {
  'use cache';
  cacheTag(getRepoCacheTag(owner, name));
  cacheLife('hours');

  const { repo } = (await graphqlDirect(RepoPulseSeriesDocument, { owner, name, groupBy })) ?? {};

  return repo?.pulseSeries ?? null;
};

export const fetchRepoPulseContributors = async (
  owner: string,
  name: string,
  period: OrgPulsePeriod,
  sortBy: OrgPulseContributorSort,
  label: string | null,
  first: number,
  offset: number,
) => {
  'use cache';
  cacheTag(getRepoCacheTag(owner, name));
  cacheLife('hours');

  const { repo } =
    (await graphqlDirect(RepoPulseContributorsDocument, { owner, name, period, sortBy, label, first, offset })) ?? {};

  return repo?.pulseContributors ?? null;
};
