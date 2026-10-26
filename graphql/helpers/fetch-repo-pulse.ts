import { cacheLife, cacheTag } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import {
  type OrgActivityGroupBy,
  type OrgPulseContributorSort,
  type OrgPulsePeriod,
  RepoPulseContributorsDocument,
  RepoPulseFactsDocument,
  type RepoPulseFactsQuery,
  RepoPulseSeriesDocument,
} from '@/types/generated/graphql';
import { getRepoCacheTag } from '@/utils/repo-paths';
import { PULSE_MAX_ROWS } from '@/utils/repo-pulse';

// The cached reads take owner and name lowercased, so every spelling of a repository shares one entry.

const readFacts = async (owner: string, name: string) => {
  'use cache';
  cacheTag(getRepoCacheTag(owner, name));
  cacheLife('hours');

  const { repo } = (await graphqlDirect(RepoPulseFactsDocument, { owner, name })) ?? {};

  return repo?.pulse ?? null;
};

export type RepoPulseFactsRead = {
  pulse: NonNullable<NonNullable<RepoPulseFactsQuery['repo']>['pulse']> | null;
  /** False when the read failed and the page renders without the analytics, so it is cached briefly. */
  complete: boolean;
};

/** The repository's code and contributor facts; a failed read hides the analytics, not the page. */
export const fetchRepoPulseFacts = async (owner: string, name: string): Promise<RepoPulseFactsRead> => {
  try {
    return { pulse: await readFacts(owner.toLowerCase(), name.toLowerCase()), complete: true };
  } catch (error) {
    console.error('Error loading the repository analytics:', error);
    return { pulse: null, complete: false };
  }
};

const readSeries = async (owner: string, name: string, groupBy: OrgActivityGroupBy) => {
  'use cache';
  cacheTag(getRepoCacheTag(owner, name));
  cacheLife('hours');

  const { repo } = (await graphqlDirect(RepoPulseSeriesDocument, { owner, name, groupBy }, { source: 'client' })) ?? {};

  return repo?.pulseSeries ?? null;
};

export const fetchRepoPulseSeries = (owner: string, name: string, groupBy: OrgActivityGroupBy) =>
  readSeries(owner.toLowerCase(), name.toLowerCase(), groupBy);

const readContributors = async (
  owner: string,
  name: string,
  period: OrgPulsePeriod,
  sortBy: OrgPulseContributorSort,
  label: string | null,
) => {
  'use cache';
  cacheTag(getRepoCacheTag(owner, name));
  cacheLife('hours');

  const variables = { owner, name, period, sortBy, label, first: PULSE_MAX_ROWS, offset: 0 };
  const { repo } = (await graphqlDirect(RepoPulseContributorsDocument, variables, { source: 'client' })) ?? {};

  return repo?.pulseContributors ?? null;
};

/** The whole top contributors table of a period, sort and label: every row the API holds; pages are cut from it. */
export const fetchRepoPulseContributors = (
  owner: string,
  name: string,
  period: OrgPulsePeriod,
  sortBy: OrgPulseContributorSort,
  label: string | null,
) => readContributors(owner.toLowerCase(), name.toLowerCase(), period, sortBy, label);
