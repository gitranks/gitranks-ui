import { isGithubLogin } from '@/lib/routing/ranking-routes';

/** A post's id as its links carry it: a 24-character hex object id. */
const INSIGHT_ID = /^[0-9a-f]{24}$/i;

/**
 * True for a developer's, an organization's or a post's URL whose login or id can never name one: `/profile/wp-login.php`,
 * `/org/.env`, `/insights/<anything but an id>`. The proxy answers these with a 404 before anything renders, so they
 * cost no render and no data read. A well-formed name that is not there is left to the page, whose `notFound()` also
 * answers 404. Repository URLs are checked with the rankings (`isInvalidRankingPath`).
 */
export function isImpossibleEntityPath(pathname: string): boolean {
  const [section, first] = pathname.split('/').filter(Boolean);
  if (first === undefined) return false;

  switch (section) {
    case 'profile':
    case 'org':
      return !isGithubLogin(first);
    case 'insights':
      return !INSIGHT_ID.test(first);
    default:
      return false;
  }
}
