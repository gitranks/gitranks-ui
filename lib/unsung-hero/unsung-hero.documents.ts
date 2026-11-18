import { parse } from 'graphql';

import type DocumentNode from '@/types/typed-document-node';

/**
 * Unsung hero's operations, written out here rather than in `.gql` files, as the package pages' operations are: the
 * fields are newer than the generated schema, and an API that does not answer them yet fails only these operations.
 */
const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

export type ApiUnsungHero = {
  week: string;
  startsAt: string;
  endsAt: string;
  repo: { nameWithOwner: string };
  package: { registry: string; name: string };
  line: string;
  facts: { weeklyDownloads: number };
  starsAtStart: number | null;
  starsGained: number;
};

/** This week's hero; `null` in a week with none, and for a request the feature is closed to. */
export const UnsungHeroCurrentDocument = doc<{ unsungHero: ApiUnsungHero | null }>(
  `query UnsungHeroCurrent {
    unsungHero {
      week
      startsAt
      endsAt
      repo { nameWithOwner }
      package { registry name }
      line
      facts { weeklyDownloads }
      starsAtStart
      starsGained
    }
  }`,
);
