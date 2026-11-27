import type { ReactNode } from 'react';

import { Header } from '@/components/header/header';

/**
 * Build's pages read from top to bottom (a step, the two tests): the site header and no bar. Each page draws its own
 * strip under it (`PlayerStrip`), since only the page knows its way back and its place. The frame reads no session.
 * The proxy closes every Build address to anyone Build is not open to.
 */
export default function BuildPlayerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}
