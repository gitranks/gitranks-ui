/**
 * Unsung hero: one open-source project a week that a lot of software runs on and few people star. What the browser
 * and the server share: the hero as the site shows it, the paths that serve it, its cache tag and what a hit names.
 */

/** This week's hero as the home card draws it. Star numbers are GitHub's own count. */
export type UnsungHero = {
  /** ISO week id, `2026-W47`. */
  week: string;
  /** Monday 00:00 UTC, as an ISO date. */
  startsAt: string;
  /** The next Monday 00:00 UTC, as an ISO date. */
  endsAt: string;
  repo: { nameWithOwner: string };
  package: { registry: string; name: string };
  /** The card's line under the name. */
  line: string;
  /** The package's downloads a week when the hero was picked. */
  weeklyDownloads: number;
  /** GitHub's star count when the week started; null when it was not read. */
  starsAtStart: number | null;
  /** Stars since the week started, never below zero. */
  starsGained: number;
};

/** The cache tag of every cached read of the heroes: expiring it shows a change at once. */
export const UNSUNG_HERO_CACHE_TAG = 'unsung-hero';

/** Where the browser asks for this week's hero: `{ hero }`, `null` in a week with none. */
export const UNSUNG_HERO_CURRENT_PATH = '/api/unsung-hero/current';

/** Where the browser reports a visit of the hero's repository page or a press of "Star on GitHub". */
export const UNSUNG_HERO_HIT_PATH = '/api/unsung-hero/hit';

/** The page of past heroes. */
export const UNSUNG_HEROES_PATH = '/unsung-heroes';

/** What a hit counts: a view of the hero's repository page, or a press of "Star on GitHub". */
export const HERO_HIT_KINDS = ['visit', 'github'] as const;
export type HeroHitKind = (typeof HERO_HIT_KINDS)[number];

/** One hit: its kind and the repository it was on, `owner/name`. */
export type HeroHit = { kind: HeroHitKind; repo: string };

/** `owner/name` as GitHub spells one: an owner of up to 39 characters and a name of up to 100. */
const REPO_NAME = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/;

export const isRepoName = (value: unknown): value is string => typeof value === 'string' && REPO_NAME.test(value);

/** A hit as the browser sent it, or null when it is not one. */
export function heroHitOf(body: unknown): HeroHit | null {
  if (!body || typeof body !== 'object') return null;
  const { kind, repo } = body as { kind?: unknown; repo?: unknown };
  const known = HERO_HIT_KINDS.find((hitKind) => hitKind === kind);
  return known && isRepoName(repo) ? { kind: known, repo } : null;
}

/** Whether the repository `owner/name` is the hero's, in any letter case (GitHub's names are case-insensitive). */
export const isHeroRepo = (hero: Pick<UnsungHero, 'repo'> | null | undefined, nameWithOwner: string) =>
  !!hero && hero.repo.nameWithOwner.toLowerCase() === nameWithOwner.toLowerCase();

const DAY_MS = 24 * 60 * 60 * 1000;
const monthDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const dayOnly = new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone: 'UTC' });
const monthOf = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });

/** The hero's week, Monday to Sunday: "Nov 17 – 23", or "Nov 30 – Dec 6" across two months. */
export function heroWeekLabel(hero: Pick<UnsungHero, 'startsAt' | 'endsAt'>): string {
  const start = new Date(hero.startsAt);
  const end = new Date(new Date(hero.endsAt).getTime() - DAY_MS);
  const last = monthOf.format(start) === monthOf.format(end) ? dayOnly.format(end) : monthDay.format(end);
  return `${monthDay.format(start)} – ${last}`;
}
