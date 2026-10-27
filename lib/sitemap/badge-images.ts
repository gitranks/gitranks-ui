import { listCanonicalBadgeImageUrls } from '@/badge/canonical-badge';
import { isRankedIn, type RankingScores } from '@/badge/utils/is-ranked-in';
import { type BadgeEntityPath, badgeImagePath, hasProfileCard } from '@/badge/v3/links';
import { PROMOTION, type PromotedBadge, promotionSetFor } from '@/badge/v3/promotion';
import type { By } from '@/badge/v3/types';
import { SITEMAP_OLD_BADGE_IMAGES_UNTIL } from '@/lib/sitemap/sitemap.consts';
import { absoluteSitemapUrl } from '@/lib/sitemap/sitemap-url';
import { UserRankProp } from '@/types/ranking.types';

const XML_ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };

/**
 * An image URL as the sitemap must hold it. The sitemap writes image locs as they are, so a query with more than one
 * key (`?a=1&b=2`) would break the XML unless its `&` is escaped here.
 */
export const escapeImageLoc = (url: string): string => url.replace(/[&<>"']/g, (char) => XML_ENTITIES[char]);

/** A badge image path as an absolute, escaped sitemap image loc. */
export const sitemapImageLoc = (path: string): string => escapeImageLoc(absoluteSitemapUrl(path));

/** A promoted badge's image as the page's Badges card draws it: the SVG's light drawing. */
const shownImageLoc = (entity: BadgeEntityPath, { id, query = {} }: PromotedBadge) =>
  sitemapImageLoc(badgeImagePath(entity, id, 'svg', { ...query, theme: 'light' }));

const RANK_PROPS: Record<By, UserRankProp> = {
  stars: UserRankProp.s,
  contributions: UserRankProp.c,
  followers: UserRankProp.f,
};

/**
 * Whether a profile's page shows a promoted badge, as far as its scores tell. Scores only, as
 * `listCanonicalBadgeImageUrls` does: a profile whose score reached the threshold since the last ranking update can be
 * listed a day early. Badges the scores cannot decide (a country rank, this month's race, the count chart) are left out.
 */
function profileShows(scores: RankingScores, { id, query = {} }: PromotedBadge): boolean {
  if (id === 'profile-card') return hasProfileCard(scores, undefined);
  if (id === 'rank' && query.scope !== 'country') {
    return isRankedIn(RANK_PROPS[(query.by as By | undefined) ?? 'stars'], scores, undefined);
  }
  return false;
}

/**
 * A profile's badge images for the sitemap: the badges its page promotes for its size (stars on its own repositories)
 * that its scores show it has. Before `SITEMAP_OLD_BADGE_IMAGES_UNTIL` the old badge PNGs follow.
 */
export function listProfileBadgeImageUrls(login: string, scores: RankingScores, now = new Date()): string[] {
  const user = { kind: 'user', login } as const;
  const { shields, panels } = promotionSetFor('user', scores.s ?? 0);
  const current = [...shields, ...panels].filter((badge) => profileShows(scores, badge));

  return [
    ...current.map((badge) => shownImageLoc(user, badge)),
    ...(now < SITEMAP_OLD_BADGE_IMAGES_UNTIL ? listCanonicalBadgeImageUrls(login, scores).map(escapeImageLoc) : []),
  ];
}

/** The badges of the largest repository set that every listed repository shows. */
const LISTED_REPO_BADGES = new Set(['rank', 'star-history']);

/**
 * A listed repository's badge images. Listed repositories have 1,000+ stars, so they are ranked (or will be at the next
 * update) and have a star history; whether they have contributors or top stargazers the sitemap cannot tell.
 */
export function listRepoBadgeImageUrls(nameWithOwner: string): string[] {
  const repo = { kind: 'repo', nameWithOwner } as const;
  const { shields, panels } = promotionSetFor('repo', PROMOTION.repo.at(-1)?.from ?? 1_000);
  return [...shields, ...panels]
    .filter(({ id }) => LISTED_REPO_BADGES.has(id))
    .map((badge) => shownImageLoc(repo, badge));
}

/** The badges every organization set from 1,000 stars promotes. */
const LISTED_ORG_BADGES = new Set(['rank', 'org-card']);

/**
 * A listed organization's badge images. Listed organizations have 1,000+ stars, so they are ranked (or will be at the
 * next update); the sitemap does not say which set above 1,000 stars they are in, so only what both sets show.
 */
export function listOrgBadgeImageUrls(login: string): string[] {
  const org = { kind: 'org', login } as const;
  const { shields, panels } = promotionSetFor('org', 1_000);
  return [...shields, ...panels]
    .filter(({ id }) => LISTED_ORG_BADGES.has(id))
    .map((badge) => shownImageLoc(org, badge));
}
