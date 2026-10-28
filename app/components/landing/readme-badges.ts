import type { EntityFacts } from '@/badge/v3/facts';
import {
  availableChoices,
  type BadgeChoice,
  type BadgeTile,
  badgeTiles,
  entityNameOf,
  type TileLink,
} from '@/badge/v3/tiles';
import type { EntityKind } from '@/badge/v3/types';

/**
 * What the landing's README mock shows for each kind of entity, in order of preference: ranks, the monthly race, the
 * next goal, starred by and contributors, then a card for developers. No tier badge: the landing promotes none. A
 * badge the entity does not have is skipped, and the next one takes its place.
 */
export const README_BADGES: Record<EntityKind, { shields: BadgeChoice[]; card: BadgeChoice | null }> = {
  user: {
    shields: [{ id: 'rank' }, { id: 'language-rank' }, { id: 'month' }, { id: 'goal' }],
    card: { id: 'profile-card' },
  },
  repo: {
    shields: [
      { id: 'language-rank' },
      { id: 'goal' },
      { id: 'starred-by' },
      { id: 'month' },
      { id: 'rank' },
      { id: 'contributors' },
    ],
    card: null,
  },
  org: {
    shields: [
      { id: 'rank' },
      { id: 'contributors' },
      { id: 'contributors', query: { value: 'new' } },
      { id: 'top-repo' },
    ],
    card: null,
  },
};

/** A README line holds this many shields. */
export const README_SHIELDS = 3;

/** One entity's README: its name, its first available shields and, for a developer, a card. */
export type ReadmeContent = {
  kind: EntityKind;
  /** The login or `owner/name`. */
  name: string;
  shields: BadgeTile[];
  card: BadgeTile | null;
  /** Whether an image carries the render's stamp while it waits on a read (see `pendingQuery`). */
  pending: boolean;
};

/**
 * The README the landing draws for an entity; `null` when it has no shield to show. `link` says where a badge leads:
 * `embed` for the visitor's own profile, `find` for a showcase entity (make the same badge for one's own).
 */
export function readmeContent(entity: EntityFacts, link: TileLink, now = new Date()): ReadmeContent | null {
  const { shields, card } = README_BADGES[entity.kind];
  const shieldTiles = badgeTiles(entity, availableChoices(entity, shields, now).slice(0, README_SHIELDS), now, link);
  if (!shieldTiles.length) {
    return null;
  }
  const [cardTile = null] = card ? badgeTiles(entity, availableChoices(entity, [card], now), now, link) : [];
  return {
    kind: entity.kind,
    name: entityNameOf(entity),
    shields: shieldTiles,
    card: cardTile,
    pending: [...shieldTiles, ...(cardTile ? [cardTile] : [])].some(({ pending }) => pending),
  };
}
