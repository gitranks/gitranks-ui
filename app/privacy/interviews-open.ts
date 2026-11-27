/*
 * Whether the Privacy policy shows its GitRanks Interviews section. The section is about pages most people cannot see
 * yet, so it waits for the day Interviews opens to everyone. This file stands in for the constant that opens
 * Interviews' parts on the site's other pages (`INTERVIEWS_OPEN_TO_EVERYONE` in `lib/interviews/interviews-parts.ts`):
 * once that file is on main, this one goes and the page imports the constant from there.
 */

/** Interviews is open to everyone: the Privacy policy then shows its Interviews section. */
export const INTERVIEWS_OPEN_TO_EVERYONE = false;

/**
 * The day the Interviews section first shows (YYYY-MM-DD): the policy's "Last updated" line moves to it. Set it on the
 * day `INTERVIEWS_OPEN_TO_EVERYONE` turns true; a spec fails while it is open without one.
 */
export const INTERVIEWS_PRIVACY_UPDATED: string | null = null;
