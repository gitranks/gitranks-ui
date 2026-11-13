import type { Metadata } from 'next';
import { type ReactNode, Suspense } from 'react';

import { HeaderLine } from '@/app/contribute/components/contribute-tabs-nav';
import { LearnTabs } from '@/app/learn/components/learn-tabs';
import { Header } from '@/components/header/header';

export const metadata: Metadata = { title: 'Learn' };

/**
 * GitRanks Learn, under the site header, with its tabs. Its own pages are open only to signed-in users the API lets in:
 * the proxy answers visitors without a session with a 404, and each page asks the API for the rest.
 */
export default function LearnLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header section="learn" />
      {/* The tabs read the path: the header's line until then. */}
      <Suspense fallback={<HeaderLine />}>
        <LearnTabs />
      </Suspense>
      {children}
    </>
  );
}
