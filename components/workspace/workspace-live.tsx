import type { ReactNode } from 'react';

import { ChangesProvider } from '@/components/workspace/changes-provider';
import { loadContributeActivity, loadContributeVersion, loadNeedsYouCount } from '@/lib/workspace/contribute.data';

/**
 * The workspace's one poll with nothing drawn, for a page shown without the tabs that still waits on the user's
 * attempts (Learn's start page before the account has entered). Mount it only where the tabs do not show: under the
 * tabs the poll runs already. The reads are the tabs' own, once per request.
 */
export async function WorkspaceLive({ children }: { children: ReactNode }) {
  const [version, activity, needsYou] = await Promise.all([
    loadContributeVersion().catch(() => null),
    loadContributeActivity().catch(() => null),
    loadNeedsYouCount().catch(() => null),
  ]);
  return (
    <ChangesProvider version={version} activity={activity} needsYou={needsYou}>
      {children}
    </ChangesProvider>
  );
}
