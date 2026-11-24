import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { FairUseAppealForm } from '@/components/workspace/fair-use-appeal';
import { IssuePageScreen, type IssuePageScreenProps } from '@/components/workspace/masked-issue/issue-page-screen';
import { MaskedIssueRow } from '@/components/workspace/masked-issue/masked-issue-row';
import { MaskedListFoot } from '@/components/workspace/masked-issue/why-hidden';
import {
  fullPage,
  issueNumbers,
  issuePage,
  looksToday,
  MASKED_NOW,
  maskedIssues,
} from '@/lib/workspace/__fixtures__/masked-issue';
import type { IssuePage } from '@/lib/workspace/masked-issue.types';

/**
 * The parts of masked issues, before a page places them: five boards, the most telling states, since the export has
 * room for few more. Every other state lives in its spec: the row's (opening, taken, the day's limit, holding another,
 * Skip, held, a visitor), the page's (each end, each way to start, a visitor), the window's and the appeal's.
 */

const MAIN = 'mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 pt-7 pb-16';
const frame = (children: ReactNode) => <main className={MAIN}>{children}</main>;

const LEARNED = { title: 'Find duplicates in one pass with a set', learned: true };

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
      start={{ agents: { own: true, hosted: false }, ownName: 'Claude Code' }}
      {...props}
    />,
  );

export const MASKED_ISSUE_SCREENS: Screen[] = [
  {
    id: 'masked-issue-row',
    title: 'Masked issue row',
    area: 'workspace',
    route: '/learn/earlier',
    sources: [
      'components/workspace/masked-issue/masked-issue-row.tsx',
      'components/workspace/masked-issue/facts.tsx',
      'components/workspace/masked-issue/why-hidden.tsx',
      'lib/workspace/masked-issue.ts',
    ],
    states: [
      {
        id: 'list',
        title: 'Masked rows in a list: the facts, the rewritten title, the lesson, two hints; the line under the list',
        path: '/learn/earlier',
        height: 560,
        render: () =>
          frame(
            <>
              <div className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
                {maskedIssues.map((masked, at) => (
                  <MaskedIssueRow key={masked.id} issue={masked} lesson={at === 0 ? LEARNED : null} />
                ))}
              </div>
              <MaskedListFoot looks={looksToday()} numbers={issueNumbers} status="" />
            </>,
          ),
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
        id: 'full',
        title: 'After the press: the hold and its minutes, the issue in full, how to start, then "Not for me"',
        path: '/my/issues/q7k2m9xa',
        height: 1100,
        render: () => page(fullPage()),
      },
      {
        id: 'given-back',
        title: 'After "Give it back": two reasons saved and a note typed, not saved yet',
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
    ],
  },
];
