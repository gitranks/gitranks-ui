import { cacheLife } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import {
  CountryLanguageSummaryRanksDocument,
  type CountrySummaryOrder,
  CountrySummaryRanksDocument,
  type LanguageSummaryOrder,
  LanguageSummaryRanksDocument,
} from '@/types/generated/graphql';

/** The API's largest page of language summaries. */
const LANGUAGE_PAGE = 100;
/** Far past the last language (about 600 worldwide), so a runaway loop stops. */
const MAX_LANGUAGE_PAGES = 30;

/**
 * Every country's numbers from one monthly snapshot (no leaders), in ranking order. Last month's snapshot gives the
 * moves; null when that snapshot can't be read.
 */
export const fetchCountrySummaryRanks = async (order: CountrySummaryOrder, date?: string | null) => {
  'use cache';
  cacheLife('days');

  const data = await graphqlDirect(CountrySummaryRanksDocument, { order, date });
  return data?.countrySummary ?? null;
};

/**
 * Every language's numbers from one monthly snapshot, worldwide or in one country, in ranking order (no leaders).
 * The API answers 100 at a time, so this reads page after page. Null when a page can't be read.
 */
export const fetchLanguageSummaryRanks = async ({
  order,
  date,
  country,
}: {
  order: LanguageSummaryOrder;
  date?: string | null;
  /** A country's name; none for worldwide. */
  country?: string | null;
}) => {
  'use cache';
  cacheLife('days');

  const rows: { language: string; date: string; usersCount: number; score: number; size: number }[] = [];

  for (let page = 0; page < MAX_LANGUAGE_PAGES; page++) {
    const vars = { order, date, offset: page * LANGUAGE_PAGE, limit: LANGUAGE_PAGE };
    const batch = country
      ? (await graphqlDirect(CountryLanguageSummaryRanksDocument, { ...vars, country }))?.countryLanguageSummary
      : (await graphqlDirect(LanguageSummaryRanksDocument, vars))?.languageSummary;

    if (!batch) {
      return null;
    }
    rows.push(...batch);
    if (batch.length < LANGUAGE_PAGE) {
      break;
    }
  }

  return rows;
};
