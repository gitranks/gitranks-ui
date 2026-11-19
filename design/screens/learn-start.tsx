import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { LearnStartScreen, type LearnStartScreenProps } from '@/app/learn/components/learn-start-screen';
import { LearnTabs } from '@/app/learn/components/learn-tabs';
import { Header } from '@/components/header/header';
import { AgentConnectView, type AgentConnectViewProps } from '@/components/workspace/agent/agent-connect';
import {
  fixAttemptOf,
  START_GOAL,
  START_NUMBER,
  START_PATH,
  START_REPO,
  startConnection,
  startViews,
} from '@/lib/learn/__fixtures__/learn-start';

/** The page's own container, as its `page.tsx` draws it. */
const MAIN = 'mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16';
const SHOWN_TOKEN = 'gr_8Kq2vN4tXb7RwL1mZc9HpYe3Ud6SfA0jQg5Ko2Ti8Lm';
const noop = () => {};

/** The page as the Learn layout frames it: the site header, then Learn's tabs. */
const frame = (children: ReactNode) => (
  <>
    <Header section="learn" />
    <LearnTabs />
    <main className={MAIN}>{children}</main>
  </>
);

/** Step 1's connect steps in Learn: the token made and its setup for Claude Code, unless `props` says otherwise. */
const connectSteps = (props: Partial<AgentConnectViewProps> = {}) => (
  <AgentConnectView
    mode="learn"
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

const page = (props: Partial<LearnStartScreenProps> = {}) =>
  frame(
    <LearnStartScreen
      repo={START_REPO}
      number={START_NUMBER}
      goal={START_GOAL}
      view={startViews.open}
      connection={startConnection}
      connect={connectSteps()}
      fix={null}
      onCheckAgain={noop}
      {...props}
    />,
  );

export const LEARN_START_SCREENS: Screen[] = [
  {
    id: 'learn-start',
    title: 'Start your own lesson',
    area: 'learn',
    route: '/learn/start/[owner]/[repo]/[number]',
    sources: [
      'app/learn/start/[owner]/[repo]/[number]/page.tsx',
      'app/learn/components/learn-start.tsx',
      'app/learn/components/learn-start-screen.tsx',
      'app/contribute/components/agent-connect.tsx',
      'lib/learn/learn-start.ts',
      'lib/learn/learn-start-poll.ts',
    ],
    states: [
      {
        id: 'connect',
        title: 'No agent has called yet: step 1 is the connect steps, the token and its setup for Claude Code',
        path: START_PATH,
        height: 1680,
        render: () => page({ connection: null }),
      },
      {
        id: 'connect-sign-in',
        title: 'No agent has called yet, agents sign in with GitHub: the setup to add, then the wait for its call',
        path: START_PATH,
        height: 1120,
        render: () =>
          page({ connection: null, connect: connectSteps({ signIn: true, stage: 'added', shown: null, hint: false }) }),
      },
      {
        id: 'waiting',
        title: 'Connected: one prompt to paste, the page waits for the agent to take the issue',
        path: START_PATH,
        height: 1100,
        render: () => page(),
      },
      {
        id: 'fix',
        title: 'The agent took it as a regular fix while it runs: release it, then paste the prompt again',
        path: START_PATH,
        height: 1080,
        render: () => page({ fix: fixAttemptOf('RUNNING') }),
      },
      {
        id: 'fix-pr-open',
        title: 'The agent opened a regular pull request for it: pick another issue',
        path: START_PATH,
        height: 1000,
        render: () => page({ fix: fixAttemptOf('PR_OPEN') }),
      },
      {
        id: 'timeout',
        title: '30 minutes and nothing from the agent: Check again',
        path: START_PATH,
        height: 1080,
        render: () => page({ timedOut: true }),
      },
      {
        id: 'refused-limit',
        title: 'Two pull requests wait on maintainers: no new lesson until one is merged or closed',
        path: START_PATH,
        height: 760,
        render: () => page({ view: startViews.limitPrs }),
      },
      {
        id: 'refused-taken',
        title: "Someone else's agent took it, before the agent is connected: step 1 stays",
        path: START_PATH,
        height: 960,
        render: () =>
          page({ view: startViews.taken, connection: null, connect: connectSteps({ stage: 'none', shown: null }) }),
      },
      {
        id: 'refused-paused',
        title: "A paused account: Contribute's paused notice",
        path: START_PATH,
        height: 760,
        render: () => page({ view: startViews.paused }),
      },
      {
        id: 'unavailable-untitled',
        title: "An issue that can't be started here, its title unread: owner/repo#n",
        path: START_PATH,
        height: 720,
        render: () => page({ view: startViews.unavailable }),
      },
      {
        id: 'phone',
        title: 'Connected, on a phone',
        path: START_PATH,
        width: 390,
        height: 1320,
        render: () => page(),
      },
    ],
  },
];
