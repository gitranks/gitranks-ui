import { listCanonicalBadgeImageUrls } from '@/badge/canonical-badge';
import { isRankedIn, type RankingScores } from '@/badge/utils/is-ranked-in';
import { badgeImagePath, hasProfileCard } from '@/badge/v3/links';
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

const RANKINGS: [By, UserRankProp][] = [
  ['stars', UserRankProp.s],
  ['contributions', UserRankProp.c],
  ['followers', UserRankProp.f],
];

/**
 * A profile's badge images for the sitemap: its profile card and a rank shield per ranking it is in. Scores only, as
 * `listCanonicalBadgeImageUrls` does: a profile whose score reached the threshold since the last ranking update can
 * be listed a day early. Before `SITEMAP_OLD_BADGE_IMAGES_UNTIL` the old badge PNGs follow.
 *
 * The rank shield of the stars ranking is the default (`rank.png`); the others name theirs in the query.
 */
export function listProfileBadgeImageUrls(login: string, scores: RankingScores, now = new Date()): string[] {
  const user = { kind: 'user', login } as const;
  const ranks = RANKINGS.filter(([, prop]) => isRankedIn(prop, scores, undefined)).map(([by]) =>
    badgeImagePath(user, 'rank', 'png', by === 'stars' ? {} : { by }),
  );
  const current = [
    ...(hasProfileCard(scores, undefined) ? [badgeImagePath(user, 'profile-card', 'png')] : []),
    ...ranks,
  ];

  return [
    ...current.map(sitemapImageLoc),
    ...(now < SITEMAP_OLD_BADGE_IMAGES_UNTIL ? listCanonicalBadgeImageUrls(login, scores).map(escapeImageLoc) : []),
  ];
}

/** A listed repository's rank card: listed repositories have 1,000+ stars, so they are ranked (or will be at the next update). */
export const listRepoBadgeImageUrls = (nameWithOwner: string): string[] => [
  sitemapImageLoc(badgeImagePath({ kind: 'repo', nameWithOwner }, 'rank-card', 'png')),
];

/** A listed organization's card: listed organizations have 1,000+ stars, so they are ranked (or will be at the next update). */
export const listOrgBadgeImageUrls = (login: string): string[] => [
  sitemapImageLoc(badgeImagePath({ kind: 'org', login }, 'org-card', 'png')),
];
