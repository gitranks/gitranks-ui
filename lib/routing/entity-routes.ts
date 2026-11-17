import { isNpmPackageName } from '@/lib/packages/npm-package-name';
import { isGithubLogin, PACKAGE_REGISTRIES } from '@/lib/routing/ranking-routes';

/** A post's id as its links carry it: a 24-character hex object id. */
const INSIGHT_ID = /^[0-9a-f]{24}$/i;

/** The segments of a package's name, decoded and joined as the name; null when one does not decode. */
function packageNameOf(segments: string[]): string | null {
  try {
    return segments.map((segment) => decodeURIComponent(segment)).join('/');
  } catch {
    return null;
  }
}

/** `/package/<registry>/<name>`, where `<name>` is `x` or `@scope/x`: an unknown registry or a name npm never takes. */
function isImpossiblePackagePath(registry: string, nameSegments: string[]): boolean {
  if (!PACKAGE_REGISTRIES.has(registry)) return true;
  const name = packageNameOf(nameSegments);
  return name === null || !isNpmPackageName(name);
}

/**
 * True for a developer's, an organization's, a post's or a package's URL whose login, id or name can never name one:
 * `/profile/wp-login.php`, `/org/.env`, `/insights/<anything but an id>`, `/package/pypi/x`, `/package/npm/.env`. The
 * proxy answers these with a 404 before anything renders, so they cost no render and no data read. A well-formed name
 * that is not there is left to the page, whose `notFound()` also answers 404. Repository URLs are checked with the
 * rankings (`isInvalidRankingPath`).
 */
export function isImpossibleEntityPath(pathname: string): boolean {
  const [section, first, ...rest] = pathname.split('/').filter(Boolean);
  if (first === undefined) return false;

  switch (section) {
    case 'profile':
    case 'org':
      return !isGithubLogin(first);
    case 'insights':
      return !INSIGHT_ID.test(first);
    case 'package':
      return isImpossiblePackagePath(first, rest);
    default:
      return false;
  }
}
