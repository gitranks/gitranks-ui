import { isNameSegmentCount, isRegistryId, type RegistryId } from '@/lib/packages/registries';

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
