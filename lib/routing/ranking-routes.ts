import { parsePageParam } from '@/utils/parse-page-param';

/**
 * Deepest page each ranking can serve. The ranking tables show 100 rows a page, and the rankings
 * query takes offsets up to 100,000 for the global and country rankings and up to 5,000 for
 * languages and organizations. The language summaries (24 a page) get a ceiling of their own.
 */
export const RANKING_MAX_PAGE = {
  global: 1001,
  country: 1001,
  language: 51,
  org: 51,
  /** Every repository ranking: global, per language and without a language. */
  repo: 51,
  /** The language summaries: far past the last language, and keeps the query offset in range. */
  languageSummary: 1000,
} as const;

// Literal copies so the proxy does not load the generated GraphQL module; a spec keeps them in sync.
export const RANKING_TYPES = new Set(['stars', 'contributions', 'followers']);
export const COUNTRY_SUMMARY_ORDERS = new Set(['stars', 'contributions', 'followers', 'users']);
export const LANGUAGE_SUMMARY_ORDERS = new Set(['score', 'size', 'users']);

// GitHub's rules: an owner is 1-39 of [A-Za-z0-9-] not starting with '-'; a name is 1-100 of [A-Za-z0-9._-].
const REPO_OWNER = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/;
const REPO_NAME = /^[A-Za-z0-9._-]{1,100}$/;

/** True when `owner` and `name` can name a GitHub repository. */
export function isRepoSlug(owner: string, name: string): boolean {
  return REPO_OWNER.test(owner) && REPO_NAME.test(name);
}

const isPage = (value: string, maxPage = Number.MAX_SAFE_INTEGER) => {
  const page = parsePageParam(value);
  return page !== null && page <= maxPage;
};

function isInvalidRepoRankingPath(rest: string[]): boolean {
  const [list] = rest;

  if (rest.length === 1) {
    return list !== 'languages' && !isPage(list, RANKING_MAX_PAGE.repo);
  }
  if (list === 'no-language') {
    return rest.length === 2 && !isPage(rest[1], RANKING_MAX_PAGE.repo);
  }
  if (list === 'language') {
    return rest.length === 3 && !isPage(rest[2], RANKING_MAX_PAGE.repo);
  }
  return false;
}

/**
 * True for a ranking URL whose type, order or page number can never render a ranking.
 *
 * The proxy answers these with a 404 before anything renders, so they cost no render and leave no
 * cached page behind. Lookups that need data (an unknown country, a page past the last entry) are
 * left to the page, whose `notFound()` also answers 404.
 */
export function isInvalidRankingPath(pathname: string): boolean {
  const [section, ...rest] = pathname.split('/').filter(Boolean);

  switch (section) {
    case 'by':
      if (rest.length === 1) {
        return !RANKING_TYPES.has(rest[0]);
      }
      return rest.length === 2 && !(RANKING_TYPES.has(rest[0]) && isPage(rest[1], RANKING_MAX_PAGE.global));
    case 'country':
      return rest.length === 3 && !(RANKING_TYPES.has(rest[1]) && isPage(rest[2], RANKING_MAX_PAGE.country));
    case 'language':
      return rest.length === 3 && !isPage(rest[2], RANKING_MAX_PAGE.language);
    case 'languages':
      return (
        rest.length === 3 &&
        !(LANGUAGE_SUMMARY_ORDERS.has(rest[1].toLowerCase()) && isPage(rest[2], RANKING_MAX_PAGE.languageSummary))
      );
    case 'countries':
      return rest.length === 2 && !(COUNTRY_SUMMARY_ORDERS.has(rest[0].toLowerCase()) && isPage(rest[1]));
    case 'orgs':
      return rest.length === 1 && !isPage(rest[0], RANKING_MAX_PAGE.org);
    case 'repos':
      return isInvalidRepoRankingPath(rest);
    case 'repo':
      return !(rest.length === 2 && isRepoSlug(rest[0], rest[1]));
    default:
      return false;
  }
}
