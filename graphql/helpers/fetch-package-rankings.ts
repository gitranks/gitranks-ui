import { cacheLife } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import {
  PackageRankingFactsDocument,
  type PackageRankingFactsQuery,
  PackageRankingsDocument,
  type PackageRankingsQuery,
  type PackageRankingType,
  type PackageRegistry,
} from '@/types/generated/graphql';

export type PackageRankRows = NonNullable<PackageRankingsQuery['packageRankings']>;
export type PackageRankingFactsData = NonNullable<PackageRankingFactsQuery['packageRankingFacts']>;

/**
 * A page of a package ranking. `undefined` when it cannot be read now (a failed read, or no answer): kept a few minutes
 * instead of thrown, because during prerender an error inside a cached function fails the page even when its caller
 * catches it. An empty list is a real answer: no package on that page.
 */
export const fetchPackageRankings = async (props: {
  registry: PackageRegistry;
  by: PackageRankingType;
  offset: number;
}): Promise<PackageRankRows | undefined> => {
  'use cache';

  try {
    const { packageRankings } = (await graphqlDirect(PackageRankingsDocument, props)) ?? {};

    if (!packageRankings) {
      cacheLife('minutes');
      return undefined;
    }

    cacheLife('hours');
    return packageRankings;
  } catch {
    cacheLife('minutes');
    return undefined;
  }
};

/**
 * How many packages the rankings hold and the dates of their numbers: `null` before the first ranks, `undefined` when
 * it cannot be read now (kept a few minutes, as above).
 */
export const fetchPackageRankingFacts = async (
  registry: PackageRegistry,
): Promise<PackageRankingFactsData | null | undefined> => {
  'use cache';

  try {
    const { packageRankingFacts } = (await graphqlDirect(PackageRankingFactsDocument, { registry })) ?? {};
    cacheLife('hours');
    return packageRankingFacts ?? null;
  } catch {
    cacheLife('minutes');
    return undefined;
  }
};
