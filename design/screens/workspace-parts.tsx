import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { IssueRow, type IssueRowProps } from '@/components/workspace/issue-row';
import { IssueStartsProvider } from '@/components/workspace/start-control';
import { issue } from '@/lib/contribute/__fixtures__/contribute-overview';
import { issueRowOfContribute } from '@/lib/workspace/issue-row';
import { ISSUE_START_FAILED, issueStartRefusalOf } from '@/lib/workspace/start-refusals';

/** The parts the two front tabs share, before a page places them: in a plain container. */
const MAIN = 'mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 pt-7 pb-16';
const frame = (children: ReactNode) => <main className={MAIN}>{children}</main>;
const list = (children: ReactNode) => (
  <IssueStartsProvider>
    <div className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">{children}</div>
  </IssueStartsProvider>
);

const PICKS = [
  issue(),
  issue({
    issueId: 'I_2',
    number: 930,
    nameWithOwner: 'tidewave/tide',
    title: 'Dark mode toggle flashes on first load',
    language: 'JS_TS',
    size: 'S',
    labels: ['good first issue', 'ui'],
    forNewcomers: true,
    why: 'a small fix in one component, and the maintainers welcome first pull requests',
  }),
  issue({
    issueId: 'I_3',
    number: 381,
    nameWithOwner: 'oxbow-dev/oxbow',
    title: 'Retry the upload after a 503',
    language: 'GO',
    size: 'L',
    repoRules: { lines: [], manualOnly: false },
  }),
].map(issueRowOfContribute);

const BOTH = { hosted: true, own: true };

/** Contribute's rows under the agents connected now: the first row's Start is primary. */
const contributeRows = (props: Partial<IssueRowProps> = {}, picks = PICKS) =>
  frame(
    list(
      picks.map((pick, index) => (
        <IssueRow key={pick.issueId} issue={pick} side="contribute" agents={BOTH} primary={index === 0} {...props} />
      )),
    ),
  );

const refused = (refusal: Parameters<typeof issueStartRefusalOf>[0]['refusal'], patch = {}) =>
  issueStartRefusalOf(
    { attempt: null, started: false, refusal, value: null, holder: null, until: null, ...patch },
    { capUsd: 2 },
  );

export const WORKSPACE_PART_SCREENS: Screen[] = [
  {
    id: 'issue-row',
    title: 'Issue row',
    area: 'workspace',
    route: '/contribute',
    sources: [
      'components/workspace/issue-row.tsx',
      'components/workspace/issue-row-menu.tsx',
      'components/workspace/start-control.tsx',
      'lib/workspace/issue-row.ts',
      'lib/workspace/start-refusals.ts',
      'lib/workspace/start-action.ts',
    ],
    states: [
      {
        id: 'both-agents',
        title: 'Contribute, both agents connected: Start with a chevron (hosted first), primary on the first row',
        path: '/contribute',
        height: 560,
        render: () => contributeRows(),
      },
      {
        id: 'none-connected',
        title: 'Contribute, nothing connected now: Start opens the Start page, whose first step connects the agent',
        path: '/contribute',
        height: 560,
        render: () => contributeRows({ agents: { hosted: false, own: false } }),
      },
      {
        id: 'refusals',
        title: "A hosted Start refused: the row's sentence and its one next step",
        path: '/contribute',
        height: 1180,
        render: () =>
          frame(
            list(
              [
                refused('AGENT_BUSY', { value: 1, holder: { id: 'A_3', repo: 'acme/widgets', number: 7 } }),
                refused('LIMIT_REACHED', { value: 3 }),
                refused('BUDGET', { until: '2026-11-21T00:00:00.000Z' }),
                refused('CLAIM_PENDING'),
                refused('REPO_UNAVAILABLE'),
                refused('TAKEN'),
                ISSUE_START_FAILED,
              ].map((refusal, index) => (
                <IssueRow
                  key={refusal?.code}
                  issue={{ ...PICKS[0], issueId: `I_${index}` }}
                  side="contribute"
                  agents={{ hosted: true, own: false }}
                  initialRefusal={refusal}
                />
              )),
            ),
          ),
      },
      {
        id: 'phone',
        title: 'Contribute, both agents, on a phone',
        path: '/contribute',
        width: 390,
        height: 820,
        render: () => contributeRows(),
      },
    ],
  },
];
