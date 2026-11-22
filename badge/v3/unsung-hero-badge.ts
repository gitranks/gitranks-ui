import { shortMonthName } from './month';

/**
 * The Unsung hero badge: a repository's shield for its week as Unsung hero, "Unsung hero · Nov 2026". Only a
 * repository that was a hero has it.
 */

/** The badge's id in the repository catalogue. */
export const UNSUNG_HERO_BADGE = 'unsung-hero';

/** The repository's latest week as Unsung hero: the ISO week (`2026-W47`) and its Monday, as an ISO date. */
export type RepoUnsungHeroFacts = { week: string; startsAt: string };

/** "Nov 2026": the month and year the hero's week started, in UTC. */
export function unsungHeroMonth(hero: RepoUnsungHeroFacts): string {
  const start = new Date(hero.startsAt);
  return `${shortMonthName(start.getUTCMonth())} ${start.getUTCFullYear()}`;
}
