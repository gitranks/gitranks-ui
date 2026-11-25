import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { Tab } from '@/components/tabs/tabs';
import { TabsBar } from '@/components/tabs/tabs-bar';
import { LearnDoor, LearnDoorDue } from '@/components/workspace/learn-door';
import { FALLBACK_TABS, type FallbackTab, WorkspaceBarFallback } from '@/components/workspace/workspace-bar-fallback';
import { WORKSPACE_TABS } from '@/lib/workspace/workspace-tabs';

/**
 * The workspace's bar for wave 4, from fixtures: four tabs with the door into Learn at the right edge, and the bar's
 * place held while it is read. Held back from the export (`exported: false`) until the bar switches to them.
 */

const Case = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="flex flex-col gap-3 border-t pt-4">
    <span className="mx-auto w-full max-w-7xl px-4 text-sm font-semibold text-foreground">{title}</span>
    {children}
  </div>
);

/** The four tabs as the bar draws them, the current one marked, with the door when the person uses Learn. */
function Bar({ current, needsYou, door }: { current: FallbackTab; needsYou?: number; door?: ReactNode }) {
  return (
    <TabsBar end={door}>
      {FALLBACK_TABS.map(({ tab }) => {
        const { label, href } = WORKSPACE_TABS[tab];
        const count = tab === 'pull-requests' && needsYou ? needsYou : undefined;
        return (
          <Tab
            key={tab}
            href={href}
            active={tab === current}
            count={count}
            tone="brand"
            countLabel={count ? 'need you' : undefined}
          >
            {label}
          </Tab>
        );
      })}
    </TabsBar>
  );
}

export const WORKSPACE_BAR_DOOR_SCREENS: Screen[] = [
  {
    id: 'workspace-bar-door',
    title: "The workspace's bar: four tabs and the door into Learn",
    area: 'workspace',
    route: '/my/pull-requests',
    exported: false,
    sources: [
      'components/workspace/learn-door.tsx',
      'components/workspace/workspace-bar-fallback.tsx',
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
