import type { ContributeEmailSettingsInput, ContributeNeedsYouEmail } from '@/lib/workspace/contribute.types';

/**
 * The three choices of "When a pull request needs you", in the control's order, with their names. "Immediately" keeps
 * its short wait (an item that clears on its own sends nothing), which the words leave out.
 */
export const NEEDS_YOU_LABELS: Record<ContributeNeedsYouEmail, string> = {
  AFTER_30_MINUTES: 'Immediately',
  ONCE_A_DAY: 'Once a day',
  OFF: 'Off',
};

export const NEEDS_YOU_TITLE = 'When a pull request needs you';
export const ENDED_TITLE = 'When a pull request is merged or closed';

/** What "When a pull request needs you" covers, whatever the choice. */
export const NEEDS_YOU_COVERS = 'A fix to approve, a change or a comment from a maintainer, or a step only you can do.';

/** A zone's city, as people say it: `America/New_York` is "New York". */
export function zoneCityOf(zone: string): string {
  const city = zone.split('/').at(-1) || zone;
  return city.replace(/_/g, ' ');
}

/**
 * The line under "When a pull request needs you": what it covers, then what the choice sends. `zone` is the time zone
 * the daily summary keeps, said here only where no "Time zone" row says it (null then).
 */
export function needsYouLineOf(choice: ContributeNeedsYouEmail, zone: string | null): string {
  if (choice === 'ONCE_A_DAY') {
    const when = zone ? `8:00 in the morning, ${zoneCityOf(zone)} time` : '8:00 in the morning';
    return `${NEEDS_YOU_COVERS} One summary a day at ${when}, while something waits.`;
  }
  if (choice === 'OFF') return `${NEEDS_YOU_COVERS} No email for these: they still show under Pull requests.`;
  return NEEDS_YOU_COVERS;
}

export const endedLineOf = (on: boolean): string =>
  on ? 'One email each time.' : 'No email when a pull request is merged or closed.';

/** With no address nothing is sent: both rows are disabled under this line. */
export const EMAIL_NO_ADDRESS =
  'We have no email address for you, so no email is sent. Sign in again and share your GitHub email.';
export const EMAIL_AUTOPILOT_NOTE = "Autopilot's notices still come while autopilot is on.";
export const EMAIL_READ_FAILED = 'Email settings did not load.';

export const addressLineOf = (to: string): string => `Email goes to ${to}.`;

/**
 * The choice an email's "instead" link offers (`?email=daily`, or `?email=after-30` for Immediately, the value emails
 * already sent carry); null for anything else. Opening the link changes nothing: the page asks first.
 */
export function emailHintOf(value: string | string[] | undefined): ContributeNeedsYouEmail | null {
  const hint = Array.isArray(value) ? value[0] : value;
  if (hint === 'daily') return 'ONCE_A_DAY';
  if (hint === 'after-30') return 'AFTER_30_MINUTES';
  return null;
}

/** The question above the rows while an email's link offers another choice. */
export const hintQuestionOf = (hint: ContributeNeedsYouEmail): string =>
  hint === 'ONCE_A_DAY' ? 'Switch to one summary a day?' : 'Switch to immediate emails?';

/** The link that keeps the stored choice: "Keep immediate emails", "Keep once a day", "Keep emails off". */
const KEEP_LABELS: Record<ContributeNeedsYouEmail, string> = {
  AFTER_30_MINUTES: 'Keep immediate emails',
  ONCE_A_DAY: 'Keep once a day',
  OFF: 'Keep emails off',
};

export const keepLabelOf = (current: ContributeNeedsYouEmail): string => KEEP_LABELS[current];

/** The address without the hint, on the Email group: what Switch and Keep leave in the address bar. */
export function withoutEmailHint(href: string): string {
  const url = new URL(href, 'https://gitranks.invalid');
  url.searchParams.delete('email');
  return `${url.pathname}${url.search}#email`;
}

/** The longest time zone name sent; IANA names are far shorter. */
export const TIME_ZONE_MAX = 64;

/** A time zone worth sending: a non-empty name of at most 64 characters. Whether it is a real zone the API decides. */
export function timeZoneOf(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const zone = value.trim();
  return zone && zone.length <= TIME_ZONE_MAX ? zone : undefined;
}

/** The browser's time zone; null where it tells none (some privacy modes report "Etc/Unknown" or nothing). */
export function browserTimeZone(): string | null {
  try {
    const zone = timeZoneOf(Intl.DateTimeFormat().resolvedOptions().timeZone);
    return zone && zone !== 'Etc/Unknown' ? zone : null;
  } catch {
    return null;
  }
}

/** Where this browser keeps the last time zone it sent, so a visit sends it once, and again after a move. */
const SENT_ZONE_KEY = 'gitranks:time-zone-sent';

export function sentTimeZone(): string | null {
  try {
    return window.localStorage.getItem(SENT_ZONE_KEY);
  } catch {
    return null;
  }
}

export function rememberSentTimeZone(zone: string): void {
  try {
    window.localStorage.setItem(SENT_ZONE_KEY, zone);
  } catch {
    // Storage blocked: the next visit sends the zone again, which changes nothing.
  }
}

/** Forgets the zone sent, so the next visit sends the device's again: after a save of it that failed. */
export function forgetSentTimeZone(): void {
  try {
    window.localStorage.removeItem(SENT_ZONE_KEY);
  } catch {
    // Storage blocked: nothing was kept.
  }
}

/** A save as the API takes it: only the fields given, and only well-formed ones. */
export function emailSettingsInputOf(input: ContributeEmailSettingsInput): ContributeEmailSettingsInput {
  const needsYou = input?.needsYou;
  const timeZone = timeZoneOf(input?.timeZone);
  return {
    ...(typeof needsYou === 'string' && Object.hasOwn(NEEDS_YOU_LABELS, needsYou) ? { needsYou } : {}),
    ...(typeof input?.ended === 'boolean' ? { ended: input.ended } : {}),
    ...(timeZone ? { timeZone } : {}),
  };
}
