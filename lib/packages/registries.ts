import { isNpmPackageName, NPM_NAME_MAX_LENGTH } from '@/lib/packages/npm-package-name';
import {
  foldPypiName,
  isPypiProjectName,
  PYPI_NAME_MAX_LENGTH,
  pypiRequirementName,
} from '@/lib/packages/pypi-project-name';
import {
  CRATE_NAME_MAX_LENGTH,
  crateRequirementName,
  foldCrateName,
  foldNugetName,
  foldPackagistName,
  GEM_NAME_MAX_LENGTH,
  GO_NAME_MAX_LENGTH,
  goModuleOfPath,
  goRequirementName,
  isCrateName,
  isGemName,
  isGoModulePath,
  isMavenName,
  isNugetName,
  isPackagistName,
  isPubName,
  MAVEN_NAME_MAX_LENGTH,
  mavenRequirementName,
  NUGET_NAME_MAX_LENGTH,
  nugetRequirementName,
  PACKAGIST_NAME_MAX_LENGTH,
  PUB_NAME_MAX_LENGTH,
  packagistRequirementName,
  pubRequirementName,
  rubygemsRequirementName,
} from '@/lib/packages/registry-names';
import type { PackageRegistry } from '@/types/generated/graphql';

/**
 * The period a registry's downloads are counted over: `week` for the 7 days to the last day counted (a package's
 * `lastWeek` and `previousWeek`), `month` for a registry counted one calendar month at a time (its `last30Days` is the
 * month just ended, `previous30Days` the month before, and its history points are months).
 */
export type DownloadsUnit = 'week' | 'month';

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
  /** The site a package's page is on, where it is not called by the label: "Open on pkg.go.dev". */
  siteName?: string;
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
  /**
   * The one spelling the site's addresses use for a name the registry takes as the same in other spellings (PyPI:
   * `Zope.Interface` is `zope-interface`); the name as it is where every spelling is its own (npm).
   */
  canonicalName: (name: string) => string;
  /** How a name is spelled in the site's addresses, where `canonicalName` changes it: "in lower case, …". */
  nameInAddress?: string;
  /** The name in a requirement a visitor may paste (PyPI's `django>=5.0`); without one, the text is the name. */
  requirementName?: (requirement: string) => string;
  /**
   * The name a pasted page address's path names, where a page can be of a part of a package (Go: a package inside a
   * module); without one, the path is the name.
   */
  nameOfPagePath?: (path: string) => string;
  /** A name's form in an address's pattern, where it is more than one word: "{groupId}/{artifactId}". */
  addressPattern?: string;
  /** Where the registry's facts are read from, credited on a package's page, when that is not the registry itself. */
  factsCredit?: { label: string; url: string };
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
    canonicalName: (name) => name,
    nameMaxLength: NPM_NAME_MAX_LENGTH,
    path: { min: 1, max: 2, join: '/', scope: '@' },
    downloads: 'week',
    manifest: 'package.json',
    examples: ['react', '@types/node'],
    nameHint: 'react or @scope/name',
  },
  pypi: {
    label: 'PyPI',
    article: 'a',
    api: 'PYPI',
    pageUrl: (name) => `https://pypi.org/project/${name}/`,
    pageUrlPrefix: /^(?:https?:\/\/)?(?:www\.)?pypi\.org\/project\//i,
    isName: isPypiProjectName,
    canonicalName: foldPypiName,
    nameInAddress: 'in lower case, with each run of `-`, `_` and `.` as one `-`',
    requirementName: pypiRequirementName,
    nameMaxLength: PYPI_NAME_MAX_LENGTH,
    path: { min: 1, max: 1, join: '/' },
    downloads: 'month',
    manifest: 'requirements.txt or pyproject.toml',
    examples: ['requests', 'numpy'],
    nameHint: 'requests or numpy',
  },
  go: {
    label: 'Go',
    siteName: 'pkg.go.dev',
    article: 'a',
    api: 'GO',
    pageUrl: (name) => `https://pkg.go.dev/${name}`,
    pageUrlPrefix: /^(?:https?:\/\/)?(?:www\.)?pkg\.go\.dev\//i,
    isName: isGoModulePath,
    canonicalName: (name) => name,
    requirementName: goRequirementName,
    nameOfPagePath: goModuleOfPath,
    addressPattern: '{modulePath}',
    nameMaxLength: GO_NAME_MAX_LENGTH,
    path: { min: 1, max: null, join: '/' },
    downloads: null,
    manifest: 'go.mod',
    examples: ['github.com/gin-gonic/gin', 'golang.org/x/net'],
    nameHint: 'github.com/owner/module',
  },
  crates: {
    label: 'crates.io',
    article: 'a',
    api: 'CRATES',
    pageUrl: (name) => `https://crates.io/crates/${name}`,
    pageUrlPrefix: /^(?:https?:\/\/)?(?:www\.)?crates\.io\/crates\//i,
    isName: isCrateName,
    canonicalName: foldCrateName,
    nameInAddress: 'in lower case, with `_` for each `-`',
    requirementName: crateRequirementName,
    nameMaxLength: CRATE_NAME_MAX_LENGTH,
    path: { min: 1, max: 1, join: '/' },
    downloads: 'week',
    manifest: 'Cargo.toml',
    examples: ['serde', 'tokio'],
    nameHint: 'serde or tokio',
  },
  pub: {
    label: 'pub.dev',
    article: 'a',
    api: 'PUB',
    pageUrl: (name) => `https://pub.dev/packages/${name}`,
    pageUrlPrefix: /^(?:https?:\/\/)?(?:www\.)?pub\.dev\/packages\//i,
    isName: isPubName,
    canonicalName: (name) => name,
    requirementName: pubRequirementName,
    nameMaxLength: PUB_NAME_MAX_LENGTH,
    path: { min: 1, max: 1, join: '/' },
    downloads: 'month',
    manifest: 'pubspec.yaml',
    examples: ['http', 'provider'],
    nameHint: 'http or provider',
  },
  packagist: {
    label: 'Packagist',
    article: 'a',
    api: 'PACKAGIST',
    pageUrl: (name) => `https://packagist.org/packages/${name}`,
    pageUrlPrefix: /^(?:https?:\/\/)?(?:www\.)?packagist\.org\/packages\//i,
    isName: isPackagistName,
    canonicalName: foldPackagistName,
    nameInAddress: 'in lower case',
    requirementName: packagistRequirementName,
    addressPattern: '{vendor}/{package}',
    nameMaxLength: PACKAGIST_NAME_MAX_LENGTH,
    path: { min: 2, max: 2, join: '/' },
    downloads: 'month',
    manifest: 'composer.json',
    examples: ['laravel/framework', 'symfony/console'],
    nameHint: 'vendor/package',
  },
  maven: {
    label: 'Maven Central',
    article: 'a',
    api: 'MAVEN',
    pageUrl: (name) => `https://central.sonatype.com/artifact/${name.replace(':', '/')}`,
    pageUrlPrefix: /^(?:https?:\/\/)?(?:www\.)?(?:central\.sonatype\.com|mvnrepository\.com)\/artifact\//i,
    isName: isMavenName,
    canonicalName: (name) => name,
    requirementName: mavenRequirementName,
    addressPattern: '{groupId}/{artifactId}',
    factsCredit: { label: 'deps.dev', url: 'https://deps.dev/' },
    nameMaxLength: MAVEN_NAME_MAX_LENGTH,
    path: { min: 2, max: 2, join: ':' },
    downloads: null,
    manifest: 'pom.xml or build.gradle',
    examples: ['org.slf4j:slf4j-api', 'com.google.guava:guava'],
    nameHint: 'groupId:artifactId',
  },
  nuget: {
    label: 'NuGet',
    article: 'a',
    api: 'NUGET',
    pageUrl: (name) => `https://www.nuget.org/packages/${name}`,
    pageUrlPrefix: /^(?:https?:\/\/)?(?:www\.)?nuget\.org\/packages\//i,
    isName: isNugetName,
    canonicalName: foldNugetName,
    nameInAddress: 'in lower case',
    requirementName: nugetRequirementName,
    nameMaxLength: NUGET_NAME_MAX_LENGTH,
    path: { min: 1, max: 1, join: '/' },
    downloads: 'month',
    manifest: '.csproj or packages.config',
    examples: ['newtonsoft.json', 'serilog'],
    nameHint: 'Newtonsoft.Json or Serilog',
  },
  rubygems: {
    label: 'RubyGems',
    article: 'a',
    api: 'RUBYGEMS',
    pageUrl: (name) => `https://rubygems.org/gems/${name}`,
    pageUrlPrefix: /^(?:https?:\/\/)?(?:www\.)?rubygems\.org\/gems\//i,
    isName: isGemName,
    canonicalName: (name) => name,
    requirementName: rubygemsRequirementName,
    nameMaxLength: GEM_NAME_MAX_LENGTH,
    path: { min: 1, max: 1, join: '/' },
    downloads: 'month',
    manifest: 'Gemfile or .gemspec',
    examples: ['rails', 'rack'],
    nameHint: 'rails or rack',
  },
} as const satisfies Record<string, RegistryTraits>;

/** A row of the table, the site showing its registry or not. */
export type RegistryId = keyof typeof REGISTRIES;

/** Every row of the table, in its order, shown or not: what the API may already send (a cache tag) before it is. */
export const ALL_REGISTRY_IDS = Object.keys(REGISTRIES) as RegistryId[];

/**
 * The registries the site shows. A registry goes live by joining this list; until then its package and ranking
 * addresses are not found, and no switch, sitemap, list or search names it.
 */
export const LISTED_REGISTRIES = [
  'npm',
  'pypi',
  'go',
  'crates',
  'pub',
  'packagist',
  'maven',
  'nuget',
  'rubygems',
] as const satisfies readonly RegistryId[];

/**
 * Every registry the site shows, in the table's order. Everything a visitor reaches reads this list: the routes, the
 * registry switch, the copy that names the registries, the sitemaps, llms.txt and the badge builder's search.
 */
export const REGISTRY_IDS: RegistryId[] = ALL_REGISTRY_IDS.filter((id) =>
  (LISTED_REGISTRIES as readonly RegistryId[]).includes(id),
);

/** Whether a value names a row of the table (exact, letter case included), the site showing it or not. */
export const isRegistryRow = (value: unknown): value is RegistryId =>
  typeof value === 'string' && Object.hasOwn(REGISTRIES, value);

/** The registry `/packages` opens on, and the one a package named without a registry is on. */
export const DEFAULT_REGISTRY: RegistryId = 'npm';

/** Whether a URL's segment names a registry the site shows (exact, letter case included). */
export const isRegistryId = (value: unknown): value is RegistryId =>
  isRegistryRow(value) && REGISTRY_IDS.includes(value);

/** A registry's traits, typed as any registry's. */
export const registryOf = (id: RegistryId): RegistryTraits => REGISTRIES[id];

/** The registry the API names (`NPM`), or `null` for one the site does not list. */
export function registryOfApi(api: string | null | undefined): RegistryId | null {
  return REGISTRY_IDS.find((id) => REGISTRIES[id].api === api) ?? null;
}

/** The table's row of a registry as the API names it (`GO`), the site showing it or not; `null` for none. */
export function registryRowOfApi(api: string | null | undefined): RegistryId | null {
  return ALL_REGISTRY_IDS.find((id) => REGISTRIES[id].api === api) ?? null;
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

/**
 * The registries that count downloads but whose first count is not read yet, with when it comes: "early December 2026".
 * While a registry is here the site treats it as one without download counts: no downloads ranking, and nothing about
 * downloads in titles, tiles, badges or copy. pub.dev leaves it once its first month (November 2026, read December 1–3)
 * is applied. NuGet and RubyGems publish a running count of all downloads, read in the first days of each month: their
 * first month (December 2026) is the difference between December's read and January's, so they leave it once that
 * month is applied.
 */
export const DOWNLOADS_PENDING = {
  pub: 'early December 2026',
  nuget: 'early January 2027',
  rubygems: 'early January 2027',
} as const satisfies Partial<Record<RegistryId, string>>;

/** Whether a registry counts downloads but its first count is not read yet (`DOWNLOADS_PENDING`). */
export const isDownloadsPending = (id: RegistryId): id is keyof typeof DOWNLOADS_PENDING =>
  Object.hasOwn(DOWNLOADS_PENDING, id);

/**
 * How often the site shows a registry's downloads counted: its row's unit, or `null` for a registry that publishes no
 * download counts or whose first count is not read yet. What everything a visitor reaches reads, never the row's
 * `downloads`.
 */
export const downloadsUnitOf = (id: RegistryId): DownloadsUnit | null =>
  isDownloadsPending(id) ? null : registryOf(id).downloads;

/** Whether a registry has download counts, and so a downloads ranking and downloads badges. */
export const registryHasDownloads = (id: RegistryId) => downloadsUnitOf(id) !== null;

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

/**
 * "npm package", "npm or PyPI package"; with `article`, "an npm package": a package on any registry the site lists.
 * With more than two listed, the list would outgrow the sentence: "package", "a package".
 */
export function anyRegistryPackageText(article = false): string {
  if (REGISTRY_IDS.length > 2) return article ? 'a package' : 'package';
  const text = `${registryLabelList('or')} package`;
  return article ? `${REGISTRIES[REGISTRY_IDS[0]].article} ${text}` : text;
}

/** A package by its registry and its name as the registry writes it. */
export type PackageRef = { registry: RegistryId; name: string };

/**
 * A package's name as a visitor reads it: the registry's own spelling (`zope.interface`) when the API answers one, else
 * its name. Text only: addresses, keys and reads take `name`.
 */
export const spelledNameOf = ({ name, displayName }: { name: string; displayName?: string | null }) =>
  displayName || name;

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

/** How the site words a count of downloads in each unit. */
export const DOWNLOADS_UNIT_TEXT = {
  week: { per: 'a week', last: 'last week', before: 'the week before', adjective: 'weekly' },
  month: { per: 'last month', last: 'last month', before: 'the month before', adjective: 'monthly' },
} as const satisfies Record<
  DownloadsUnit,
  {
    /** After a count: "527,312 downloads a week", "downloaded 2,118 times last month". */
    per: string;
    /** The last period counted: "1,030,000 downloads last week". */
    last: string;
    /** The period before it: "vs the week before". */
    before: string;
    /** "weekly downloads", "Read monthly; downloads from npm, weekly". */
    adjective: string;
  }
>;

/** The fields a package's downloads are read from, in either unit. */
type DownloadsCounts = {
  lastWeek?: number | null;
  previousWeek?: number | null;
  last30Days?: number | null;
  previous30Days?: number | null;
};

/**
 * A package's downloads in its registry's unit: the last period counted and the one before it (`null` without one).
 * Last week's and the week before's for `week`; for `month`, the month just ended and the month before. `null` when
 * the registry has no download counts, or the count of its unit is missing.
 */
export function downloadsCountOf(
  unit: DownloadsUnit | null,
  downloads: DownloadsCounts | null | undefined,
): { last: number; previous: number | null } | null {
  if (!unit || !downloads) return null;
  const [last, previous] =
    unit === 'week' ? [downloads.lastWeek, downloads.previousWeek] : [downloads.last30Days, downloads.previous30Days];
  return typeof last === 'number' ? { last, previous: previous ?? null } : null;
}

/** "npm downloads a week", "PyPI downloads last month": a registry's downloads in its own unit; "… downloads" where it has none. */
export function registryDownloadsText(id: RegistryId) {
  const { label } = registryOf(id);
  const downloads = downloadsUnitOf(id);
  return downloads ? `${label} downloads ${DOWNLOADS_UNIT_TEXT[downloads].per}` : `${label} downloads`;
}

/**
 * "package.json", "package.json, requirements.txt or pyproject.toml": the files the registries' packages are listed
 * in, each once; every listed registry's unless `registries` names some.
 */
export function registryManifestList(registries: readonly RegistryId[] = REGISTRY_IDS): string {
  const files = [...new Set(registries.flatMap((id) => registryOf(id).manifest.split(' or ')))];
  return files.length > 1 ? `${files.slice(0, -1).join(', ')} or ${files.at(-1)}` : files.join('');
}

/** A package's name in the one spelling the site's addresses use: `zope-interface` for PyPI's `Zope.Interface`. */
export const canonicalNameOf = (id: RegistryId, name: string) => registryOf(id).canonicalName(name);
