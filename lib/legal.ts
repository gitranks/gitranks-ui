/**
 * Who runs GitRanks, for the Privacy policy and the Terms (`app/privacy`, `app/terms`): the operator's name and
 * address, the contact address and the day the text last changed.
 *
 * Both pages are short and defensive on purpose: the information the GDPR (Articles 13 and 14) and consumer law
 * require, plus clauses that protect the operator; no promise the law doesn't require, and no numbers the site shows
 * and may change (thresholds, limits). Add detail later as a decision, not by drift.
 */

/** The operator's full legal name: the owner, as a sole trader. */
export const OPERATOR_NAME = 'Vitalii Maslianok';

/** The operator's postal address, one line. */
export const OPERATOR_ADDRESS =
  '14 Prospekt Martynova, Sofiivska Borshchahivka, Bucha district, Kyiv region, 08156, Ukraine';

/** Where privacy and removal requests, and every other question, go. */
export const CONTACT_EMAIL = 'hello@gitranks.com';

/** The day the Privacy policy and the Terms last changed (YYYY-MM-DD). */
export const LAST_UPDATED = '2026-10-31';

/** "27 October 2026", the way the pages show a last-updated day. */
export function legalDate(day: string = LAST_UPDATED): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${day}T00:00:00Z`),
  );
}
