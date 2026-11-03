import { readFileSync } from 'node:fs';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/contribute/me',
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/app/contribute/actions', () => ({}));
// A marker where the page reads itself again, so the static markup shows it.
vi.mock('@/lib/contribute/contribute.data', () => ({
  loadContribute: vi.fn(),
  loadAttempt: vi.fn(),
  loadResolveHumanThreads: vi.fn(async () => undefined),
  loadAttempts: vi.fn(),
  loadContributions: vi.fn(),
  loadRepliesWaiting: vi.fn(),
}));

const { ReviewScreen, grantNeededOf } = await import('./review-view');
const { ContributionsScreen } = await import('./contributions-view');
const { SettingsScreen } = await import('./settings-view');
const { ReplyDraftItem } = await import('./reply-drafts');
const { AutopilotRecord, autopilotErrorMessage } = await import('./autopilot-section');
const { NOW, views, settings: baseSettings } = await import('@/lib/contribute/__fixtures__/contribute-views');
const {
  attempt,
  contributions,
  feedbackThread,
  flowDraft,
  followUpAttempts,
  followUpOf,
  followUpRun,
  followUps,
  needsYou,
  replyDraft,
} = await import('@/lib/contribute/__fixtures__/contribute-attempts');
const { replyWaiting } = await import('@/lib/contribute/__fixtures__/contribute-overview');
const { nextForAgreement, nextForChecks, nextForDco, nextForRun, nextForYou } = await import(
  '@/lib/contribute/__fixtures__/needs-you'
);
const { followUpErrorMessage, handledErrorMessage, replyRefusalOf, vetoErrorMessage } = await import(
  '@/lib/contribute/follow-up-format'
);

import type {
  ContributeAttemptDetail,
  ContributeContributions,
  ContributeReplyDraft,
  ContributeReplyWaiting,
  ContributeView,
} from '@/lib/contribute/contribute.types';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ');

/** The page of `item`; `next`: on the round not started yet. */
const review = (item: ContributeAttemptDetail, view: ContributeView = views.active, next = false) =>
  renderToStaticMarkup(<ReviewScreen view={view} attempt={item} next={next} now={NOW} />);

/** My contributions with the open pull request (`kelp-db/kelp` #1419) as `patch` makes it. */
const mine = (
  patch: Partial<ContributeContributions['items'][number]>,
  replies: ContributeReplyWaiting[] = [],
  attempts = [attempt({ attemptId: 'A_F1', kind: 'FOLLOW_UP', state: 'REVIEW' })],
) =>
  renderToStaticMarkup(
    <ContributionsScreen
      view={views.active}
      contributions={{
        ...contributions,
        items: contributions.items.map((item) =>
          item.attemptId === 'A_8' ? { ...item, pullRequest: { ...item.pullRequest, prId: 'PR_8' }, ...patch } : item,
        ),
      }}
      attempts={attempts}
      replies={replies}
      now={NOW}
    />,
  );

describe('a pull request that needs the user, on My contributions', () => {
  it('says the move and its button, leading to the next step, and no follow-up controls', () => {
    const html = mine({ needsYou: needsYou(), followUps: followUps() });
    const plain = text(html);

    expect(html).toContain('data-row="changes"');
    expect(plain).toContain(
      'kelp-db/kelp · PR #1419 Changes requested Add a --json flag to kelp status Your move: A reviewer asked for changes. Start run 1 on them. · and 2 more Start run 1',
    );
    expect(html).toContain('href="/contribute/attempts/A_8?session=next"');
    expect(plain).toMatch(/Needs you · 2/);
    // The owner, 2026-11-01: the follow-up management lives on the attempt page only.
    expect(html).not.toContain('data-start-follow-up');
    expect(html).not.toContain('data-follow-ups');
  });

  it('names each reason by the move it asks for, with the way to it', () => {
    const one = (kind: 'COMMENT' | 'CHECK_FAILED' | 'CLA' | 'BOT_BLOCKED' | 'TITLE' | 'DCO' | 'RUN_ENDED') =>
      text(mine({ needsYou: { since: NOW.toISOString(), signals: [{ kind, at: NOW.toISOString(), detail: null }] } }));
    expect(one('COMMENT')).toContain('Your move: Someone commented on it. Let run 1 answer, or reply on GitHub.');
    expect(one('CHECK_FAILED')).toContain('Your move: A check fails on your pull request. Start run 1 to fix it.');
    expect(one('CLA')).toContain(
      'Your move: The repo merges code only from people who signed its CLA, and only you can sign it. Sign it on its page; this clears once the check passes. Sign the CLA ↗ I signed it',
    );
    expect(one('BOT_BLOCKED')).toContain(
      'Your move: A review bot holds the merge until you do what it asks: "Blocked before merge" Read what it asks.',
    );
    expect(one('TITLE')).toContain(
      'Your move: The repo sets a rule for pull request titles, and this one breaks it. Retitle the pull request on GitHub.',
    );
    expect(one('DCO')).toContain('Your move: The repo needs your Signed-off-by on every commit');
    expect(one('RUN_ENDED')).toContain('Your move: The last run changed nothing: what is left is yours to do.');
  });

  it('says why Mark as handled did not go through', () => {
    expect(handledErrorMessage('NOT_FOUND')).toContain('no longer yours');
    expect(handledErrorMessage('INVALID', 'the pull request is not open')).toContain('no longer open');
    expect(handledErrorMessage('INVALID', 'the pull request changed meanwhile: try again')).toContain(
      'changed just now',
    );
    expect(handledErrorMessage('INVALID', 'prId must match')).not.toContain('changed just now');
  });

  it('lists a follow-up ready once, as its Review row, and one under way in place, not counted nor in progress', () => {
    const current = followUps({ used: 1, manualRuns: 1, currentAttemptId: 'A_F1' });
    const ready = mine(
      { needsYou: needsYou(), followUps: current },
      [],
      [attempt({ attemptId: 'A_F1', kind: 'FOLLOW_UP', state: 'REVIEW', followUpOf: { ...followUpOf, prId: 'PR_8' } })],
    );
    expect(ready.match(/data-row=/g)).toHaveLength(1);
    expect(ready).toContain('data-row="run-ready"');
    expect(ready).toContain('href="/contribute/attempts/A_1/runs/A_F1"');

    const running = mine(
      { needsYou: needsYou(), followUps: current },
      [],
      [
        attempt({
          attemptId: 'A_F1',
          kind: 'FOLLOW_UP',
          state: 'RUNNING',
          followUpStep: 'fixing',
          createdAt: '2026-10-28T11:30:00.000Z',
        }),
      ],
    );
    const plain = text(running);
    expect(running).toContain('data-row="working"');
    expect(plain).toContain('Needs you · 0 · 1 run working on it');
    expect(plain).toContain('Run 1 working Add a --json flag to kelp status Fixing · started 30 minutes ago.');
    expect(plain).toContain('Watch run 1');
    expect(running).not.toContain('data-section="in-progress"');
  });

  it('leaves out a pull request with nothing new, and one that is not open', () => {
    expect(mine({ needsYou: null, followUps: followUps() }, [], [])).not.toContain('data-row=');
    const merged = renderToStaticMarkup(
      <ContributionsScreen
        view={views.active}
        contributions={{
          ...contributions,
          items: [{ ...contributions.items[0], needsYou: needsYou(), followUps: followUps() }],
        }}
        attempts={[]}
        now={NOW}
      />,
    );
    expect(merged).not.toContain('data-row=');
    // Without the newer fields at all, the page reads as it did.
    expect(mine({}, [], [])).not.toContain('data-row=');
  });

  it('asks to approve the replies waiting, even with nothing new on GitHub, and keeps their text off the list', () => {
    const html = mine({ needsYou: null, followUps: followUps({ used: 1, manualRuns: 1 }) }, [
      replyWaiting({ prId: 'PR_8', attemptId: 'A_F1' }),
    ]);

    expect(html).toContain('data-row="replies"');
    expect(text(html)).toContain(
      'Your move: A run drafted 1 reply to @maintainer-mo. Read and post them. Approve the reply',
    );
    expect(html).not.toContain('data-reply-draft');
  });

  it('says when autopilot submits an attempt waiting for it, with the link to stop it', () => {
    const html = renderToStaticMarkup(
      <ContributionsScreen
        view={views.active}
        contributions={contributions}
        attempts={[
          attempt({ state: 'PENDING_AUTOSUBMIT', autosubmitAt: '2026-10-28T12:42:00.000Z', autopilot: true }),
          attempt({ attemptId: 'A_F2', kind: 'FOLLOW_UP', state: 'DONE' }),
        ]}
        now={NOW}
      />,
    );

    expect(text(html)).toContain(
      'Autopilot · 42 min Nested layouts re-render on every navigation Your move: Autopilot opens this pull request in 42 minutes. Check it, or stop it. Check before it submits',
    );
    expect(html).toContain('href="/contribute/attempts/A_1"');
    expect(text(html)).toContain('Follow-ups pushed 1');
  });
});

describe('the follow-ups of a pull request, on its first attempt', () => {
  it('says the move under the header, and the next step, recommended, as a session to open', () => {
    const html = review(followUpAttempts.prNeedsYou);
    const plain = text(html);

    expect(html).toContain('data-your-move="waiting"');
    expect(plain).toContain('Your move: A reviewer asked for changes. Start run 1 on them. Go to the next step →');
    expect(html).toContain('data-session="next"');
    expect(html).toContain('href="/contribute/attempts/A_1?session=next"');
    expect(plain).toContain('Run 1 · follow-up Recommended');
    expect(plain).not.toMatch(/rounds? (used|left)/);
    // The run is started from its own session, not from the first attempt's.
    expect(html).not.toContain('data-start-follow-up');

    const next = review(followUpAttempts.prNeedsYou, views.active, true);
    const nextText = text(next);
    expect(next).not.toContain('data-your-move');
    expect(next).toContain('data-next-round="recommended"');
    expect(nextText).toContain('Your move: start run 1 Recommended');
    expect(nextText).toContain(
      'Run 1 works on A reviewer asked for changes · 3 hours ago Someone else commented on it · 2 hours ago A check started failing: lint, test (ubuntu) · 1 hour ago',
    );
    expect(next).toContain('data-start-follow-up="PR_1"');
    expect(next).toContain('data-follow-up-note=""');
    expect(next).toContain('maxLength="2000"');
    expect(nextText).toContain(
      'Fix the failing checks (lint, test (ubuntu)), address the requested changes and answer the new comment on the pull request.',
    );
    expect(nextText).toContain('GitRanks filled this in from what waits on the pull request.');
    expect(nextText).toContain('Start run 1');
    expect(nextText).toContain('Rather answer it yourself? Reply on GitHub ↗ then mark it as handled');
    expect(next).toContain('data-kinds="CHANGES_REQUESTED,COMMENT,CHECK_FAILED"');
    expect(next).toContain('data-variant="default"');
  });

  it('offers a run with nothing waiting too: the user says what they think is wrong', () => {
    const html = review(followUpAttempts.quiet, views.active, true);
    const plain = text(html);

    expect(html).toContain('data-next-round="own"');
    expect(plain).toContain(
      'GitRanks sees nothing waiting on #1419. If you think something is wrong, start a run anyway',
    );
    expect(plain).toContain('What’s wrong? (optional)');
    expect(html).toContain('data-variant="default"');
    expect(plain).toContain('Run 1 · autopilot');
    expect(plain).toContain('Run 2 · you');
    expect(plain).toContain('Run 3 · follow-up Not started');
    expect(plain).toContain('2 runs · $0.43');
    expect(html).not.toContain('data-session="handed-off"');
    expect(plain).not.toMatch(/rounds? (used|left)|handed to you/i);
  });

  it('with only the user’s own moves waiting (a bot blocking the merge), leads with them, a run one link away', () => {
    const blocked = {
      ...followUpAttempts.quiet,
      needsYou: {
        since: NOW.toISOString(),
        signals: [{ kind: 'BOT_BLOCKED' as const, at: NOW.toISOString(), detail: 'clawsweeper: Blocked before merge' }],
      },
    };
    const html = review(blocked, views.active, true);
    const plain = text(html);

    expect(html).toContain('data-next-card="found"');
    expect(plain).toContain('Your move: do what clawsweeper asks Only you can do this');
    expect(plain).toContain('“Blocked before merge”');
    expect(html).toContain('href="https://github.com/driftwood-js/driftwood/pull/1419"');
    expect(html).toContain('data-kinds="BOT_BLOCKED"');
    expect(plain).toContain("I've done it");
    expect(plain).toContain('Think the code needs a change after all? Start run 3 with a note →');
    expect(html).toContain('href="#next-run"');
    expect(html).toContain('data-next-round="own"');
    expect(plain).toContain('Think the code needs a change too? Start a run with a note');
    // The sessions list: the next is the user's move, not a run's.
    expect(plain).toContain('Run 3 · follow-up Your move');
  });

  it('tells autopilot’s share while it is on, and that a run of the user’s turns it off here', () => {
    const contributor = views.active.contributor!;
    const on: ContributeView = {
      ...views.active,
      contributor: {
        ...contributor,
        settings: { ...contributor.settings!, autopilot: true },
        autopilot: { ...contributor.autopilot, unlocked: true },
      },
    };
    expect(text(review(followUpAttempts.prNeedsYou, on, true))).toContain(
      'Autopilot has started 0 of its 2 runs here. A run you start yourself turns autopilot off on this pull request.',
    );
    expect(text(review(followUpAttempts.quiet, on, true))).toContain(
      'Autopilot stays off on this pull request: you started run 2 yourself.',
    );
    expect(review(followUpAttempts.prNeedsYou, views.active, true)).not.toContain('data-autopilot-runs');
    expect(review({ ...followUpAttempts.prNeedsYou, runner: 'MCP' }, on, true)).not.toContain('data-autopilot-runs');
  });

  it('says why no run can start on waiting comments of a pull request opened by hand', () => {
    const hand = {
      ...followUpAttempts.quiet,
      openedBy: 'HAND' as const,
      reviewFeedback: { readAt: null, threads: [feedbackThread()] },
    };
    const html = review(hand, views.active, true);
    expect(html).toContain('data-panel="review-feedback"');
    expect(text(html)).toContain(
      'You opened this pull request yourself, so no run can add to it: answer these on GitHub.',
    );
    expect(text(html)).not.toContain('under way');
    expect(html).not.toContain('data-start-follow-up');
  });

  it('describes the note box to screen readers: its hint and a live counter', () => {
    const html = review(followUpAttempts.prNeedsYou, views.active, true);
    expect(html).toContain('aria-describedby="follow-up-note-PR_1-hint follow-up-note-PR_1-count"');
    expect(html).toContain('id="follow-up-note-PR_1-count" aria-live="polite"');
  });

  it('shows the user’s note on the run it went with', () => {
    const noted = {
      ...followUpAttempts.review,
      followUpOf: { ...followUpAttempts.review.followUpOf!, trigger: 'own' as const, reason: 'Fix the docs example.' },
    };
    const html = review(noted);
    expect(html).toContain('data-run-note=""');
    expect(text(html)).toContain('Your note Fix the docs example.');
    expect(review(followUpAttempts.review)).not.toContain('data-run-note');
  });

  it('lists the follow-up running on it', () => {
    const html = review(followUpAttempts.underWay);

    expect(html).toContain('data-session="A_F1"');
    expect(html).toContain('href="/contribute/attempts/A_1/runs/A_F1"');
    expect(html).not.toContain('data-session="next"');
  });

  it('offers no next round on a merged or closed pull request', () => {
    const merged = {
      ...followUpAttempts.prNeedsYou,
      state: 'MERGED' as const,
      needsYou: null,
      pullRequest: { ...followUpAttempts.prNeedsYou.pullRequest!, state: 'MERGED' as const },
    };
    for (const item of [
      merged,
      { ...merged, followUps: undefined },
      { ...merged, followUps: followUps({ used: 1 }) },
    ]) {
      const html = review(item, views.active, true);
      expect(html).not.toContain('data-session="next"');
      expect(html).not.toContain('data-start-follow-up');
      expect(html).not.toContain('data-needs-you');
    }
  });

  it('renders the page without the follow-up fields', () => {
    const html = review({
      ...followUpAttempts.prNeedsYou,
      needsYou: undefined,
      followUps: undefined,
      replyDrafts: undefined,
    });

    expect(html).toMatch(/<li data-session="A_1"/);
    expect(html).not.toContain('data-session="next"');
    expect(text(html)).not.toContain('Reply drafts are not available yet.');
  });
});

describe('a follow-up on the review screen', () => {
  it('shows it as a follow-up of the pull request, with its new commits, checks and cost', () => {
    const html = review(followUpAttempts.review);
    const plain = text(html);

    expect(html).toContain('data-follow-up-of="1419"');
    expect(plain).toContain('A follow-up of pull request #1419');
    expect(html).toContain('href="https://github.com/driftwood-js/driftwood/pull/1419"');
    expect(html).toContain('href="/contribute/attempts/A_1"');
    expect(plain).toContain('The new commits');
    expect(html).toContain('data-file="src/router/normalize-path.ts"');
    expect(html).toContain('data-check="SECRETS"');
    expect(plain).toContain('$1.12 of your $5 limit');
  });

  it('pushes its commits with no title or description to edit', () => {
    const html = review(followUpAttempts.review);

    expect(html).toContain('data-follow-up-approval="A_F1"');
    expect(text(html)).toContain('Push to pull request #1419');
    expect(text(html)).toContain('Push the commits');
    expect(html).not.toContain('data-pr-form');
    expect(html).not.toContain('name="title"');
    expect(html).not.toContain('name="body"');
    expect(html).not.toContain('data-panel="approval"');
  });

  it('finishes one with replies only', () => {
    const plain = text(review(followUpAttempts.repliesOnly));

    expect(plain).toContain('Finish this follow-up');
    expect(plain).toContain('The agent made no commits this run');
    expect(plain).toContain('Approve the replies you want posted, here or once it is finished');
    expect(plain).not.toContain('Finish it, then approve');
  });

  it('shows the push under way, without the steps of a new pull request', () => {
    const html = review(followUpAttempts.submitting);

    expect(html).toContain('data-attempt-status="SUBMITTING"');
    expect(text(html)).toContain('Pushing the fixes');
    expect(html).not.toContain('aria-label="Submission steps"');
    expect(html).not.toContain('data-follow-up-approval');
  });

  it('renders DONE as pushed to the pull request', () => {
    const html = review(followUpAttempts.done);

    expect(html).toContain('data-state="DONE"');
    expect(html).toContain('data-attempt-status="DONE"');
    expect(text(html)).toContain('Pushed to the pull request');
    expect(text(html)).toContain('The new commits are on pull request #1419');
  });

  it('says nothing was pushed when it stopped or was discarded', () => {
    expect(text(review(followUpAttempts.stopped))).toContain('Nothing was pushed to pull request #1419');
    expect(text(review(followUpAttempts.discarded))).toContain('You discarded it.');
    expect(text(review(followUpAttempts.discarded))).not.toContain('went back to the pool');
    // A stop the next run would hit too says what to do first, and where.
    const html = review(followUpAttempts.stopped);
    expect(html).toContain('data-end-move="BUDGET"');
    expect(text(html)).toContain(
      'What to do: To give the next run more room, raise "Each run" under More limits in Budget and pacing.',
    );
    expect(html).toContain('href="/contribute/settings/budget#more-limits"');
    expect(review(followUpAttempts.discarded)).not.toContain('data-end-move');
  });

  it('says the pull request it follows up is not available yet without the field', () => {
    expect(text(review({ ...followUpAttempts.review, followUpOf: undefined }))).toContain(
      'The pull request it follows up is not available yet.',
    );
  });
});

describe('the reply drafts', () => {
  const item = (draft: ContributeReplyDraft, followUp?: Parameters<typeof ReplyDraftItem>[0]['followUp']) =>
    renderToStaticMarkup(
      <ul>
        <ReplyDraftItem draft={draft} prNumber={1419} followUp={followUp} now={NOW} />
      </ul>,
    );

  it('shows a draft with its review thread, the comment it answers, the text and Approve', () => {
    const html = item(replyDraft());
    const plain = text(html);

    expect(html).toContain('data-reply-state="DRAFT"');
    expect(html).toContain('data-reply-target="RC_1"');
    expect(plain).toContain('Reply in a review thread · src/router/normalize-path.ts:3');
    expect(plain).toContain('maintainer-mo wrote: Should the root path "/" keep its slash?');
    expect(plain).toContain('Good catch: the root path keeps its slash now');
    expect(html).toContain('data-approve-reply="D_1"');
    expect(html).toContain('data-blocked="false"');
    expect(plain).toContain('Approve and post');
  });

  it('shows a top-level comment as one', () => {
    expect(text(item(replyDraft({ comment: null })))).toContain('Comment on the pull request');
  });

  it('offers Dismiss on a waiting reply, and says why a dismissed one was not posted', () => {
    expect(item(replyDraft())).toContain('data-dismiss-reply="D_1"');
    expect(item(replyDraft({ state: 'POSTING' }))).not.toContain('data-dismiss-reply');

    const dismissed = item(replyDraft({ state: 'DISMISSED', dismissedReason: 'POSTED_BY_HAND' }));
    expect(dismissed).toContain('data-reply-dismissed="POSTED_BY_HAND"');
    expect(text(dismissed)).toContain('Dismissed: you posted it on GitHub yourself');
    expect(dismissed).not.toContain('data-approve-reply');
    expect(dismissed).not.toContain('data-dismiss-reply');
    expect(text(item(replyDraft({ state: 'DISMISSED', dismissedReason: 'THREAD_RESOLVED' })))).toContain(
      'the thread was resolved on GitHub',
    );
  });

  it('offers a thread reply GitHub refused in its thread as a comment on the pull request instead', () => {
    const lastError = { reason: 'org_restricted', note: 'GitHub did not let us post it.', at: NOW.toISOString() };
    const html = item(replyDraft({ state: 'FAILED', lastError, canPostAsComment: true }));
    const plain = text(html);
    // Both: the thread again once the organization approves the app, or a comment now.
    expect(plain).toContain('Approve again');
    expect(plain).toContain('Post as a comment instead');
    expect(plain).toContain(
      'You can approve it again once the organization approves the app, post it as a comment on the pull request instead, or dismiss it.',
    );
    expect(html).toContain('data-dismiss-reply="D_1"');
    expect(html).toContain('aria-label="Dismiss the reply to maintainer-mo"');

    const posted = item(replyDraft({ state: 'POSTED', asComment: true, url: 'https://github.com/o/r/pull/1419#c1' }));
    expect(text(posted)).toContain('Posted as a comment on pull request #1419');
  });

  it('shows posting, posted with its link, and failed with the note and Approve again', () => {
    const posting = item(replyDraft({ state: 'POSTING' }));
    expect(text(posting)).toContain('Posting it on GitHub.');
    expect(posting).not.toContain('data-approve-reply');

    const posted = item(
      replyDraft({
        state: 'POSTED',
        posted: true,
        postedAt: '2026-10-28T11:00:00.000Z',
        url: 'https://github.com/driftwood-js/driftwood/pull/1419#discussion_r1',
      }),
    );
    expect(text(posted)).toContain(
      'Posted as a reply in the review thread on src/router/normalize-path.ts:3, on pull request #1419, 1 hour ago.',
    );
    expect(posted).toContain('href="https://github.com/driftwood-js/driftwood/pull/1419#discussion_r1"');
    expect(posted).not.toContain('data-approve-reply');

    const failed = item(
      replyDraft({
        state: 'FAILED',
        lastError: { reason: 'no_answer', note: 'GitHub did not answer. Approve again later.', at: NOW.toISOString() },
      }),
    );
    expect(failed).toContain('data-reply-error="no_answer"');
    expect(text(failed)).toContain(
      'GitHub did not answer. Approve again later. You can approve it again, or dismiss it.',
    );
    expect(text(failed)).toContain('Approve again');
  });

  it('puts the reply in a box with a copy icon, copying what it shows, and links where it goes', () => {
    const html = item(
      replyDraft({ commentUrl: 'https://github.com/driftwood-js/driftwood/pull/1419#discussion_r901' }),
    );
    expect(html).toContain('data-reply-text');
    expect(html).toContain('aria-label="Copy the reply to maintainer-mo on src/router/normalize-path.ts:3"');
    expect(html).toContain('href="https://github.com/driftwood-js/driftwood/pull/1419#discussion_r901"');
    expect(text(html)).toContain('Open the thread on GitHub ↗');

    // What was last sent to GitHub, mark and prefix included, is what shows and copies.
    const sent = item(replyDraft({ state: 'FAILED', body: '🤖 Fixed in 46de700: Good catch.' }));
    expect(text(sent)).toContain('🤖 Fixed in 46de700: Good catch.');
    expect(sent).not.toContain('data-reply-link');

    const posted = item(
      replyDraft({
        comment: null,
        state: 'POSTED',
        posted: true,
        commentUrl: 'https://github.com/driftwood-js/driftwood/pull/1419',
      }),
    );
    expect(posted).toContain('aria-label="Copy the comment on pull request #1419"');
    expect(posted).not.toContain('data-reply-link');
  });

  it('copies a draft not sent yet as an approval would post it: the mark and the prefix with its commit', () => {
    const html = item(flowDraft({ prefix: 'Fixed in 46de700: ', body: '🤖 Fixed in 46de700: Made it a const.' }));
    expect(text(html)).toContain('🤖 Fixed in 46de700: Made it a const.');
    expect(html).toContain('aria-label="Copy the reply to coderabbitai on src/router/normalize-path.ts:3"');
    expect(text(html)).not.toContain('once its commits are on the pull request');
  });

  it('shows a reply whose commit is not on the pull request yet, but offers no copy until it is', () => {
    const html = item(flowDraft({ body: null }));
    expect(text(html)).toContain('Fixed in the new commit: Made it a const.');
    expect(html).not.toContain('aria-label="Copy the');
    expect(text(html)).toContain('You can copy it once its commits are on the pull request.');
  });

  it("refused by the repository's organization: says so, keeps Approve again, and links where to ask it", () => {
    const failed = (id?: string) => {
      vi.stubEnv('AUTH_GITHUB_CONTRIBUTE_ID', id ?? '');
      try {
        return item(
          replyDraft({
            state: 'FAILED',
            commentUrl: 'https://github.com/driftwood-js/driftwood/pull/1419#discussion_r901',
            lastError: {
              reason: 'org_restricted',
              note: 'The organization has not approved the app.',
              at: NOW.toISOString(),
            },
          }),
        );
      } finally {
        vi.unstubAllEnvs();
      }
    };

    const app = failed('Ov23liAbc');
    expect(app).toContain('data-reply-error="org_restricted"');
    expect(text(app)).toContain(
      'The organization has not approved the app. You can approve it again once the organization approves the app, or dismiss it.',
    );
    expect(text(app)).not.toContain('locked or closed');
    expect(app).toContain('data-org-access="app"');
    expect(app).toContain('href="https://github.com/settings/connections/applications/Ov23liAbc"');
    expect(text(app)).toContain('Request access for the organization ↗');
    expect(text(app)).toContain('Open the thread on GitHub ↗');
    expect(app).toContain('data-approve-reply="D_1"');

    const apps = failed();
    expect(apps).toContain('data-org-access="apps"');
    expect(apps).toContain('href="https://github.com/settings/applications"');
    expect(text(apps)).toContain('press Request next to the organization');

    expect(
      item(replyDraft({ state: 'FAILED', lastError: { reason: 'forbidden', note: 'No.', at: NOW.toISOString() } })),
    ).not.toContain('data-org-access');
  });

  it("on the follow-up's card, shows the refused reply to copy, its thread, and where to ask the organization", () => {
    const html = review(followUpAttempts.orgRestricted);
    const plain = text(html);

    expect(plain).toContain('🤖 Fixed in 46de700: Made it a const.');
    expect(html).toContain('aria-label="Copy the reply to coderabbitai on src/router/normalize-path.ts:3"');
    expect(html).toContain('href="https://github.com/driftwood-js/driftwood/pull/1419#discussion_r901"');
    expect(html).toContain('data-org-access');
    expect(plain).toContain("The repository's organization only lets apps it approved post there.");
  });

  it('back in the review, a reply the organization refused can be copied and its thread opened from the field', () => {
    const refused = (patch: Partial<ContributeReplyDraft>) =>
      review({
        ...followUpAttempts.review,
        replyDrafts: [
          flowDraft({
            state: 'FAILED',
            commentUrl: 'https://github.com/driftwood-js/driftwood/pull/1419#discussion_r901',
            lastError: {
              reason: 'org_restricted',
              note: 'The organization has not approved the app.',
              at: NOW.toISOString(),
            },
            ...patch,
          }),
        ],
      });

    const html = refused({ prefix: 'Fixed in 46de700: ', body: '🤖 Fixed in 46de700: Made it a const.' });
    expect(html).toContain('<textarea');
    expect(html).toContain('data-reply-copy');
    expect(html).toContain('aria-label="Copy the reply to coderabbitai on src/router/normalize-path.ts:3"');
    expect(html).toContain('href="https://github.com/driftwood-js/driftwood/pull/1419#discussion_r901"');
    expect(html).toContain('data-org-access');

    // Its commit not on the pull request yet: no copy, and why.
    const waiting = refused({ body: null });
    expect(waiting).toContain('data-reply-copy');
    expect(waiting).not.toContain('aria-label="Copy the reply');
    expect(text(waiting)).toContain('You can copy it once its commits are on the pull request.');
  });

  it("refused submission by the repository's organization: the note, where to ask it, and no grant bounce", () => {
    const refused: ContributeAttemptDetail = {
      ...followUpAttempts.review,
      submit: {
        step: 'PUSH',
        waitUntil: null,
        fork: 'octocat/driftwood',
        branch: 'gitranks/871',
        lastError: {
          reason: 'org_restricted',
          note: 'The organization has not approved the app.',
          at: NOW.toISOString(),
        },
      },
    };
    const html = review(refused);
    expect(html).toContain('data-submit-error="org_restricted"');
    expect(html).toContain('data-org-access');
    expect(text(html)).not.toContain('Allow on GitHub');
    const connected = { ...views.active, grantAvailable: true, grant: { connected: true, login: 'octocat' } };
    expect(grantNeededOf(connected, refused)).toBe(false);
  });

  it('keeps a posted link that does not point at GitHub as no link', () => {
    const html = item(replyDraft({ state: 'POSTED', posted: true, url: 'javascript:alert(1)' }));
    expect(html).not.toContain('javascript:');
  });

  it('asks before posting: the button opens the confirm, and only the confirm posts', () => {
    const html = item(replyDraft());

    // The confirm is closed: nothing in the page posts the reply.
    expect(text(html)).not.toContain('Post it');
    expect(text(html)).not.toContain('Post this reply on GitHub?');

    const source = readFileSync(new URL('./approve-reply-button.tsx', import.meta.url), 'utf8');
    expect(source.match(/approveReply\(/g)).toHaveLength(1);
    const approve = source.slice(source.indexOf('const approve = '), source.indexOf('return ('));
    expect(approve).toContain('approveReply(draftId, asComment)');
    expect(source.match(/onClick=\{approve\}/g)).toHaveLength(1);
    const dialog = source.slice(source.indexOf('<DialogFooter>'), source.indexOf('</DialogFooter>'));
    expect(dialog).toContain('onClick={approve}');
    expect(source).toContain('onClick={() => setOpen(true)}');
  });

  it("disables Approve while the follow-up's commits are not pushed, and once they never can be", () => {
    const pending = item(replyDraft(), { attemptId: 'A_F1', state: 'REVIEW', patch: 'diff' });
    expect(pending).toContain('data-blocked="true"');
    expect(text(pending)).toContain('which are not on the pull request yet. Push them first');
    expect(pending).toMatch(/<button[^>]*disabled=""[^>]*>Approve and post/);

    const never = item(replyDraft(), { attemptId: 'A_F1', state: 'STOPPED', patch: 'diff' });
    expect(text(never)).toContain('which were never pushed to the pull request, so it cannot be posted.');

    expect(item(replyDraft(), { attemptId: 'A_F1', state: 'DONE', patch: 'diff' })).toContain('data-blocked="false"');
    expect(item(replyDraft(), { attemptId: 'A_F1', state: 'REVIEW', patch: null })).toContain('data-blocked="false"');
  });

  it("on the follow-up's own page, blocks its replies until the commits are pushed", () => {
    expect(review(followUpAttempts.review)).toContain('data-blocked="true"');
    expect(review(followUpAttempts.repliesOnly)).not.toContain('data-blocked="true"');
    expect(review(followUpAttempts.done)).toContain('data-approve-reply="D_2"');
  });

  it('escapes the drafted text and the comment it answers: both are untrusted', () => {
    const html = item(
      replyDraft({
        text: '<img src=x onerror=alert(1)>',
        comment: { commentId: 'RC_2', author: '<b>x</b>', path: null, line: null, excerpt: '<script>1</script>' },
      }),
    );
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>x</b>');
  });
});

describe('refusals, in plain words', () => {
  it.each([
    ['The pull request is not open', 'The pull request is no longer open'],
    ['A follow-up is already under way on this pull request', 'A follow-up is already running'],
    ['New sessions are paused on our side for now', 'New agent sessions are paused on our side'],
    ['Contributing is paused', 'Contributing is paused. Click Resume contributing'],
    ['Your Claude key cannot start a session now', 'Your Claude key cannot start a session now: none is connected'],
    ['Your limits leave no room for another attempt now', 'Your spend limits leave no room'],
    ['The pull request has no branch of ours to add commits to', 'You opened this pull request yourself'],
    // The API's words since octoscope#1417: each still maps to its own, never an earlier pattern.
    ['The pull request is not open, so a run has nothing to add commits to', 'The pull request is no longer open'],
    [
      'You opened it by hand, so it has no branch of ours a run can add to: change it on GitHub',
      'You opened this pull request yourself',
    ],
    [
      'Contributing is paused: click Resume contributing on Overview or in Contribute settings (connect a working Claude key first if it asks), then start the run',
      'Contributing is paused. Click Resume contributing',
    ],
    [
      'Your Claude key cannot start a session now (none connected, Anthropic refused it, or its credits ran out): connect a working key in Contribute settings, Keys and access, then start the run',
      'Your Claude key cannot start a session now',
    ],
    [
      'Your spend limits leave no room for another run now: raise them, or lower Each run, in Contribute settings, Budget and pacing, or wait until they reset',
      'Your spend limits leave no room',
    ],
    [
      "The repository's maintainers opted out of GitRanks Contribute (or do not accept AI-assisted changes): nothing more is sent there",
      "The repo's maintainers keep it out of GitRanks Contribute",
    ],
  ])('a follow-up refused as "%s"', (message, words) => {
    expect(followUpErrorMessage('INVALID', message)).toContain(words);
  });

  it('a follow-up refused with words this UI does not know keeps them, and a lost one says so', () => {
    expect(followUpErrorMessage('INVALID', 'Something new')).toBe('Something new');
    expect(followUpErrorMessage('NOT_FOUND')).toContain('no longer yours');
    expect(followUpErrorMessage('NOT_AVAILABLE_YET')).toBe('This is not available yet. It is coming soon.');
  });

  it.each([
    [
      "This reply describes the follow-up's commits, which are not on the pull request yet: approve them first, then the reply",
      'not on the pull request yet. Push the commits first',
    ],
    ["This reply describes the follow-up's commits, which were never pushed to the pull request", 'never pushed'],
    ['The pull request is no longer open', 'no longer open'],
  ])('a reply refused as "%s" cannot be approved again', (message, words) => {
    const refusal = replyRefusalOf('INVALID', message);
    expect(refusal.final).toBe(true);
    expect(refusal.text).toContain(words);
  });

  it('a reply refused for a reason approving again can mend keeps Approve', () => {
    expect(replyRefusalOf('INVALID', 'Your GitHub login could not be read. Sign in again, then approve again')).toEqual(
      {
        text: 'Your GitHub login could not be read. Sign in again, then approve again',
        final: false,
      },
    );
    expect(replyRefusalOf('FAILED').final).toBe(false);
  });

  it('a Stop that came too late, and an autopilot setting refused while it is coming', () => {
    expect(vetoErrorMessage('INVALID', 'the attempt submitted meanwhile')).toContain(
      'Autopilot submitted it just before',
    );
    expect(vetoErrorMessage('INVALID', 'the attempt is review, not waiting to submit')).toContain(
      'no longer waiting for autopilot',
    );
    expect(
      autopilotErrorMessage(
        'INVALID',
        'Autopilot is coming: it opens once GitRanks can tell you before it submits anything for you',
      ),
    ).toContain('Autopilot is coming soon: it cannot be turned on yet.');
    expect(autopilotErrorMessage('INVALID', 'autopilot unlocks after 3 pull requests merged through GitRanks')).toBe(
      'Autopilot is locked: it unlocks after 3 pull requests merged through GitRanks.',
    );
    expect(autopilotErrorMessage('INVALID', 'Something else was locked')).toBe('Something else was locked');
  });
});

describe('autopilot', () => {
  /** Its row on the Settings summary, and the record its Details dialog opens. */
  const settings = (view: ContributeView) =>
    renderToStaticMarkup(
      <>
        <SettingsScreen view={view} now={NOW} />
        {view.contributor ? <AutopilotRecord autopilot={view.contributor.autopilot} /> : null}
      </>,
    );

  it('says it is coming soon while it is not open, with the record and the toggle off', () => {
    const html = settings(views.autopilotComing);
    const plain = text(html);

    expect(html).toContain('data-autopilot-available="false"');
    expect(plain).toContain('Coming soon');
    expect(plain).toContain('Autopilot is coming soon.');
    expect(plain).toContain('Merged through GitRanks 2');
    expect(plain).toContain('Still needed to unlock 1');
    expect(plain).toContain('Closed without merging in a row 1 of 2');
    expect(plain).toContain('2 of 3 merged PRs');
    expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*disabled=""/);
  });

  it('lets a setting left on be turned off while autopilot is not open', () => {
    const view = {
      ...views.autopilotComing,
      contributor: {
        ...views.autopilotComing.contributor,
        autopilot: { ...views.autopilotComing.contributor.autopilot, unlocked: true, mergedToUnlock: 0 },
        settings: { ...baseSettings, autopilot: true },
      },
    };
    const html = settings(view);
    const checkbox = html.match(/<input[^>]*type="checkbox"[^>]*>/)?.[0] ?? '';

    expect(html).toContain('data-autopilot-available="false"');
    expect(checkbox).toContain('checked=""');
    expect(checkbox).not.toContain('disabled=""');
    expect(text(html)).toContain('Coming soon');
  });

  it('says it is not available yet while the API does not answer whether it is open', () => {
    const html = settings(views.active);

    expect(html).toContain('data-autopilot-available="unknown"');
    expect(text(html)).toContain('Autopilot is not available yet.');
    expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*disabled=""/);
  });

  it('lets the user turn it on or off once it is open and unlocked', () => {
    const html = settings(views.autopilotUnlocked);

    expect(html).toContain('data-autopilot="unlocked"');
    expect(html).toContain('data-autopilot-available="true"');
    expect(html).not.toContain('data-autopilot-coming');
    expect(text(html)).toContain('Still needed to unlock none, unlocked');
    expect(html).not.toMatch(/<input[^>]*type="checkbox"[^>]*disabled=""/);
  });

  it('says when it locked again, and counts the merges since', () => {
    const plain = text(settings(views.autopilotRelocked));

    expect(plain).toContain('Locked on Oct 20 · 1 of 3 merged since');
    expect(plain).toContain('Locked on Oct 20: two pull requests in a row were closed without merging.');
    expect(plain).toContain('1 of 3 merged PRs');
  });

  it('says where the emails before each submission go, and refuses to turn it on with no email', () => {
    const withNotice = (noticeTo: string | null) => ({
      ...views.autopilotUnlocked,
      contributor: {
        ...views.autopilotUnlocked.contributor,
        autopilot: { ...views.autopilotUnlocked.contributor.autopilot, noticeTo },
        settings: { ...baseSettings, autopilot: false },
      },
    });
    const mailed = settings(withNotice('m•••@gmail.com'));
    expect(text(mailed)).toContain('Emails before each submission go to m•••@gmail.com');
    expect(text(mailed)).toContain('Before autopilot submits, we email you at m•••@gmail.com.');
    expect(mailed).not.toMatch(/<input[^>]*type="checkbox"[^>]*disabled=""/);

    const unmailed = settings(withNotice(null));
    expect(unmailed).toContain('data-autopilot-no-email');
    expect(text(unmailed)).toContain('Sign in again and share your GitHub email to turn it on.');
    expect(unmailed).toMatch(/<input[^>]*type="checkbox"[^>]*disabled=""/);

    // A setting left on with no address: its changes wait for the review, and it can still be turned off.
    const leftOn = withNotice(null);
    const html = settings({
      ...leftOn,
      contributor: { ...leftOn.contributor, settings: { ...baseSettings, autopilot: true } },
    });
    const checkbox = html.match(/<input[^>]*type="checkbox"[^>]*>/)?.[0] ?? '';
    expect(checkbox).toContain('checked=""');
    expect(checkbox).not.toContain('disabled=""');
    expect(text(html)).toContain('so its changes wait for your review');

    // Locked: signing in again would not turn it on, so the row does not say so.
    const locked = withNotice(null);
    const lockedHtml = settings({
      ...locked,
      contributor: {
        ...locked.contributor,
        autopilot: { ...locked.contributor.autopilot, unlocked: false, mergedToUnlock: 1 },
      },
    });
    expect(lockedHtml).not.toContain('data-autopilot-no-email');
  });

  it('words the refusal to turn it on with no email', () => {
    expect(
      autopilotErrorMessage(
        'INVALID',
        'Autopilot emails you before each submission. Sign in again and share your GitHub email to turn it on',
      ),
    ).toContain('we have no email for you');
  });

  it('says it is emailing first while the hour has not started', () => {
    const plain = text(review({ ...followUpAttempts.pendingAutosubmit, autosubmitAt: null }));
    expect(plain).toContain('Emailing you first. The hour starts once the email is sent.');
  });

  it('says why autopilot left a change for the review, and nothing for an ordinary one or the user’s Stop', () => {
    const reviewing = (reviewReason: ContributeAttemptDetail['reviewReason']) =>
      review({
        ...followUpAttempts.pendingAutosubmit,
        state: 'REVIEW',
        autosubmitAt: null,
        autopilot: false,
        reviewReason,
      });
    expect(reviewing('notice_late')).toContain('data-autopilot-review-reason="notice_late"');
    expect(text(reviewing('notice_late'))).toContain('we could not email you first');
    expect(text(reviewing('no_email'))).toContain('we have no email to tell you first');
    expect(text(reviewing('autopilot_off'))).toContain('turned off or locked before it did');
    expect(reviewing('override')).toContain('data-autopilot-review-reason="override"');
    expect(text(reviewing('override'))).toContain('You chose to work on this one, so you approve its pull request.');
    expect(reviewing('vetoed')).not.toContain('data-autopilot-review-reason');
    expect(reviewing(null)).not.toContain('data-autopilot-review-reason');
  });

  it('counts down to the submission on an attempt waiting for it, with Stop', () => {
    const html = review(followUpAttempts.pendingAutosubmit);

    expect(html).toContain('data-attempt-status="PENDING_AUTOSUBMIT"');
    expect(html).toContain('data-autosubmit-at="2026-10-28T12:42:00.000Z"');
    expect(text(html)).toContain('It submits in 42 minutes, at Oct 28, 12:42 UTC');
    expect(html).toContain('data-stop-autopilot="A_1"');
    expect(text(html)).toContain('Stop');
  });
});

describe('values the UI does not know yet', () => {
  it('renders a new signal kind and a new reply state without failing', () => {
    const html = mine({
      needsYou: {
        since: NOW.toISOString(),
        signals: [{ kind: 'NEW_KIND' as never, at: NOW.toISOString(), detail: null }],
      },
      followUps: followUps(),
    });
    expect(html).toContain('data-row="other"');
    expect(text(html)).toContain(
      'Your move: Something changed on it. Start run 1 to look at it, or see what on GitHub.',
    );

    const draft = renderToStaticMarkup(
      <ul>
        <ReplyDraftItem draft={replyDraft({ state: 'ARCHIVED' as never })} prNumber={null} now={NOW} />
      </ul>,
    );
    expect(draft).toContain('data-reply-state="ARCHIVED"');
    expect(text(draft)).toContain('Archived');
    expect(draft).not.toContain('data-approve-reply');
  });
});

describe('the follow-up flow: review feedback, the run, the result and the rounds', () => {
  // The pull request's page on the round not started yet, where the waiting comments are chosen.
  const prOpen = (patch: Partial<ContributeAttemptDetail> = {}) =>
    review(
      {
        ...followUpAttempts.prNeedsYou,
        reviewFeedback: {
          readAt: '2026-10-28T11:50:00.000Z',
          threads: [
            feedbackThread(),
            feedbackThread({ commentId: 'C_2', threadId: 'T_2', excerpt: 'Translate the <b>title</b>.' }),
            feedbackThread({
              commentId: 'C_3',
              threadId: 'T_3',
              bot: false,
              author: 'maintainer-mo',
              excerpt: 'Name it collapse?',
            }),
            feedbackThread({ commentId: 'C_4', threadId: 'T_4', ignored: true, excerpt: 'Add a baseline.' }),
          ],
        },
        ...patch,
      },
      views.active,
      true,
    );

  it('lists the waiting comments, bots and people apart, each to Address or Ignore, with one button', () => {
    const html = prOpen();
    const plain = text(html);
    expect(html).toContain('data-panel="review-feedback"');
    expect(plain).toContain('3 comments wait for an answer on pull request #1419');
    expect(plain).toContain('Bots · 2');
    expect(plain).toContain('People · 1');
    // Ignored in an earlier round: listed apart, not counted.
    expect(html).not.toContain('data-feedback-thread="C_4"');
    expect(plain).toContain('Show 1 ignored');
    expect(plain).toContain('Address 3 comments');
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(3);
    // The card starts the round, so the plain button is not offered beside it.
    expect(html).not.toContain('data-start-follow-up');
    // Strangers' words are text, never markup.
    expect(html).not.toContain('<b>title</b>');
    expect(html).toContain('href="https://github.com/driftwood-js/driftwood/pull/1419#discussion_r901"');
  });

  it('says why no round can start while one runs, and keeps the plain button without waiting comments', () => {
    const busy = text(prOpen({ followUps: followUps({ used: 1, manualRuns: 1, currentAttemptId: 'A_F1' }) }));
    expect(busy).toContain('A follow-up is under way on these comments.');
    expect(busy).not.toContain('Address 3 comments');
    const none = prOpen({ reviewFeedback: { readAt: null, threads: [] } });
    expect(none).not.toContain('data-panel="review-feedback"');
    expect(none).toContain('data-start-follow-up');
  });

  it('shows the run as four steps: reading, fixing once the work is sent, then our checks', () => {
    const run = (patch: Partial<ContributeAttemptDetail>) =>
      review(followUpAttempts.review && { ...followUpAttempts.review, ...patch });
    const reading = run({
      state: 'RUNNING',
      events: [{ state: 'RUNNING', detail: 'follow_up: no claim', at: '2026-10-28T11:00:00.000Z' }],
    });
    expect(reading).toContain('data-follow-up-step="reading"');
    expect(reading).toMatch(/data-step="reading" data-step-state="current"/);
    expect(text(reading)).toMatch(/Reading comments : now .*Fixing : next .*Checks : next .*Ready for you : next/);
    const fixing = run({
      state: 'RUNNING',
      events: [
        { state: 'RUNNING', detail: 'go: budget raised to $5.00, the work sent', at: '2026-10-28T11:01:00.000Z' },
      ],
    });
    expect(fixing).toMatch(/data-step="fixing" data-step-state="current"/);
    expect(fixing).toMatch(/data-step="reading" data-step-state="done"/);
    expect(run({ state: 'CHECKS' })).toMatch(/data-step="checks" data-step-state="current"/);
    expect(text(run({ state: 'RUNNING' }))).toContain('Nothing goes to GitHub before you approve it');
  });

  const inReview = (patch: Partial<ContributeAttemptDetail> = {}) =>
    followUpAttempts.review && {
      ...followUpAttempts.review,
      checkStatus: {
        status: 'NOT_RUN' as const,
        note: 'The tests could not run in the sandbox (npm test), so nothing here proves the change works.',
      },
      replyDrafts: [
        flowDraft(),
        flowDraft({
          draftId: 'D_2',
          bot: false,
          comment: { ...flowDraft().comment!, author: 'maintainer-mo' },
          prefix: 'Fixed in <commit>: ',
        }),
        flowDraft({
          draftId: 'D_3',
          outcome: 'SKIPPED',
          prefix: 'Not changed: ',
          reason: 'Shared component',
          text: 'Out of scope here.',
        }),
        flowDraft({
          draftId: 'D_4',
          outcome: 'NEEDS_YOU',
          prefix: null,
          reason: 'Trim too, or only collapse?',
          text: '',
        }),
      ],
      ...patch,
    };

  it('shows each comment’s outcome, the checks in plain words, the diff and one approval', () => {
    const html = review(inReview());
    const plain = text(html);
    expect(html).toContain('data-panel="follow-up-result"');
    expect(html).toContain('data-check-status="NOT_RUN"');
    expect(plain).toContain('The tests could not run');
    expect(plain).toContain('Fixed');
    expect(plain).toContain('Not changed');
    expect(plain).toContain('Needs you');
    expect(plain).toContain('Question for you: Trim too, or only collapse?');
    expect(plain).toContain('Reply, posted in your name after “Fixed in the new commit:”');
    // The bot's thread is resolved after; the person's stays open for its reviewer.
    expect(plain).toContain('then resolve the thread');
    expect(plain).toContain('the thread stays open for its reviewer');
    expect(plain).toContain('Push fixes and reply');
    expect(plain).toContain('Discard run');
    expect(plain).toContain(
      'Approving pushes the new commits to pull request #1419, posts 3 replies, resolves 2 threads.',
    );
    // The owner, 2026-11-01: each comment may be discarded on its own, for good, until someone comments again.
    expect(plain.match(/Discard comment/g)?.length).toBe(4);
    expect(html).toContain('aria-label="Discard the comment of maintainer-mo on src/router/normalize-path.ts:3');
    // The diff sits in the card, before the approval; the old one-by-one approval is gone.
    expect(html.indexOf('data-file="src/router/normalize-path.ts"')).toBeGreaterThan(
      html.indexOf('data-panel="follow-up-result"'),
    );
    expect(html).not.toContain('data-follow-up-approval');
    expect(html).not.toContain('data-panel="replies"');
  });

  it('blocks the push on a failed rail, saying so, and keeps Discard', () => {
    const plain = text(
      review(
        inReview({ checkStatus: { status: 'BLOCKED', note: 'It cannot be pushed: it changes a GitHub workflow.' } }),
      ),
    );
    expect(plain).toContain('Our checks block this push');
    expect(plain).toContain('These commits cannot be pushed. Discard them, or answer the threads on GitHub yourself.');
    expect(plain).toContain('Discard');
  });

  it('after the push: the round line, and each reply posted, resolved or left open', () => {
    const html = review(
      inReview({
        state: 'DONE',
        round: {
          round: 1,
          attemptId: 'A_F1',
          by: 'user',
          trigger: 'recommended',
          reason: null,
          costUsd: 0.31,
          state: 'DONE',
          endReason: null,
          pushedSha: '46de700aa1',
          fixed: 5,
          skipped: 0,
          needsYou: 0,
          replied: 2,
          resolved: 1,
          at: '2026-10-28T12:00:00.000Z',
        },
        replyDrafts: [
          flowDraft({
            state: 'POSTED',
            posted: true,
            resolveState: 'RESOLVED',
            text: 'Fixed in 46de700: Made it a const.',
            url: 'https://github.com/driftwood-js/driftwood/pull/1419#discussion_r905',
          }),
          flowDraft({
            draftId: 'D_2',
            bot: false,
            state: 'POSTED',
            posted: true,
            text: 'Fixed in 46de700: Renamed it.',
          }),
          flowDraft({
            draftId: 'D_3',
            state: 'FAILED',
            lastError: {
              reason: 'forbidden',
              note: 'GitHub refused the reply: the conversation is locked.',
              at: '2026-10-28T12:00:00.000Z',
            },
          }),
        ],
      }),
    );
    const plain = text(html);
    expect(plain).toContain('Run 1 pushed 46de700 · 5 fixed · 2 replied · 1 resolved');
    expect(plain).toContain('Replied and resolved');
    expect(plain).toContain('Replied, left open for its reviewer');
    expect(plain).toContain('GitHub refused the reply: the conversation is locked.');
    expect(plain).not.toContain('Push fixes and reply');
    expect(html).toContain('href="https://github.com/driftwood-js/driftwood/pull/1419#discussion_r905"');
  });

  it('lines the rounds up on the pull request’s page', () => {
    const plain = text(
      prOpen({
        followUps: followUps({
          used: 2,
          autopilotRuns: 1,
          manualRuns: 1,
          history: [
            {
              round: 1,
              attemptId: 'A_F1',
              by: 'autopilot',
              trigger: 'autopilot',
              reason: null,
              costUsd: 0.31,
              state: 'DONE',
              endReason: null,
              pushedSha: '46de700aa1',
              fixed: 5,
              skipped: 0,
              needsYou: 0,
              replied: 2,
              resolved: 0,
              at: '2026-10-28T12:00:00.000Z',
            },
            {
              round: 2,
              attemptId: 'A_F2',
              by: 'user',
              trigger: 'own',
              reason: 'The docs example is wrong.',
              costUsd: 0.12,
              state: 'STOPPED',
              endReason: 'NO_GO',
              pushedSha: null,
              fixed: 0,
              skipped: 0,
              needsYou: 0,
              replied: 0,
              resolved: 0,
              at: '2026-10-28T13:00:00.000Z',
            },
          ],
        }),
      }),
    );
    expect(plain).toContain('Run 1 · autopilot Pushed 46de700');
    expect(plain).toContain('5 fixed · 2 replied');
    expect(plain).toContain('Run 2 · you Stopped');
    expect(plain).toContain('2 runs · $0.43');
    expect(plain).not.toMatch(/rounds? (used|left)/);
  });

  it('never stops silently: each end says what happened and what the user can do', () => {
    const noGo = text(
      review({ ...followUpAttempts.stopped, endReason: 'NO_GO', endDetail: 'The comments ask for a redesign.' }),
    );
    expect(noGo).toContain('Stopped, nothing pushed');
    expect(noGo).toContain('The agent read the comments and decided not to change anything.');
    expect(noGo).toContain('Its reason: The comments ask for a redesign.');
    expect(noGo).toContain('or start another run from its page.');
    expect(noGo).toContain('Back to the pull request');
    const empty = text(review({ ...followUpAttempts.stopped, endReason: 'CHECKS_FAILED', endDetail: 'not_empty' }));
    expect(empty).toContain('The agent wrote no commit and no reply');
  });

  it('never takes more than a run can: past 20 comments it asks to ignore the rest first', () => {
    const many = Array.from({ length: 22 }, (_, index) =>
      feedbackThread({ commentId: `C_${index}`, threadId: `T_${index}` }),
    );
    const plain = text(prOpen({ reviewFeedback: { readAt: null, threads: many } }));
    expect(plain).toContain('Address 22 comments');
    expect(plain).toContain('A run takes 20 comments at most. Set 2 to Ignore: they stay out of every run');
  });

  it('marks the Checks step as our checks came out, and says what an older stop really was', () => {
    const blocked = review(
      inReview({ checkStatus: { status: 'BLOCKED', note: 'It cannot be pushed: it changes a GitHub workflow.' } }),
    );
    expect(blocked).toMatch(/data-step="checks" data-step-state="failed"/);
    expect(review(inReview())).toMatch(/data-step="checks" data-step-state="skipped"/);
    const older = text(review({ ...followUpAttempts.stopped, endReason: 'CHECKS_FAILED', endDetail: 'tests_passed' }));
    expect(older).toContain('Our checks stopped it before the review.');
    expect(older).not.toContain('wrote no commit');
  });

  it('after the push, offers to post a reply that did not go with it', () => {
    const plain = text(review(inReview({ state: 'DONE', replyDrafts: [flowDraft({ draftId: 'D_9' })] })));
    expect(plain).toContain('Not posted with the push. Post it now if you want it, or dismiss it.');
  });

  it('shows a round with no reply as the flow’s, with its checks', () => {
    const html = review(inReview({ replyDrafts: [] }));
    expect(html).toContain('data-panel="follow-up-result"');
    expect(text(html)).toContain('The agent drafted no reply this run.');
    expect(html).not.toContain('data-follow-up-approval');
  });

  it('keeps the drafts one by one on an API without the flow', () => {
    const html = review(followUpAttempts.review);
    expect(html).not.toContain('data-panel="follow-up-result"');
    expect(html).toContain('data-follow-up-approval="A_F1"');
  });
});

describe('the next step, for each thing only the user can do', () => {
  const next = (item: ContributeAttemptDetail) => review(item, views.active, true);

  it('shows what run 1 found and the bot\'s verdict on one card: the steps, GitHub, "I\'ve done it"', () => {
    const html = next(nextForYou);
    const plain = text(html);
    expect(html).toContain('data-next-card="found"');
    expect(plain).toContain('Your move: what run 1 left for you Only you can do this');
    expect(plain).toContain('clawsweeper · blocks the merge · 8 hours ago');
    expect(plain).toContain('Run 1 changed nothing · Oct 28, 10:52 UTC · $0.31');
    expect(plain).toContain(
      "What to do Open #190186 on GitHub (the button below) and find clawsweeper's comment: it says what it wants. Do this there: Add real behavior proof to the PR description: redacted terminal output, logs or a recording of a stopped run",
    );
    // Why only the user can: a review bot answers the person behind the pull request.
    expect(plain).toContain('clawsweeper is a review bot on the repo: it holds the merge until what it asks is done');
    expect(plain).toContain('Open PR #190186 on GitHub ↗');
    expect(html).toContain('href="https://github.com/openclaw/openclaw/pull/190186"');
    expect(html).toContain('data-kinds="BOT_BLOCKED,RUN_ENDED"');
    expect(plain).toContain('Start run 2 with a note →');
    // The card's GitHub link is the view's main button: no run is recommended.
    expect(html.indexOf('data-variant="default"')).toBeLessThan(html.indexOf('data-next-round'));
  });

  it('gives a run that stopped the next run, or the user’s own hands', () => {
    const stopped = {
      ...nextForYou,
      needsYou: {
        since: '',
        signals: [
          {
            kind: 'RUN_ENDED' as const,
            at: '2026-10-28T10:52:00.000Z',
            detail: 'It reached your limit for one attempt',
            attemptId: 'A_OC1',
            round: 1,
            outcome: 'STOPPED' as const,
          },
        ],
      },
    };
    const plain = text(next(stopped));
    expect(plain).toContain('Your move: try run 2, or handle it yourself Run 1 stopped');
    expect(plain).toContain('Run 1 stopped · Oct 28, 10:52 UTC · $0.31: It reached your limit for one attempt');
    expect(plain).toContain("Try run 2 I'll handle it");
  });

  it('gives a run whose commits failed to push the next run, or the user’s own hands', () => {
    const failed = {
      ...nextForYou,
      needsYou: {
        since: '',
        signals: [
          {
            kind: 'RUN_ENDED' as const,
            at: '2026-10-28T10:52:00.000Z',
            detail: 'The branch changed on GitHub: the commits no longer apply.',
            attemptId: 'A_OC1',
            round: 1,
            outcome: 'PUSH_FAILED' as const,
          },
        ],
      },
    };
    const html = next(failed);
    const plain = text(html);
    expect(html).toContain('data-next-card="push-failed"');
    expect(plain).toContain('Your move: try run 2, or handle it yourself Run 1 not pushed');
    expect(plain).toContain("Run 1's commits could not be pushed");
    expect(plain).toContain('They never reached the pull request, so it is as it was before the run.');
    expect(plain).toContain('What to do Read why it stopped, above');
    expect(plain).toContain('Click Try run 2, write in its note what to do differently');
    expect(plain).toContain("Try run 2 I'll handle it");
    expect(plain).toContain(
      "Run 1's commits could not be pushed (The branch changed on GitHub: the commits no longer apply). Make the change again",
    );
  });

  it('gives the comment that signs an agreement to copy, and leaves its line out of the rules card', () => {
    const html = next(nextForAgreement);
    const plain = text(html);
    expect(html).toContain('data-next-card="agreement"');
    expect(plain).toContain('Your move: sign the DCO Agreement to sign');
    expect(plain.split('I have read the DCO Document and I hereby sign the DCO')).toHaveLength(2);
    expect(html).toContain('aria-label="Copy the comment"');
    expect(plain).toContain('Read the DCO first');
    expect(plain).toContain('Open PR #23935 on GitHub ↗ (opens in a new tab) I posted it');
    expect(html).not.toContain('data-panel="pr-conventions"');
  });

  it('signs off and pushes, says what the force-push does, and how it went', () => {
    const html = next(nextForDco);
    const plain = text(html);
    expect(html).toContain('data-next-card="dco"');
    expect(plain).toContain('Your move: sign off the commits Sign-off missing');
    expect(plain).toContain('the branch is rewritten (a force-push)');
    expect(html).toContain('href="https://developercertificate.org/"');
    expect(html).toContain('data-sign-off="A_T"');
    expect(plain).toContain('Sign off and push Mark as handled');

    const sending = text(
      next({
        ...nextForDco,
        prFix: { kind: 'SIGN_OFF', state: 'SENDING', note: null, at: '2026-10-28T11:59:00.000Z' },
      }),
    );
    expect(sending).toContain('Signing off… ');
    expect(sending).toContain('Signing off and pushing…');
    const failed = text(
      next({
        ...nextForDco,
        prFix: { kind: 'SIGN_OFF', state: 'FAILED', note: 'The branch moved.', at: '2026-10-28T11:59:00.000Z' },
      }),
    );
    expect(failed).toContain('Try the sign-off again');
    expect(failed).toContain(
      'The sign-off did not go through: The branch moved. Try again, or sign off by hand: git rebase --signoff HEAD~N (N: the commits on the pull request), then git push --force-with-lease.',
    );
    // A pull request opened by hand: the steps by hand, its commits the user's, and Mark as handled.
    const byHand = next({ ...nextForDco, openedBy: 'HAND' });
    expect(byHand).not.toContain('data-sign-off');
    expect(text(byHand)).toContain('and yours went out without one');
    expect(text(byHand)).toContain(
      'Run git rebase --signoff HEAD~N, where N is the number of commits on the pull request',
    );
    expect(byHand).toContain('data-kinds="DCO"');
  });

  it('starts the run with the failing checks ticked and the note filled in', () => {
    const plain = text(next(nextForChecks));
    expect(plain).toContain('Your move: start run 2 Recommended');
    expect(plain).toContain('Run 2 works on A check started failing: lint, test (ubuntu) · 2 hours ago');
    expect(plain).toContain('Fix the failing checks (lint, test (ubuntu)).');
    expect(plain).toContain('Start run 2');
  });

  it('leads with the comments to choose, the note filled in from them', () => {
    const plain = text(next(nextForRun));
    expect(plain).toContain('Your move: start run 2 Recommended');
    expect(plain).toContain('Review feedback');
    expect(plain).toContain(
      'Fix the failing checks (lint, test (ubuntu)) and address the 2 review comments from @ana-kelp.',
    );
  });

  it("never calls a run back for review working: its review on the first attempt's page, no line on its own", () => {
    const ready = {
      ...nextForRun,
      followUps: followUps({
        used: 2,
        currentAttemptId: 'A_F2',
        history: [followUpRun({ attemptId: 'A_F1' }), followUpRun({ round: 2, attemptId: 'A_F2', state: 'REVIEW' })],
      }),
    };
    const html = review(ready);
    expect(html).toContain('data-your-move="waiting"');
    expect(text(html)).toContain('Review run 2 →');
    expect(html).toContain('href="/contribute/attempts/A_8/runs/A_F2"');
    const own = renderToStaticMarkup(
      <ReviewScreen
        view={views.active}
        attempt={{ ...followUpAttempts.review, attemptId: 'A_F2' }}
        first={ready}
        now={NOW}
      />,
    );
    expect(own).not.toContain('data-your-move');
  });

  it('says the move in one line on the other sessions, with the way to the next step', () => {
    const plain = text(review(nextForAgreement));
    expect(plain).toContain(
      `Your move: Only you can sign the repo's DCO; its bot records it from this comment on PR #23935, word for word: "I have read the DCO Document and I hereby sign the DCO" Go to the next step →`,
    );
  });
});
