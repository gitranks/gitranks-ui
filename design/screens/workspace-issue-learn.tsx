import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { Header } from '@/components/header/header';
import { AgentConnectView } from '@/components/workspace/agent/agent-connect';
import { IssuePageScreen, type IssuePageScreenProps } from '@/components/workspace/masked-issue/issue-page-screen';
import { WorkspaceTabsNav } from '@/components/workspace/workspace-tabs-nav';
import { fullPage, issueNumbers, issuePage, MASKED_NOW } from '@/lib/workspace/__fixtures__/masked-issue';
import { issueLessonLineOf } from '@/lib/workspace/issue-page-learn';
import { MCP_CLIENTS_WITH_VS_CODE } from '@/lib/workspace/mcp-setup';
import { PICK_ISSUE_PATHS } from '@/lib/workspace/paths';

/**
 * The page of one issue from Learn, with Learn's parts: the lesson and why, an issue kept for learners with no "How"
 * step, the line of the started state, and VS Code among the agents to connect. Held back from the export
 * (`exported: false`): the export is at its file limit.
 */

const PATH = '/my/issues/q7k2m9xa?from=learn';
const MAIN = 'mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 pt-7 pb-16';
const TABS = ['contribute', 'learn', 'pull-requests', 'agent', 'settings'] as const;
const noop = () => {};

const LESSON = { slug: 'a-queue-first-in-first-out', title: 'A queue: first in, first out' };
const teaches = issueLessonLineOf({ lesson: LESSON, why: 'TEACHES_NEW' });
const uses = issueLessonLineOf({ lesson: LESSON, why: 'USES_LEARNED' });

/** The page as the workspace's layout frames it: the site header, then the tabs. */
const frame = (children: ReactNode) => (
  <>
    <Header />
    <WorkspaceTabsNav tabs={TABS} needsYou={2} />
    <main className={MAIN}>{children}</main>
  </>
);

const OWN = { agents: { own: true, hosted: false }, ownName: 'Claude Code' };

const draw = (props: Partial<IssuePageScreenProps> & Pick<IssuePageScreenProps, 'page'>) =>
  frame(
    <IssuePageScreen
      from="learn"
      back={{ href: PICK_ISSUE_PATHS.learn, label: 'Issues' }}
      numbers={issueNumbers}
      now={MASKED_NOW}
      timeZone="UTC"
      start={OWN}
      {...props}
    />,
  );

/** The connect steps with VS Code picked: its own MCP file, signing in with GitHub. */
const vsCodeConnect = (
  <AgentConnectView
    embedded
    signIn
    client="vscode"
    clients={MCP_CLIENTS_WITH_VS_CODE}
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
  />
);

const STARTED_PAGE = issuePage({ state: 'STARTED', startPath: '/my/pull-requests/acme/notebook/1290' });

export const WORKSPACE_ISSUE_LEARN_SCREENS: Screen[] = [
  {
    id: 'issue-page-learn',
    title: 'The page of one issue, from Learn',
    area: 'workspace',
    route: '/my/issues/[id]',
    exported: false,
    sources: [
      'app/(workspace)/my/issues/[id]/page.tsx',
      'components/workspace/masked-issue/issue-page-live.tsx',
      'components/workspace/masked-issue/issue-page-screen.tsx',
      'components/workspace/masked-issue/issue-start-form.tsx',
      'components/workspace/agent/agent-connect.tsx',
      'lib/workspace/issue-page-learn.ts',
      'lib/workspace/issue-page-learn.data.ts',
    ],
    states: [
      {
        id: 'masked-lesson',
        title: 'Before the press: the masked card says the lesson it teaches, new for you',
        path: PATH,
        height: 760,
        render: () => draw({ page: issuePage(), lesson: teaches }),
      },
      {
        id: 'full-lesson',
        title: 'After the press: the lesson you learned, and the two ways of the same size',
        path: PATH,
        height: 1240,
        render: () => draw({ page: fullPage(), lesson: uses }),
      },
      {
        id: 'learn-only',
        title: 'An issue kept for learners: no "How" step, the walkthrough always on',
        path: PATH,
        height: 1080,
        render: () => draw({ page: fullPage(), lesson: teaches, learnOnly: true }),
      },
      {
        id: 'connect-vs-code',
        title: 'No agent connected yet: VS Code is one of the agents to pick',
        path: PATH,
        height: 1600,
        render: () =>
          draw({
            page: fullPage(),
            lesson: teaches,
            start: { agents: { own: false, hosted: false }, connect: vsCodeConnect },
          }),
      },
      {
        id: 'started',
        title: 'Started: one line says who started it, when, and with the walkthrough',
        path: PATH,
        height: 560,
        render: () =>
          draw({
            page: STARTED_PAGE,
            started: { agent: 'Claude Code', at: '2026-10-28T11:48:00.000Z', walkthrough: true },
          }),
      },
    ],
  },
];
