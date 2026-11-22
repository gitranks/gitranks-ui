import type { HeroCancelReason, HeroMail, HeroRefusal, HeroSlot, HeroStatus, HeroWeek } from './admin.types';

// Words, numbers and dates of the board. Every date is UTC: weeks start Monday 00:00 UTC.

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Scheduling for a week with the heads-up closes this long before it starts; the heads-up is queued from then. With no
 * heads-up it stays open until the week starts.
 */
export const HEADS_UP_LEAD_HOURS = 97;

/** The longest words a slot takes, as the API checks them. */
export const LINE_MAX = 120;
export const REASON_MAX = 120;
export const TEXT_MAX = 600;

const FULL = new Intl.NumberFormat('en-US');
const COMPACT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const MONTH_SHORT = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const MONTH_YEAR = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const WEEKDAY_DATE = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});
const STAMP = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
});

/** `1,745`; a dash when unknown. */
export const full = (n: number | null | undefined): string => (typeof n === 'number' ? FULL.format(n) : '—');

/** `98.8M`; a dash when unknown. */
export const compact = (n: number | null | undefined): string => (typeof n === 'number' ? COMPACT.format(n) : '—');

/** `Jan 2023`; a dash when unknown. */
export const monthYear = (at: string | null | undefined): string => (at ? MONTH_YEAR.format(new Date(at)) : '—');

/** `Nov 20`. */
export const day = (at: string): string => DAY.format(new Date(at));

/** `Monday, November 23`. */
export const weekdayDate = (at: string): string => WEEKDAY_DATE.format(new Date(at));

/** `Thu, Nov 19, 23:00 UTC`. */
export const stamp = (at: string): string => `${STAMP.format(new Date(at))} UTC`;

/** The week as the board names it: `Nov 23 – 29`, `Nov 30 – Dec 6`. */
export function weekShort({ startsAt, endsAt }: Pick<HeroWeek, 'startsAt' | 'endsAt'>): string {
  const start = new Date(startsAt);
  const last = new Date(new Date(endsAt).getTime() - DAY_MS);
  const startMonth = MONTH_SHORT.format(start);
  const lastMonth = MONTH_SHORT.format(last);
  const end = startMonth === lastMonth ? `${last.getUTCDate()}` : `${lastMonth} ${last.getUTCDate()}`;
  return `${startMonth} ${start.getUTCDate()} – ${end}`;
}

/** The repository's own name: `mona/scroll-guard` → `scroll-guard`. */
export const repoNameOf = (nameWithOwner: string): string => nameWithOwner.slice(nameWithOwner.indexOf('/') + 1);

/** What each refusal means, and what to do about it. */
export const REFUSAL_TEXT: Record<HeroRefusal, string> = {
  NOT_ON_SHORTLIST: 'This repository is no longer on the shortlist.',
  NO_LIVE_CHECK: 'Run a live check first.',
  LIVE_CHECK_STALE: 'The live check is more than 10 minutes old. Run it again.',
  OTHER_PACKAGE: 'The package does not match the live check, or GitHub cannot be asked about that name.',
  PACKAGES_UNAVAILABLE: 'The package lookup did not answer, so GitHub’s link is not known. Run the live check again.',
  REPOSITORY_GONE: 'GitHub no longer shows this repository: deleted, renamed away or made private.',
  GITHUB_UNAVAILABLE: 'GitHub did not answer. Try again in a minute.',
  FORK: 'The repository is a fork.',
  ARCHIVED: 'The repository is archived.',
  NO_EMAIL:
    'The owner has no public email on GitHub, so the heads-up has nowhere to go. Schedule it with no heads-up, or pick another.',
  UNLINKED: 'GitHub does not link this package to the repository.',
  OPTED_OUT: 'This maintainer opted out. We do not ask again.',
  ALREADY_FEATURED: 'This repository already has a slot.',
  BAD_WEEK: 'That is not a week we can schedule.',
  TOO_LATE:
    'Scheduling for that week has closed: with the heads-up the maintainer would get less than 4 days to opt out, and with none the week has started.',
  WEEK_TAKEN: 'That week already has a hero.',
  NO_ACCOUNT_EMAIL: 'Your session holds no email address, and a preview’s emails go to you. Sign in again.',
  BAD_TEXT: `Write the card’s line and the archive’s text, within their lengths: line and reason ${LINE_MAX}, text ${TEXT_MAX} characters.`,
  NOT_FOUND: 'That slot no longer exists.',
  NOT_CANCELLABLE:
    'This slot can no longer be cancelled: its maintainer was told, or may have been. It ends only by their opt-out or the repository gone.',
  NOT_MARKABLE:
    'This heads-up cannot be marked as sent: it was sent or held already, or was queued less than 6 hours ago.',
};

export const refusalText = (refusal: string): string => REFUSAL_TEXT[refusal as HeroRefusal] ?? `Refused (${refusal}).`;

export const STATUS_LABEL: Record<HeroStatus, string> = {
  SCHEDULED: 'Scheduled',
  NOTIFIED: 'Maintainer told',
  LIVE: 'Live',
  DONE: 'Done',
  OPTED_OUT: 'Opted out',
  CANCELLED: 'Cancelled',
};

export const STATUS_TONE: Record<HeroStatus, 'neutral' | 'green' | 'violet' | 'amber' | 'red'> = {
  SCHEDULED: 'neutral',
  NOTIFIED: 'violet',
  LIVE: 'green',
  DONE: 'neutral',
  OPTED_OUT: 'amber',
  CANCELLED: 'red',
};

const CANCEL_REASON: Record<HeroCancelReason, string> = {
  owner: 'Cancelled by you',
  gone: 'The repository is gone: deleted or made private',
  archived: 'The repository was archived',
  no_email: 'The maintainer’s public email was gone at the heads-up',
  opted_out: 'The maintainer had opted out',
  owner_changed: 'The repository belonged to another account at the heads-up',
  not_told: 'The heads-up never left, so nobody was told',
  not_live: 'The week ended before GitHub’s star count could be read',
  removed: 'The maintainer’s account was removed',
};

export const cancelReasonText = (reason: string | null): string =>
  reason ? (CANCEL_REASON[reason as HeroCancelReason] ?? `Cancelled (${reason})`) : 'Cancelled';

/** One line on an email of a slot, and whether it needs the owner. */
export type MailLine = { text: string; tone: 'neutral' | 'amber' };

function mailLine(name: 'Heads-up' | 'Recap', mail: HeroMail): MailLine | null {
  if (mail.sentAt) {
    const by = mail.markedBy ? `, marked by ${mail.markedBy}` : '';
    return { text: `${name} sent ${stamp(mail.sentAt)}${by}`, tone: 'neutral' };
  }
  if (mail.held) return { text: `${name} held: the address may not receive this email yet`, tone: 'amber' };
  if (mail.noReceipt && mail.queuedAt) {
    return {
      text: `No receipt: ${name.toLowerCase()} queued ${stamp(mail.queuedAt)}, neither sent nor held`,
      tone: 'amber',
    };
  }
  if (mail.queuedAt)
    return { text: `${name} queued ${stamp(mail.queuedAt)}, waiting for its receipt`, tone: 'neutral' };
  return null;
}

/** Where a slot's heads-up stands; a slot with no heads-up says so. */
export function headsUpLine(slot: Pick<HeroSlot, 'status' | 'startsAt' | 'headsUp' | 'noHeadsUp'>): MailLine | null {
  const line = slot.headsUp ? mailLine('Heads-up', slot.headsUp) : null;
  if (line) return line;
  if (slot.noHeadsUp) {
    const text =
      slot.status === 'SCHEDULED'
        ? 'No heads-up: the maintainer gets no email before the week'
        : 'No heads-up was sent';
    return { text, tone: 'neutral' };
  }
  if (slot.status !== 'SCHEDULED') return null;
  const from = new Date(new Date(slot.startsAt).getTime() - HEADS_UP_LEAD_HOURS * HOUR_MS).toISOString();
  return { text: `Heads-up not sent yet: it goes out from ${stamp(from)}`, tone: 'neutral' };
}

/** Where a slot's recap stands. */
export const recapLine = (slot: Pick<HeroSlot, 'recap'>): MailLine | null =>
  slot.recap ? mailLine('Recap', slot.recap) : null;

/**
 * Whether Cancel applies, as the API decides it: a preview slot in any state but an ended one; a real one only while
 * `scheduled` and its heads-up not queued, or held (it did not leave); a real one with no heads-up until its week ends
 * (nobody was told). Locked otherwise, with why; `none` for a slot that has ended.
 */
export type CancelState = { kind: 'cancellable' } | { kind: 'locked'; why: string } | { kind: 'none' };

export function cancelStateOf(slot: Pick<HeroSlot, 'status' | 'preview' | 'headsUp' | 'noHeadsUp'>): CancelState {
  if (slot.status === 'CANCELLED' || slot.status === 'OPTED_OUT') return { kind: 'none' };
  if (slot.preview) return { kind: 'cancellable' };
  if (slot.status === 'DONE') return { kind: 'none' };
  if (slot.noHeadsUp && (slot.status === 'SCHEDULED' || slot.status === 'LIVE')) return { kind: 'cancellable' };
  if (slot.status === 'SCHEDULED') {
    if (!slot.headsUp?.queuedAt || slot.headsUp.held) return { kind: 'cancellable' };
    return {
      kind: 'locked',
      why: 'Locked: the heads-up has left and may have reached the maintainer. The slot ends only by their opt-out or the repository gone.',
    };
  }
  return {
    kind: 'locked',
    why: 'Locked: the maintainer was told. The slot ends only by their opt-out or the repository gone.',
  };
}

/** Mark notified applies to a scheduled slot whose heads-up left with no receipt. */
export const markableOf = (slot: Pick<HeroSlot, 'status' | 'headsUp'>): boolean =>
  slot.status === 'SCHEDULED' && !!slot.headsUp?.noReceipt;

/** `+318`; nothing when unknown. */
export const gained = (n: number | null): string => (typeof n === 'number' ? `+${full(Math.max(0, n))}` : '—');

/** The confirm step before Skip: a skip is kept for good, and this page cannot take it back. */
export const skipConfirm = (nameWithOwner: string) => ({
  title: `Skip ${nameWithOwner}?`,
  description: 'It will not be listed again, on this shortlist or any later one. This cannot be undone from this page.',
  confirm: 'Skip it',
});

/** The confirm step before cancelling a live hero: it leaves the home page at once. */
export const cancelLiveConfirm = (nameWithOwner: string) => ({
  title: `Cancel ${nameWithOwner} while it is live?`,
  description: 'It leaves the home page at once and does not become a past hero. This cannot be undone.',
  confirm: 'Cancel it',
});

/** The confirm step before Mark notified: the slot is then the maintainer's, and can no longer be cancelled. */
export const markNotifiedConfirm = (nameWithOwner: string) => ({
  title: `Mark the heads-up of ${nameWithOwner} as sent?`,
  description:
    'Check the mailbox’s Sent folder first. The slot becomes “Maintainer told” and can no longer be cancelled. This cannot be undone.',
  confirm: 'Mark as sent',
});
