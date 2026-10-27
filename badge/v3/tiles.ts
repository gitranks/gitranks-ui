import { availabilityOf, type BadgeDefinition, countSeries, findBadge, isUserRankedIn, rankPropOf } from './catalogue';
import { type EntityFacts, wallOf } from './facts';
import { formatCompact, formatFull } from './format';
import { type BadgeEntityPath, badgeImagePath } from './links';
import { type BadgeParams, BadgeParamsError, resolveParams } from './params';
import { shieldContent } from './shields';
import type { BadgeFormat, By, Segment, Theme } from './types';
import { wallLayout } from './wall-layout';
import { builderHref } from '@/app/badge/builder/[[...login]]/utils/builder-state';

/**
 * Live badges on pages: the Badges card on profile, repository and organization pages, and the gallery. Each badge is
 * an image of its real URL that opens the builder at its last step.
 */

/** A badge with the query that picks its variant (`rank?by=contributions`). */
export type BadgeChoice = { id: string; query?: Record<string, string> };

/** The entity a badge URL names. */
export function entityPathOf(entity: EntityFacts): BadgeEntityPath {
  return entity.kind === 'repo'
    ? { kind: 'repo', nameWithOwner: entity.nameWithOwner }
    : { kind: entity.kind, login: entity.login };
}

/** "acme/fastqueue" or "octocat". */
export const entityNameOf = (entity: EntityFacts | BadgeEntityPath) =>
  entity.kind === 'repo' ? entity.nameWithOwner : entity.login;

const segmentText = (segment: Segment | undefined) => segment?.runs.map(({ text }) => text).join('') ?? '';

const plural = (count: number, one: string, many: string) => `${formatFull(count)} ${count === 1 ? one : many}`;

/** The count chart draws up to this many monthly points. */
const COUNT_CHART_MONTHS = 24;

const COUNT_NAMES: Record<By, string> = {
  stars: 'stars on own repositories',
  contributions: 'contribution stars',
  followers: 'followers',
};

/** What a card or chart shows, in words. */
function panelFact(entity: EntityFacts, badge: BadgeDefinition, params: BadgeParams): string {
  switch (entity.kind) {
    case 'repo': {
      const rank = entity.rank?.s;
      if (badge.id === 'rank-card' && rank) {
        const total = entity.totals.repos;
        return `#${formatFull(rank)}${total ? ` of ${formatCompact(total)} repos` : ' of all repos'}`;
      }
      if (badge.id === 'starred-by-card' && entity.starsBest) {
        return `starred by ${plural(entity.starsBest.total, 'top developer', 'top developers')}`;
      }
      if (badge.id === 'star-history' || badge.id === 'stars-card') {
        return `${badge.title}, ${plural(entity.stars, 'star', 'stars')}`;
      }
      return badge.title;
    }
    case 'user': {
      if (badge.id === 'profile-card') {
        // As the card picks its rank: stars, else contributions; the provisional rank until the next update.
        const by: By = isUserRankedIn(entity, 'stars', 'global') ? 'stars' : 'contributions';
        const prop = rankPropOf(by);
        const rank = entity.rankGlobal?.[prop] ?? entity.rankGlobal?.[`${prop}Provisional`];
        return rank ? `#${formatFull(rank)} by ${by}` : badge.title;
      }
      if (badge.id === 'count-chart') {
        // The months the chart draws: up to 24.
        const months = countSeries(entity, params.by).slice(-COUNT_CHART_MONTHS).length;
        return `${COUNT_NAMES[params.by]}, last ${months} months`;
      }
      return badge.title;
    }
    case 'org': {
      const rank = entity.rank?.s;
      if (badge.id === 'org-card' && rank) {
        const total = entity.orgRankTotal;
        return total
          ? `#${formatFull(rank)} of ${formatCompact(total)} organizations`
          : `org rank #${formatFull(rank)}`;
      }
      return badge.title;
    }
  }
}

/** The image's alt text: the entity and the fact it shows, "acme/fastqueue on GitRanks: repo rank #41,206 · top 1%". */
export function badgeAlt(entity: EntityFacts, badge: BadgeDefinition, params: BadgeParams, now = new Date()): string {
  let fact = badge.title;
  if (badge.format === 'shield') {
    const content = shieldContent(entity, badge, params, now);
    if (content) {
      const extra = segmentText(content.extra);
      fact = `${content.label} ${segmentText(content.value)}${extra ? ` · ${extra}` : ''}`;
    }
  } else {
    fact = panelFact(entity, badge, params);
  }
  return `${entityNameOf(entity)} on GitRanks: ${fact}`;
}

/** A badge ready to draw on a page. */
export type BadgeTile = {
  /** Unique within a list: the id and its query. */
  key: string;
  format: BadgeFormat;
  /** The badge's own URL pinned to each drawing of Auto, so it matches the page's theme rather than the system's. */
  src: Record<Theme, string>;
  alt: string;
  /** The builder's last step for this badge, with the options it is drawn with. */
  href: string;
  /** Cards and charts draw at a fixed size; shields are 20 px high. */
  size: { width: number; height: number } | null;
};

/** The drawing size a tile reserves: a card's or chart's own, a wall's from its rows and people; none for shields. */
function sizeOf(entity: EntityFacts, badge: BadgeDefinition, params: BadgeParams): BadgeTile['size'] {
  if (badge.format === 'shield') return null;
  if (badge.id === 'contributors-wall') {
    const wall = wallOf(entity, params.order);
    if (!wall) return null;
    const { width, height } = wallLayout(wall, params.rows);
    return { width, height };
  }
  return badge.size ?? null;
}

/** The badge a choice names and the params its query gives, or `null` when the badge cannot take that query. */
export function resolveChoice(
  entity: EntityFacts,
  choice: BadgeChoice,
): { badge: BadgeDefinition; params: BadgeParams } | null {
  const badge = findBadge(entity.kind, choice.id);
  if (!badge) return null;
  try {
    return { badge, params: resolveParams(badge, choice.query ?? {}) };
  } catch (error) {
    if (error instanceof BadgeParamsError) return null;
    throw error;
  }
}

/** The choices that are available for the entity: the ones a page may show. */
export function availableChoices(entity: EntityFacts, choices: BadgeChoice[], now = new Date()): BadgeChoice[] {
  return choices.filter((choice) => {
    const resolved = resolveChoice(entity, choice);
    return !!resolved && availabilityOf(entity, choice.id, resolved.params, now) === 'available';
  });
}

/** A tile for each badge the entity can show, in order; a badge it cannot draw with that query is left out. */
export function badgeTiles(entity: EntityFacts, choices: BadgeChoice[], now = new Date()): BadgeTile[] {
  const path = entityPathOf(entity);
  return choices.flatMap((choice): BadgeTile[] => {
    const resolved = resolveChoice(entity, choice);
    if (!resolved) return [];
    const { badge, params } = resolved;
    const query = choice.query ?? {};
    const search = new URLSearchParams(query).toString();
    return [
      {
        key: search ? `${choice.id}?${search}` : choice.id,
        format: badge.format,
        src: {
          light: badgeImagePath(path, badge.id, 'svg', { ...query, theme: 'light' }),
          dark: badgeImagePath(path, badge.id, 'svg', { ...query, theme: 'dark' }),
        },
        alt: badgeAlt(entity, badge, params, now),
        href: builderHref({ kind: entity.kind, name: entityNameOf(entity), badge, style: query, embed: true }),
        size: sizeOf(entity, badge, params),
      },
    ];
  });
}
