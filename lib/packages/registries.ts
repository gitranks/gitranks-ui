import { isNpmPackageName, NPM_NAME_MAX_LENGTH } from '@/lib/packages/npm-package-name';
import type { PackageRegistry } from '@/types/generated/graphql';

/**
 * The period a registry's downloads are counted over, as the site says it: "downloads a week". Only weekly counts are
 * read for now (a package's `lastWeek`), so a week is the only unit.
 */
export type DownloadsUnit = 'week';

/**
 * How a registry's package names map to URL segments and back: a name takes `min` to `max` segments (`max: null` for
 * any number), joined by `join`. With `scope`, a name takes its extra segments only behind a scope that starts with
 * it (npm: `react`, or `@scope/name`), so a scope needs a highest count.
 */
export type RegistryPath =
  | { min: number; max: number; join: '/' | ':'; scope?: string }
  | { min: number; max: null; join: '/' | ':'; scope?: never };

/** What the site shows of a registry, and how its names are checked. */
export type RegistryTraits = {
  /** The registry as written in text: "npm package", "Open on npm". */
  label: string;
  /** The article before the label, as it is read aloud: "an npm package". */
  article: 'a' | 'an';
  /** The registry as the API names it. */
  api: `${PackageRegistry}`;
  /** The package's page on the registry's own site. */
  pageUrl: (name: string) => string;
  /** What leads a package's name in the address of its page on the registry's site, as a visitor may paste it. */
  pageUrlPrefix: RegExp;
  /** Whether a name can name a package on the registry, by the registry's own rules. */
  isName: (name: string) => boolean;
  /** The longest name the registry takes. */
  nameMaxLength: number;
  path: RegistryPath;
  /** How often its downloads are counted; `null` for a registry that publishes no download counts. */
  downloads: DownloadsUnit | null;
  /** The file a repository lists the registry's packages in: "list it in their own package.json". */
  manifest: string;
  /** Names a visitor knows, for examples in copy; the first is the package prerendered at build time. */
  examples: readonly [string, ...string[]];
  /** What a name looks like, for a field's placeholder: "react or @scope/name". */
  nameHint: string;
};

/** The registries the site lists packages of, by their name in URLs. */
export const REGISTRIES = {
  npm: {
    label: 'npm',
    article: 'an',
    api: 'NPM',
    pageUrl: (name) => `https://www.npmjs.com/package/${name}`,
    pageUrlPrefix: /^(?:https?:\/\/)?(?:www\.)?npmjs\.(?:com|org)\/package\//i,
    isName: isNpmPackageName,
    nameMaxLength: NPM_NAME_MAX_LENGTH,
    path: { min: 1, max: 2, join: '/', scope: '@' },
    downloads: 'week',
    manifest: 'package.json',
    examples: ['react', '@types/node'],
    nameHint: 'react or @scope/name',
  },
} as const satisfies Record<string, RegistryTraits>;

export type RegistryId = keyof typeof REGISTRIES;

/** Every registry, in the order the site lists them. */
export const REGISTRY_IDS = Object.keys(REGISTRIES) as RegistryId[];

/** The registry `/packages` opens on, and the one a package named without a registry is on. */
export const DEFAULT_REGISTRY: RegistryId = 'npm';

/** Whether a URL's segment names a registry (exact, letter case included). */
export const isRegistryId = (value: unknown): value is RegistryId =>
  typeof value === 'string' && Object.hasOwn(REGISTRIES, value);

/** A registry's traits, typed as any registry's. */
export const registryOf = (id: RegistryId): RegistryTraits => REGISTRIES[id];

/** The registry the API names (`NPM`), or `null` for one the site does not list. */
export function registryOfApi(api: string | null | undefined): RegistryId | null {
  return REGISTRY_IDS.find((id) => REGISTRIES[id].api === api) ?? null;
}

/** A registry as the API names it, one the site lists: `NPM`. */
export type ListedApiRegistry = (typeof REGISTRIES)[RegistryId]['api'];

/** Whether the API names a registry the site lists. */
export const isListedApiRegistry = (api: unknown): api is ListedApiRegistry =>
  typeof api === 'string' && registryOfApi(api) !== null;

/** The registry of a value already checked as one the site lists (`isListedApiRegistry`). */
export const registryOfListedApi = (api: ListedApiRegistry): RegistryId =>
  REGISTRY_IDS.find((id) => REGISTRIES[id].api === api) as RegistryId;

/** The registry as the API names it, typed as the API's enum (the same string). */
export const apiRegistryOf = (id: RegistryId) => REGISTRIES[id].api as PackageRegistry;

/** Whether a registry has download counts, and so a downloads ranking and downloads badges. */
export const registryHasDownloads = (id: RegistryId) => registryOf(id).downloads !== null;

/** Whether a name on the registry may take this many URL segments (`min` to `max`). */
function isSegmentCountInRange(id: RegistryId, count: number): boolean {
  const { min, max } = registryOf(id).path;
  return count >= min && (max === null || count <= max);
}

/**
 * Whether these segments are as many as a name on the registry takes, by their count alone: npm takes a second one only
 * behind an `@scope`. What decides which segments a path's file follows (`<name>/facts.md`).
 */
export function isNameSegmentCount(id: RegistryId, segments: readonly string[]): boolean {
  const path = registryOf(id).path;
  if (!isSegmentCountInRange(id, segments.length)) return false;
  if (path.max === null || path.scope === undefined) return true;
  return segments.length === (segments[0]?.startsWith(path.scope) ? path.max : path.min);
}

/**
 * The name a package's URL segments (decoded) spell on a registry, or `null` when they cannot name one of its packages:
 * `min` to `max` segments, joined by the registry's `join`, then the registry's own name rule.
 */
export function nameOfSegments(id: RegistryId, segments: readonly string[]): string | null {
  const { path, isName } = registryOf(id);
  if (!isSegmentCountInRange(id, segments.length)) return null;
  const name = segments.join(path.join);
  return isName(name) ? name : null;
}

/** A package's name as URL segments, as they are (not encoded): `@types/node` is `@types`, `node`. */
export const segmentsOfName = (id: RegistryId, name: string): string[] => name.split(registryOf(id).path.join);

/** Whether `name` can name a package on the registry. */
export const isPackageName = (id: RegistryId, name: string) => registryOf(id).isName(name);

/** "npm", "npm and PyPI", "npm, PyPI or Maven Central": every registry the site lists. */
export function registryLabelList(conjunction: 'and' | 'or' = 'and'): string {
  const labels = REGISTRY_IDS.map((id) => REGISTRIES[id].label);
  return labels.length > 1 ? `${labels.slice(0, -1).join(', ')} ${conjunction} ${labels.at(-1)}` : labels.join('');
}

/** "npm package", "npm or PyPI package"; with `article`, "an npm package": a package on any registry the site lists. */
export function anyRegistryPackageText(article = false): string {
  const text = `${registryLabelList('or')} package`;
  return article ? `${REGISTRIES[REGISTRY_IDS[0]].article} ${text}` : text;
}

/** A package by its registry and its name as the registry writes it. */
export type PackageRef = { registry: RegistryId; name: string };

/** A package as badge URLs, picks and follows name it: `<registry>/<name>` (`npm/react`, `npm/@types/node`). */
export const packageKeyOf = ({ registry, name }: PackageRef) => `${registry}/${name}`;

/** The package a `<registry>/<name>` key names (split at the first `/`), or `null` when it names none. */
export function packageOfKey(key: string): PackageRef | null {
  const slash = key.indexOf('/');
  const registry = key.slice(0, slash);
  const name = key.slice(slash + 1);
  return slash > 0 && isRegistryId(registry) && isPackageName(registry, name) ? { registry, name } : null;
}

/** A package's name as people know it: the name alone on the default registry, `<registry>/<name>` on another. */
export const packageDisplayNameOf = ({ registry, name }: PackageRef) =>
  registry === DEFAULT_REGISTRY ? name : `${registry}/${name}`;

/** "npm downloads a week": a registry's downloads in its own unit; "… downloads" alone where it has none. */
export function registryDownloadsText(id: RegistryId) {
  const { label, downloads } = registryOf(id);
  return downloads ? `${label} downloads a ${downloads}` : `${label} downloads`;
}

/** "package.json", "package.json or pyproject.toml": the files the listed registries' packages are listed in. */
export const registryManifestList = () => [...new Set(REGISTRY_IDS.map((id) => REGISTRIES[id].manifest))].join(' or ');
