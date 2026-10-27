import type { EntityFacts } from './facts';
import { availableChoices, type BadgeChoice } from './tiles';

/** A badge a page shows, with the query that picks its variant (`rank?by=contributions`). */
export type PromotedBadge = BadgeChoice;

type PromotionSet = {
  bucket: string;
  /** Stars from (inclusive) and to (exclusive) that put an entity in the bucket. */
  from: number;
  to: number;
  shields: PromotedBadge[];
  panels: PromotedBadge[];
};

const UNBOUNDED = Number.POSITIVE_INFINITY;

/**
 * What a page promotes by the entity's size (spec §3.9): repositories by stars, developers by stars on their own
 * repositories, organizations by stars. Each set in order; a page keeps the available ones.
 */
export const PROMOTION: Record<EntityFacts['kind'], PromotionSet[]> = {
  repo: [
    {
      bucket: '5–100',
      from: 0,
      to: 100,
      shields: [{ id: 'language-rank' }],
      panels: [{ id: 'rank-card' }],
    },
    {
      bucket: '100–1k',
      from: 100,
      to: 1_000,
      shields: [{ id: 'rank' }, { id: 'language-rank' }, { id: 'month' }],
      panels: [{ id: 'rank-card' }],
    },
    {
      bucket: '1k+',
      from: 1_000,
      to: UNBOUNDED,
      shields: [{ id: 'rank' }, { id: 'contributors' }],
      panels: [{ id: 'starred-by-card' }, { id: 'star-history' }],
    },
  ],
  user: [
    {
      bucket: 'under 100',
      from: 0,
      to: 100,
      shields: [
        { id: 'rank', query: { by: 'contributions' } },
        { id: 'rank', query: { scope: 'country' } },
        { id: 'month' },
      ],
      panels: [],
    },
    {
      bucket: '100–1k',
      from: 100,
      to: 1_000,
      shields: [{ id: 'rank' }, { id: 'rank', query: { scope: 'country' } }, { id: 'month' }],
      panels: [{ id: 'profile-card' }],
    },
    {
      bucket: '1k+',
      from: 1_000,
      to: UNBOUNDED,
      shields: [{ id: 'rank' }, { id: 'rank', query: { scope: 'country' } }],
      panels: [{ id: 'profile-card' }, { id: 'count-chart' }],
    },
  ],
  org: [
    { bucket: 'under 1k', from: 0, to: 1_000, shields: [{ id: 'rank' }, { id: 'stars' }], panels: [] },
    {
      bucket: '1k–10k',
      from: 1_000,
      to: 10_000,
      shields: [{ id: 'rank' }, { id: 'top-repo' }],
      panels: [{ id: 'org-card' }],
    },
    {
      bucket: '10k+',
      from: 10_000,
      to: UNBOUNDED,
      shields: [{ id: 'rank' }, { id: 'contributors' }],
      panels: [{ id: 'org-card' }, { id: 'contributors-chart' }],
    },
  ],
};

/** The stars that size an entity. */
const sizeOf = (entity: EntityFacts) => (entity.kind === 'repo' ? entity.stars : (entity.s ?? 0));

/** The set for an entity of a kind with these stars (for a developer, stars on their own repositories). */
export function promotionSetFor(kind: EntityFacts['kind'], stars: number): PromotionSet {
  const sets = PROMOTION[kind];
  return sets.find(({ from, to }) => stars >= from && stars < to) ?? sets[0];
}

export const promotionSetOf = (entity: EntityFacts): PromotionSet => promotionSetFor(entity.kind, sizeOf(entity));

/** The bucket's shields, then its cards and charts, keeping the ones available for the entity. */
export function promotedBadges(entity: EntityFacts, now = new Date()): PromotedBadge[] {
  const { shields, panels } = promotionSetOf(entity);
  return availableChoices(entity, [...shields, ...panels], now);
}
