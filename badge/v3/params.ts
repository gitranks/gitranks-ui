import { z } from 'zod';

import type { BadgeDefinition, ExtraKey } from './catalogue';
import { CONTRIBUTOR_KEYS, DEFAULT_CONTRIBUTOR_VALUE } from './contributors';
import type { By, ContributorKey, Preset, Scheme, Scope, Theme, WallOrder } from './types';

/** Custom label text is cut to this many characters. */
export const LABEL_MAX_LENGTH = 40;

const hex = z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);

/**
 * The query of a v3 badge URL (spec §5.1). Not strict: unknown keys, such as a README's `?v=2`, are ignored; a known
 * key with an invalid value fails.
 */
export const BadgeQuerySchema = z
  .object({
    extra: z
      .string()
      .regex(/^[a-z0-9-]{1,20}$/)
      .optional(),
    value: z.enum(CONTRIBUTOR_KEYS).optional(),
    logo: z.enum(['0', '1']).optional(),
    scheme: z.enum(['custom', 'auto', 'tint']).optional(),
    preset: z.enum(['night', 'classic', 'violet']).optional(),
    left: hex.optional(),
    right: hex.optional(),
    theme: z.enum(['light', 'dark']).optional(),
    label: z.string().max(1000).optional(),
    by: z.enum(['stars', 'contributions', 'followers']).optional(),
    scope: z.enum(['global', 'country']).optional(),
    language: z.string().trim().min(1).max(64).optional(),
    size: z.enum(['social']).optional(),
    order: z.enum(['popular', 'contributions', 'newest']).optional(),
    rows: z.enum(['1', '2', '3', '4', '5']).optional(),
    tiers: z.enum(['0', '1']).optional(),
  })
  .refine(({ left, right }) => (left === undefined) === (right === undefined), {
    message: 'left and right go together',
  });

export type BadgeQuery = z.infer<typeof BadgeQuerySchema>;

export type BadgeParams = {
  /** The extra to show; `null` for none. */
  extra: ExtraKey | null;
  value: ContributorKey;
  logo: boolean;
  scheme: Scheme;
  preset: Preset;
  /** Picked colours, both or neither. */
  colors: { left: string; right: string } | null;
  /** Pins one drawing of an Auto badge. */
  theme: Theme | null;
  /** Custom label text, trimmed and cut. */
  label: string | null;
  by: By;
  scope: Scope;
  language: string | null;
  size: 'social' | null;
  order: WallOrder;
  rows: number;
  tiers: boolean;
};

export class BadgeParamsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BadgeParamsError';
  }
}

/** The defaults of a badge, as the builder starts it. */
export function defaultParams(badge: BadgeDefinition): BadgeParams {
  return {
    extra: badge.defaultExtra,
    value: DEFAULT_CONTRIBUTOR_VALUE,
    logo: true,
    scheme: badge.format === 'shield' ? 'custom' : 'auto',
    preset: 'night',
    colors: null,
    theme: null,
    label: null,
    by: 'stars',
    scope: 'global',
    language: null,
    size: null,
    order: 'popular',
    rows: 3,
    tiers: true,
  };
}

/** Trimmed and cut to 40 characters; empty means the badge's own label. */
export function cutLabel(label: string | undefined): string | null {
  const trimmed = label?.trim();
  return trimmed ? [...trimmed].slice(0, LABEL_MAX_LENGTH).join('').trim() : null;
}

/**
 * A badge's parameters from its query. Throws `BadgeParamsError` for a value the badge cannot take: an extra or a
 * contributor value it does not allow, Custom colours on a card or chart, `newest` on a developer's wall, or a lone
 * `left` or `right`. Options a badge does not read are ignored.
 */
export function resolveParams(badge: BadgeDefinition, search: URLSearchParams | Record<string, string>): BadgeParams {
  const raw = search instanceof URLSearchParams ? Object.fromEntries(search.entries()) : search;
  const parsed = BadgeQuerySchema.safeParse(raw);
  if (!parsed.success) {
    throw new BadgeParamsError(
      parsed.error.issues.map(({ path, message }) => `${path.join('.')}: ${message}`).join('; '),
    );
  }
  const query = parsed.data;
  const params = defaultParams(badge);
  const takes = (option: BadgeDefinition['options'][number]) => badge.options.includes(option);

  if (badge.format === 'shield' && query.extra !== undefined) {
    if (query.extra === 'none') {
      params.extra = null;
    } else if ((badge.extras as readonly string[]).includes(query.extra)) {
      params.extra = query.extra as ExtraKey;
    } else {
      throw new BadgeParamsError(`extra: ${badge.id} does not take "${query.extra}"`);
    }
  }

  if (takes('value') && query.value !== undefined) {
    if (!badge.values?.includes(query.value)) {
      throw new BadgeParamsError(`value: ${badge.id} does not take "${query.value}"`);
    }
    params.value = query.value;
  }

  if (query.scheme === 'custom' && badge.format !== 'shield') {
    throw new BadgeParamsError('scheme: custom colours are for shields');
  }
  params.scheme = query.scheme ?? params.scheme;
  params.preset = query.preset ?? params.preset;
  params.colors = query.left && query.right ? { left: query.left, right: query.right } : null;
  params.theme = query.theme ?? null;
  params.logo = query.logo !== '0';
  params.label = badge.format === 'shield' ? cutLabel(query.label) : null;

  if (takes('by')) params.by = query.by ?? params.by;
  if (takes('scope')) params.scope = query.scope ?? params.scope;
  if (takes('language')) params.language = query.language ?? null;
  if (takes('size')) params.size = query.size ?? null;
  if (takes('rows') && query.rows) params.rows = Number(query.rows);
  if (takes('tiers')) params.tiers = query.tiers !== '0';
  if (takes('order') && query.order) {
    if (query.order === 'newest' && badge.entity === 'user') {
      throw new BadgeParamsError('order: a developer wall has no "newest"');
    }
    params.order = query.order;
  }

  return params;
}
