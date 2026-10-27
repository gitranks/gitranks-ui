import type { BadgeChoice } from '@/badge/v3/tiles';
import type { EntityKind } from '@/badge/v3/types';

/** The gallery's sections, in order. */
export const GALLERY_SECTIONS: { kind: EntityKind; title: string; make: string; leader: string }[] = [
  { kind: 'user', title: 'Developers', make: 'Make a developer badge', leader: 'the #1 developer by stars' },
  { kind: 'repo', title: 'Repositories', make: 'Make a repository badge', leader: 'the #1 repository' },
  { kind: 'org', title: 'Organizations', make: 'Make an organization badge', leader: 'the #1 organization' },
];

/** A wall in the gallery draws two rows: the same badge, fewer bytes. */
const WALL: BadgeChoice = { id: 'contributors-wall', query: { rows: '2' } };

/**
 * What the gallery shows for each kind of entity, in order: the shields and cards that work best for it, drawn for
 * today's #1. A badge the #1 does not have is left out, so no rank goal (a #1 has none). Tier badges stay in the
 * builder; the developer contributors wall is never shown.
 */
export const GALLERY_BADGES: Record<EntityKind, BadgeChoice[]> = {
  user: [
    { id: 'rank' },
    { id: 'rank', query: { scope: 'country' } },
    { id: 'language-rank' },
    { id: 'rank', query: { by: 'contributions' } },
    { id: 'profile-card' },
    { id: 'count-chart' },
  ],
  repo: [
    { id: 'rank' },
    { id: 'language-rank' },
    { id: 'starred-by' },
    { id: 'stars' },
    { id: 'rank-card' },
    { id: 'starred-by-card' },
    { id: 'star-history' },
    WALL,
  ],
  org: [
    { id: 'rank' },
    { id: 'top-repo' },
    { id: 'contributors' },
    { id: 'stars' },
    { id: 'org-card' },
    { id: 'contributors-chart' },
    WALL,
  ],
};
