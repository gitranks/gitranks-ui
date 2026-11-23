import type { LearnEmailSettings } from '../settings';

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
