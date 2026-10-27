import { type BadgeDefinition, findBadge } from '@/badge/v3/catalogue';
import { DEFAULT_CONTRIBUTOR_VALUE } from '@/badge/v3/contributors';
import { BadgeParamsError, cutLabel, resolveParams } from '@/badge/v3/params';
import type { EntityKind } from '@/badge/v3/types';
import { isGithubLogin, isRepoSlug } from '@/lib/routing/ranking-routes';

/**
 * The builder's URL carries its whole state, so every step can be linked and Back works:
 *
 * `/badge/builder?{user|org|repo}={name}&badge={id}&{style…}&step=embed`
 *
 * - no entity key: step 1 (Find) for any kind; an empty one (`?repo=`) narrows step 1 to that kind;
 * - a filled entity: step 2 (Badge);
 * - a badge as well: step 3 (Style), its style read from the same query;
 * - `step=embed` as well: step 4 (Embed).
 */

export const ENTITY_KEYS = ['user', 'org', 'repo'] as const satisfies readonly EntityKind[];

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

/** The builder's state from its query. Only the first entity key counts; style values are kept as written. */
export function parseBuilderQuery(query: URLSearchParams | BuilderQuery): BuilderState {
  const kind = ENTITY_KEYS.find((key) => read(query, key) !== null) ?? null;
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

/** Whether a name can name an entity of that kind at all; anything else is a miss without asking. */
export function isEntityName(kind: EntityKind, name: string): boolean {
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
    if (DEFAULT_STYLE[key] === value) continue;
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

/** A builder link for a state; an entity key with an empty name narrows step 1 to that kind. */
export function builderHref(state: {
  kind: EntityKind | null;
  name?: string | null;
  badge?: BadgeDefinition | null;
  style?: Style;
  embed?: boolean;
}): string {
  const parts: string[] = [];
  if (state.kind) parts.push(`${state.kind}=${encodeValue(state.name ?? '')}`);
  if (state.kind && state.name && state.badge) {
    parts.push(`badge=${state.badge.id}`);
    for (const [key, value] of styleQuery(state.badge, state.style ?? {})) parts.push(`${key}=${encodeValue(value)}`);
    if (state.embed) parts.push('step=embed');
  }
  return parts.length ? `/badge/builder?${parts.join('&')}` : '/badge/builder';
}

/**
 * Where picking an entity in step 1 leads. An old builder link without a login (`?user=&badge=tier&…`) keeps its
 * badge and style for an entity of the kind it names; anything else starts at step 2.
 */
export function pickTarget(
  state: Pick<BuilderState, 'kind' | 'badge' | 'style'>,
  kind: EntityKind,
  name: string,
): { kind: EntityKind; name: string; badge: BadgeDefinition | null; style: Style } {
  const keep = kind === state.kind && !!state.badge;
  return { kind, name, badge: keep ? state.badge : null, style: keep ? state.style : {} };
}
