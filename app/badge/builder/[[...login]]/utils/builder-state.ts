import { type BadgeDefinition, findBadge } from '@/badge/v3/catalogue';
import { DEFAULT_CONTRIBUTOR_VALUE } from '@/badge/v3/contributors';
import { BadgeParamsError, cutLabel, resolveParams } from '@/badge/v3/params';
import type { EntityKind } from '@/badge/v3/types';
import { isNpmPackageName } from '@/lib/packages/npm-package-name';
import { isGithubLogin, isRepoSlug } from '@/lib/routing/ranking-routes';

/**
 * The builder's URL carries its whole state, so every step can be linked and Back works:
 *
 * `/badge/builder?{user|org|repo|package}={name}&badge={id}&{style…}&step=embed`
 *
 * A package is named as its badge URLs name it, `npm/<name>`; its key counts only for a visitor packages are shown to.
 *
 * - no entity key: step 1 (Find) for any kind; an empty one (`?repo=`) narrows step 1 to that kind;
 * - a filled entity: step 2 (Badge);
 * - a badge as well: step 3 (Style), its style read from the same query;
 * - `step=embed` as well: step 4 (Embed).
 */

export const ENTITY_KEYS = ['user', 'org', 'repo', 'package'] as const satisfies readonly EntityKind[];

/** The badge query names the builder writes, in the order it writes them. */
export const STYLE_KEYS = [
  'by',
  'scope',
  'language',
  'value',
  'extra',
  'order',
  'rows',
  'tiers',
  'scheme',
  'left',
  'right',
  'label',
  'logo',
] as const;

export type StyleKey = (typeof STYLE_KEYS)[number];
export type Style = Partial<Record<StyleKey, string>>;

export const STEPS = ['find', 'badge', 'style', 'embed'] as const;
export type BuilderStep = (typeof STEPS)[number];

export const STEP_NAMES: Record<BuilderStep, string> = { find: 'Find', badge: 'Badge', style: 'Style', embed: 'Embed' };

/** Every query name the builder reads. */
export const BUILDER_KEYS = [...ENTITY_KEYS, 'badge', 'step', ...STYLE_KEYS] as const;
export type BuilderQuery = Partial<Record<(typeof BUILDER_KEYS)[number], string | null>>;

export type BuilderState = {
  /** The kind the URL names, filled or not; `null` when it names none. */
  kind: EntityKind | null;
  /** The entity's login or `owner/name`, trimmed; `null` when the key is empty or missing. */
  name: string | null;
  /** A badge of the catalogue for that kind; `null` when missing or unknown. */
  badge: BadgeDefinition | null;
  embed: boolean;
  style: Style;
};

const read = (query: URLSearchParams | BuilderQuery, key: string): string | null => {
  const value = query instanceof URLSearchParams ? query.get(key) : query[key as keyof BuilderQuery];
  return typeof value === 'string' ? value : null;
};

/**
 * The query that puts the entity's stored name in the URL when the URL names it otherwise: another spelling, or an
 * old name of a repository that was renamed or moved, whose facts come back under the current name. The badge URL and
 * the snippets then use the name that stays valid. `null` when they already agree.
 */
export function storedNameQuery(state: Pick<BuilderState, 'kind' | 'name'>, storedName: string): BuilderQuery | null {
  return state.kind && storedName !== state.name ? { [state.kind]: storedName } : null;
}

/** Whether the query names a package (`?package=…`), which counts only once packages are known to be shown. */
export const namesPackage = (query: URLSearchParams | BuilderQuery) => read(query, 'package') !== null;

/**
 * The builder's state from its query. Only the first entity key counts; style values are kept as written. A package's
 * key counts only with `packages` (packages are shown to the visitor); without it the builder is today's.
 */
export function parseBuilderQuery(
  query: URLSearchParams | BuilderQuery,
  { packages = false }: { packages?: boolean } = {},
): BuilderState {
  const kind = ENTITY_KEYS.find((key) => (packages || key !== 'package') && read(query, key) !== null) ?? null;
  const name = kind ? read(query, kind)?.trim() || null : null;
  const badgeId = read(query, 'badge');
  const badge = kind && badgeId ? findBadge(kind, badgeId) : null;
  const style: Style = {};
  for (const key of STYLE_KEYS) {
    const value = read(query, key);
    if (value !== null && value !== '') style[key] = value;
  }
  return { kind, name, badge, embed: read(query, 'step') === 'embed', style };
}

/** The step the URL asks for, before the entity is looked up. */
export function stepOf(state: Pick<BuilderState, 'name' | 'badge' | 'embed'>): BuilderStep {
  if (!state.name) return 'find';
  if (!state.badge) return 'badge';
  return state.embed ? 'embed' : 'style';
}

/** The npm package a builder name `npm/<name>` names: its name, or `null`. */
export function packageNameOf(name: string): string | null {
  const [registry, ...rest] = name.split('/');
  const packageName = rest.join('/');
  return registry === 'npm' && isNpmPackageName(packageName) ? packageName : null;
}

/** An entity's name as people read it: a package's own name, without its registry. */
export const entityLabel = (kind: EntityKind, name: string) =>
  kind === 'package' ? (packageNameOf(name) ?? name) : name;

/** Whether a name can name an entity of that kind at all; anything else is a miss without asking. */
export function isEntityName(kind: EntityKind, name: string): boolean {
  if (kind === 'package') {
    return packageNameOf(name) !== null;
  }
  if (kind === 'repo') {
    const [owner, repo, ...rest] = name.split('/');
    return !rest.length && !!repo && isRepoSlug(owner, repo);
  }
  return isGithubLogin(name);
}

export type SearchTarget = { kind: 'repo'; name: string } | { kind: 'login'; name: string };

/**
 * What a Find search names: `owner/name` is a repository, anything else a login (a developer or an organization).
 * Spaces, a pasted github.com URL and a leading `@` are dropped; `null` when it cannot name either.
 */
export function parseSearch(input: string): SearchTarget | null {
  // Past `owner/name` (`/issues/1`, `/tree/main`) still names the repository.
  const [owner = '', name] = input
    .replace(/\s+/g, '')
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '')
    .replace(/[?#].*$/, '')
    .replace(/^@/, '')
    .split('/')
    .filter(Boolean);

  if (name !== undefined) {
    return isRepoSlug(owner, name) ? { kind: 'repo', name: `${owner}/${name}` } : null;
  }
  return isGithubLogin(owner) ? { kind: 'login', name: owner } : null;
}

/** What may lead an npm package's name when a visitor pastes it: its page's address (`npmjs.com/package/`), `npm:`. */
const NPM_PREFIX = /^(?:(?:https?:\/\/)?(?:www\.)?npmjs\.(?:com|org)\/package\/|npm:)/i;

/**
 * The npm package a Find search names, as the builder names it (`npm/<name>`); `null` when it cannot name one. Spaces
 * are dropped, and so are an npm page's address, `npm:` and a version after the name (`react@19`).
 */
export function parsePackageSearch(input: string): string | null {
  const bare = input
    .replace(/\s+/g, '')
    .replace(NPM_PREFIX, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '');
  // A version after the name, not a scope's own `@`.
  const name = bare.replace(/(?<=.)@[^/]*$/, '');
  return isNpmPackageName(name) ? `npm/${name}` : null;
}

/** What a search asks for: a kind and the name it is asked under. */
export type SearchLookup = { kind: EntityKind; name: string };

/** The GitHub kinds a GitHub search can be, in the order results are listed. */
function githubKindsFor(target: SearchTarget, narrowed: EntityKind | null): EntityKind[] {
  if (target.kind === 'repo') return narrowed && narrowed !== 'repo' ? [] : ['repo'];
  if (narrowed === 'repo') return [];
  return narrowed ? [narrowed] : ['user', 'org'];
}

/**
 * What a Find search asks for. `owner/name` is a repository, a login a developer or an organization. Once packages
 * are shown (`packages`), a name is an npm package too, and a scoped name (`@scope/name`), an npm page's address or
 * `npm:name` a package only. Narrowed to packages, the search names one package; without `packages`, nothing.
 */
export function searchLookups(input: string, narrowed: EntityKind | null, packages = false): SearchLookup[] {
  if (narrowed === 'package') {
    const pkg = packages ? parsePackageSearch(input) : null;
    return pkg ? [{ kind: 'package', name: pkg }] : [];
  }
  const pkg = packages && !narrowed ? parsePackageSearch(input) : null;
  const trimmed = input.replace(/\s+/g, '');
  if (pkg && (trimmed.startsWith('@') || NPM_PREFIX.test(trimmed))) {
    return [{ kind: 'package', name: pkg }];
  }
  const target = parseSearch(input);
  const github = target ? githubKindsFor(target, narrowed).map((kind) => ({ kind, name: target.name })) : [];
  return pkg && target?.kind === 'login' ? [...github, { kind: 'package', name: pkg }] : github;
}

const DEFAULT_STYLE: Style = {
  by: 'stars',
  scope: 'global',
  order: 'popular',
  rows: '3',
  tiers: '1',
  scheme: 'auto',
  logo: '1',
  value: DEFAULT_CONTRIBUTOR_VALUE,
};

/** The keys a badge reads: the shared ones, its options, and the shield-only extra, value and label. */
function keysOf(badge: BadgeDefinition): Set<StyleKey> {
  const keys = new Set<StyleKey>(['scheme', 'left', 'right', 'logo']);
  for (const option of badge.options) {
    if ((STYLE_KEYS as readonly string[]).includes(option)) keys.add(option as StyleKey);
  }
  if (badge.format === 'shield') {
    keys.add('extra');
    keys.add('label');
  }
  return keys;
}

const accepts = (badge: BadgeDefinition, style: Style) => {
  try {
    resolveParams(badge, style as Record<string, string>);
    return true;
  } catch (error) {
    if (error instanceof BadgeParamsError) return false;
    throw error;
  }
};

/**
 * The style a badge's URL carries: only keys the badge reads, values it accepts, and nothing that repeats a default,
 * so a link stays short and a hand-edited one never draws a 400. Picked colours go with `scheme=custom`, both or
 * neither.
 */
export function cleanStyle(badge: BadgeDefinition, style: Style): Style {
  const keys = keysOf(badge);
  const out: Style = {};
  for (const key of STYLE_KEYS) {
    const value = style[key];
    if (value === undefined || !keys.has(key) || key === 'left' || key === 'right') continue;
    if ((key === 'scheme' ? (badge.defaultScheme ?? DEFAULT_STYLE.scheme) : DEFAULT_STYLE[key]) === value) continue;
    // The default extra, or "none" where the badge shows no extra by default.
    if (key === 'extra' && (value === badge.defaultExtra || (value === 'none' && badge.defaultExtra === null)))
      continue;
    if (key === 'scheme' && value === 'custom') {
      const colors = { scheme: 'custom', left: style.left ?? '', right: style.right ?? '' };
      if (accepts(badge, { ...out, ...colors })) Object.assign(out, colors);
      continue;
    }
    if (key === 'label') {
      // Cut as the image cuts it, so the URL never carries more than the badge shows.
      const label = cutLabel(value);
      if (label) out.label = label;
      continue;
    }
    if (accepts(badge, { ...out, [key]: value })) out[key] = value;
  }
  // `extra` checked before `value` would refuse an extra equal to a later value: check the pair once more.
  if (out.extra && !accepts(badge, out)) delete out.extra;
  return out;
}

/** The style as a badge image's query, in the builder's key order. */
export function styleQuery(badge: BadgeDefinition, style: Style): URLSearchParams {
  const clean = cleanStyle(badge, style);
  const query = new URLSearchParams();
  for (const key of STYLE_KEYS) {
    const value = clean[key];
    if (value !== undefined) query.set(key, value);
  }
  return query;
}

/** Query values with `/`, `@` and `:` left readable, as the builder writes them. */
const encodeValue = (value: string) => encodeURIComponent(value).replace(/%2F/gi, '/').replace(/%40/g, '@');

/**
 * A builder link for a state. An entity key with an empty name narrows step 1 to that kind; a badge with it is the one
 * the visitor picked before their entity (in the gallery), kept with its style for the entity they find.
 */
export function builderHref(state: {
  kind: EntityKind | null;
  name?: string | null;
  badge?: BadgeDefinition | null;
  style?: Style;
  embed?: boolean;
}): string {
  const parts: string[] = [];
  if (state.kind) parts.push(`${state.kind}=${encodeValue(state.name ?? '')}`);
  if (state.kind && state.badge) {
    parts.push(`badge=${state.badge.id}`);
    for (const [key, value] of styleQuery(state.badge, state.style ?? {})) parts.push(`${key}=${encodeValue(value)}`);
    if (state.name && state.embed) parts.push('step=embed');
  }
  return parts.length ? `/badge/builder?${parts.join('&')}` : '/badge/builder';
}

/**
 * Where picking an entity in step 1 leads. A badge picked before the entity (a gallery link, or an old builder link
 * without a login: `?repo=&badge=star-history&…`) is kept with its style for an entity of the kind it names, so the
 * builder goes on to step 3 (or to step 2 when that badge has nothing to show for the entity); anything else starts
 * at step 2.
 */
export function pickTarget(
  state: Pick<BuilderState, 'kind' | 'badge' | 'style'>,
  kind: EntityKind,
  name: string,
): { kind: EntityKind; name: string; badge: BadgeDefinition | null; style: Style } {
  const keep = kind === state.kind && !!state.badge;
  return { kind, name, badge: keep ? state.badge : null, style: keep ? state.style : {} };
}
