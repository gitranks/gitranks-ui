import { type ReactNode, Suspense } from 'react';

import { BuildBar } from '@/components/build/bar/build-bar';
import { BuildBarLive } from '@/components/build/bar/build-bar-live';
import { Header } from '@/components/header/header';
import { VISITOR_BUILD_BAR } from '@/lib/build/build-bar';

/**
 * Build's pages with its bar (Home, Projects, a project, My builds): the site header and Build's bar. The frame reads
 * no session, so a page under it can be cached for everyone; the bar reads the path and the person's own in the
 * browser, so it streams in behind a visitor's bar. The proxy closes every Build address to anyone Build is not open
 * to.
 */
export default function BuildLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <Suspense fallback={<BuildBar view={VISITOR_BUILD_BAR} place={null} />}>
        <BuildBarLive />
      </Suspense>
      {children}
    </>
  );
}
