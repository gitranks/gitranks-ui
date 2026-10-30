import type { Metadata } from 'next';
import { type ReactNode, Suspense } from 'react';

import { ContributeBar, ContributeBarFallback } from './components/contribute-bar';

export const metadata: Metadata = {
  title: 'Contribute',
  robots: { index: false, follow: false },
};

/**
 * GitRanks Contribute, under the site header titled "contribute", with its tabs as the header's menu. Open only to
 * signed-in users the API lets in: the proxy answers everyone else with a 404, and each page checks again when it reads
 * the user's data. The page for maintainers is the exception, open to everyone, with the bar and no tabs.
 */
export default function ContributeLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* The bar reads the viewer and the path (an attempt's is known only per request): first the header with no menu
          and no account. */}
      <Suspense fallback={<ContributeBarFallback />}>
        <ContributeBar />
      </Suspense>
      {children}
    </>
  );
}
