import type { MetadataRoute } from 'next';

import { fetchCountries } from '@/graphql/helpers/fetch-countries';
import { SITEMAP_COUNTRY_LIMIT, SITEMAP_PAGE_DEPTH, SITEMAP_RANKING_TYPES } from '@/lib/sitemap/sitemap.consts';
import { sitemapEntry, sitemapPagePriority } from '@/lib/sitemap/sitemap-url';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pagesToParse = SITEMAP_PAGE_DEPTH.countries;
  const pages = Array.from({ length: pagesToParse }, (_, i) => i + 1);
  const countries = await fetchCountries();
  const countryNames = countries.slice(0, SITEMAP_COUNTRY_LIMIT).map((country) => country.name);

  return pages.flatMap((page) => {
    const priority = sitemapPagePriority(page, pagesToParse);
    return countryNames.flatMap((name) =>
      SITEMAP_RANKING_TYPES.map((rankingType) =>
        sitemapEntry(`/country/${encodeURIComponent(name)}/${rankingType}/${page}`, {
          priority,
        }),
      ),
    );
  });
}
