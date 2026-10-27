/**
 * Who runs GitRanks, for the Privacy policy and the Terms (`app/privacy`, `app/terms`): the operator's name and
 * address, the contact address and the day the text last changed.
 *
 * Both pages are short and defensive on purpose: the information the GDPR (Articles 13 and 14) and consumer law
 * require, plus clauses that protect the operator; no promise the law doesn't require, and no numbers the site shows
 * and may change (thresholds, limits). Add detail later as a decision, not by drift.
 *
 * Open points for the owner and a lawyer (not on the pages):
 * - GDPR Art. 27: an operator outside the EU that monitors people in the EU (rankings and profiles are monitoring)
 *   must, as a rule, name a representative in the EU, and under UK GDPR one in the UK.
 * - Art. 14(5)(b): GitRanks describes millions of public GitHub accounts and informs them through this page, not one
 *   by one. The legitimate-interests assessment for ranking and profiling them should be written down.
 * - Google Analytics sets non-essential cookies, which in the EU and the UK need consent before they are set
 *   (ePrivacy Art. 5(3), PECR reg. 6). The site has no consent banner yet: add one or drop the cookies.
 * - Records against fake stars are kept after a removal (Privacy policy #removal); confirm that the legitimate
 *   interest in fair rankings outweighs the request.
 * - Ukraine's Law No. 2297-VI: whether processing must be notified, and whether a responsible person must be named.
 * - Have a lawyer review both pages.
 */

/** The operator's full legal name: the owner, as a sole trader. */
export const OPERATOR_NAME = 'Vitalii Maslianok';

/** The operator's postal address, one line. */
export const OPERATOR_ADDRESS =
  '14 Prospekt Martynova, Sofiivska Borshchahivka, Bucha district, Kyiv region, 08156, Ukraine';

/** Where privacy and removal requests, and every other question, go. */
export const CONTACT_EMAIL = 'hello@gitranks.com';

/** The day the Privacy policy and the Terms last changed (YYYY-MM-DD). */
export const LAST_UPDATED = '2026-10-27';

/** "27 October 2026", the way the pages show a last-updated day. */
export function legalDate(day: string = LAST_UPDATED): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${day}T00:00:00Z`),
  );
}
