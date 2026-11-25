/*
 * The Learn sign: set once, when a person saves Learn's onboarding, and never cleared. People never see it as a word;
 * it only decides where Learn's buttons lead. It has three states: true, false, and null when it cannot be read, in
 * which case every reader keeps today's rule and nobody is sent to the onboarding.
 */

/** The sign from its stamp as the API answers it: a time is the sign, null is none yet, anything else is not known. */
export const learnSignOf = (at: unknown): boolean | null =>
  typeof at === 'string' ? at.length > 0 : at === null ? false : null;

/** The sign as one of Learn's own routes answers it (`learnOnboarded`): true, false, or not known. */
export const learnSignFrom = (value: unknown): boolean | null => (typeof value === 'boolean' ? value : null);
