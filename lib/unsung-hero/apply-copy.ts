import type { ApplicationStatus, ApplyPackage, ApplyRefusal, HeroApplication } from './apply.types';
import { heroUsageOf } from './hero-usage';
import { heroWeekLabel } from './unsung-hero';

// The apply page's words, numbers and dates. Every date is UTC: weeks start Monday 00:00 UTC.

/** The longest note the API takes, and the longest nomination as typed. */
export const APPLY_NOTE_MAX = 500;
export const APPLY_TYPED_MAX = 300;

/** How long a nomination waits after the last key before it is looked up. */
export const RESOLVE_DEBOUNCE_MS = 400;

export const APPLY_TITLE = 'Apply for Unsung hero';
export const APPLY_DESCRIPTION =
  'Think an open-source package belongs on the GitRanks home page for a week? Tell us about yours, or one you rely on. It is free, and always will be.';

export const APPLY_HEADING = 'Think a package belongs here?';
export const APPLY_LEAD =
  'Each week the home page features one open-source package that a lot of software runs on and few people star. Tell us about yours, or one you rely on.';

export const FREE_TITLE = 'It is free. Always.';
export const FREE_TEXT =
  'We never ask for money, stars or anything else in exchange, and nobody can pay for a slot. If anyone asks you to pay for an Unsung hero slot, it is not us.';

export const ONE_A_WEEK =
  'One hero a week, so most good packages wait their turn. We tell the maintainer before the week starts, and one click opts them out.';

/** The page could not be read. */
export const APPLY_UNAVAILABLE_TEXT = 'Applications are not available right now. Try again in a few minutes.';

/** Signed in, but the account is not on GitRanks yet. */
export const PROFILE_SETTING_UP_TEXT = 'Your GitRanks profile is still being set up. Try again in a few minutes.';

const FULL = new Intl.NumberFormat('en-US');
const COMPACT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const SENT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const WEEKDAY_DATE = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

/** `Nov 22, 2026`. */
export const sentDate = (at: string): string => SENT.format(new Date(at));

/** How much a package is used, short: `2.4M a week`, `4.5M a month`, `used by 1,920`; null when unknown. */
export function usageShort(pkg: Pick<ApplyPackage, 'downloads' | 'downloadsPer' | 'dependents'>): string | null {
  const usage = heroUsageOf({ downloads: pkg.downloads, downloadsPer: pkg.downloadsPer, dependents: pkg.dependents });
  if (usage.downloads !== null && usage.downloadsPer)
    return `${COMPACT.format(usage.downloads)} a ${usage.downloadsPer}`;
  return usage.dependents ? `used by ${FULL.format(usage.dependents)}` : null;
}

/** The package's name as its registry spells it. */
export const packageNameOf = (pkg: Pick<ApplyPackage, 'name' | 'displayName'>): string => pkg.displayName || pkg.name;

/** A package's key in a list: its registry and name. */
export const packageKey = (pkg: Pick<ApplyPackage, 'registry' | 'name'>): string => `${pkg.registry}/${pkg.name}`;

/** What an application is for: the package's name, or the nomination as typed. */
export const applicationNameOf = (application: Pick<HeroApplication, 'package' | 'typed'>): string =>
  application.package ? packageNameOf(application.package) : (application.typed ?? 'your package');

/** The status's pill: its words and tone. */
export function statusPillOf(application: HeroApplication): {
  text: string;
  tone: 'neutral' | 'violet' | 'green' | 'amber';
} {
  const week = application.week ? heroWeekLabel(application.week) : null;
  const dated = (word: string) => (week ? `${word} · ${week}` : word);
  switch (application.status) {
    case 'SCHEDULED':
      return { text: dated('Scheduled'), tone: 'violet' };
    case 'LIVE':
      return { text: dated('Live'), tone: 'green' };
    case 'FEATURED':
      return { text: dated('Featured'), tone: 'neutral' };
    case 'NOT_PICKED':
      return { text: 'Not picked', tone: 'amber' };
    default:
      return { text: 'In review', tone: 'neutral' };
  }
}

/** The status card's title and text. */
export function statusCopyOf(application: HeroApplication): { title: string; text: string } {
  const name = applicationNameOf(application);
  const week = application.week ? heroWeekLabel(application.week) : 'its week';
  const monday = application.week ? WEEKDAY_DATE.format(new Date(application.week.startsAt)) : 'Monday';
  const copy: Record<ApplicationStatus, { title: string; text: string }> = {
    IN_REVIEW: {
      title: 'We have your application',
      text: 'We check every application and read your note. We pick one hero a week, so it may take a while, and we may not pick it. When we schedule it, this page says so and we email you.',
    },
    SCHEDULED: {
      title: `${name} is the Unsung hero for ${week}`,
      text: `From ${monday}, the home page features it for a week. We emailed you, and we write to the maintainer before the week starts. Nothing for you to do.`,
    },
    LIVE: {
      title: `${name} is the Unsung hero this week`,
      text: 'It is on the home page until Sunday. Nothing for you to do.',
    },
    FEATURED: {
      title: `${name} was the Unsung hero for ${week}`,
      text: 'Thanks for applying. It is among the past heroes now. You can send a new application whenever you like.',
    },
    NOT_PICKED: {
      title: `We did not pick ${name} this time`,
      text: 'Thanks for applying. It does not fit the slot right now. You can send a new application whenever you like.',
    },
  };
  return copy[application.status] ?? copy.IN_REVIEW;
}

/** Under a scheduled or live application: what can still change it. */
export const SCHEDULED_NOTE =
  'Scheduled applications cannot be cancelled here. The maintainer can still opt out from our email.';

/** The confirm step before Cancel: it removes the application whole. */
export const cancelCopyOf = (name: string) => ({
  title: 'Cancel your application?',
  description: `This removes your application for ${name} completely, with your note. We will not consider it any more. You can send a new application afterwards.`,
  keep: 'Keep it',
  confirm: 'Remove application',
});

/** Why a send or a cancel did not go through, and what to do. */
export const REFUSAL_TEXT: Record<ApplyRefusal, string> = {
  SIGN_IN: 'We could not tell who you are. Sign in again; if you just joined GitRanks, try again in a few minutes.',
  OPEN_APPLICATION: 'You already have an open application. Reload the page to see it.',
  PACKAGE_TAKEN: 'Someone has already applied for this package. We will look at it.',
  TOO_MANY: 'That is enough applications for today. Try again tomorrow.',
  BAD_INPUT: 'We could not tell which package you mean. Choose it again, or pick one of the matches.',
  NOT_CANCELLABLE: 'It can no longer be cancelled: we have started on it. Reload the page to see where it stands.',
  UNAVAILABLE: 'We could not send it just now. Try again in a minute.',
};

export const refusalTextOf = (refusal: string | null): string =>
  (refusal && REFUSAL_TEXT[refusal as ApplyRefusal]) || REFUSAL_TEXT.UNAVAILABLE;
