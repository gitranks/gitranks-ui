import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LaunchedTerms, TermsScreen } from './terms';
import { pageMetadata } from '@/lib/seo/page-metadata';

export const metadata: Metadata = pageMetadata({
  title: 'Terms of service',
  description: 'The terms for using GitRanks: rankings, signing in, refreshes, badges, fair use and liability.',
  path: '/terms',
});

/** The Terms without Contribute's section at once, then with it for whoever may see Contribute (`terms.tsx`). */
export default function Terms() {
  return (
    <Suspense fallback={<TermsScreen contribute={false} />}>
      <LaunchedTerms />
    </Suspense>
  );
}
