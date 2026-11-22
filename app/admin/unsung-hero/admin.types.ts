// The Unsung hero board as the API answers it. Enum values come in upper case; dates as ISO strings.

export type HeroStatus = 'SCHEDULED' | 'NOTIFIED' | 'LIVE' | 'DONE' | 'OPTED_OUT' | 'CANCELLED';

export type HeroMissCode =
  | 'ORGANIZATION'
  | 'FOLLOWERS'
  | 'STARS'
  | 'STALE'
  | 'LICENSE'
  | 'ADVISORY'
  | 'UNLINKED'
  | 'NO_EMAIL';

export type HeroLiveOutcome = 'FOUND' | 'MISSING' | 'UNAVAILABLE';

/** Why an action was refused. Schedule's are also listed on a live check. */
export const HERO_REFUSALS = [
  'NOT_ON_SHORTLIST',
  'NO_LIVE_CHECK',
  'LIVE_CHECK_STALE',
  'OTHER_PACKAGE',
  'PACKAGES_UNAVAILABLE',
  'REPOSITORY_GONE',
  'GITHUB_UNAVAILABLE',
  'FORK',
  'ARCHIVED',
  'NO_EMAIL',
  'UNLINKED',
  'OPTED_OUT',
  'ALREADY_FEATURED',
  'BAD_WEEK',
  'TOO_LATE',
  'WEEK_TAKEN',
  'BAD_TEXT',
  'NOT_FOUND',
  'NOT_CANCELLABLE',
  'NOT_MARKABLE',
] as const;
export type HeroRefusal = (typeof HERO_REFUSALS)[number];

/** Why a slot was cancelled, as the API stores it (lower case). */
export type HeroCancelReason =
  | 'owner'
  | 'gone'
  | 'archived'
  | 'no_email'
  | 'opted_out'
  | 'owner_changed'
  | 'not_told'
  | 'not_live'
  | 'removed';

/** A registry as the API names it: `NPM`, `PYPI`. Kept a string: a registry the site lists later still shows. */
export type HeroRegistry = string;

export type HeroMiss = { code: HeroMissCode; label: string; blocks: boolean };

export type HeroRepo = {
  githubId: string;
  nameWithOwner: string;
  description?: string | null;
  createdAt: string | null;
};

/** `displayName`: the registry's spelling, when it differs from the stored name. */
export type HeroPackage = { registry: HeroRegistry; name: string; displayName?: string | null };

/** Downloads in the registry's period (`WEEK` or `MONTH`); null for a registry read by its dependents. */
export type HeroDownloads = { downloads?: number | null; downloadsPer?: string | null };

/** One of a slot's two emails. `noReceipt`: queued long enough ago with neither outcome. */
export type HeroMail = {
  queuedAt: string | null;
  sentAt: string | null;
  held: boolean;
  markedBy: string | null;
  noReceipt: boolean;
};

export type HeroSlot = {
  id: string;
  week: string;
  startsAt: string;
  endsAt: string;
  status: HeroStatus;
  repo: HeroRepo;
  package: HeroPackage;
  maintainer: { githubId: string; login: string; name: string | null; hasEmail: boolean };
  line: string;
  reason: string | null;
  text: string;
  /** Scheduled with no heads-up: the maintainer gets no email before the week and no chance to opt out. */
  noHeadsUp: boolean;
  facts: HeroDownloads & { weeklyDownloads: number; dependents: number | null; contributors: number | null };
  headsUp: HeroMail | null;
  recap: HeroMail | null;
  starsAtStart: number | null;
  starsNow: number | null;
  starsGained: number | null;
  visits: number;
  githubClicks: number;
  scheduledBy: string;
  scheduledAt: string;
  optedOutAt: string | null;
  /** A `HeroCancelReason`, kept a string: a reason added later still shows. */
  cancelledReason: string | null;
};

export type HeroLiveCheck = HeroDownloads & {
  at: string;
  outcome: HeroLiveOutcome;
  package: HeroPackage;
  nameWithOwner: string | null;
  githubStars: number | null;
  isFork: boolean | null;
  isArchived: boolean | null;
  licenseSpdx: string | null;
  pushedAt: string | null;
  ownerLogin: string | null;
  ownerType: string | null;
  ownerFollowers: number | null;
  /** Only in a live check's own answer; null on the board. */
  firstName: string | null;
  hasEmail: boolean;
  advisories: string[];
  advisoriesIncomplete: boolean;
  lookupAnswered: boolean;
  linked: boolean | null;
  weeklyDownloads: number | null;
  dependents: number | null;
  optedOut: boolean;
  misses: HeroMiss[];
  /** What Schedule would refuse now, the week aside. */
  refusals: HeroRefusal[];
  /** The same for a slot with no heads-up, which needs no public email. */
  refusalsWithoutHeadsUp: HeroRefusal[];
};

export type HeroCandidate = HeroDownloads & {
  position: number;
  repo: HeroRepo;
  package: HeroPackage;
  weeklyDownloads: number;
  downloadsRank: number;
  /** The place in the ranking its registry's list is read by: `DOWNLOADS`, or `DEPENDENTS` for Maven and Go. */
  rank?: number;
  rankBy?: string;
  dependents: number | null;
  stars: number;
  pushedAt: string | null;
  owner: { githubId: string; login: string; type: string; followers: number | null; hasEmail: boolean };
  score: number;
  misses: HeroMiss[];
  liveCheck: HeroLiveCheck | null;
};

export type HeroWeek = { week: string; startsAt: string; endsAt: string; closesAt: string };

export type HeroOptOut = { maintainerGithubId: string; login: string; at: string };

export type HeroBoard = {
  live: HeroSlot[];
  /** Scheduled and notified slots, soonest first. */
  upcoming: HeroSlot[];
  /** The week after this one: the first a slot with no heads-up may take. */
  nextWeek: HeroWeek;
  /** The first week still open with the heads-up. */
  firstOpenWeek: HeroWeek;
  shortlist: HeroCandidate[];
  shortlistBuiltAt: string | null;
  /** Ended, opted-out and cancelled slots, newest first. */
  past: HeroSlot[];
  optOuts: HeroOptOut[];
};

export type HeroActionResult = { ok: boolean; refusal: HeroRefusal | null; slot: HeroSlot | null };

export type HeroLiveCheckResult = { refusal: HeroRefusal | null; check: HeroLiveCheck | null };

export type HeroScheduleInput = {
  repoGithubId: string;
  week: string;
  registry: HeroRegistry;
  name: string;
  line: string;
  reason: string | null;
  text: string;
  headsUp: boolean;
};
