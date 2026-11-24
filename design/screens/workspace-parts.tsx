import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { IssueRow, type IssueRowProps } from '@/components/workspace/issue-row';
import { RightNow } from '@/components/workspace/right-now';
import { RunStepsList } from '@/components/workspace/run-steps';
import { IssueStartsProvider } from '@/components/workspace/start-control';
import { activityOf, runOf } from '@/lib/contribute/__fixtures__/agent-runs';
import { issue } from '@/lib/contribute/__fixtures__/contribute-overview';
import { issueRowOfContribute, issueRowOfLearn } from '@/lib/workspace/issue-row';
import { startIssue } from '@/lib/workspace/start/__fixtures__/start-page';
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

const LESSONS = [
  startIssue,
  {
    ...startIssue,
    issueId: 'I_9',
    repo: 'calendarist/cal',
    number: 102,
    title: 'Week starts on Sunday for en-GB',
    size: 'M',
  },
].map(issueRowOfLearn);

const refused = (refusal: Parameters<typeof issueStartRefusalOf>[0]['refusal'], patch = {}) =>
  issueStartRefusalOf(
    { attempt: null, started: false, refusal, value: null, holder: null, until: null, ...patch },
    { capUsd: 2 },
  );

const working = runOf({
  mode: 'FIX',
  title: 'Panic when a span ends at EOF',
  nameWithOwner: 'quill-rs/quill',
  number: 1204,
});
const checking = runOf({
  attemptId: 'att_checking',
  mode: 'FIX',
  phase: 'CHECKING_ISSUE',
  nameWithOwner: 'tidewave/tide',
  number: 930,
  title: 'Dark mode toggle flashes on first load',
  elapsedSeconds: 40,
  spendUsd: 0.05,
});
const ownFix = runOf({
  attemptId: 'att_own',
  runner: 'MCP',
  mode: 'FIX',
  nameWithOwner: 'oxbow-dev/oxbow',
  number: 381,
  title: 'Retry the upload after a 503',
  spendUsd: null,
  budgetUsd: null,
  lastCallAt: '2026-10-31T11:58:00.000Z',
});
const followUp = runOf({
  attemptId: 'att_follow_up',
  kind: 'FOLLOW_UP',
  mode: 'FIX',
  phase: 'ADDRESSING_REVIEW',
  nameWithOwner: 'recharts/recharts',
  number: 8136,
  title: 'Tooltip flickers on resize',
  prUrl: 'https://github.com/recharts/recharts/pull/8140',
});
const lesson = runOf({
  attemptId: 'att_lesson',
  runner: 'MCP',
  mode: 'LEARN',
  phase: 'WRITING_LESSON',
  nameWithOwner: 'driftwood-js/driftwood',
  number: 934,
  title: 'Route params lose their type after a redirect',
  spendUsd: null,
  budgetUsd: null,
  lastCallAt: '2026-10-31T11:55:00.000Z',
});

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
        id: 'learn',
        title: 'Learn: Start a lesson, never a menu',
        path: '/learn/earlier',
        height: 360,
        render: () =>
          frame(
            list(
              LESSONS.map((row, index) => (
                <IssueRow key={row.issueId} issue={row} side="learn" agents={BOTH} primary={index === 0} />
              )),
            ),
          ),
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
  {
    id: 'right-now',
    title: 'Right now',
    area: 'workspace',
    route: '/contribute',
    sources: [
      'components/workspace/right-now.tsx',
      'components/workspace/run-steps.tsx',
      'components/ui/hover-card.tsx',
      'lib/workspace/right-now.ts',
      'lib/workspace/run-steps.ts',
    ],
    states: [
      {
        id: 'contribute',
        title: 'Contribute: the hosted agent and the own agent at work, a follow-up among them',
        path: '/contribute',
        height: 720,
        render: () =>
          frame(
            <RightNow
              side="fix"
              activity={activityOf(checking, working, followUp, ownFix)}
              notes={{
                hosted: { note: 'on your Claude key · Sonnet 5.5', aside: '3 of 3 at a time' },
                own: { note: 'Claude Code' },
              }}
            />,
          ),
      },
      {
        id: 'learn',
        title: 'Learn: the own agent writing a lesson',
        path: '/learn/earlier',
        height: 320,
        render: () =>
          frame(
            <RightNow side="learn" activity={activityOf(working, lesson)} notes={{ own: { note: 'Claude Code' } }} />,
          ),
      },
      {
        id: 'steps-card',
        title: "The hover card on the bars: this run's steps, done, now and left",
        path: '/contribute',
        height: 320,
        render: () =>
          frame(
            <div className="flex flex-wrap gap-4">
              {[working, lesson, followUp].map((run) => (
                <div key={run.attemptId} className="w-60 rounded-md border bg-popover p-3.5 shadow-md">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">This run&apos;s steps</p>
                  <RunStepsList run={run} />
                </div>
              ))}
            </div>,
          ),
      },
      {
        id: 'phone',
        title: 'Contribute, on a phone',
        path: '/contribute',
        width: 390,
        height: 900,
        render: () => frame(<RightNow side="fix" activity={activityOf(checking, working, ownFix)} />),
      },
    ],
  },
];
