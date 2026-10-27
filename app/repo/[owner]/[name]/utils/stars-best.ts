import { tierCountText } from './who-builds-it';

/** From this many top-developer stargazers the section is the full one; under it, a one-line strip. */
export const STARS_BEST_FULL_FROM = 20;

/** The Legend ratio is shown from this many times the usual rate. */
export const LEGEND_RATIO_MIN = 1.5;

/** Top stargazers shown by name in the full section, and as avatars in the strip. */
export const STARS_BEST_TOP_FULL = 6;
export const STARS_BEST_TOP_COMPACT = 3;

type Counts = { tier: number; count: number }[];

/** Which version of "Starred by the best" a repository gets: the full section, the strip, or none at all. */
export function starsBestView(starsBest?: { total: number } | null): 'full' | 'compact' | null {
  if (!starsBest || starsBest.total <= 0) return null;
  return starsBest.total >= STARS_BEST_FULL_FROM ? 'full' : 'compact';
}

/** "4.2×", "2×", "12×": one decimal under 10 (none when it is 0), whole numbers from 10. */
export function formatRatio(ratio: number): string {
  const rounded = ratio >= 10 ? Math.round(ratio) : Math.round(ratio * 10) / 10;
  return `${rounded.toLocaleString('en-US')}×`;
}

/** The ratio when it is worth saying: at least `LEGEND_RATIO_MIN`. */
export const shownLegendRatio = (ratio?: number | null) =>
  typeof ratio === 'number' && Number.isFinite(ratio) && ratio >= LEGEND_RATIO_MIN ? ratio : null;

/** The tiers present, highest first, with their counts. */
export const tiersPresent = (counts: Counts) =>
  [...counts].filter(({ count }) => count > 0).sort((a, b) => b.tier - a.tier);

/**
 * The rest of the stargazers after the first one named, for "Starred by ana Legend 2, 1 Legend and 2 Elites.": the
 * tiers highest first, the third and lower folded into "N more" when there are more than three. Empty when there is
 * no one else.
 */
export function othersParts(counts: Counts, first?: { tier: number } | null): string[] {
  const others = tiersPresent(
    counts.map(({ tier, count }) => ({ tier, count: first && tier === first.tier ? count - 1 : count })),
  );
  if (others.length <= 3) return others.map(({ tier, count }) => tierCountText(count, tier));

  const rest = others.slice(2).reduce((sum, { count }) => sum + count, 0);
  return [
    ...others.slice(0, 2).map(({ tier, count }) => tierCountText(count, tier)),
    `${rest.toLocaleString('en-US')} more`,
  ];
}

/** The separator before item `at` of a list read as "a, b and c". */
export const listSeparator = (at: number, length: number) => (at === 0 ? '' : at === length - 1 ? ' and ' : ', ');
