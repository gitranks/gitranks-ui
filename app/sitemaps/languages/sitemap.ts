import type { MetadataRoute } from 'next';

import { fetchCountries } from '@/graphql/helpers/fetch-countries';
import { fetchTopLanguages } from '@/graphql/helpers/top-languages';
import {
  SITEMAP_LANGUAGE_COUNTRY_LIMIT,
  SITEMAP_LANGUAGE_LIMIT,
  SITEMAP_PAGE_DEPTH,
} from '@/lib/sitemap/sitemap.consts';
import { sitemapEntry, sitemapPagePriority } from '@/lib/sitemap/sitemap-url';
import { getLanguageRankingPath } from '@/utils/get-language-ranking-path';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pagesToParse = SITEMAP_PAGE_DEPTH.languages;
  const pages = Array.from({ length: pagesToParse }, (_, i) => i + 1);
  const [countries, languages] = await Promise.all([
    fetchCountries(),
    fetchTopLanguages({ limit: SITEMAP_LANGUAGE_LIMIT }),
  ]);

  const countryNames = countries.slice(0, SITEMAP_LANGUAGE_COUNTRY_LIMIT).map((country) => country.name);
  const languageNames = languages.slice(0, SITEMAP_LANGUAGE_LIMIT).map((language) => language.language);

  return pages.flatMap((page) => {
    const priority = sitemapPagePriority(page, pagesToParse);
    return countryNames.flatMap((country) =>
      languageNames.map((language) => sitemapEntry(getLanguageRankingPath(language, country, page), { priority })),
    );
  });
}
