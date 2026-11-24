import type { LearnActionError } from './learn-action';
import { languageNameOf } from './learn-question';
import { LEARN_DEFAULT_TIME_ZONE } from './my-progress';
import { LEARN_SETUP_PATH } from './paths';
import { type LearnSetupRead, SETUP_LEVELS, valuesOfRead } from './setup';
import { zoneCityOf } from '@/lib/workspace/email-settings';

/*
 * Learn's rows of Settings (page 23): "Languages and level" under Learn preferences, and in Email the switch "Lessons
 * to repeat" and the time zone the morning emails keep. A save sends only what the person changed, so the switch
 * never moves the zone and a zone never moves the switch.
 */

/** Who chose the time zone: the device's, saved on each visit, or the person's own, kept. */
export type LearnTimeZoneBy = 'DEVICE' | 'PERSON';

/** Learn's email settings as the API answers them: the zone is New York when the person has none. */
export type LearnEmailSettings = { lessonsToRepeat: boolean; timeZone: string; timeZoneBy: LearnTimeZoneBy };

/** What a save sends: each field only when it changes. */
export type LearnEmailSettingsInput = {
  lessonsToRepeat?: boolean;
  timeZone?: string;
  timeZoneBy?: LearnTimeZoneBy;
};

const isZoneBy = (value: unknown): value is LearnTimeZoneBy => value === 'DEVICE' || value === 'PERSON';

/** The API's answer when it has the settings' shape; null for anything else. */
export function learnEmailSettingsOf(value: unknown): LearnEmailSettings | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.lessonsToRepeat !== 'boolean' || !isTimeZoneName(raw.timeZone) || !isZoneBy(raw.timeZoneBy)) {
    return null;
  }
  return { lessonsToRepeat: raw.lessonsToRepeat, timeZone: raw.timeZone, timeZoneBy: raw.timeZoneBy };
}

/** The longest zone name taken; IANA names are far shorter. */
const TIME_ZONE_MAX = 64;

/** A real IANA zone name, as the browser knows it: not an offset typed by hand. */
export function isTimeZoneName(value: unknown): value is string {
  if (typeof value !== 'string' || !value || value.length > TIME_ZONE_MAX || /^[+-]/.test(value)) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/**
 * A save as the person asked it, or null for anything else: the switch as a boolean, a zone of a real name with
 * `PERSON`, or `DEVICE` alone to hand the zone back to the device. At least one field; nothing else is sent.
 */
export function learnEmailSettingsInputOf(value: unknown): LearnEmailSettingsInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const input: LearnEmailSettingsInput = {};
  if (raw.lessonsToRepeat !== undefined) {
    if (typeof raw.lessonsToRepeat !== 'boolean') return null;
    input.lessonsToRepeat = raw.lessonsToRepeat;
  }
  if (raw.timeZoneBy === 'DEVICE') {
    if (raw.timeZone !== undefined) return null;
    input.timeZoneBy = 'DEVICE';
  } else if (raw.timeZone !== undefined || raw.timeZoneBy !== undefined) {
    if (raw.timeZoneBy !== undefined && raw.timeZoneBy !== 'PERSON') return null;
    if (!isTimeZoneName(raw.timeZone)) return null;
    input.timeZone = raw.timeZone;
    input.timeZoneBy = 'PERSON';
  }
  return Object.keys(input).length ? input : null;
}

/** Why a change did not save, under its row. `CLOSED`: the API answered nothing for the person. */
export function learnSettingsErrorOf(error: LearnActionError | 'CLOSED'): string {
  if (error === 'SIGNED_OUT') return 'Your session ended. Sign in again, then change it.';
  if (error === 'INVALID') return 'That is not a choice Learn takes. Reload the page and pick again.';
  if (error === 'CLOSED') return 'Nothing was saved. Try again in a minute.';
  return 'We could not save just now. Try again in a minute.';
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Lessons to repeat                                                                                                  */
/* ------------------------------------------------------------------------------------------------------------------ */

export const LESSONS_TO_REPEAT_TITLE = 'Lessons to repeat';
export const LEARN_EMAIL_READ_FAILED =
  "Lessons to repeat and your time zone didn't load. Reload the page to try again; the rest works as usual.";
export const LESSONS_TO_REPEAT_LINE = 'One email a day at most, in the morning, and only when a lesson is still due.';

/** "A new issue for you" as Settings reads it: on or off, and the list it covers (null until first turned on). */
export type LearnIssuesEmailSetting = { on: boolean; cover: 'FOR_YOU' | 'LEARNED' | null };

/** The switch of "A new issue for you" as the API answers it; null for any other shape. */
export function learnIssuesEmailOf(value: unknown): LearnIssuesEmailSetting | null {
  if (!value || typeof value !== 'object') return null;
  const { newIssues, newIssuesCover } = value as { newIssues?: unknown; newIssuesCover?: unknown };
  if (typeof newIssues !== 'boolean') return null;
  return { on: newIssues, cover: newIssuesCover === 'FOR_YOU' || newIssuesCover === 'LEARNED' ? newIssuesCover : null };
}

/** "A new issue for you": its row, the same switch as "Email me when one appears" on Issues. */
export const NEW_ISSUES_TITLE = 'New issues for you';
export const NEW_ISSUES_LINE =
  'When an issue comes onto your Learn list. One email a day at most, with five issues at most.';

/* ------------------------------------------------------------------------------------------------------------------ */
/* Time zone                                                                                                          */
/* ------------------------------------------------------------------------------------------------------------------ */

export const TIME_ZONE_TITLE = 'Time zone';

/** A zone's offset from UTC at `now`: "UTC+1", "UTC−5", "UTC+5:30", "UTC+0". */
export function zoneOffsetOf(zone: string, now: Date): string {
  try {
    const name =
      new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'shortOffset' })
        .formatToParts(now)
        .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
    const offset = name.replace(/^GMT/, '') || '+0';
    return `UTC${offset.replace('-', '−')}`;
  } catch {
    return 'UTC';
  }
}

/** A zone as the list and its button show it: "Lisbon (UTC+0)". */
export const zoneLabelOf = (zone: string, now: Date): string => `${zoneCityOf(zone)} (${zoneOffsetOf(zone, now)})`;

/**
 * Whose zone the row shows: chosen by the person, taken from their device, or none known (Learn's default, New York).
 * Null when that cannot be told: the zone the device sent did not load.
 */
export type ZoneSource = 'person' | 'device' | 'unknown' | null;

/**
 * Where the zone comes from. The API answers New York for a person with no zone, so whether the device sent one is
 * read from the zone saved for the Email rows: `savedZone` null for none, undefined when that read failed.
 */
export function zoneSourceOf(
  settings: Pick<LearnEmailSettings, 'timeZoneBy'>,
  savedZone: string | null | undefined,
): ZoneSource {
  if (settings.timeZoneBy === 'PERSON') return 'person';
  if (savedZone === undefined) return null;
  return savedZone === null ? 'unknown' : 'device';
}

/** The line under "Time zone". */
export function timeZoneLineOf(zone: string, source: ZoneSource): string {
  if (source === 'unknown') {
    return `We could not tell your time zone, so daily emails come in the morning, ${zoneCityOf(LEARN_DEFAULT_TIME_ZONE)} time. Change it if you are elsewhere.`;
  }
  const lead = `Daily emails come in the morning, ${zoneCityOf(zone)} time.`;
  if (source === 'person') return `${lead} You chose it, so it no longer follows your device.`;
  return source === 'device' ? `${lead} Taken from your device.` : lead;
}

/** Every zone the browser knows, by city; a browser that lists none offers the zones already in play. */
export function allZonesOf(...known: (string | null | undefined)[]): string[] {
  let zones: string[] = [];
  try {
    zones = (Intl as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone') ?? [];
  } catch {
    zones = [];
  }
  const all = new Set([...known.filter((zone): zone is string => !!zone && isTimeZoneName(zone)), ...zones]);
  return [...all].sort((a, b) => zoneCityOf(a).localeCompare(zoneCityOf(b)));
}

/** One entry of the list: the zone, its city and offset, and whether it is the device's. */
export type ZoneChoice = { zone: string; label: string; device: boolean };

/** The list's entries at `now`: the device's zone first, marked, then every other zone, by city. */
export function zoneChoicesOf(zones: readonly string[], deviceZone: string | null, now: Date): ZoneChoice[] {
  const others = zones.filter((zone) => zone !== deviceZone);
  return [...(deviceZone ? [deviceZone] : []), ...others].map((zone) => ({
    zone,
    label: zoneLabelOf(zone, now),
    device: zone === deviceZone,
  }));
}

/** The save a pick makes: the device's own zone hands the choice back to the device; any other is the person's. */
export function zonePickInputOf(zone: string, deviceZone: string | null): LearnEmailSettingsInput {
  return zone === deviceZone ? { timeZoneBy: 'DEVICE' } : { timeZone: zone, timeZoneBy: 'PERSON' };
}

/**
 * Whether a pick changes nothing, so nothing is saved: the zone the person already chose, or the device's when the
 * setting follows the device and the device's zone is the one kept (`savedZone`, the zone the Email rows read). The
 * device's zone while another is kept (none yet, or an earlier device's) is saved, to send it.
 */
export function pickChangesNothing(
  settings: Pick<LearnEmailSettings, 'timeZone' | 'timeZoneBy'>,
  savedZone: string | null | undefined,
  zone: string,
  deviceZone: string | null,
): boolean {
  const input = zonePickInputOf(zone, deviceZone);
  if (input.timeZoneBy === 'PERSON') return settings.timeZoneBy === 'PERSON' && settings.timeZone === zone;
  return settings.timeZoneBy === 'DEVICE' && settings.timeZone === deviceZone && savedZone === deviceZone;
}

/** Under "Time zone" when the device's zone, picked, did not save: the emails keep the zone they had. */
export const DEVICE_ZONE_NOT_SAVED = "We couldn't save your device's time zone, so daily emails keep the one above.";

/** The settings once a pick is saved, as the row shows them while the save runs. */
export function settingsAfterPick(
  settings: LearnEmailSettings,
  input: LearnEmailSettingsInput,
  deviceZone: string | null,
) {
  if (input.timeZoneBy === 'DEVICE') {
    return { ...settings, timeZone: deviceZone ?? settings.timeZone, timeZoneBy: 'DEVICE' as const };
  }
  return { ...settings, timeZone: input.timeZone ?? settings.timeZone, timeZoneBy: 'PERSON' as const };
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Learn preferences                                                                                                  */
/* ------------------------------------------------------------------------------------------------------------------ */

export const LEARN_PREFERENCES_TITLE = 'Learn preferences';
export const LANGUAGES_AND_LEVEL_TITLE = 'Languages and level';

/** "Go and TypeScript", "Go, Rust and Java". */
const andWords = (words: readonly string[]) =>
  words.length < 2 ? (words[0] ?? '') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;

/** The setup in a line: "Python first · also Go and Rust · Some experience"; null with nothing in it. */
export function setupSummaryOf(read: Pick<LearnSetupRead, 'mainLanguage' | 'otherLanguages' | 'level'>): string | null {
  const values = valuesOfRead(read);
  const parts = [
    values.mainLanguage ? `${languageNameOf(values.mainLanguage)} first` : null,
    values.otherLanguages.length ? `also ${andWords(values.otherLanguages.map(languageNameOf))}` : null,
    SETUP_LEVELS.find((each) => each.level === values.level)?.label ?? null,
  ].filter((part): part is string => !!part);
  return parts.length ? parts.join(' · ') : null;
}

/** The row "Languages and level" in each state of the setup: what it says and what its button does. */
export type SetupRow = {
  kind: 'saved' | 'guessed' | 'working' | 'none' | 'failed';
  value: string;
  cta: string;
  /** Marked "Our guess". */
  guess: boolean;
};

/**
 * The row for the setup as read: the person's own, our guess waiting for them, our guess running, none yet, or a read
 * that failed (`undefined`). Its button always opens Set up Learn.
 */
export function setupRowOf(read: LearnSetupRead | null | undefined): SetupRow {
  if (read === undefined) {
    return {
      kind: 'failed',
      value: "Your languages and level didn't load. Reload the page to try again.",
      cta: 'Set up Learn',
      guess: false,
    };
  }
  const summary = read ? setupSummaryOf(read) : null;
  if (read?.state === 'SAVED' && summary) return { kind: 'saved', value: summary, cta: 'Edit', guess: false };
  if (read?.state === 'GUESSED' && summary) {
    return {
      kind: 'guessed',
      value: `${summary}. Learn uses this guess until you save it.`,
      cta: 'Check and save',
      guess: true,
    };
  }
  if (read?.state === 'WORKING') {
    return {
      kind: 'working',
      value: 'We are reading your public GitHub profile. It takes a few seconds.',
      cta: 'Set up Learn',
      guess: false,
    };
  }
  return {
    kind: 'none',
    value: 'Not set up yet. Pick your languages and level, and Learn opens each example in your language.',
    cta: 'Set up Learn',
    guess: false,
  };
}

/** Where the row's button goes. */
export const SETUP_ROW_PATH = LEARN_SETUP_PATH;

/* ------------------------------------------------------------------------------------------------------------------ */
/* An email switch with no address                                                                                    */
/* ------------------------------------------------------------------------------------------------------------------ */

/**
 * Under a Learn email's switch while the person has no address ("Lessons to repeat" in Settings, "A new issue for
 * you" on Issues): the email cannot be sent, and where the address comes from. Said in place, so a switch never looks
 * on while it sends nothing; it goes once an address is read.
 */
export const EMAIL_NEEDS_ADDRESS = {
  lead: 'This email needs an address, and we have none for you. Add or verify one in your',
  link: 'GitHub email settings',
  tail: ', then sign in again.',
} as const;
