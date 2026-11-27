import type { Screen } from '../registry';
import { BuildStartScreen, type BuildStartScreenProps } from '@/components/build/start/build-start-screen';
import { Header } from '@/components/header/header';
import { AgentConnectView, type AgentConnectViewProps } from '@/components/workspace/agent/agent-connect';
import { codingAgentCard } from '@/lib/build/__fixtures__/projects';
import { startedBuild, startProject, startProjects } from '@/lib/build/__fixtures__/start';
import { buildStartPath } from '@/lib/build/paths';
import { BUILD_AGENT_VARIANT } from '@/lib/build/start';
import { MCP_CLIENTS_WITH_VS_CODE } from '@/lib/workspace/mcp-setup';

/**
 * Build's start flow, `/build/start`: the site header, the flow's two steps at the top, no bar, one narrow column.
 * The page reads its state on the server and moves it in the browser (`build-start-live.tsx`); here each state is the
 * screen with fixtures, as the boards draw them: setup, waiting, connected from a project, connected with no project,
 * the build started, the other cases and the phone.
 */

const noop = () => {};
const FROM_PROJECT = buildStartPath(startProject.slug);
const NO_PROJECT = buildStartPath();

/** Step 1's connect steps as the page embeds them: Claude Code picked and its setup shown, unless `props` says otherwise. */
const connect = (props: Partial<AgentConnectViewProps> = {}) => (
  <AgentConnectView
    embedded
    signIn
    keyLink={false}
    variant={BUILD_AGENT_VARIANT}
    client="claude-code"
    onClient={noop}
    stage="none"
    shown={null}
    os="mac"
    detectedOs="mac"
    onOs={noop}
    onCreate={noop}
    onAdded={noop}
    onReopen={noop}
    onReplace={noop}
    clients={MCP_CLIENTS_WITH_VS_CODE}
    {...props}
  />
);

/** The page as its layout frames it: the site header, then the flow. */
const page = (props: Partial<BuildStartScreenProps>) => (
  <>
    <Header />
    <BuildStartScreen
      stage="agent"
      connect={connect()}
      agent="Claude Code"
      project={{ kind: 'say', project: startProject, from: 'address' }}
      build={null}
      {...props}
    />
  </>
);

const pick = { kind: 'pick', projects: startProjects } as const;

export const BUILD_START_SCREENS: Screen[] = [
  {
    id: 'build-start',
    title: 'Build · The start flow',
    area: 'build',
    route: '/build/start',
    sources: [
      'app/(build-player)/build/start/page.tsx',
      'components/build/start/build-start-live.tsx',
      'components/build/start/build-start-screen.tsx',
      'components/workspace/agent/agent-connect.tsx',
      'components/workspace/getting-in/flow-frame.tsx',
      'lib/build/start.ts',
    ],
    states: [
      {
        id: 'setup',
        title: 'Setup: pick your agent, paste one line, press "I added it"; step 2 waits, locked',
        path: FROM_PROJECT,
        height: 900,
        render: () => page({ stage: 'agent' }),
      },
      {
        id: 'waiting',
        title: "Waiting for the agent's first call",
        path: FROM_PROJECT,
        height: 620,
        render: () => page({ stage: 'agent', connect: connect({ stage: 'added' }) }),
      },
      {
        id: 'connected',
        title: 'The agent connected, came from a project: its sentence to say, with Copy',
        path: FROM_PROJECT,
        height: 700,
        render: () => page({ stage: 'project' }),
      },
      {
        id: 'pick',
        title: 'The agent connected, no project in the address: pick one from the list',
        path: NO_PROJECT,
        height: 900,
        render: () => page({ stage: 'project', project: pick }),
      },
      {
        id: 'started',
        title: 'The build started: both steps done, the way to the project',
        path: FROM_PROJECT,
        height: 680,
        render: () => page({ stage: 'started', build: startedBuild }),
      },
      {
        id: 'sign-in',
        title: 'Not signed in: step 1 asks for the GitHub sign-in first',
        path: FROM_PROJECT,
        signedOut: true,
        height: 620,
        render: () => page({ stage: 'sign_in' }),
      },
      {
        id: 'late',
        title: 'No call after 10 minutes: the waiting line changes its words and its dot, in place',
        path: FROM_PROJECT,
        height: 640,
        render: () => page({ stage: 'agent', connect: connect({ stage: 'added', late: true }) }),
      },
      {
        id: 'picked',
        title: 'A project picked from the list: its sentence; "Pick another project" brings the list back',
        path: NO_PROJECT,
        height: 700,
        render: () => page({ stage: 'project', project: { kind: 'say', project: codingAgentCard, from: 'list' } }),
      },
      {
        id: 'already-connected',
        title: 'An agent connected before: step 1 done, step 2 open from the first paint',
        path: NO_PROJECT,
        height: 900,
        render: () => page({ stage: 'project', agent: null, project: pick }),
      },
      {
        id: 'phone',
        title: 'Phone: the setup',
        path: FROM_PROJECT,
        width: 390,
        height: 1500,
        render: () => page({ stage: 'agent' }),
      },
    ],
  },
];
