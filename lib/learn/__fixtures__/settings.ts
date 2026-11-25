import type { LearnEmailSettings, LearnIssuesEmailSetting, LearnLessonIssuesSetting } from '../settings';

/** Learn's email settings as page 23's boards draw them. */
export const learnEmail = {
  /** Off, the zone taken from the device. */
  device: { lessonsToRepeat: false, timeZone: 'Europe/Lisbon', timeZoneBy: 'DEVICE' },
  /** On, the zone taken from the device. */
  on: { lessonsToRepeat: true, timeZone: 'Europe/Lisbon', timeZoneBy: 'DEVICE' },
  /** A zone the person chose. */
  chosen: { lessonsToRepeat: true, timeZone: 'Europe/Berlin', timeZoneBy: 'PERSON' },
  /** No zone known: the API answers New York. */
  unknown: { lessonsToRepeat: false, timeZone: 'America/New_York', timeZoneBy: 'DEVICE' },
} satisfies Record<string, LearnEmailSettings>;

/** The cities the boards' open list shows, the device's (Lisbon) first. */
export const BOARD_ZONES = [
  'Europe/Lisbon',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Kyiv',
  'America/New_York',
  'America/Los_Angeles',
];

/** "New issues for you": off as it starts, on for the person's list, and on for the lessons they learned. */
export const learnIssuesEmail: Record<'off' | 'forYou' | 'learned', LearnIssuesEmailSetting> = {
  off: { on: false, cover: null },
  forYou: { on: true, cover: 'FOR_YOU' },
  learned: { on: true, cover: 'LEARNED' },
};

/** "Issues for my lessons": off as it starts, and on. */
export const learnLessonIssuesEmail: Record<'off' | 'on', LearnLessonIssuesSetting> = {
  off: { on: false },
  on: { on: true },
};
