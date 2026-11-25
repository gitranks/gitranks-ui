import { type ReactNode, Suspense } from 'react';

import { LearnDoorCount } from './learn-door-count';
import { Header } from '@/components/header/header';
import { LearnBarLive } from '@/components/learn/bar/learn-bar-live';
import { WorkspaceBarFallback } from '@/components/workspace/workspace-bar-fallback';
import { WorkspaceClientSlots } from '@/components/workspace/workspace-client-slots';
import { WorkspaceTabs } from '@/components/workspace/workspace-tabs';
import { FROM_LEARN } from '@/lib/learn/paths';

/**
 * The signed-in workspace, Contribute's and Learn's: the site header (its menu marks itself by the path), then the
 * workspace's tabs once the user has entered, with the one poll and, for a person who uses Learn, the door into Learn
 * with its count read in the browser; on Settings opened from Learn, Learn's bar instead.
 * Who sees which page is decided by the proxy and by each page; the tabs follow the same gate. No metadata here: each
 * section and page sets its own, so `/learn` stays indexable.
 */
export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      {/* The tabs read the viewer and the path (an attempt's is known only per request). Until then, the bar's place: the
          four tab names where the browser guessed the tabs will show, else the header's line. */}
      <Suspense fallback={<WorkspaceBarFallback />}>
        <WorkspaceTabs learnBar={<LearnBarLive from={FROM_LEARN} />} learnDoorCount={<LearnDoorCount />} />
        <WorkspaceClientSlots />
      </Suspense>
      {children}
    </>
  );
}
