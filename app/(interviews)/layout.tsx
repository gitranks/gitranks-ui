import { type ReactNode, Suspense } from 'react';

import { Header } from '@/components/header/header';
import { InterviewsBar } from '@/components/interviews/bar/interviews-bar';
import { InterviewsBarLive } from '@/components/interviews/bar/interviews-bar-live';
import { VISITOR_INTERVIEWS_BAR } from '@/lib/interviews/interviews-bar';

/**
 * Interviews' pages with its bar (home, a company, a plan, My interviews, How it works): the site header and
 * Interviews' bar. The frame reads no session, so a page under it can be cached for everyone; the bar reads the path
 * and the person's own in the browser, so it streams in behind a visitor's bar. The proxy closes every Interviews
 * address to anyone Interviews is not open to.
 */
export default function InterviewsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header section="interviews" />
      <Suspense fallback={<InterviewsBar view={VISITOR_INTERVIEWS_BAR} place={null} />}>
        <InterviewsBarLive />
      </Suspense>
      {children}
    </>
  );
}
