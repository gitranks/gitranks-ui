import { describe, expect, it } from 'vitest';

import { learnEmail } from './__fixtures__/settings';
import { setupGuessed, setupNone, setupNothing, setupSaved, setupWorking } from './__fixtures__/setup';
import {
  allZonesOf,
  isTimeZoneName,
  learnEmailSettingsInputOf,
  learnEmailSettingsOf,
  learnIssuesEmailOf,
  learnSettingsErrorOf,
  pickChangesNothing,
  settingsAfterPick,
  setupRowOf,
  setupSummaryOf,
  timeZoneLineOf,
  zoneChoicesOf,
  zoneLabelOf,
  zoneOffsetOf,
  zonePickInputOf,
  zoneSourceOf,
} from './settings';

const WINTER = new Date('2026-01-15T12:00:00.000Z');
const SUMMER = new Date('2026-07-15T12:00:00.000Z');

describe("Learn's email settings as the API answers them", () => {
  it('takes an answer of the right shape, and nothing else', () => {
    expect(learnEmailSettingsOf(learnEmail.chosen)).toEqual(learnEmail.chosen);
    expect(learnEmailSettingsOf({ ...learnEmail.chosen, extra: 1 })).toEqual(learnEmail.chosen);
    for (const bad of [
      null,
      'on',
      { ...learnEmail.chosen, lessonsToRepeat: 'yes' },
      { ...learnEmail.chosen, timeZone: 'Mars/Olympus' },
      { ...learnEmail.chosen, timeZoneBy: 'SOMEONE' },
    ]) {
      expect(learnEmailSettingsOf(bad)).toBeNull();
    }
  });

  it('knows a real zone name from an offset, a made-up name or one far too long', () => {
    expect(isTimeZoneName('Europe/Lisbon')).toBe(true);
    expect(isTimeZoneName('America/Argentina/Buenos_Aires')).toBe(true);
    for (const bad of ['', '+02:00', '-5', 'Mars/Olympus', `Europe/${'x'.repeat(64)}`, 3, null]) {
      expect(isTimeZoneName(bad)).toBe(false);
    }
  });
});

describe('"A new issue for you" as the API answers it', () => {
  it('reads the switch and the list it covers, no list until it was first turned on, and nothing of another shape', () => {
    expect(learnIssuesEmailOf({ newIssues: true, newIssuesCover: 'FOR_YOU' })).toEqual({ on: true, cover: 'FOR_YOU' });
    expect(learnIssuesEmailOf({ newIssues: false, newIssuesCover: 'LEARNED' })).toEqual({
      on: false,
      cover: 'LEARNED',
    });
    expect(learnIssuesEmailOf({ newIssues: false, newIssuesCover: null })).toEqual({ on: false, cover: null });
    expect(learnIssuesEmailOf({ newIssues: true, newIssuesCover: 'ALL' })).toEqual({ on: true, cover: null });
    for (const odd of [null, undefined, 'on', {}, { newIssues: 'true' }]) expect(learnIssuesEmailOf(odd)).toBeNull();
  });
});

describe('a save of the email settings', () => {
  it('sends the switch alone, so it never moves the zone', () => {
    expect(learnEmailSettingsInputOf({ lessonsToRepeat: true })).toEqual({ lessonsToRepeat: true });
    expect(learnEmailSettingsInputOf({ lessonsToRepeat: false })).toEqual({ lessonsToRepeat: false });
  });

  it("makes a zone the person's own, and hands it back to the device alone", () => {
    expect(learnEmailSettingsInputOf({ timeZone: 'Europe/Berlin' })).toEqual({
      timeZone: 'Europe/Berlin',
      timeZoneBy: 'PERSON',
    });
    expect(learnEmailSettingsInputOf({ timeZone: 'Europe/Berlin', timeZoneBy: 'PERSON' })).toEqual({
      timeZone: 'Europe/Berlin',
      timeZoneBy: 'PERSON',
    });
    expect(learnEmailSettingsInputOf({ timeZoneBy: 'DEVICE' })).toEqual({ timeZoneBy: 'DEVICE' });
  });

  it('refuses anything else: nothing to save, a bad switch, a zone that is not one, a person with no zone', () => {
    for (const bad of [
      null,
      [],
      {},
      { lessonsToRepeat: 'on' },
      { timeZone: '+01:00' },
      { timeZone: 'Mars/Olympus' },
      { timeZoneBy: 'PERSON' },
      { timeZoneBy: 'SOMEONE', timeZone: 'Europe/Berlin' },
      { timeZoneBy: 'DEVICE', timeZone: 'Europe/Berlin' },
      { lessonsToRepeat: true, timeZone: 7 },
    ]) {
      expect(learnEmailSettingsInputOf(bad)).toBeNull();
    }
  });

  it('keeps only the fields it knows', () => {
    expect(learnEmailSettingsInputOf({ lessonsToRepeat: true, githubLogin: 'someone-else' })).toEqual({
      lessonsToRepeat: true,
    });
  });

  it('says why a change did not save', () => {
    expect(learnSettingsErrorOf('SIGNED_OUT')).toBe('Your session ended. Sign in again, then change it.');
    expect(learnSettingsErrorOf('CLOSED')).toBe('Nothing was saved. Try again in a minute.');
    expect(learnSettingsErrorOf('INVALID')).toBe('That is not a choice Learn takes. Reload the page and pick again.');
    expect(learnSettingsErrorOf('FAILED')).toBe('We could not save just now. Try again in a minute.');
  });
});

describe('the time zone row', () => {
  it('names a zone by its city and its offset at the time', () => {
    expect(zoneLabelOf('Europe/Lisbon', WINTER)).toBe('Lisbon (UTC+0)');
    expect(zoneLabelOf('Europe/Berlin', SUMMER)).toBe('Berlin (UTC+2)');
    expect(zoneLabelOf('America/New_York', WINTER)).toBe('New York (UTC−5)');
    expect(zoneOffsetOf('Asia/Kolkata', WINTER)).toBe('UTC+5:30');
    expect(zoneOffsetOf('Mars/Olympus', WINTER)).toBe('UTC');
  });

  it("says whose zone it is: the person's, the device's, none known, or nothing when that is not known", () => {
    expect(zoneSourceOf(learnEmail.chosen, 'Europe/Berlin')).toBe('person');
    expect(zoneSourceOf(learnEmail.device, 'Europe/Lisbon')).toBe('device');
    expect(zoneSourceOf(learnEmail.unknown, null)).toBe('unknown');
    expect(zoneSourceOf(learnEmail.device, undefined)).toBeNull();
    expect(timeZoneLineOf('Europe/Lisbon', 'device')).toBe(
      'Daily emails come in the morning, Lisbon time. Taken from your device.',
    );
    expect(timeZoneLineOf('Europe/Berlin', 'person')).toBe(
      'Daily emails come in the morning, Berlin time. You chose it, so it no longer follows your device.',
    );
    expect(timeZoneLineOf('America/New_York', 'unknown')).toBe(
      'We could not tell your time zone, so daily emails come in the morning, New York time. Change it if you are elsewhere.',
    );
    expect(timeZoneLineOf('Europe/Lisbon', null)).toBe('Daily emails come in the morning, Lisbon time.');
  });

  it("lists the device's zone first and marked, then every other, by city", () => {
    const choices = zoneChoicesOf(['Europe/Berlin', 'Europe/Lisbon', 'America/New_York'], 'Europe/Lisbon', WINTER);
    expect(choices).toEqual([
      { zone: 'Europe/Lisbon', label: 'Lisbon (UTC+0)', device: true },
      { zone: 'Europe/Berlin', label: 'Berlin (UTC+1)', device: false },
      { zone: 'America/New_York', label: 'New York (UTC−5)', device: false },
    ]);
    expect(zoneChoicesOf(['Europe/Berlin'], null, WINTER).map((choice) => choice.device)).toEqual([false]);
    const all = allZonesOf('Europe/Lisbon', 'Mars/Olympus');
    expect(all).toContain('Europe/Lisbon');
    expect(all).not.toContain('Mars/Olympus');
    expect(new Set(all).size).toBe(all.length);
  });

  it("hands the choice back to the device for the device's own zone, and keeps any other as the person's", () => {
    expect(zonePickInputOf('Europe/Lisbon', 'Europe/Lisbon')).toEqual({ timeZoneBy: 'DEVICE' });
    expect(zonePickInputOf('Europe/Berlin', 'Europe/Lisbon')).toEqual({
      timeZone: 'Europe/Berlin',
      timeZoneBy: 'PERSON',
    });
    expect(zonePickInputOf('Europe/Berlin', null)).toEqual({ timeZone: 'Europe/Berlin', timeZoneBy: 'PERSON' });
    expect(settingsAfterPick(learnEmail.chosen, { timeZoneBy: 'DEVICE' }, 'Europe/Lisbon')).toEqual({
      ...learnEmail.chosen,
      timeZone: 'Europe/Lisbon',
      timeZoneBy: 'DEVICE',
    });
    expect(
      settingsAfterPick(learnEmail.device, { timeZone: 'Europe/Kyiv', timeZoneBy: 'PERSON' }, 'Europe/Lisbon'),
    ).toEqual({ ...learnEmail.device, timeZone: 'Europe/Kyiv', timeZoneBy: 'PERSON' });
  });
});

describe('the row "Languages and level"', () => {
  it('says the setup in a line, with only what it holds', () => {
    expect(setupSummaryOf(setupSaved)).toBe('Rust first · also Python and Go · Some experience');
    expect(setupSummaryOf({ mainLanguage: 'go', otherLanguages: ['python', 'rust', 'java'], level: 1 })).toBe(
      'Go first · also Python, Rust and Java · New to programming',
    );
    expect(setupSummaryOf(setupNothing)).toBe('Some experience');
    expect(setupSummaryOf(setupNone)).toBeNull();
  });

  it("shows the person's own with Edit, our guess marked with Check and save, and the read while it runs", () => {
    expect(setupRowOf(setupSaved)).toEqual({
      kind: 'saved',
      value: 'Rust first · also Python and Go · Some experience',
      cta: 'Edit',
      guess: false,
    });
    expect(setupRowOf(setupGuessed)).toEqual({
      kind: 'guessed',
      value: 'Go first · also Python · Experienced developer. Learn uses this guess until you save it.',
      cta: 'Check and save',
      guess: true,
    });
    expect(setupRowOf(setupWorking)).toMatchObject({ kind: 'working', cta: 'Set up Learn', guess: false });
  });

  it('says none yet, and a read that failed, each opening Set up Learn', () => {
    expect(setupRowOf(null)).toMatchObject({ kind: 'none', cta: 'Set up Learn' });
    expect(setupRowOf(setupNone)).toMatchObject({ kind: 'none', cta: 'Set up Learn' });
    expect(setupRowOf(undefined)).toEqual({
      kind: 'failed',
      value: "Your languages and level didn't load. Reload the page to try again.",
      cta: 'Set up Learn',
      guess: false,
    });
  });
});

describe('a pick that changes nothing', () => {
  it("is the person's own zone again, or the device's when it is the one kept", () => {
    expect(pickChangesNothing(learnEmail.chosen, 'Europe/Berlin', 'Europe/Berlin', 'Europe/Lisbon')).toBe(true);
    expect(pickChangesNothing(learnEmail.device, 'Europe/Lisbon', 'Europe/Lisbon', 'Europe/Lisbon')).toBe(true);
    // Another city; the device's while the person chose one; the device's while none, or an earlier device's, is kept.
    expect(pickChangesNothing(learnEmail.chosen, 'Europe/Berlin', 'Asia/Tokyo', 'Europe/Lisbon')).toBe(false);
    expect(pickChangesNothing(learnEmail.chosen, 'Europe/Berlin', 'Europe/Lisbon', 'Europe/Lisbon')).toBe(false);
    expect(pickChangesNothing(learnEmail.unknown, null, 'Europe/Lisbon', 'Europe/Lisbon')).toBe(false);
    expect(pickChangesNothing(learnEmail.device, 'Europe/Lisbon', 'Asia/Tokyo', 'Asia/Tokyo')).toBe(false);
    expect(pickChangesNothing(learnEmail.device, 'Europe/Berlin', 'Europe/Lisbon', 'Europe/Lisbon')).toBe(false);
  });
});
