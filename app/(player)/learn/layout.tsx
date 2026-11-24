import type { ReactNode } from 'react';

import { Header } from '@/components/header/header';

/**
 * Learn's player pages (the review, the check): the site header with Learn marked, and no bar. Each page draws its own
 * strip under it (`PlayerStrip`), since only the page knows its way back and where its run stands. The frame reads no
 * session. The player's pages under `/my`, which both products open, have their own header.
 */
export default function PlayerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header section="learn" />
      {children}
    </>
  );
}
