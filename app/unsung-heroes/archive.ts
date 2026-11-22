import type { ApiArchive, ApiArchiveHero } from './archive.documents';
import { type HeroUsage, heroUsageOf } from '@/lib/unsung-hero/hero-usage';

/** A hero as the archive draws it, in "This week" or among the past heroes. Star numbers are GitHub's own count. */
export type ArchiveHero = {
  /** Monday 00:00 UTC, as an ISO date. */
  startsAt: string;
  /** The next Monday 00:00 UTC, as an ISO date. */
  endsAt: string;
  /** This week's hero. */
  live: boolean;
  repo: { nameWithOwner: string; createdAt: string | null };
  package: { registry: string; name: string };
  maintainer: { login: string; name: string | null };
  /** The one line under its name among the past heroes. */
  line: string;
  /** The paragraph "This week" says about it. */
  text: string;
  weeklyDownloads: number;
  /** How much it is used, as picked: downloads in their period, or the repositories using it. */
  usage: HeroUsage;
  /** Shown only when known: without it "This week" has three figures. */
  contributors: number | null;
  /** When the week started: "stars when featured". */
  starsAtStart: number | null;
  /** As last read: "now N". */
  starsNow: number | null;
  /** "+N since Monday" while live; the week's gain after it. Never below zero. */
  starsGained: number;
};

/** The archive: this week's hero, the past ones newest first, and the totals. */
export type Archive = {
  live: ArchiveHero | null;
  past: ArchiveHero[];
  totals: {
    /** Past heroes and this week's. */
    heroes: number;
    /** The past heroes' gains (this week's is shown on its own). */
    starsGained: number;
    /** Every hero's downloads a week when featured (a month's as a week's worth), this week's included. */
    weeklyDownloads: number;
    /** The first hero's week start; null with none. */
    since: string | null;
  };
};

/** The archive while it cannot be read. */
export const ARCHIVE_UNAVAILABLE = 'unavailable' as const;

const count = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/** A hero as the archive draws it, field by field, so nothing else of the answer reaches the page. */
export const archiveHeroOf = (hero: ApiArchiveHero): ArchiveHero => ({
  startsAt: hero.startsAt,
  endsAt: hero.endsAt,
  live: hero.live === true,
  repo: { nameWithOwner: hero.repo.nameWithOwner, createdAt: hero.repo.createdAt ?? null },
  package: { registry: hero.package.registry, name: hero.package.name },
  maintainer: { login: hero.maintainer.login, name: hero.maintainer.name ?? null },
  line: hero.line,
  text: hero.text,
  weeklyDownloads: count(hero.facts.weeklyDownloads) ?? 0,
  usage: heroUsageOf(hero.facts),
  contributors: count(hero.facts.contributors),
  starsAtStart: count(hero.starsAtStart),
  starsNow: count(hero.starsNow),
  starsGained: Math.max(0, count(hero.starsGained) ?? 0),
});

export const archiveOf = (archive: ApiArchive): Archive => ({
  live: archive.live ? archiveHeroOf(archive.live) : null,
  past: (archive.past ?? []).map(archiveHeroOf),
  totals: {
    heroes: count(archive.totals.heroes) ?? 0,
    starsGained: Math.max(0, count(archive.totals.starsGained) ?? 0),
    weeklyDownloads: count(archive.totals.weeklyDownloads) ?? 0,
    since: archive.totals.since ?? null,
  },
});

/** The id of a hero's row, `owner-name`: the recap email links to `/unsung-heroes#owner-name`. */
export const heroAnchorOf = (nameWithOwner: string) => nameWithOwner.replace('/', '-');

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const compactWords = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  compactDisplay: 'long',
  maximumFractionDigits: 1,
});
const full = new Intl.NumberFormat('en-US');
const monthYear = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** 98.8M: a figure in a card. */
export const formatCompactCount = (value: number) => compact.format(value);
/** 1,204: a count in full. */
export const formatFullCount = (value: number) => full.format(value);
/** "98.8 million" in running text; "512,300" below a million. */
export const formatCountWords = (value: number) =>
  value >= 1_000_000 ? compactWords.format(value) : full.format(value);
/** "January 2019". */
export const formatMonthYear = (iso: string) => monthYear.format(new Date(iso));

const plural = (value: number, one: string, many: string) => `${formatFullCount(value)} ${value === 1 ? one : many}`;

/**
 * The sentence under the totals, for readers and search engines alike: "This week's Unsung hero is acme/left-trim,
 * downloaded 98.8 million times a week with 942 stars. 5 projects have been featured since October 2026."
 */
export function archiveSummaryOf({ live, totals }: Archive): string {
  const parts: string[] = [];
  if (live) {
    const { downloads, downloadsPer, dependents } = live.usage;
    const counted = downloads !== null && downloadsPer;
    const used = counted
      ? `downloaded ${formatCountWords(downloads)} times a ${downloadsPer}`
      : dependents
        ? `used by ${plural(dependents, 'GitHub repository', 'GitHub repositories')} with 100+ stars`
        : null;
    // "with 942 stars" after downloads; after "with 100+ stars" a second "with" would read twice.
    const starCount = live.starsAtStart === null ? null : plural(live.starsAtStart, 'star', 'stars');
    const stars = starCount === null ? '' : counted || !used ? ` with ${starCount}` : `, and has ${starCount}`;
    parts.push(`This week's Unsung hero is ${live.repo.nameWithOwner}${used ? `, ${used}` : ''}${stars}.`);
  }
  if (totals.heroes > 0) {
    const since = totals.since ? ` since ${formatMonthYear(totals.since)}` : '';
    parts.push(`${plural(totals.heroes, 'project has', 'projects have')} been featured${since}.`);
  }
  return parts.join(' ');
}

/** The archive's title, as written. */
export const ARCHIVE_TITLE = 'Unsung heroes: the open source your software runs on';

/** The archive's lead, its first sentence also the start of its description. */
export const ARCHIVE_LEAD =
  'One open-source project a week that a lot of software runs on, and few people star. Our way to back lesser-known maintainers.';

/** The paragraph closing "How we pick", as written: no other wording asks for a star. */
export const ARCHIVE_PICK_NOTE =
  'We pick from what 100+ star projects depend on, then a person makes the call. Nobody pays to be here, and nobody gets anything for starring. Star a project only if you use it.';

/**
 * "One open-source project a week that a lot of software runs on, and few people star. 5 heroes so far, +788 stars
 * while featured."
 */
export function archiveDescriptionOf(archive: Archive | null): string {
  const first = 'One open-source project a week that a lot of software runs on, and few people star.';
  const heroes = archive?.totals.heroes ?? 0;
  if (!archive || heroes === 0) return first;
  return `${first} ${plural(heroes, 'hero', 'heroes')} so far, +${formatFullCount(archive.totals.starsGained)} stars while featured.`;
}
