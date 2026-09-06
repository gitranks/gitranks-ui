import { RANK_NAME } from '@/badge/badge.consts';
import type { BadgeV2Params } from '@/badge/badge.types';
import { LABEL_BG, VALUE_BG } from '@/badge/templates/inline/inline.consts';
import { absoluteSitemapUrl } from '@/lib/sitemap/sitemap-url';
import { BadgeContext, BadgeCornerStyle, BadgeMeta, BadgeType } from '@/types/badge.types';
import { UserRankProp } from '@/types/ranking.types';

export const CANONICAL_BADGE_VARIANTS = [
  'stars-rank',
  'contributions-rank',
  'followers-rank',
  'stars-score',
  'contributions-score',
  'followers-score',
] as const;

export type CanonicalBadgeVariant = (typeof CANONICAL_BADGE_VARIANTS)[number];

export type CanonicalBadgeFormat = 'svg' | 'png';

const SCORE_LABEL: Record<UserRankProp, string> = {
  [UserRankProp.s]: 'Total Stars',
  [UserRankProp.c]: 'Contribution Score',
  [UserRankProp.f]: 'Total Followers',
};

/** Matches gallery/screenshot score badges (darker blue than default VALUE_BG). */
const SCORE_VALUE_BG = '#1e3a8a';

const VARIANT_CONFIG: Record<
  CanonicalBadgeVariant,
  { ranking: UserRankProp; type: BadgeType; title: string; valueBgColor: string }
> = {
  'stars-rank': {
    ranking: UserRankProp.s,
    type: BadgeType.Position,
    title: RANK_NAME[UserRankProp.s],
    valueBgColor: VALUE_BG,
  },
  'contributions-rank': {
    ranking: UserRankProp.c,
    type: BadgeType.Position,
    title: RANK_NAME[UserRankProp.c],
    valueBgColor: VALUE_BG,
  },
  'followers-rank': {
    ranking: UserRankProp.f,
    type: BadgeType.Position,
    title: RANK_NAME[UserRankProp.f],
    valueBgColor: VALUE_BG,
  },
  'stars-score': {
    ranking: UserRankProp.s,
    type: BadgeType.Score,
    title: SCORE_LABEL[UserRankProp.s],
    valueBgColor: SCORE_VALUE_BG,
  },
  'contributions-score': {
    ranking: UserRankProp.c,
    type: BadgeType.Score,
    title: SCORE_LABEL[UserRankProp.c],
    valueBgColor: SCORE_VALUE_BG,
  },
  'followers-score': {
    ranking: UserRankProp.f,
    type: BadgeType.Score,
    title: SCORE_LABEL[UserRankProp.f],
    valueBgColor: SCORE_VALUE_BG,
  },
};

export function isCanonicalBadgeVariant(value: string): value is CanonicalBadgeVariant {
  return (CANONICAL_BADGE_VARIANTS as readonly string[]).includes(value);
}

export function parseCanonicalBadgeFile(file: string): {
  variant: CanonicalBadgeVariant;
  format: CanonicalBadgeFormat;
} | null {
  const match = /^(?<variant>[a-z-]+)\.(?<format>svg|png)$/.exec(file);
  if (!match?.groups) return null;
  const { variant, format } = match.groups;
  if (!isCanonicalBadgeVariant(variant)) return null;
  return { variant, format: format as CanonicalBadgeFormat };
}

export function getCanonicalBadgeParams(variant: CanonicalBadgeVariant): BadgeV2Params {
  const { ranking, type, title, valueBgColor } = VARIANT_CONFIG[variant];
  return {
    ranking,
    type,
    context: BadgeContext.Global,
    meta: BadgeMeta.None,
    label: title,
    cornerStyle: BadgeCornerStyle.Rounded,
    labelBgColor: LABEL_BG,
    valueBgColor,
  };
}

export function getCanonicalBadgeTitle(variant: CanonicalBadgeVariant): string {
  return VARIANT_CONFIG[variant].title;
}

/** Path only, e.g. `/badges/maslianok/stars-rank.svg` */
export function getCanonicalBadgePath(
  login: string,
  variant: CanonicalBadgeVariant,
  format: CanonicalBadgeFormat = 'svg',
): string {
  return `/badges/${encodeURIComponent(login)}/${variant}.${format}`;
}

export function getCanonicalBadgeUrl(
  login: string,
  variant: CanonicalBadgeVariant,
  format: CanonicalBadgeFormat = 'svg',
  baseUrl = process.env.NEXT_PUBLIC_URI?.replace(/\/+$/, '') ?? '',
): string {
  return `${baseUrl}${getCanonicalBadgePath(login, variant, format)}`;
}

/** Absolute PNG locs for sitemap image extension / IndexNow. */
export function listCanonicalBadgeImageUrls(login: string): string[] {
  return CANONICAL_BADGE_VARIANTS.map((variant) => absoluteSitemapUrl(getCanonicalBadgePath(login, variant, 'png')));
}
