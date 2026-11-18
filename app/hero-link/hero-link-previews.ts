import type { ArchiveHero } from '@/app/unsung-heroes/archive';
import type { HeroLink } from '@/lib/link-token/hero-pages';
import type { UnsungHero } from '@/lib/unsung-hero/unsung-hero';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The ISO week id of a day, `2026-W47`: the week's Thursday decides its year. */
export function isoWeekOf(iso: string): string {
  const date = new Date(iso);
  const thursday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7));
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((thursday.getTime() - yearStart) / DAY_MS + 1) / 7);
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** The star count the week is featured with: GitHub's when it started, before then the latest read. */
const featuredStars = (link: HeroLink) => link.starsAtStart ?? link.stars;

/** Stars since Monday: only once the week has started, never below zero. */
const gainedOf = (link: HeroLink) =>
  link.week !== 'upcoming' && link.starsAtStart !== null && link.stars !== null
    ? Math.max(0, link.stars - link.starsAtStart)
    : 0;

/** The home card as it shows the link's week. */
export const cardHeroOf = (link: HeroLink): UnsungHero => ({
  week: isoWeekOf(link.startsAt),
  startsAt: link.startsAt,
  endsAt: link.endsAt,
  repo: { nameWithOwner: link.repo.nameWithOwner },
  package: link.package,
  line: link.line,
  weeklyDownloads: link.facts.weeklyDownloads,
  starsAtStart: featuredStars(link),
  starsGained: gainedOf(link),
});

/** The archive's "This week" block as it shows the link's week. */
export const archiveHeroOf = (link: HeroLink): ArchiveHero => ({
  startsAt: link.startsAt,
  endsAt: link.endsAt,
  live: true,
  repo: { nameWithOwner: link.repo.nameWithOwner, createdAt: link.repo.createdAt },
  package: link.package,
  maintainer: link.maintainer,
  line: link.line,
  text: link.text,
  weeklyDownloads: link.facts.weeklyDownloads,
  contributors: link.facts.contributors,
  starsAtStart: featuredStars(link),
  starsNow: link.stars,
  starsGained: gainedOf(link),
});
