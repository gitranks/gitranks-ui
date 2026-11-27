/** The day the Privacy policy last changed (YYYY-MM-DD), its GitRanks Interviews section aside. */
export const PRIVACY_UPDATED = '2026-11-25';

/**
 * The day the GitRanks Interviews section first shows (YYYY-MM-DD). Set it on the day Interviews opens to everyone; a
 * spec fails while it is open without one.
 */
export const INTERVIEWS_PRIVACY_UPDATED: string | null = null;

/**
 * The policy's "Last updated" day: `PRIVACY_UPDATED`, or the day the Interviews section first showed when it shows and
 * that day is later. Days in YYYY-MM-DD compare as strings.
 */
export function privacyUpdated(
  interviewsShown: boolean,
  policy: string = PRIVACY_UPDATED,
  interviews: string | null = INTERVIEWS_PRIVACY_UPDATED,
): string {
  return interviewsShown && interviews && interviews > policy ? interviews : policy;
}
