import { availabilityOf, type BadgeDefinition } from './catalogue';
import { awaitsRead, type EntityFacts } from './facts';
import type { BadgeParams } from './params';
import { shieldContent } from './shields';

/**
 * Badges and a read GitRanks has yet to make. Most repositories have no star history: GitRanks reads it for one when a
 * signed-in visitor presses Refresh on its page, and on its own for repositories with `HISTORY_READ_STARS` or more.
 * Only a few badges need it; the rest draw the same with or without it.
 */

/** Repository badges that read the star history: without it they draw "preparing", "not yet" or a neutral month. */
export const HISTORY_BADGES: ReadonlySet<string> = new Set(['star-history', 'stars-card', 'month']);

/** From this many stars GitRanks reads a repository's star history on its own, without a visitor's Refresh. */
export const HISTORY_READ_STARS = 1_000;

/**
 * Whether the badge waits on a read GitRanks has yet to make: a history badge of a repository without its star
 * history, or any badge of a developer whose first read is still running. Organizations have no such wait.
 */
export function awaitsReadFor(entity: EntityFacts, badgeId: string): boolean {
  switch (entity.kind) {
    case 'repo':
      return !entity.history && HISTORY_BADGES.has(badgeId);
    case 'user':
      return awaitsRead(entity);
    case 'org':
      return false;
  }
}

/** Whether the image draws "preparing" or "not yet" rather than its badge (see `renderBadge`). */
export function drawsProvisional(
  entity: EntityFacts,
  badge: BadgeDefinition,
  params: BadgeParams,
  now = new Date(),
): boolean {
  if (entity.kind === 'repo' && badge.id === 'star-history') return !entity.history;
  if (badge.format === 'shield') return shieldContent(entity, badge, params, now) === null;
  return availabilityOf(entity, badge.id, params, now) !== 'available';
}

/**
 * Whether the entity's data will change soon with nothing to expire its cached copies: a repository GitRanks reads
 * the star history of on its own (see `HISTORY_READ_STARS`), or a developer whose first read is running. A visitor's
 * Refresh expires the entity's cached data itself, at its start and at its end.
 */
export function readsSoon(entity: EntityFacts): boolean {
  switch (entity.kind) {
    case 'repo':
      return !entity.history && entity.stars >= HISTORY_READ_STARS;
    case 'user':
      return awaitsRead(entity);
    case 'org':
      return false;
  }
}

/** The query key an image on GitRanks' own pages carries while it waits on a read. Image routes ignore it. */
export const PENDING_KEY = 'pending';

/**
 * The extra query of an image on GitRanks' own pages: `{ pending: <stamp, base 36> }` while the image draws
 * "preparing" or "not yet" for want of a read (see `awaitsReadFor`), so it is never shown from a cache after the
 * read; nothing otherwise, so the clean URL, never fetched while the image waited, is the one used once it has data.
 * The code to copy never carries it.
 */
export function pendingQuery(
  entity: EntityFacts,
  badge: BadgeDefinition,
  params: BadgeParams,
  stamp: Date | number,
  now = new Date(stamp),
): Record<string, string> {
  return awaitsReadFor(entity, badge.id) && drawsProvisional(entity, badge, params, now)
    ? { [PENDING_KEY]: new Date(stamp).getTime().toString(36) }
    : {};
}
