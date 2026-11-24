import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { GoalSettingsScreen } from '@/app/(workspace)/my/settings/components/settings-pages';
import { Header } from '@/components/header/header';
import { WorkspaceTabsNav } from '@/components/workspace/workspace-tabs-nav';
import { filledProfile } from '@/lib/learn/__fixtures__/profile';

/** A Settings page's column. */
const SETTINGS_MAIN = 'mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16';

/** Every tab, as a signed-in account sees them. */
const TABS = ['contribute', 'learn', 'pull-requests', 'agent', 'settings'] as const;

/** A page that draws its own `main`, under the header and the tabs. */
const bare = (children: ReactNode) => (
  <>
    <Header />
    <WorkspaceTabsNav tabs={TABS} needsYou={2} />
    {children}
  </>
);

/** Settings' goal page: Learn's part of the workspace's Settings. */
export const WORKSPACE_LESSON_SCREENS: Screen[] = [
  {
    id: 'settings-goal',
    title: 'Goal and level',
    area: 'workspace',
    route: '/my/settings/goal',
    sources: [
      'app/(workspace)/my/settings/goal/page.tsx',
      'app/(workspace)/my/settings/components/settings-pages.tsx',
      'components/learn/learn-profile-form.tsx',
      'app/learn/components/learn-setting-up.tsx',
      'lib/learn/profile-form.ts',
    ],
    states: [
      {
        id: 'filled',
        title: 'A goal saved: Save goes back to Settings',
        path: '/my/settings/goal',
        height: 1240,
        render: () => bare(<main className={SETTINGS_MAIN}>{<GoalSettingsScreen profile={filledProfile} />}</main>),
      },
    ],
  },
];
