import { cacheLife } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import {
  CountryLanguageFactsDocument,
  type CountryLanguageFactsQueryVariables,
  LanguageFactsDocument,
  type LanguageFactsQueryVariables,
} from '@/types/generated/graphql';

/**
 * The monthly language summary as the ranking facts use it: language, developer count and date. It leaves
 * out each language's top developer, which the full summaries need and these facts don't.
 *
 * An optional fact: a failed read gives an empty list for a few minutes instead of failing the page, because
 * an error inside a cached function fails the page even when its caller catches it.
 */
export const fetchLanguageFacts = async (props: LanguageFactsQueryVariables) => {
  'use cache';

  try {
    const { languageSummary } = (await graphqlDirect(LanguageFactsDocument, props)) ?? {};
    cacheLife('days');
    return languageSummary ?? [];
  } catch {
    cacheLife('minutes');
    return [];
  }
};

/** {@link fetchLanguageFacts} for the developers of one country. */
export const fetchCountryLanguageFacts = async (props: CountryLanguageFactsQueryVariables) => {
  'use cache';

  try {
    const { countryLanguageSummary } = (await graphqlDirect(CountryLanguageFactsDocument, props)) ?? {};
    cacheLife('days');
    return countryLanguageSummary ?? [];
  } catch {
    cacheLife('minutes');
    return [];
  }
};
