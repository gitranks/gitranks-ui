import type { BuildSettings } from '../types';

/* Build's row in Settings as the approved designs draw it. */

/** A person with a build, the reminders as they come: on. */
export const buildRemindersOn: BuildSettings = { reminders: true };

/** The switch turned off. */
export const buildRemindersOff: BuildSettings = { reminders: false };
