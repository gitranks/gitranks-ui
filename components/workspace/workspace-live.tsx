import type { ReactNode } from 'react';

import { ChangesProvider } from '@/components/workspace/changes-provider';
import { loadContributeActivity, loadContributeVersion, loadNeedsYouCount } from '@/lib/workspace/contribute.data';

/**
 * The workspace's one poll with nothing drawn, for a page that may show without the tabs and still waits on the user's
 * attempts (Learn's start page). It stands by: it polls only while the tabs' poll does not run in the tab, so under the
 * tabs the poll still runs once. The reads are the tabs' own, once per request.
 */
export async function WorkspaceLive({ children }: { children: ReactNode }) {
  const [version, activity, needsYou] = await Promise.all([
    loadContributeVersion().catch(() => null),
    loadContributeActivity().catch(() => null),
    loadNeedsYouCount().catch(() => null),
  ]);
  return (
    <ChangesProvider version={version} activity={activity} needsYou={needsYou} standby>
      {children}
    </ChangesProvider>
  );
}
