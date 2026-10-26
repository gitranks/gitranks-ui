/** Child sitemap segments under `/sitemaps/<id>/sitemap.xml`. */
export const SITEMAP_SEGMENTS = [
  'static',
  'rankings',
  'countries',
  'languages',
  'profiles',
  'orgs',
  'insights',
] as const;

export type SitemapSegment = (typeof SITEMAP_SEGMENTS)[number];

/** Shallow pagination — deep pages are thin and blow up generation cost. */
export const SITEMAP_PAGE_DEPTH = {
  rankings: 20,
  countries: 3,
  languages: 2,
  orgs: 20,
  /** The global repository ranking, every page. */
  repos: 50,
} as const;

export const SITEMAP_COUNTRY_LIMIT = 100;
export const SITEMAP_LANGUAGE_LIMIT = 10;
export const SITEMAP_LANGUAGE_COUNTRY_LIMIT = 10;
/** Languages with the most ranked repositories, listed to the rankings' depth. */
export const SITEMAP_REPO_LANGUAGE_LIMIT = 30;

export const SITEMAP_RANKING_TYPES = ['contributions', 'followers', 'stars'] as const;

/**
 * Insight posts are short, so the sitemap lists only recent ones: the newest posts from the last
 * `maxAgeDays`, at most `maxPosts`. Widen it once their indexing has been checked.
 */
export const SITEMAP_INSIGHTS = { maxAgeDays: 90, maxPosts: 200 } as const;
