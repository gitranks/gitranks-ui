/** Child sitemap segments under `/sitemaps/<id>/sitemap.xml`. */
export const SITEMAP_SEGMENTS = ['static', 'rankings', 'countries', 'languages', 'profiles', 'orgs'] as const;

export type SitemapSegment = (typeof SITEMAP_SEGMENTS)[number];

/** Shallow pagination — deep pages are thin and blow up generation cost. */
export const SITEMAP_PAGE_DEPTH = {
  rankings: 20,
  countries: 3,
  languages: 2,
  orgs: 20,
} as const;

export const SITEMAP_COUNTRY_LIMIT = 100;
export const SITEMAP_LANGUAGE_LIMIT = 10;
export const SITEMAP_LANGUAGE_COUNTRY_LIMIT = 10;

export const SITEMAP_RANKING_TYPES = ['contributions', 'followers', 'stars'] as const;
