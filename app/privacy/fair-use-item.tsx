import { connection } from 'next/server';
import { Suspense } from 'react';

import { TermsRulesLink } from './terms-rules-link';
import { B, UpdatedLine } from '@/components/legal/legal-page';
import { type IssueRules, RULES_BEFORE, RULES_UNREAD, termsDayOf } from '@/lib/workspace/fair-use';
import { issueRules } from '@/lib/workspace/rules-live';

/**
 * The Privacy policy's own date while the rules of today hold: it changed after `LAST_UPDATED` (GitRanks Learn and
 * following a package, 2026-11-18; the public progress page, 2026-11-20; Contribute's fair use, 2026-11-22; the bar
 * Settings opens with, 2026-11-23; the record of issues taken and the cookie of "See the full issue", 2026-11-24).
 * Once the rules about full issues a day are live, the date of the Terms that describe them.
 */
export const PRIVACY_UPDATED = '2026-11-24';

/**
 * The Privacy policy's fair-use item: while the rules of today hold, issues shown and viewed and a shorter list; once
 * the rules about full issues a day are live, issues taken against pull requests; while the API does not answer, that
 * this part could not be loaded; while the read is under way, the item's name alone.
 */
export function FairUseItemScreen({ rules = RULES_BEFORE }: { rules?: IssueRules }) {
  if (rules.state === 'pending') {
    return (
      <li aria-busy="true" data-fair-use-item="pending">
        <B>Fair use</B>
      </li>
    );
  }
  if (rules.state === 'unknown') {
    return (
      <li data-fair-use-item="unknown">
        <B>Fair use</B>: {RULES_UNREAD}
      </li>
    );
  }
  if (rules.state === 'before') {
    return (
      <li data-fair-use-item="before">
        <B>Fair use</B>: pull requests for issues from your list go through GitRanks (see the <TermsRulesLink />
        ). To check that, we compare the issues we showed you with the pull requests you open for them, and count the
        issues you view. What we find, the messages we send you about it and your answers are kept for up to 180 days
        after the last change, even after you delete your Contribute data, and longer while a shorter list or a block is
        in place. Basis: legitimate interests, in keeping Contribute fair.
      </li>
    );
  }
  return (
    <li data-fair-use-item="live">
      <B>Fair use</B>: pull requests for issues you take on GitRanks go through GitRanks (see the <TermsRulesLink />
      ). Once a day we compare the issues you took with the pull requests you open, on GitRanks or outside it, and count
      the issues you took against the pull requests you opened through GitRanks. We keep what we find: the days on which
      an issue you took here was fixed outside GitRanks, your counts of issues taken and pull requests opened, the
      issues you took in the last 30 days, a lower limit or a closed access, and your requests to look again. We keep
      them for as long as GitRanks runs Contribute, even after you delete your Contribute data, so that deleting resets
      nothing. Messages and your answers: 180 days after they were sent, longer while a lower limit or a closed access
      holds. What our earlier checks found is kept for up to 180 days after its last change. Basis: legitimate
      interests, in keeping Contribute fair.
    </li>
  );
}

/** The item with the rules the API says hold. */
export async function FairUseItemLive() {
  await connection();
  return <FairUseItemScreen rules={await issueRules()} />;
}

/** The item's name at once in the static page, never words that may be the wrong ones; then the rules that hold. */
export function FairUseItem() {
  return (
    <Suspense fallback={<FairUseItemScreen rules={{ state: 'pending' }} />}>
      <FairUseItemLive />
    </Suspense>
  );
}

/** The policy's date for the rules that hold: today's own date, the Terms' once live, none while unknown. */
export function PrivacyUpdatedScreen({ rules }: { rules: IssueRules }) {
  if (rules.state === 'pending') return <p aria-busy="true" className="h-5 text-sm" data-privacy-updated="pending" />;
  if (rules.state === 'unknown') return null;
  return <UpdatedLine updated={termsDayOf(rules) ?? PRIVACY_UPDATED} />;
}

/** The date line with the rules the API says hold. */
export async function PrivacyUpdatedLive() {
  await connection();
  return <PrivacyUpdatedScreen rules={await issueRules()} />;
}

/** The date line: an empty line of its height at once in the static page, then the date. */
export function PrivacyUpdated() {
  return (
    <Suspense fallback={<PrivacyUpdatedScreen rules={{ state: 'pending' }} />}>
      <PrivacyUpdatedLive />
    </Suspense>
  );
}
