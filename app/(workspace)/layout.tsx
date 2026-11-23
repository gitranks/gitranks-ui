import { type ReactNode, Suspense } from 'react';

import { Header } from '@/components/header/header';
import { LearnBarLive } from '@/components/learn/bar/learn-bar-live';
import { HeaderLine } from '@/components/workspace/header-line';
import { WorkspaceClientSlots } from '@/components/workspace/workspace-client-slots';
import { WorkspaceTabs } from '@/components/workspace/workspace-tabs';
import { FROM_LEARN } from '@/lib/learn/paths';

/**
 * The signed-in workspace, Contribute's and Learn's: the site header (its menu marks itself by the path), then the
 * workspace's tabs once the user has entered, with the one poll; on Settings opened from Learn, Learn's bar instead.
 * Who sees which page is decided by the proxy and by each page; the tabs follow the same gate. No metadata here: each
 * section and page sets its own, so `/learn` stays indexable once Learn is open to everyone.
 */
export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      {/* The tabs read the viewer and the path (an attempt's is known only per request): the header's line until then. */}
      <Suspense fallback={<HeaderLine />}>
        <WorkspaceTabs learnBar={<LearnBarLive from={FROM_LEARN} />} />
        <WorkspaceClientSlots />
      </Suspense>
      {children}
    </>
  );
}
