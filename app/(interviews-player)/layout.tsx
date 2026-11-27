import type { ReactNode } from 'react';

import { Header } from '@/components/header/header';

/**
 * Interviews' pages read from top to bottom (the connecting screen): the site header and no bar. The page draws its
 * own strip under it, since only the page knows its plan and its place. The frame reads no session. The proxy closes
 * every Interviews address to anyone Interviews is not open to.
 */
export default function InterviewsPlayerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header section="interviews" />
      {children}
    </>
  );
}
