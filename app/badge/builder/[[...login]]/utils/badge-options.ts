import { type Style, styleQuery } from './builder-state';
import {
  availabilityOf,
  type BadgeDefinition,
  badgesOf,
  type ExtraKey,
  repoLanguageOf,
  userLanguageOf,
} from '@/badge/v3/catalogue';
import { contributorCount } from '@/badge/v3/contributors';
import { type EntityFacts, wallOf } from '@/badge/v3/facts';
import { type BadgeParams, BadgeParamsError, resolveParams, schemesOf } from '@/badge/v3/params';
import { shieldContent } from '@/badge/v3/shields';
import type { BadgeFormat, By, ContributorKey, Scheme, Segment, WallOrder } from '@/badge/v3/types';

/** A badge the builder offers, with the options it starts from (a developer ranked only by contributions starts there). */
export type OfferedBadge = { badge: BadgeDefinition; style: Style };

const BYS: By[] = ['stars', 'contributions', 'followers'];

/** The params a style resolves to, or `null` when the badge cannot take it. */
export function paramsOf(badge: BadgeDefinition, style: Style): BadgeParams | null {
  try {
    return resolveParams(badge, styleQuery(badge, style));
  } catch (error) {
    if (error instanceof BadgeParamsError) return null;
    throw error;
  }
}

export function isAvailable(entity: EntityFacts, badge: BadgeDefinition, style: Style, now = new Date()): boolean {
  const params = paramsOf(badge, style);
  return !!params && availabilityOf(entity, badge.id, params, now) === 'available';
}

/** Options that may stop applying to an entity (a country rank, a language, a wall order), dropped first to last. */
export const SETTLE_KEYS = ['scope', 'language', 'order', 'extra'] as const;

/**
 * The style with the options dropped, in `SETTLE_KEYS` order, until the badge is available again; `keep` names options
 * the visitor just chose, which stay. `null` when the badge is not available even then.
 */
export function settleStyle(
  entity: EntityFacts,
  badge: BadgeDefinition,
  style: Style,
  now = new Date(),
  keep: readonly string[] = [],
): Style | null {
  const next: Style = { ...style };
  if (isAvailable(entity, badge, next, now)) return next;
  for (const key of SETTLE_KEYS) {
    if (keep.includes(key) || next[key] === undefined) continue;
    delete next[key];
    if (isAvailable(entity, badge, next, now)) return next;
  }
  return null;
}

/**
 * The entity's available badges in catalogue order, each with the first ranking it is available in; badges with
 * nothing to show (and the developer contributors wall, never offered) are left out.
 */
export function offeredBadges(entity: EntityFacts, now = new Date()): OfferedBadge[] {
  return badgesOf(entity.kind).flatMap((badge): OfferedBadge[] => {
    const starts: Style[] = badge.options.includes('by') ? BYS.map((by) => (by === 'stars' ? {} : { by })) : [{}];
    const style = starts.find((start) => isAvailable(entity, badge, start, now));
    return style ? [{ badge, style }] : [];
  });
}

export const FORMAT_GROUPS: { format: BadgeFormat; name: string }[] = [
  { format: 'shield', name: 'Shields' },
  { format: 'card', name: 'Cards' },
  { format: 'chart', name: 'Charts' },
];

/** The text of a shield segment. */
export const segmentText = (segment: Segment | undefined | null) =>
  segment?.runs.map(({ text }) => text).join('') ?? '';

/** What a shield says, in one line: "repo rank #41,206 · top 1%". */
export function shieldText(entity: EntityFacts, badge: BadgeDefinition, params: BadgeParams, now = new Date()) {
  const content = shieldContent(entity, badge, params, now);
  if (!content) return null;
  const extra = segmentText(content.extra);
  return `${content.label} ${segmentText(content.value)}${extra ? ` · ${extra}` : ''}`;
}

/** The entity's name as its URLs write it. */
export const entityName = (entity: EntityFacts) => (entity.kind === 'repo' ? entity.nameWithOwner : entity.login);

/** The image's alt text: the entity and the fact it shows. */
export function badgeAlt(entity: EntityFacts, badge: BadgeDefinition, style: Style, now = new Date()): string {
  const params = paramsOf(badge, style);
  const fact = (params && badge.format === 'shield' && shieldText(entity, badge, params, now)) || badge.title;
  return `${entityName(entity)} on GitRanks: ${fact}`;
}

export const EXTRA_NAMES: Record<ExtraKey, string> = {
  top: 'Top share',
  month: 'This month',
  goal: 'Rank goal',
  of: 'List size',
  togo: 'Still to go',
  race: 'Race with last month',
  count: 'More top developers',
  shared: 'Shared contributors',
  repos: 'Repositories',
  rank: 'Rank',
  stars: 'Stars',
  level: 'Tier level',
  '12mo': 'Active in 12 months',
  new: 'New last month',
  '5yr': 'In 5 years',
  countries: 'Countries',
  legends: 'Legends',
};

/** "Active in 12 months" and the rest, for contributor keys used as an extra or a value. */
export const CONTRIBUTOR_NAMES: Record<ContributorKey, string> = {
  '12mo': 'Active in 12 months',
  month: 'Active last month',
  new: 'New last month',
  '5yr': 'In 5 years',
  countries: 'Countries',
  legends: 'Legends',
};

export type Choice<T extends string> = { value: T; name: string; sample?: string };

/** The shield's extras that have something to show with these params, each with what it would say. */
export function extraChoices(
  entity: EntityFacts,
  badge: BadgeDefinition,
  params: BadgeParams,
  now = new Date(),
): Choice<ExtraKey>[] {
  if (badge.format !== 'shield') return [];
  return badge.extras.flatMap((extra): Choice<ExtraKey>[] => {
    if (badge.values && extra === params.value) return [];
    const sample = segmentText(shieldContent(entity, badge, { ...params, extra }, now)?.extra);
    if (!sample) return [];
    const name = badge.values ? CONTRIBUTOR_NAMES[extra as ContributorKey] : EXTRA_NAMES[extra];
    return [{ value: extra, name, sample }];
  });
}

/** The contributor facts the entity has, for a contributors shield's value. */
export function valueChoices(entity: EntityFacts, badge: BadgeDefinition): Choice<ContributorKey>[] {
  if (!badge.values || entity.kind === 'user') return [];
  return badge.values
    .filter((key) => contributorCount(entity, key) !== null)
    .map((key) => ({ value: key, name: CONTRIBUTOR_NAMES[key] }));
}

const BY_NAMES: Record<By, string> = { stars: 'Stars', contributions: 'Contributions', followers: 'Followers' };

/** The rankings the badge is available in, for a developer badge that reads `by`. */
export function byChoices(entity: EntityFacts, badge: BadgeDefinition, style: Style, now = new Date()): Choice<By>[] {
  if (!badge.options.includes('by')) return [];
  return BYS.filter((by) => isAvailable(entity, badge, { ...style, by }, now)).map((by) => ({
    value: by,
    name: BY_NAMES[by],
  }));
}

/** All developers, or their country's, where the badge is available there. */
export function scopeChoices(
  entity: EntityFacts,
  badge: BadgeDefinition,
  style: Style,
  now = new Date(),
): Choice<'global' | 'country'>[] {
  if (entity.kind !== 'user' || !badge.options.includes('scope')) return [];
  const choices: Choice<'global' | 'country'>[] = [{ value: 'global', name: 'All developers' }];
  if (entity.country && isAvailable(entity, badge, { ...style, scope: 'country' }, now)) {
    choices.push({ value: 'country', name: entity.country });
  }
  return choices.length > 1 ? choices : [];
}

/** A developer's ranked languages, best first, for a language rank. */
export function languageChoices(entity: EntityFacts, badge: BadgeDefinition): Choice<string>[] {
  if (entity.kind !== 'user' || !badge.options.includes('language')) return [];
  return entity.languages
    .filter(({ rank }) => !!rank)
    .toSorted((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    .map(({ name, rank }) => ({ value: name, name, sample: `#${rank?.toLocaleString('en-US')}` }));
}

/** The language a language rank shows with this style: the asked one, or the best (a repository has only its own). */
export function languageOf(entity: EntityFacts, language: string | undefined): string | null {
  if (entity.kind === 'repo') return repoLanguageOf(entity, language ?? null);
  if (entity.kind === 'user') return userLanguageOf(entity, language ?? null)?.name ?? null;
  return null;
}

const ORDER_NAMES: Record<WallOrder, string> = {
  popular: 'Most popular first',
  contributions: 'Most contributions first',
  newest: 'Newest first',
};

/** The orders a wall has people in. */
export function orderChoices(entity: EntityFacts, badge: BadgeDefinition, style: Style, now = new Date()) {
  if (!badge.options.includes('order')) return [];
  return (['popular', 'contributions', 'newest'] as const)
    .filter((order) => wallOf(entity, order) && isAvailable(entity, badge, { ...style, order }, now))
    .map((order): Choice<WallOrder> => ({ value: order, name: ORDER_NAMES[order] }));
}

/** A repository's rank and language rank are one choice in the builder: "Rank among all repositories | Rust". */
export function rankAmongChoices(entity: EntityFacts, badge: BadgeDefinition, now = new Date()) {
  if (entity.kind !== 'repo' || (badge.id !== 'rank' && badge.id !== 'language-rank')) return [];
  const language = repoLanguageOf(entity, null);
  const languageRank = badgesOf('repo').find(({ id }) => id === 'language-rank');
  if (!language || !languageRank || !isAvailable(entity, languageRank, {}, now)) return [];
  return [
    { value: 'rank', name: 'All repositories' },
    { value: 'language-rank', name: language },
  ];
}

export type SchemeChoice = { value: Scheme; name: string; hint?: string; swatches: string[] };

const SCHEME_CHOICES: Record<Scheme, Omit<SchemeChoice, 'value'>> = {
  auto: { name: 'Auto', hint: 'light or dark', swatches: ['linear-gradient(135deg, #e4e4e7 50%, #3f3f46 50%)'] },
  night: { name: 'Night', swatches: ['#3f3f46', '#212830'] },
  violet: { name: 'Violet', swatches: ['#52525b', '#6d28d9'] },
  tier: { name: 'Tier color', swatches: ['#52525b', '#1447e6'] },
  classic: { name: 'Classic', swatches: ['#5c5c5c', '#2282c2'] },
  custom: { name: 'Custom', swatches: [] },
};

/** The colour schemes the badge takes, in one row. */
export const schemeChoices = (badge: BadgeDefinition): SchemeChoice[] =>
  schemesOf(badge).map((value) => ({ value, ...SCHEME_CHOICES[value] }));

/** Where picked colours start: Night's. */
export const CUSTOM_START = { left: '#3f3f46', right: '#212830' } as const;
