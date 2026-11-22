import { Suspense } from 'react';

import { A } from '@/components/legal/legal-page';
import { CONTRIBUTE_RULES_PATH } from '@/lib/workspace/fair-use';
import { contributeShown } from '@/lib/workspace/preview-gate';

const TERMS_PATH = '/terms';

/**
 * "Terms of service", linking the fair-use rule (`/terms#contribute-rules`) only for whoever the Terms show
 * Contribute's section to, by the Terms' own check; the Terms' top for everyone else, where that anchor is not on the
 * page. The rest of the Privacy policy stays static: the plain link at once, the rule's once the check answers.
 */
export function TermsRulesLink() {
  return (
    <Suspense fallback={<A href={TERMS_PATH}>Terms of service</A>}>
      <ShownTermsRulesLink />
    </Suspense>
  );
}

/** The link once the check answers; a failed check leaves the plain one. */
export async function ShownTermsRulesLink() {
  const shown = await contributeShown().catch(() => false);
  return <A href={shown ? CONTRIBUTE_RULES_PATH : TERMS_PATH}>Terms of service</A>;
}
