import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { ContributeTabsNav } from '@/app/contribute/components/contribute-tabs-nav';
import { ContributionsScreen } from '@/app/contribute/components/contributions-view';
import { IssuesScreen } from '@/app/contribute/components/issues-view';
import { OverviewScreen, overviewSectionsOf } from '@/app/contribute/components/overview-status';
import { ReviewScreen } from '@/app/contribute/components/review-view';
import { RunsScreen } from '@/app/contribute/components/runs-view';
import { SettingsScreen } from '@/app/contribute/components/settings-view';
import { Header } from '@/components/header/header';
import { activityOf, FOLLOW_UP, runOf, WORKING } from '@/lib/contribute/__fixtures__/agent-runs';
import { attempt, attempts, contributions, followUpAttempts } from '@/lib/contribute/__fixtures__/contribute-attempts';
import { issuePage, nowIdle, overviewData } from '@/lib/contribute/__fixtures__/contribute-overview';
import { contributor, mcpToken, NOW, settings, views } from '@/lib/contribute/__fixtures__/contribute-views';
import { pageOf } from '@/lib/contribute/__fixtures__/runs';
import type { ContributeActivity, ContributeView } from '@/lib/contribute/contribute.types';
import { runsQueryOf } from '@/lib/contribute/runs';

/** A key and a live token the agent has called with: both lanes of Right now. */
const both: ContributeView = {
  ...views.active,
  contributor: contributor({ settings: { ...settings, attemptsAtATime: 2 } }),
  ownAgent: { paths: { hosted: true, mcp: true }, tokens: [mcpToken({ lastUsedAt: '2026-10-28T09:00:00.000Z' })] },
};

const own = runOf({
  attemptId: 'att_own',
  runner: 'MCP',
  spendUsd: null,
  budgetUsd: null,
  nameWithOwner: 'quill-rs/quill',
  number: 1204,
  title: 'Panic when the config file is empty',
  label: 'Your agent is working',
});
const stopped = runOf({
  attemptId: 'att_stopped',
  phase: 'STOPPED',
  active: false,
  label: 'Stopped',
  nameWithOwner: 'iptv-org/iptv',
  number: 57201,
  title: 'Add: Mi Musica Hits SD',
  latestEvent: { state: 'STOPPED', detail: 'No-go: nothing here needs a code change.', at: '2026-10-31T11:58:00.000Z' },
});

/** The page as the Contribute layout frames it: the site header, then the tabs. */
const frame = (children: ReactNode, activity: ContributeActivity = activityOf()) => (
  <>
    <Header section="contribute" />
    <ContributeTabsNav onboarded activity={activity} />
    {children}
  </>
);

/** A page's own container, as its `page.tsx` draws it. */
const MAIN = 'mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16';

const overview = (view: ContributeView, activity: ContributeActivity, working: boolean) =>
  frame(
    <OverviewScreen
      view={view}
      now={NOW}
      sections={overviewSectionsOf(
        view,
        {
          ...overviewData(),
          activity,
          now: working
            ? {
                ...nowIdle,
                inFlight: [
                  attempt({ state: 'RUNNING', runner: 'MANAGED_AGENTS' }),
                  attempt({
                    attemptId: 'A_own',
                    state: 'RUNNING',
                    runner: 'MCP',
                    agent: { name: 'CLAUDE_CODE', model: null },
                  }),
                ],
              }
            : nowIdle,
        },
        NOW,
      )}
    />,
    activity,
  );

const busy = activityOf(WORKING, FOLLOW_UP, own, stopped);

export const CONTRIBUTE_SCREENS: Screen[] = [
  {
    id: 'contribute-overview',
    title: 'Overview',
    area: 'contribute',
    route: '/contribute',
    sources: [
      'app/contribute/components/overview-status.tsx',
      'app/contribute/components/overview-sections.tsx',
      'app/contribute/components/agent-runs.tsx',
      'lib/contribute/overview.ts',
    ],
    states: [
      {
        id: 'working',
        title: 'Agents working',
        path: '/contribute',
        height: 1900,
        render: () => overview(both, busy, true),
      },
      {
        id: 'idle',
        title: 'Nothing running',
        path: '/contribute',
        height: 1700,
        render: () => overview(both, activityOf(), false),
      },
      {
        id: 'working-phone',
        title: 'Agents working · phone',
        path: '/contribute',
        width: 390,
        height: 3400,
        render: () => overview(both, busy, true),
      },
    ],
  },
  {
    id: 'contribute-runs',
    title: 'Agent runs',
    area: 'contribute',
    route: '/contribute/runs',
    sources: ['app/contribute/components/runs-view.tsx', 'lib/contribute/runs.ts'],
    states: [
      {
        id: 'history',
        title: 'History',
        path: '/contribute/runs',
        height: 2000,
        render: () =>
          frame(
            <main className={MAIN}>
              <RunsScreen view={views.active} page={pageOf()} query={runsQueryOf({})} now={NOW} />
            </main>,
          ),
      },
    ],
  },
  {
    id: 'contribute-attempt',
    title: 'A contribution',
    area: 'contribute',
    route: '/contribute/attempts/[id]',
    sources: [
      'app/contribute/components/review-view.tsx',
      'app/contribute/components/attempt-sessions.tsx',
      'lib/contribute/sessions.ts',
    ],
    states: [
      {
        id: 'review',
        title: 'First attempt, ready for review',
        path: '/contribute/attempts/A_1',
        height: 2000,
        render: () =>
          frame(
            <main className={MAIN}>
              <ReviewScreen view={views.active} attempt={attempts.review} now={NOW} />
            </main>,
          ),
      },
      {
        id: 'pr-open',
        title: 'Pull request open, comments waiting',
        path: '/contribute/attempts/A_1',
        height: 2000,
        render: () =>
          frame(
            <main className={MAIN}>
              <ReviewScreen view={views.active} attempt={followUpAttempts.prNeedsYou} now={NOW} />
            </main>,
          ),
      },
      {
        id: 'next-round',
        title: 'The next round, not started',
        path: '/contribute/attempts/A_1',
        height: 1600,
        render: () =>
          frame(
            <main className={MAIN}>
              <ReviewScreen view={views.active} attempt={followUpAttempts.prNeedsYou} next now={NOW} />
            </main>,
          ),
      },
    ],
  },
  {
    id: 'contribute-me',
    title: 'My contributions',
    area: 'contribute',
    route: '/contribute/me',
    sources: ['app/contribute/components/contributions-view.tsx'],
    states: [
      {
        id: 'list',
        title: 'Open, merged and stopped',
        path: '/contribute/me',
        height: 1800,
        render: () =>
          frame(
            <main className={MAIN}>
              <ContributionsScreen
                view={views.active}
                contributions={contributions}
                attempts={[
                  attempt(),
                  attempt({ attemptId: 'A_2', state: 'RUNNING', costUsd: 0.4 }),
                  attempt({ attemptId: 'A_4', state: 'STOPPED', endReason: 'NO_GO', costUsd: 0.38 }),
                  attempt({ attemptId: 'A_5', state: 'MERGED' }),
                ]}
                now={NOW}
              />
            </main>,
          ),
      },
    ],
  },
  {
    id: 'contribute-issues',
    title: 'Issues for you',
    area: 'contribute',
    route: '/contribute/issues',
    sources: ['app/contribute/components/issues-view.tsx'],
    states: [
      {
        id: 'feed',
        title: 'The feed',
        path: '/contribute/issues',
        height: 1800,
        render: () =>
          frame(
            <main className={MAIN}>
              <IssuesScreen view={views.active} page={issuePage} query={{}} now={NOW} />
            </main>,
          ),
      },
    ],
  },
  {
    id: 'contribute-settings',
    title: 'Settings',
    area: 'contribute',
    route: '/contribute/settings',
    sources: ['app/contribute/components/settings-view.tsx', 'app/contribute/components/settings-pages.tsx'],
    states: [
      {
        id: 'summary',
        title: 'Summary',
        path: '/contribute/settings',
        height: 1800,
        render: () =>
          frame(
            <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16">
              <SettingsScreen view={views.active} now={NOW} />
            </main>,
          ),
      },
    ],
  },
];
