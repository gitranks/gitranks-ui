import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { Header } from '@/components/header/header';
import { AgentConnectView, type AgentConnectViewProps } from '@/components/workspace/agent/agent-connect';
import { StartPageScreen, type StartPageScreenProps } from '@/components/workspace/start/start-page-screen';
import { WorkspaceTabsNav } from '@/components/workspace/workspace-tabs-nav';
import { NOW } from '@/lib/contribute/__fixtures__/contribute-views';
import {
  fixAttemptOf,
  START_GOAL,
  START_PATH,
  START_REF,
  startConnection,
  startViews,
} from '@/lib/workspace/start/__fixtures__/start-page';
import { startBackOf } from '@/lib/workspace/start/start-page';
import type { StartMode } from '@/lib/workspace/start/start-page.types';

/** The page's own container, as its `page.tsx` draws it. */
const MAIN = 'mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16';
const SHOWN_TOKEN = 'gr_8Kq2vN4tXb7RwL1mZc9HpYe3Ud6SfA0jQg5Ko2Ti8Lm';
const LESSON_PATH = `${START_PATH}?lesson=1`;
const noop = () => {};

/** Every tab, as an account Learn is open to sees them. */
const TABS = ['contribute', 'learn', 'pull-requests', 'agent', 'settings'] as const;

/** The page as the workspace's layout frames it: the site header (it marks itself by the path), then the tabs. */
const frame = (children: ReactNode) => (
  <>
    <Header />
    <WorkspaceTabsNav tabs={TABS} needsYou={2} />
    <main className={MAIN}>{children}</main>
  </>
);

/** Step 1's connect steps, embedded: the token made and its setup for Claude Code, unless `props` says otherwise. */
const connectSteps = (props: Partial<AgentConnectViewProps> = {}) => (
  <AgentConnectView
    embedded
    client="claude-code"
    onClient={noop}
    stage="token"
    shown={SHOWN_TOKEN}
    os="mac"
    detectedOs="mac"
    onOs={noop}
    onCreate={noop}
    onAdded={noop}
    onReopen={noop}
    onReplace={noop}
    {...props}
  />
);

const page = (mode: StartMode, props: Partial<StartPageScreenProps> = {}) =>
  frame(
    <StartPageScreen
      issueRef={START_REF}
      mode={mode}
      issue={startViews.open}
      goal={mode === 'lesson' ? START_GOAL : null}
      connection={startConnection}
      connect={connectSteps()}
      fix={null}
      onCheckAgain={noop}
      back={startBackOf(mode)}
      frame="tabs"
      now={NOW}
      {...props}
    />,
  );

export const START_SCREENS: Screen[] = [
  {
    id: 'start',
    title: 'Start page',
    area: 'workspace',
    route: '/my/start/[owner]/[repo]/[issue]',
    sources: [
      'app/(workspace)/my/start/[owner]/[repo]/[issue]/page.tsx',
      'app/(onboarding)/learn/start/[owner]/[repo]/[issue]/page.tsx',
      'components/workspace/start/start-page-body.tsx',
      'components/workspace/start/start-page-screen.tsx',
      'components/workspace/start/start-refusal.tsx',
      'components/workspace/agent/agent-connect.tsx',
      'lib/workspace/start/start-page.ts',
      'lib/workspace/start-refusals.ts',
    ],
    states: [
      {
        id: 'fix',
        title: 'Fix it, connected: one prompt to paste, the page waits for the agent to take the issue',
        path: START_PATH,
        height: 1080,
        render: () => page('fix'),
      },
      {
        id: 'fix-connect',
        title: 'Fix it, no agent has called yet: step 1 is the connect steps, the token and its setup',
        path: START_PATH,
        height: 1660,
        render: () => page('fix', { connection: null }),
      },
      {
        id: 'fix-timeout',
        title: 'Fix it, 30 minutes and nothing from the agent: Check again',
        path: START_PATH,
        height: 1060,
        render: () => page('fix', { timedOut: true }),
      },
      {
        id: 'fix-limit-prs',
        title: 'Fix it, the open pull request limit reached: its one notice',
        path: START_PATH,
        height: 760,
        render: () => page('fix', { issue: startViews.limitPrs }),
      },
      {
        id: 'fix-taken',
        title: "Fix it, someone else's agent took the issue",
        path: START_PATH,
        height: 760,
        render: () => page('fix', { issue: startViews.taken }),
      },
      {
        id: 'fix-untitled',
        title: "Fix it, an issue that can't be started here, its title unread: owner/repo#n",
        path: START_PATH,
        height: 720,
        render: () => page('fix', { issue: startViews.unavailable }),
      },
      {
        id: 'lesson-no-goal',
        title: 'With a lesson, no goal saved: written for a general reader, Set your goal',
        path: LESSON_PATH,
        height: 1180,
        render: () => page('lesson', { goal: null }),
      },
      {
        id: 'lesson-restart',
        title: 'With a lesson, an agent with the tool list from before Learn opened: the restart sentence',
        path: LESSON_PATH,
        height: 1240,
        render: () => page('lesson', { restartHint: true }),
      },
      {
        id: 'lesson-fix',
        title:
          'With a lesson, the agent took it as a regular fix while it runs: release it, then paste the prompt again',
        path: LESSON_PATH,
        height: 1180,
        render: () => page('lesson', { fix: fixAttemptOf('RUNNING') }),
      },
      {
        id: 'lesson-fix-pr-open',
        title: 'With a lesson, the agent opened a regular pull request for it: pick another issue',
        path: LESSON_PATH,
        height: 1040,
        render: () => page('lesson', { fix: fixAttemptOf('PR_OPEN') }),
      },
      {
        id: 'lesson-own-in-progress',
        title: 'With a lesson, another lesson of the person is in progress',
        path: LESSON_PATH,
        height: 820,
        render: () => page('lesson', { issue: startViews.ownInProgress }),
      },
      {
        id: 'phone',
        title: 'Fix it, connected, on a phone',
        path: START_PATH,
        width: 390,
        height: 1360,
        render: () => page('fix'),
      },
    ],
  },
];
