import { parse } from 'graphql';

import type DocumentNode from '@/types/typed-document-node';

/**
 * The archive's operation, written out here rather than in a `.gql` file: the fields are newer than the generated
 * schema, and an API that does not answer them yet fails only this page. It asks for no address: the answer holds none.
 */
const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

/** A hero as the API answers it. Dates are ISO strings; star numbers are GitHub's own count. */
export type ApiArchiveHero = {
  startsAt: string;
  endsAt: string;
  live: boolean;
  repo: { nameWithOwner: string; description: string | null; createdAt: string | null };
  package: { registry: string; name: string };
  maintainer: { login: string; name: string | null };
  line: string;
  text: string;
  facts: { weeklyDownloads: number; contributors: number | null };
  starsAtStart: number | null;
  starsNow: number | null;
  starsGained: number;
};

export type ApiArchive = {
  live: ApiArchiveHero | null;
  past: ApiArchiveHero[];
  totals: { heroes: number; starsGained: number; weeklyDownloads: number; since: string | null };
};

const HERO_FIELDS = `startsAt endsAt live
  repo { nameWithOwner description createdAt }
  package { registry name }
  maintainer { login name }
  line text
  facts { weeklyDownloads contributors }
  starsAtStart starsNow starsGained`;

/** This week's hero, the past ones newest first, and the totals. */
export const UnsungHeroesDocument = doc<{ unsungHeroes: ApiArchive | null }>(
  `query UnsungHeroes {
    unsungHeroes {
      live { ${HERO_FIELDS} }
      past { ${HERO_FIELDS} }
      totals { heroes starsGained weeklyDownloads since }
    }
  }`,
);
