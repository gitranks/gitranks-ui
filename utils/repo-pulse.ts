import { CONTRIBUTORS_PAGE_SIZE } from '@/app/app.consts';
import { OrgActivityGroupBy, OrgPulseContributorSort, OrgPulsePeriod } from '@/types/generated/graphql';
import type { ContributorsQuery } from '@/types/pulse.types';

/** The API holds at most this many rows a period and sort, so no page reaches past it. */
export const PULSE_MAX_ROWS = 100;

/** Language names are short: a longer label cannot name one. */
export const PULSE_MAX_LABEL_LENGTH = 64;

/** The analytics change at most daily, so shared caches may hold an answer for an hour. */
export const PULSE_CACHE_CONTROL = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';

export type RepoPulseContributorsParams = ContributorsQuery & { first: number; offset: number };

const repoPulseBase = (owner: string, name: string) =>
  `/api/repo/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pulse`;

const oneOf = <T extends string>(values: Record<string, T>, value: string | null): T | null =>
  (Object.values(values) as string[]).includes(value ?? '') ? (value as T) : null;

/** A whole number from 0, at most `PULSE_MAX_ROWS`; `null` when the value is not one. */
function rowCount(value: string | null, fallback: number): number | null {
  if (value === null) {
    return fallback;
  }

  if (!/^\d{1,6}$/.test(value)) {
    return null;
  }

  return Math.min(Number(value), PULSE_MAX_ROWS);
}

/** The repository's series for one grouping. */
export function getRepoPulseSeriesUrl(owner: string, name: string, groupBy: OrgActivityGroupBy) {
  return `${repoPulseBase(owner, name)}/series?${new URLSearchParams({ groupBy })}`;
}

/** One page of the repository's top contributors. */
export function getRepoPulseContributorsUrl(owner: string, name: string, params: RepoPulseContributorsParams) {
  const search = new URLSearchParams({
    period: params.period,
    sortBy: params.sortBy,
    first: String(params.first),
    offset: String(params.offset),
  });

  if (params.label) {
    search.set('label', params.label);
  }

  return `${repoPulseBase(owner, name)}/contributors?${search}`;
}

/** The grouping a series request asks for, or `null` when it names none. */
export function parseRepoPulseSeriesParams(search: URLSearchParams): OrgActivityGroupBy | null {
  return oneOf(OrgActivityGroupBy, search.get('groupBy'));
}

/** What a contributors request asks for, or `null` when any part of it is not valid. */
export function parseRepoPulseContributorsParams(search: URLSearchParams): RepoPulseContributorsParams | null {
  const period = oneOf(OrgPulsePeriod, search.get('period'));
  const sortBy = oneOf(OrgPulseContributorSort, search.get('sortBy'));
  const label = search.get('label') || null;
  const first = rowCount(search.get('first'), CONTRIBUTORS_PAGE_SIZE);
  const offset = rowCount(search.get('offset'), 0);

  if (!period || !sortBy || first === null || offset === null) {
    return null;
  }

  if (label !== null && label.length > PULSE_MAX_LABEL_LENGTH) {
    return null;
  }

  return { period, sortBy, label, first, offset };
}
