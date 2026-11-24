import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { AgentConnectView, type AgentConnectViewProps } from '@/components/workspace/agent/agent-connect';
import { FairUseAppealForm } from '@/components/workspace/fair-use-appeal';
import { IssueRow } from '@/components/workspace/issue-row';
import { IssuePageScreen, type IssuePageScreenProps } from '@/components/workspace/masked-issue/issue-page-screen';
import { MaskedIssueRow, type MaskedIssueRowProps } from '@/components/workspace/masked-issue/masked-issue-row';
import { MaskedListFoot, WHY_HIDDEN_TITLE, WhyHiddenBody } from '@/components/workspace/masked-issue/why-hidden';
import { IssueStartsProvider } from '@/components/workspace/start-control';
import { issue } from '@/lib/contribute/__fixtures__/contribute-overview';
import {
  fullIssue,
  fullPage,
  issueNumbers,
  issuePage,
  looksAtLimit,
  looksToday,
  MASKED_NOW,
  maskedIssue,
  maskedIssues,
  openAppeal,
} from '@/lib/workspace/__fixtures__/masked-issue';
import { issueRowOfContribute } from '@/lib/workspace/issue-row';
import type { IssuePage } from '@/lib/workspace/masked-issue.types';

/**
 * The parts of masked issues, before a page places them: the masked row in its states, the page of one issue in its
 * states, the window that says why details are hidden, and the request to look again at a closed access.
 */

const MAIN = 'mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 pt-7 pb-16';
const frame = (children: ReactNode) => <main className={MAIN}>{children}</main>;
const list = (children: ReactNode) => (
  <IssueStartsProvider>
    <div className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">{children}</div>
  </IssueStartsProvider>
);
const noop = () => {};

const LEARNED = { title: 'Find duplicates in one pass with a set', learned: true };
const NEW_LESSON = { title: 'A stack: last in, first out', learned: false };

const row = (props: Partial<MaskedIssueRowProps> = {}) =>
  frame(list(<MaskedIssueRow issue={maskedIssue()} lesson={LEARNED} {...props} />));

/** Step 1's connect steps, embedded, for Claude Code. */
const connectSteps = (props: Partial<AgentConnectViewProps> = {}) => (
  <AgentConnectView
    embedded
    signIn
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
    {...props}
  />
);

const OWN = { agents: { own: true, hosted: false }, ownName: 'Claude Code' };

const page = (data: IssuePage, props: Partial<IssuePageScreenProps> = {}) =>
  frame(
    <IssuePageScreen
      page={data}
      from="learn"
      back={{ href: '/learn/earlier', label: 'Issues' }}
      numbers={issueNumbers}
      now={MASKED_NOW}
      timeZone="UTC"
      lesson={LEARNED}
      start={OWN}
      {...props}
    />,
  );

const contribute = { from: 'contribute', back: { href: '/contribute', label: 'Issues' }, lesson: null } as const;

/** Contribute's list with a named row among masked ones, and the line under it. */
const mixedList = () => {
  const named = issueRowOfContribute(
    issue({
      issueId: 'I_named',
      nameWithOwner: 'honojs/hono',
      number: 3311,
      title: 'A route with a trailing slash misses the cache',
      language: 'JS_TS',
      size: 'S',
      labels: [],
      why: 'Your stack: hono',
    }),
  );
  return frame(
    <>
      {list(
        <>
          <IssueRow issue={named} side="contribute" agents={{ hosted: true, own: true }} learnOpen />
          {maskedIssues.map((masked) => (
            <IssueRow
              key={masked.id}
              issue={{ ...named, issueId: masked.id, masked }}
              side="contribute"
              agents={{ hosted: true, own: true }}
            />
          ))}
        </>,
      )}
      <MaskedListFoot looks={looksToday()} numbers={issueNumbers} />
    </>,
  );
};

export const MASKED_ISSUE_SCREENS: Screen[] = [
  {
    id: 'masked-issue-row',
    title: 'Masked issue row',
    area: 'workspace',
    route: '/learn/earlier',
    sources: [
      'components/workspace/masked-issue/masked-issue-row.tsx',
      'components/workspace/masked-issue/facts.tsx',
      'components/workspace/issue-row.tsx',
      'lib/workspace/masked-issue.ts',
    ],
    states: [
      {
        id: 'masked',
        title: 'Masked: the facts, the rewritten title, the lesson, two hints; Skip and "See the full issue"',
        path: '/learn/earlier',
        height: 240,
        render: () => row(),
      },
      {
        id: 'opening',
        title: 'Pressed: the button waits in its place',
        path: '/learn/earlier',
        height: 240,
        render: () => row({ state: 'opening', onSee: noop }),
      },
      {
        id: 'taken',
        title: 'Someone pressed a moment before: the note, and "Show the next one"',
        path: '/learn/earlier',
        height: 240,
        render: () => row({ state: 'taken' }),
      },
      {
        id: 'limit',
        title: "The day's limit: the note, the button dimmed",
        path: '/learn/earlier',
        height: 240,
        render: () => row({ state: 'limit', looks: looksAtLimit }),
      },
      {
        id: 'holding',
        title: 'Another issue held: the press gives it back',
        path: '/learn/earlier',
        height: 240,
        render: () => row({ state: 'holding' }),
      },
      {
        id: 'skip',
        title: 'Skip pressed: two reasons and "Keep it", in the row\'s place',
        path: '/learn/earlier',
        height: 220,
        render: () => row({ initialAsking: true }),
      },
      {
        id: 'full',
        title: 'Held by the person: the project and the issue chip over the same line',
        path: '/learn/earlier',
        height: 260,
        render: () => row({ state: 'full', full: fullIssue() }),
      },
      {
        id: 'visitor',
        title: 'A visitor: no Skip',
        path: '/learn/earlier',
        signedOut: true,
        height: 240,
        render: () => row({ visitor: true, lesson: { ...LEARNED, learned: false } }),
      },
      {
        id: 'contribute-list',
        title: "Contribute's list: a named row among masked ones, and the line under it",
        path: '/contribute',
        height: 720,
        render: mixedList,
      },
      {
        id: 'teaches',
        title: 'A lesson new for the person, and fixes merged here',
        path: '/learn/earlier',
        height: 240,
        render: () => frame(list(<MaskedIssueRow issue={maskedIssues[2]} lesson={NEW_LESSON} />)),
      },
      {
        id: 'phone',
        title: 'On a phone',
        path: '/learn/earlier',
        width: 390,
        height: 420,
        render: () => row(),
      },
    ],
  },
  {
    id: 'issue-page',
    title: 'The page of one issue',
    area: 'workspace',
    route: '/my/issues/[id]',
    sources: [
      'components/workspace/masked-issue/issue-page-screen.tsx',
      'components/workspace/masked-issue/issue-start-form.tsx',
      'components/workspace/masked-issue/give-back.tsx',
      'components/workspace/masked-issue/why-hidden.tsx',
      'lib/workspace/masked-issue.ts',
    ],
    states: [
      {
        id: 'masked',
        title: 'Before the press: the masked card, the button, the hold, the window and the day',
        path: '/my/issues/q7k2m9xa',
        height: 520,
        render: () => page(issuePage()),
      },
      {
        id: 'holding',
        title: 'Before the press, another issue held',
        path: '/my/issues/q7k2m9xa',
        height: 520,
        render: () => page(issuePage({ holding: { id: 'other', until: '2026-10-28T12:09:00.000Z' } })),
      },
      {
        id: 'visitor',
        title: 'Before the press, a visitor',
        path: '/my/issues/q7k2m9xa',
        signedOut: true,
        height: 520,
        render: () => page(issuePage({ looks: null }), { visitor: true, lesson: null }),
      },
      {
        id: 'full-learn',
        title: 'After the press, from Learn: how, the agent, the prompt; then "Not for me"',
        path: '/my/issues/q7k2m9xa',
        height: 1100,
        render: () => page(fullPage()),
      },
      {
        id: 'full-learn-copied',
        title: 'From Learn, the prompt copied: held for 30 minutes',
        path: '/my/issues/q7k2m9xa',
        height: 1100,
        render: () => page(fullPage(), { start: { ...OWN, initialCopied: true } }),
      },
      {
        id: 'full-learn-no-agent',
        title: 'From Learn, no agent connected yet: connect first, the prompt waits',
        path: '/my/issues/q7k2m9xa',
        height: 1500,
        render: () => page(fullPage(), { start: { agents: { own: false, hosted: false }, connect: connectSteps() } }),
      },
      {
        id: 'full-contribute',
        title: 'From Contribute, their own agent: no choice of how',
        path: '/my/issues/q7k2m9xa',
        height: 960,
        render: () => page(fullPage(), { ...contribute }),
      },
      {
        id: 'full-contribute-learn',
        title: 'From Contribute, a person who also uses Learn: one quiet line',
        path: '/my/issues/q7k2m9xa',
        height: 1000,
        render: () => page(fullPage(), { ...contribute, start: { ...OWN, alsoLearn: true } }),
      },
      {
        id: 'full-hosted',
        title: 'From Contribute, the hosted agent only: one button',
        path: '/my/issues/q7k2m9xa',
        height: 940,
        render: () => page(fullPage(), { ...contribute, start: { agents: { own: false, hosted: true } } }),
      },
      {
        id: 'full-both',
        title: 'From Contribute, both agents: the agent is a choice',
        path: '/my/issues/q7k2m9xa',
        height: 1000,
        render: () => page(fullPage(), { ...contribute, start: { ...OWN, agents: { own: true, hosted: true } } }),
      },
      {
        id: 'full-contribute-no-agent',
        title: 'From Contribute, no agent connected yet',
        path: '/my/issues/q7k2m9xa',
        height: 1400,
        render: () =>
          page(fullPage(), {
            ...contribute,
            start: { agents: { own: false, hosted: false }, connect: connectSteps() },
          }),
      },
      {
        id: 'full-waiting-prs',
        title: 'Too many pull requests wait for maintainers: nothing to paste, giving back still works',
        path: '/my/issues/q7k2m9xa',
        height: 940,
        render: () => page(fullPage(), { ...contribute, start: { ...OWN, waitingPrs: 3 } }),
      },
      {
        id: 'given-back',
        title: 'After "Give it back": the reasons and the note, nothing to fill in',
        path: '/my/issues/q7k2m9xa',
        height: 640,
        render: () => page(issuePage({ state: 'GIVEN_BACK' })),
      },
      {
        id: 'given-back-filled',
        title: 'Two reasons saved and a note typed, not saved yet',
        path: '/my/issues/q7k2m9xa',
        height: 640,
        render: () =>
          page(issuePage({ state: 'GIVEN_BACK', reasons: ['TAKEN', 'NOT_MY_PROJECT'] }), {
            givenBack: {
              initialSaved: true,
              initialDraft: 'The thread says a rewrite of the sidebar is planned, so a fix here would be thrown away.',
            },
          }),
      },
      {
        id: 'expired',
        title: 'The 15 minutes ran out',
        path: '/my/issues/q7k2m9xa',
        height: 300,
        render: () => page(issuePage({ state: 'EXPIRED' })),
      },
      {
        id: 'replaced',
        title: 'Given back by seeing another issue',
        path: '/my/issues/q7k2m9xa',
        height: 300,
        render: () => page(issuePage({ state: 'REPLACED' })),
      },
      {
        id: 'taken',
        title: 'Someone pressed a moment before',
        path: '/my/issues/q7k2m9xa',
        height: 300,
        render: () => page(issuePage({ state: 'TAKEN' })),
      },
      {
        id: 'limit',
        title: "The day's limit",
        path: '/my/issues/q7k2m9xa',
        height: 300,
        render: () => page(issuePage({ state: 'LIMIT', looks: looksAtLimit })),
      },
      {
        id: 'left-pool',
        title: 'Closed or taken on GitHub',
        path: '/my/issues/q7k2m9xa',
        height: 300,
        render: () => page(issuePage({ state: 'LEFT_POOL' })),
      },
      {
        id: 'not-available',
        title: "Not on the person's list",
        path: '/my/issues/q7k2m9xa',
        height: 300,
        render: () => page(issuePage({ state: 'NOT_AVAILABLE' })),
      },
      {
        id: 'started',
        title: 'Started: the way to the work on it',
        path: '/my/issues/q7k2m9xa',
        height: 300,
        render: () => page(issuePage({ state: 'STARTED', startPath: '/my/pull-requests/tessera-ui/tessera/1290' })),
      },
      {
        id: 'suspended',
        title: 'A closed access: the request to look again in place of the page',
        path: '/my/issues/q7k2m9xa',
        height: 560,
        render: () => page(issuePage(), { suspended: { appeal: null } }),
      },
      {
        id: 'phone',
        title: 'After the press, from Learn, on a phone',
        path: '/my/issues/q7k2m9xa',
        width: 390,
        height: 1700,
        render: () => page(fullPage()),
      },
    ],
  },
  {
    id: 'why-hidden',
    title: 'Why we hide issue details',
    area: 'workspace',
    route: '/learn/earlier',
    sources: ['components/workspace/masked-issue/why-hidden.tsx', 'lib/workspace/masked-issue.ts'],
    states: [
      {
        id: 'open',
        title: 'The window, opened from the link under a list',
        path: '/learn/earlier',
        height: 860,
        // A portal renders nothing on the server: the board draws the window's box over the list.
        render: () => (
          <div className="relative">
            {frame(
              <>
                {list(maskedIssues.map((masked) => <MaskedIssueRow key={masked.id} issue={masked} />))}
                <MaskedListFoot looks={looksToday()} numbers={issueNumbers} />
              </>,
            )}
            <div className="absolute inset-0 flex items-start justify-center bg-black/50 px-4 pt-28">
              <div
                role="dialog"
                aria-label={WHY_HIDDEN_TITLE}
                className="flex w-full max-w-[520px] flex-col gap-4 rounded-lg border bg-background p-6 shadow-lg"
              >
                <h2 className="m-0 text-lg font-semibold">{WHY_HIDDEN_TITLE}</h2>
                <WhyHiddenBody numbers={issueNumbers} />
                <div className="flex justify-end">
                  <span className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-semibold">
                    Close
                  </span>
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'visitor-foot',
        title: "The line under a visitor's list",
        path: '/learn/earlier',
        signedOut: true,
        height: 120,
        render: () => frame(<MaskedListFoot looks={null} numbers={issueNumbers} />),
      },
    ],
  },
  {
    id: 'fair-use-appeal',
    title: 'Ask us to look again',
    area: 'workspace',
    route: '/my/issues/[id]',
    sources: ['components/workspace/fair-use-appeal.tsx', 'lib/workspace/masked-issue.ts'],
    states: [
      {
        id: 'form',
        title: 'A closed access: its words and the form',
        path: '/my/issues/q7k2m9xa',
        height: 520,
        render: () => frame(<FairUseAppealForm appeal={null} />),
      },
      {
        id: 'failed',
        title: 'Typed, and not sent',
        path: '/my/issues/q7k2m9xa',
        height: 560,
        render: () =>
          frame(
            <FairUseAppealForm
              appeal={null}
              initialText="The pull request was opened before I took the issue here."
              initialFailed
            />,
          ),
      },
      {
        id: 'open',
        title: 'Sent: one request open at a time, so no form',
        path: '/my/issues/q7k2m9xa',
        height: 320,
        render: () => frame(<FairUseAppealForm appeal={openAppeal} />),
      },
      {
        id: 'answered',
        title: 'Answered, and still closed: the person can ask again',
        path: '/my/issues/q7k2m9xa',
        height: 560,
        render: () => frame(<FairUseAppealForm appeal={{ ...openAppeal, answeredAt: '2026-10-28T08:00:00.000Z' }} />),
      },
    ],
  },
];
