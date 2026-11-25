import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { ChangesProvider } from '@/components/workspace/changes-provider';
import { LearnDoor, LearnDoorDue } from '@/components/workspace/learn-door';
import { FALLBACK_TABS, WorkspaceBarFallback } from '@/components/workspace/workspace-bar-fallback';
import { WorkspaceTabsBar } from '@/components/workspace/workspace-tabs-nav';
import type { WorkspaceTab } from '@/lib/workspace/gate';

/**
 * The workspace's bar: four tabs with the door into Learn at the right edge, and the bar's place kept while it is read.
 */

const Case = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="flex flex-col gap-3 border-t pt-4">
    <span className="mx-auto w-full max-w-7xl px-4 text-sm font-semibold text-foreground">{title}</span>
    {children}
  </div>
);

/** The four tabs as the bar draws them, the current one marked, with the door when the person uses Learn. */
function Bar({
  current,
  needsYou = null,
  door,
}: {
  current: WorkspaceTab;
  needsYou?: number | null;
  door?: ReactNode;
}) {
  return (
    <ChangesProvider version={null} activity={null} needsYou={needsYou}>
      <WorkspaceTabsBar tabs={FALLBACK_TABS} active={current} door={door} />
    </ChangesProvider>
  );
}

export const WORKSPACE_BAR_DOOR_SCREENS: Screen[] = [
  {
    id: 'workspace-bar-door',
    title: "The workspace's bar: four tabs and the door into Learn",
    area: 'workspace',
    route: '/my/pull-requests',
    sources: [
      'components/workspace/workspace-tabs-nav.tsx',
      'components/workspace/learn-door.tsx',
      'app/(workspace)/learn-door-count.tsx',
      'components/workspace/workspace-bar-fallback.tsx',
      'lib/workspace/workspace-bar-guess.ts',
      'components/tabs/bar-item.tsx',
    ],
    states: [
      {
        id: 'door',
        title: 'The door: with lessons due, with none, and for a person who does not use Learn',
        path: '/my/pull-requests',
        height: 520,
        render: () => (
          <main className="flex flex-col gap-6 pt-6 pb-10">
            <Case title="Lessons due: the door counts them">
              <Bar current="pull-requests" needsYou={2} door={<LearnDoor count={<LearnDoorDue due={6} />} />} />
            </Case>
            <Case title="None due, or the count not read yet: the word alone, the same width">
              <Bar current="contribute" door={<LearnDoor />} />
            </Case>
            <Case title="A person who does not use Learn: no door">
              <Bar current="agent" />
            </Case>
          </main>
        ),
      },
      {
        id: 'fallback',
        title: "The bar's place while it is read: the four names, the current one marked, no counts",
        path: '/my/pull-requests',
        height: 420,
        render: () => (
          <main className="flex flex-col gap-6 pt-6 pb-10">
            <Case title="The guess said the tabs will show, Pull requests current">
              <WorkspaceBarFallback shown={{ current: 'pull-requests' }} />
            </Case>
            <Case title="Then the bar: only the counts and the door arrive">
              <Bar current="pull-requests" needsYou={2} door={<LearnDoor count={<LearnDoorDue due={6} />} />} />
            </Case>
            <Case title="No guess: the header's line, as before">
              <WorkspaceBarFallback />
            </Case>
          </main>
        ),
      },
      {
        id: 'phone',
        title: 'On a phone: one row, the tabs pass under the door',
        path: '/my/pull-requests',
        width: 390,
        height: 300,
        render: () => (
          <main className="flex flex-col gap-6 pt-6 pb-10">
            <Bar current="settings" needsYou={2} door={<LearnDoor count={<LearnDoorDue due={6} />} />} />
            <WorkspaceBarFallback shown={{ current: 'settings' }} />
          </main>
        ),
      },
    ],
  },
];
