import type { Route } from 'next';
import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { AlsoWaiting } from '@/components/workspace/pr-parts/also-waiting';
import { ApproveScreen, type ApproveScreenProps } from '@/components/workspace/pr-parts/approve-screen';
import { ChecksLine } from '@/components/workspace/pr-parts/checks-line';
import { PullRequestFootLinks } from '@/components/workspace/pr-parts/foot-links';
import { PullRequestIssueCard } from '@/components/workspace/pr-parts/issue-card';
import { PullRequestBox, PullRequestOutcomeLine } from '@/components/workspace/pr-parts/pr-box';
import { FixLinkLine, PullRequestCards } from '@/components/workspace/pr-parts/pr-cards';
import { PullRequestListView } from '@/components/workspace/pr-parts/pr-list';
import { RoundsList } from '@/components/workspace/pr-parts/rounds-list';
import { StageStrip } from '@/components/workspace/pr-parts/stage-strip';
import {
  PR_NOW,
  prApprovals,
  prChecks,
  prContribute,
  prEnds,
  prLinks,
  prLists,
  prOnlyYouPage,
  prPatch,
  prReview,
  prStages,
} from '@/lib/workspace/__fixtures__/pull-request';
import type { PullRequestPage } from '@/lib/workspace/pull-request-page.types';

/**
 * The parts of a pull request's page, of Approve and of the list of pull requests, from fixtures, before a page uses
 * them. Held back from the export (`exported: false`) until the pages switch to them and today's boards of those
 * pages leave the catalogue: the export is at its file limit.
 */

const noop = () => {};
const PAGE_ROUTE = '/my/pull-requests/[owner]/[repo]/[issue]';
const PAGE_PATH = '/my/pull-requests/harbor-kit/relay/431';
const MAIN = 'mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16';
const COLUMN = 'mx-auto flex w-full max-w-4xl flex-col gap-5';

const frame = (children: ReactNode) => (
  <main className={MAIN}>
    <div className={COLUMN}>{children}</div>
  </main>
);

/** A labelled part of a board that shows several states one under the other. */
const Case = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="flex flex-col gap-3 border-t pt-4">
    <span className="text-sm font-semibold text-foreground">{title}</span>
    {children}
  </div>
);

const PRESSES = {
  onStartRound: noop,
  onSendRound: noop,
  onSendBack: noop,
  onRetry: noop,
  onOnlyYou: noop,
};

/** The part of the page under the issue: the strip, the box, what else waits, the two cards, the rounds. */
function Under({ page, agent = 'Claude Code' }: { page: PullRequestPage; agent?: string }) {
  const open = page.number !== null && (page.box === 'OPEN' || page.box === 'MERGED');
  return (
    <>
      <StageStrip page={page} />
      <PullRequestBox page={page} now={PR_NOW} links={prLinks} agent={agent} enterKey={false} {...PRESSES} />
      <PullRequestOutcomeLine outcome={page.outcome} />
      <AlsoWaiting onlyYou={page.onlyYou} onOnlyYou={noop} />
      <PullRequestCards page={page} now={PR_NOW} links={prLinks} />
      {open && page.made === 'LEARN' ? <FixLinkLine url={prLinks.fix} /> : null}
      <RoundsList
        page={page}
        now={PR_NOW}
        links={prLinks}
        onStartRound={noop}
        onSendRound={noop}
        onSendBack={noop}
        onMarkNotNeeded={noop}
        onReopen={noop}
        onAsks={noop}
        onReplyLeftOut={noop}
        onReplyText={noop}
      />
    </>
  );
}

/** The whole page of one pull request, as a page will compose the parts. */
const pageOf = (page: PullRequestPage, agent?: string) =>
  frame(
    <>
      <PullRequestIssueCard page={page} lessonHref={prLinks.lesson} backHref={prLinks.back} />
      <Under page={page} agent={agent} />
      <PullRequestFootLinks
        rules={page.rules}
        onDiscard={page.number === null ? noop : undefined}
        onClose={page.number !== null && page.box !== 'MERGED' ? noop : undefined}
      />
    </>,
  );

const stack = (cases: [string, PullRequestPage][]) =>
  frame(
    cases.map(([title, page]) => (
      <Case key={title} title={title}>
        <Under page={page} />
      </Case>
    )),
  );

const approve = (props: Partial<ApproveScreenProps> = {}) => (
  <main className="mx-auto w-full max-w-7xl px-4 pt-8 pb-16">
    <ApproveScreen
      made="LEARN"
      repo="harbor-kit/relay"
      issueNumber={431}
      issueTitle="The retry list grows without limit when a webhook keeps failing"
      approval={prApprovals.send}
      patch={prPatch}
      links={{ back: prLinks.approve, answers: prLinks.answers, lesson: prLinks.lesson }}
      onSend={noop}
      onSendBack={noop}
      initialPane="preview"
      {...props}
    />
  </main>
);

const list = (props: Partial<Parameters<typeof PullRequestListView>[0]> = {}) => (
  <main className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 pt-7 pb-16">
    <PullRequestListView
      list={prLists.contribute}
      now={PR_NOW}
      side="contribute"
      issuesHref={'/contribute' as Route}
      lessonHrefOf={(lesson) => `/learn/lessons/${lesson.slug}` as Route}
      onMore={noop}
      {...props}
    />
  </main>
);

export const WORKSPACE_PR_PART_SCREENS: Screen[] = [
  {
    id: 'pull-request-parts',
    title: 'A pull request',
    area: 'workspace',
    route: PAGE_ROUTE,
    exported: false,
    sources: [
      'components/workspace/pr-parts/issue-card.tsx',
      'components/workspace/pr-parts/stage-strip.tsx',
      'components/workspace/pr-parts/pr-box.tsx',
      'components/workspace/pr-parts/pr-cards.tsx',
      'components/workspace/pr-parts/also-waiting.tsx',
      'components/workspace/pr-parts/rounds-list.tsx',
      'components/workspace/pr-parts/checks-line.tsx',
      'components/workspace/pr-parts/foot-links.tsx',
      'lib/workspace/pull-request-page.ts',
    ],
    states: [
      {
        id: 'walkthrough-ready',
        title: 'The walkthrough is ready: the one thing to do is to answer it',
        path: PAGE_PATH,
        height: 800,
        render: () => pageOf(prStages.walkthrough),
      },
      {
        id: 'stages',
        title: 'Every stage, one under the other: the strip, the box and the two cards keep their places',
        path: PAGE_PATH,
        height: 4400,
        render: () =>
          stack([
            ['1 · The agent is fixing the issue', prStages.fixing],
            ['2 · The fix is ready, the walkthrough is being written', prStages.writing],
            ['3 · The walkthrough is partly answered', prStages.partly],
            ['4 · The walkthrough is sent back and rewritten', prStages.rewriting],
            ['5 · The walkthrough is finished: write and send the pull request', prStages.approve],
            ['6 · The pull request is being opened: a bar in five parts', prStages.opening],
            ['7 · The pull request is open', prStages.open],
            ['8 · Merged', prStages.merged],
            ['9 · A fix with no lesson, the walkthrough is ready', prStages.noLesson],
            ['10 · A fix with no lesson, merged', prStages.noLessonMerged],
          ]),
      },
      {
        id: 'review',
        title: 'Review in Learn: a round is asked, ready, sent, and a comment that asks nothing',
        path: PAGE_PATH,
        height: 5600,
        render: () =>
          frame(
            <>
              <Case title="1 · A round to answer: the prompt for your agent">{pageOf(prReview.asked)}</Case>
              <Case title="2 · Your agent finished: read the round and send it as a whole">
                {pageOf(prReview.ready)}
              </Case>
              <Case title="3 · Sent: the round closes to one row">{pageOf(prReview.sent)}</Case>
              <Case title="4 · A comment that asks for nothing: no round opens">{pageOf(prReview.asksNothing)}</Case>
            </>,
          ),
      },
      {
        id: 'tasks',
        title: 'What only you can do, one at a time in the box; marking a round as not needed; the checks opened',
        path: PAGE_PATH,
        height: 4000,
        render: () =>
          frame(
            <>
              {['cla', 'dco', 'conversation', 'title', 'github', 'bot_blocked', 'replies_failed'].map((kind) => (
                <Case key={kind} title={`Only you: ${kind}`}>
                  <PullRequestBox
                    page={prOnlyYouPage(kind)}
                    now={PR_NOW}
                    links={prLinks}
                    enterKey={false}
                    {...PRESSES}
                  />
                </Case>
              ))}
              <Case title="A round marked as not needed asks why, in the buttons’ place">
                <RoundsList
                  page={prReview.asked}
                  now={PR_NOW}
                  links={prLinks}
                  initialAsking={2}
                  onMarkNotNeeded={noop}
                />
              </Case>
              <Case title="A reason picked: the round says why and can be opened again">
                <RoundsList page={prReview.notNeeded} now={PR_NOW} links={prLinks} onReopen={noop} />
              </Case>
              <Case title="The checks line opened">
                <ChecksLine checks={prChecks} initialOpen />
              </Case>
            </>,
          ),
      },
      {
        id: 'contribute',
        title: 'The same page in Contribute, with a hosted agent: four stages, a button in place of a prompt',
        path: PAGE_PATH,
        height: 2400,
        render: () => pageOf(prContribute.asked, 'Hosted agent'),
      },
      {
        id: 'ends',
        title: 'How it ends: merged, closed, stopped, stopped before a change, discarded, no answer for a while',
        path: PAGE_PATH,
        height: 2400,
        render: () =>
          stack([
            ['1 · Merged after two rounds', prEnds.merged],
            ['2 · Closed without merging', prEnds.closed],
            ['3 · GitRanks work stopped: the project asked', prEnds.stopped],
            ['4 · The agent stopped before any change', prEnds.stoppedEarly],
            ['5 · You discarded the fix', prEnds.discarded],
            ['6 · No answer for a while', prEnds.silent],
          ]),
      },
      {
        id: 'phone',
        title: 'On a phone',
        path: PAGE_PATH,
        width: 390,
        height: 1000,
        render: () => pageOf(prStages.walkthrough),
      },
    ],
  },
  {
    id: 'approve-parts',
    title: 'Approve and send',
    area: 'workspace',
    route: `${PAGE_ROUTE}/approve`,
    exported: false,
    sources: ['components/workspace/pr-parts/approve-screen.tsx', 'lib/workspace/pull-request-approve.ts'],
    states: [
      {
        id: 'send',
        title: 'Right after the walkthrough: what you send and the change on the left, one card on the right',
        path: `${PAGE_PATH}/approve`,
        height: 1500,
        render: () => approve(),
      },
      {
        id: 'needs',
        title: 'Something is needed first: a title prefix and a sign-off',
        path: `${PAGE_PATH}/approve`,
        height: 1500,
        render: () => approve({ approval: prApprovals.needs }),
      },
      {
        id: 'github',
        title: 'GitHub has not given permission yet',
        path: `${PAGE_PATH}/approve`,
        height: 1500,
        render: () => approve({ approval: prApprovals.github }),
      },
      {
        id: 'failed',
        title: 'It could not be sent: the same button tries again',
        path: `${PAGE_PATH}/approve`,
        height: 1500,
        render: () => approve({ state: 'failed' }),
      },
      {
        id: 'send-back',
        title: 'Send it back to your agent: a field in the note’s place',
        path: `${PAGE_PATH}/approve`,
        height: 1500,
        render: () => approve({ initialSendBack: 'Keep the default as it was: no limit unless someone sets one.' }),
      },
      {
        id: 'signed-off',
        title: 'A project that asks for a sign-off, and your settings already give it',
        path: `${PAGE_PATH}/approve`,
        height: 1500,
        render: () => approve({ approval: prApprovals.signedOff }),
      },
      {
        id: 'contribute',
        title: 'Contribute: no walkthrough before it, no lesson after',
        path: `${PAGE_PATH}/approve`,
        height: 1300,
        render: () =>
          approve({
            made: 'CONTRIBUTE',
            repo: 'tessera-ui/tessera',
            issueNumber: 1274,
            issueTitle: 'A tooltip stays open after its trigger is removed',
            approval: prApprovals.contribute,
            patch: null,
          }),
      },
      {
        id: 'phone',
        title: 'On a phone',
        path: `${PAGE_PATH}/approve`,
        width: 390,
        height: 2300,
        render: () => approve(),
      },
    ],
  },
  {
    id: 'pull-request-list-parts',
    title: 'Your pull requests',
    area: 'workspace',
    route: '/my/pull-requests',
    exported: false,
    sources: ['components/workspace/pr-parts/pr-list.tsx', 'lib/workspace/pull-request-list.ts'],
    states: [
      {
        id: 'contribute',
        title: 'Opened from Contribute: what needs you, what is in progress, what has ended',
        path: '/my/pull-requests',
        height: 1400,
        render: () => list(),
      },
      {
        id: 'learn',
        title: 'Opened from Learn',
        path: '/my/pull-requests',
        height: 800,
        render: () => list({ list: prLists.learn, side: 'learn', issuesHref: '/learn/issues' as Route }),
      },
      {
        id: 'every-row',
        title: 'A row in every state',
        path: '/my/pull-requests',
        height: 2200,
        render: () => list({ list: prLists.every }),
      },
      {
        id: 'at-limit',
        title: 'At the limit',
        path: '/my/pull-requests',
        height: 1400,
        render: () => list({ list: prLists.atLimit }),
      },
      {
        id: 'empty-learn',
        title: 'No fix yet, opened from Learn',
        path: '/my/pull-requests',
        height: 400,
        render: () => list({ list: prLists.empty, side: 'learn', issuesHref: '/learn/issues' as Route }),
      },
      {
        id: 'empty-contribute',
        title: 'No fix yet, opened from Contribute',
        path: '/my/pull-requests',
        height: 400,
        render: () => list({ list: prLists.empty }),
      },
      {
        id: 'phone',
        title: 'Opened from Contribute, on a phone',
        path: '/my/pull-requests',
        width: 390,
        height: 2400,
        render: () => list(),
      },
    ],
  },
];
