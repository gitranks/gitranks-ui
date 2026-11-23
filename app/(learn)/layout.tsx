import type { ReactNode } from 'react';

import { Header } from '@/components/header/header';
import { LearnBarLive } from '@/components/learn/bar/learn-bar-live';

/**
 * Learn's pages: the site header, its Learn entry marked, and Learn's bar. The frame reads no session, so a page
 * under it can be cached for everyone; the bar reads the person's own in the browser.
 */
export default function LearnLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header section="learn" />
      <LearnBarLive />
      {children}
    </>
  );
}
