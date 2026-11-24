import { connection } from 'next/server';
import { Suspense } from 'react';

import { TermsRulesLink } from './terms-rules-link';
import { B } from '@/components/legal/legal-page';
import { issueRulesLive } from '@/lib/workspace/rules-live';

/**
 * The Privacy policy's fair-use item: while the rules of today hold, issues shown and viewed and a shorter list; once
 * the rules about full issues a day are live, issues taken against pull requests, kept for good.
 */
export function FairUseItemScreen({ rulesLive = false }: { rulesLive?: boolean }) {
  if (!rulesLive) {
    return (
      <li>
        <B>Fair use</B>: pull requests for issues from your list go through GitRanks (see the <TermsRulesLink />
        ). To check that, we compare the issues we showed you with the pull requests you open for them, and count the
        issues you view. What we find, the messages we send you about it and your answers are kept for up to 180 days
        after the last change, even after you delete your Contribute data, and longer while a shorter list or a block is
        in place. Basis: legitimate interests, in keeping Contribute fair.
      </li>
    );
  }
  return (
    <li>
      <B>Fair use</B>: pull requests for issues you take on GitRanks go through GitRanks (see the <TermsRulesLink />
      ). Once a day we compare the issues you took with the pull requests you open, on GitRanks or outside it, and count
      the issues you took against the pull requests you opened through GitRanks. We keep what we find: the days on which
      an issue you took here was fixed outside GitRanks, your counts of issues taken and pull requests opened, the
      issues you took in the last 30 days, a lower limit or a closed access, the messages we send you about them, your
      answers and your requests to look again. We keep them for as long as GitRanks runs Contribute, even after you
      delete your Contribute data, so that deleting resets nothing. What our earlier checks found is kept for up to 180
      days after its last change. Basis: legitimate interests, in keeping Contribute fair.
    </li>
  );
}

/** The item with the rules the API says are live; the read never fails (the rules of today when unknown). */
export async function FairUseItemLive() {
  await connection();
  return <FairUseItemScreen rulesLive={await issueRulesLive()} />;
}

/** The rules of today at once, in the static page, then the rules the API says are live. */
export function FairUseItem() {
  return (
    <Suspense fallback={<FairUseItemScreen />}>
      <FairUseItemLive />
    </Suspense>
  );
}
