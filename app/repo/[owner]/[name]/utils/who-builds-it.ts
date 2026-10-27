import { TIER_NAMES } from '@/app/app.consts';

/** Siblings show (with the toggle) from this many repositories sharing contributors. */
export const MIN_SIBLINGS = 3;

/** A share as people read it: "Half", "A third", "A quarter", else a percentage. */
export function shareWords(share: number): string {
  if (share >= 0.45 && share <= 0.55) return 'Half';
  if (share >= 0.3 && share <= 0.36) return 'A third';
  if (share >= 0.23 && share <= 0.27) return 'A quarter';
  return `${Math.round(share * 100)}%`;
}

// "Advanced" is an adjective: its plural stays "Advanced"; every other tier name takes an "s".
const plural = (count: number, name: string) =>
  `${count.toLocaleString('en-US')} ${name}${count === 1 || name === 'Advanced' ? '' : 's'}`;

/** "4 Legends, 11 Elites and 38 Masters": the three highest developer tiers present, highest first. */
export function builtByTiersText(counts: { tier: number; count: number }[]): string {
  const parts = [...counts]
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.tier - a.tier)
    .slice(0, 3)
    .map(({ tier, count }) => plural(count, TIER_NAMES[tier - 1]));
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
}
