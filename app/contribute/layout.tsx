import type { Metadata } from 'next';
import { type ReactNode, Suspense } from 'react';

import { ContributeTabs } from './components/contribute-tabs';
import { HeaderLine } from './components/contribute-tabs-nav';
import { Header } from '@/components/header/header';

export const metadata: Metadata = {
  title: 'Contribute',
  robots: { index: false, follow: false },
};

/**
 * GitRanks Contribute, under the site header, with its tabs below it once the user is onboarded. Open only to signed-in
 * users the API lets in: the proxy answers everyone else with a 404, and each page checks again when it reads the
 * user's data. The page for maintainers is the exception, open to everyone, with no tabs.
 */
export default function ContributeLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header section="contribute" />
      {/* The tabs read the viewer and the path (an attempt's is known only per request): the header's line until then. */}
      <Suspense fallback={<HeaderLine />}>
        <ContributeTabs />
      </Suspense>
      {children}
    </>
  );
}
