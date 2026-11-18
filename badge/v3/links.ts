import type { ImageFormat } from './types';
import { isRankedIn, type RankingRanks, type RankingScores } from '@/badge/utils/is-ranked-in';
import { type RegistryId, segmentsOfName } from '@/lib/packages/registries';
import { UserRankProp } from '@/types/ranking.types';

/**
 * Badge image paths for pages, link previews and sitemaps. Kept apart from the renderer so pages can import it
 * without the drawing code.
 */

/** The entity a badge URL names, by its stored spelling: a package by its registry and its registry name. */
export type BadgeEntityPath =
  | { kind: 'user' | 'org'; login: string }
  | { kind: 'repo'; nameWithOwner: string }
  | { kind: 'package'; registry: RegistryId; name: string };

/** A part of a package's name in a URL: encoded, with a scope's `@` kept as it is, so a badge has one address. */
const packagePart = (part: string) => encodeURIComponent(part).replace(/^%40/, '@');

/** The entity's part of a badge path: `torvalds`, `acme/fastqueue`, `npm/react` or `npm/@types/node`. */
export function badgeNamePath(entity: BadgeEntityPath): string {
  switch (entity.kind) {
    case 'repo':
      return entity.nameWithOwner.split('/').map(encodeURIComponent).join('/');
    case 'package':
      return [entity.registry, ...segmentsOfName(entity.registry, entity.name)].map(packagePart).join('/');
    default:
      return encodeURIComponent(entity.login);
  }
}

/** `/badge/{user|org|repo|package}/{id}/{badge}.{svg|png}`, with the query, if any, in the order given. */
export function badgeImagePath(
  entity: BadgeEntityPath,
  id: string,
  format: ImageFormat,
  query: Record<string, string> = {},
): string {
  const search = new URLSearchParams(query).toString();
  return `/badge/${entity.kind}/${badgeNamePath(entity)}/${id}.${format}${search ? `?${search}` : ''}`;
}

/** The card each entity's page shares as its link preview. */
export const SOCIAL_CARD_ID = {
  user: 'profile-card',
  repo: 'rank-card',
  org: 'org-card',
  package: 'package-card',
} as const;

/** The size `?size=social` draws a card at. */
export const SOCIAL_CARD_SIZE = { width: 1200, height: 630 } as const;

/** The entity's card drawn for link previews: a 1200×630 PNG. */
export function socialCardPath(entity: BadgeEntityPath): string {
  return badgeImagePath(entity, SOCIAL_CARD_ID[entity.kind], 'png', { size: 'social' });
}

/**
 * Whether a developer's profile card has its fact: a place in the stars or the contributions ranking. Pass the global
 * ranks where they are known; `undefined` checks the scores alone (see `isRankedIn`).
 */
export function hasProfileCard(scores: RankingScores, globalRanks: RankingRanks | undefined): boolean {
  return isRankedIn(UserRankProp.s, scores, globalRanks) || isRankedIn(UserRankProp.c, scores, globalRanks);
}

/** A repository's rank card and an organization's card need a global rank. */
export const hasRankCard = (rank: { s?: number | null } | null | undefined): boolean => !!rank?.s;
