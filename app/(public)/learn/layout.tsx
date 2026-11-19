import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Header } from '@/components/header/header';
import { HeaderLine } from '@/components/workspace/header-line';

export const metadata: Metadata = { title: 'Learn' };

/**
 * The pages about Learn, open to visitors (how Learn works, the page for maintainers, a shared lesson and its result
 * pages): the site header and its line, no tabs.
 */
export default function LearnPublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header section="learn" />
      <HeaderLine />
      {children}
    </>
  );
}
