import { type ReactNode, Suspense } from 'react';

import { Header } from '@/components/header/header';
import { LearnBar } from '@/components/learn/bar/learn-bar';
import { LearnBarLive } from '@/components/learn/bar/learn-bar-live';

/**
 * Learn's pages: the site header, its Learn entry marked, and Learn's bar. The frame reads no session, so a page
 * under it can be cached for everyone; the bar reads the path and the person's own in the browser, so it streams in
 * behind a visitor's bar.
 */
export default function LearnLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header section="learn" />
      <Suspense fallback={<LearnBar state={{ kind: 'visitor' }} place={null} />}>
        <LearnBarLive />
      </Suspense>
      {children}
    </>
  );
}
