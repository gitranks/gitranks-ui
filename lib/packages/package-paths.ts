import { isNameSegmentCount, isRegistryId, type RegistryId } from '@/lib/packages/registries';
import { REPO_TABS } from '@/lib/routing/ranking-routes';

const SEP = '[/\\\\]+';
const SEGMENT = '[^/\\\\]+';

/**
 * Every page behind the packages gate, as one list of path starts: a package's page, the package rankings, how
 * packages are counted, and a repository's tabs.
 */
const PACKAGE_PAGES: readonly string[] = [
  `${SEP}package`,
  `${SEP}packages`,
  `${SEP}methodology${SEP}packages`,
  `${SEP}repo${SEP}${SEGMENT}${SEP}${SEGMENT}${SEP}(?:${REPO_TABS.join('|')})`,
  `${SEP}unsung-heroes`, // The Unsung heroes archive and its link preview image.
];

/** A page or anything under it, in any letter case. */
const PAGE = new RegExp(`^(?:${PACKAGE_PAGES.join('|')})(?:[/\\\\]|$)`, 'i');
/** The start alone: for a path that does not decode, kept out rather than let through. */
const PAGE_START = new RegExp(`^(?:${PACKAGE_PAGES.join('|')})`, 'i');

/**
 * Whether the path is a page behind the packages gate, in any spelling the router reads as it (percent-encoded,
 * doubled slashes, upper case), so an encoded spelling cannot get past the gate.
 */
export function isPackagePath(pathname: string): boolean {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return PAGE_START.test(pathname);
  }
  return PAGE.test(decoded);
}

/** The last segment of a package's facts in markdown: `/package/<registry>/<name>/facts.md`. */
const PACKAGE_MARKDOWN_FILE = 'facts.md';

/**
 * The name's segments of a path's package segments that ask for its facts in markdown (`x/facts.md`,
 * `@scope/x/facts.md`), or `null` for any other: the segments before the file must be as many as a name on the
 * registry takes, so a scoped npm package named `facts.md` (`@scope/facts.md`) is a page.
 */
export function packageMarkdownNameOf(registry: RegistryId, segments: readonly string[]): string[] | null {
  if (segments.at(-1) !== PACKAGE_MARKDOWN_FILE) return null;
  const name = segments.slice(0, -1);
  return isNameSegmentCount(registry, name) ? name : null;
}

/**
 * Where the proxy answers a package's facts in markdown from: the packages API route's `facts.md` action, for
 * `/package/<registry>/<name>/facts.md`; `null` for any other path.
 */
export function packageMarkdownRewriteOf(pathname: string): string | null {
  const [section, registry, ...rest] = pathname.split('/').slice(1);
  if (section !== 'package' || !isRegistryId(registry)) return null;
  const name = packageMarkdownNameOf(registry, rest);
  return name ? `/api/packages/${registry}/${name.join('/')}/${PACKAGE_MARKDOWN_FILE}` : null;
}

/**
 * One cache tag per package, lower case whatever the spelling: `package:<registry>/<name>`. Whatever sets or expires a
 * package's cache tag writes it with this.
 */
export function packageCacheTag(registry: RegistryId, name: string) {
  return `package:${registry}/${name}`.toLowerCase();
}
