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
const {
  AUTOPILOT_CONFIRM_LINES,
  AUTOPILOT_LAUNCH_LINE,
  AutopilotConfirmLines,
  AutopilotHowItWorks,
  AutopilotRecord,
  autopilotErrorMessage,
} = await import('./autopilot-section');
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
const { nextForAgreement, nextForChecks, nextForDco, nextForRepoOut, nextForRun, nextForSilent, nextForYou } =
  await import('@/lib/contribute/__fixtures__/needs-you');
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
    const one = (
      kind: 'COMMENT' | 'CHECK_FAILED' | 'CLA' | 'BOT_BLOCKED' | 'TITLE' | 'DCO' | 'RUN_ENDED' | 'SILENT' | 'REPO_OUT',
      detail: string | null = null,
    ) => text(mine({ needsYou: { since: NOW.toISOString(), signals: [{ kind, at: NOW.toISOString(), detail }] } }));
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
    expect(one('SILENT', '2026-11-12')).toContain(
      "No answer in 30 days Add a --json flag to kelp status Your move: No one has looked at this PR for 30 days. We'll close it on Nov 12 to keep your profile tidy. Click Keep it open to keep it, or close it yourself on GitHub. See your options",
    );
    expect(one('SILENT', '2026-11-12')).toContain('Keep it open');
    expect(one('REPO_OUT', 'hostile_close')).toContain(
      'Repo out of Contribute Add a --json flag to kelp status Your move: This repo is out of Contribute: a maintainer asked us to stay away. You may want to close this PR. Close it on GitHub, or click Keep it open. See your options',
    );
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
  it('says the move in the first attempt’s line, and the next step as a session to open', () => {
    const html = review(followUpAttempts.prNeedsYou);
    const plain = text(html);

    expect(html).toContain('data-session-head="status"');
    expect(plain).toContain('Your pull request is open Your move is in the next step →');
    expect(html).toContain('href="/contribute/attempts/A_1?session=next&amp;move=changes"');
    expect(html).toContain('data-session="next"');
    expect(plain).toContain('Run 1 Your move');
    expect(plain).not.toMatch(/rounds? (used|left)/);
    // The run is started from its own session, not from the first attempt's.
    expect(html).not.toContain('data-start="next-run"');

    const next = review(followUpAttempts.prNeedsYou, views.active, true);
    const nextText = text(next);
    expect(next).toContain('data-session-head="card"');
    expect(next).toContain('data-move="next-run"');
    expect(nextText).toContain('Changes requested Start run 1 on the requested changes');
    expect(nextText).toContain(
      'Run 1 works on A reviewer asked for changes · 3 hours ago Someone else commented on it · 2 hours ago A check started failing: lint, test (ubuntu) · 1 hour ago',
    );
    expect(next).toContain('data-start="next-run"');
    expect(next).toContain('data-follow-up-note=""');
    expect(next).toContain('maxLength="2000"');
    expect(nextText).toContain(
      'Fix the failing checks (lint, test (ubuntu)), address the requested changes and answer the new comment on the pull request.',
    );
    expect(nextText).toContain('GitRanks filled this in from what waits on the pull request.');
    expect(nextText).toContain('Start run 1');
    expect(nextText).toContain('Open #1419 on GitHub ↗');
    expect(nextText).toContain('Mark as handled');
    expect(next).toContain('data-kinds="CHANGES_REQUESTED,COMMENT,CHECK_FAILED"');
    expect(next).toContain('data-variant="default"');
  });

  it('offers a run with nothing waiting too, behind "Start a run anyway": the user says what they think is wrong', () => {
    const html = review(followUpAttempts.quiet, views.active, true);
    const plain = text(html);

    expect(html).toContain('data-status="NOTHING_WAITS"');
    expect(plain).toContain('Nothing waits on #1419');
    expect(html).toContain('data-start-anyway=""');
    expect(plain).toContain('Start a run anyway');
    // The only start is the outline one inside the disclosure: never a primary while nothing waits.
    expect(html).not.toContain('data-variant="default"');
    expect(plain).toContain('Run 1 Pushed 46de700 Oct 28 · $0.31 · by autopilot');
    expect(plain).toContain('Run 2 Stopped Oct 29 · $0.12');
    expect(plain).toContain('Run 3 Not started');
    expect(plain).toContain('2 runs · $0.43');
    expect(html).not.toContain('data-session="handed-off"');
    expect(plain).not.toMatch(/rounds? (used|left)|handed to you/i);
  });

  it('with only the user’s own moves waiting (a bot blocking the merge), leads with them, a run one disclosure away', () => {
    const blocked = {
      ...followUpAttempts.quiet,
      needsYou: {
        since: NOW.toISOString(),
        signals: [{ kind: 'BOT_BLOCKED' as const, at: NOW.toISOString(), detail: 'clawsweeper: Blocked before merge' }],
      },
    };
    const html = review(blocked, views.active, true);
    const plain = text(html);

    expect(html).toContain('data-move="found"');
    expect(plain).toContain('Bot blocks merge Do what clawsweeper asks');
    expect(plain).toContain('“Blocked before merge”');
    expect(html).toContain('href="https://github.com/driftwood-js/driftwood/pull/1419"');
    expect(html).toContain('data-kinds="BOT_BLOCKED"');
    expect(plain).toContain("I've done it");
    expect(html).toContain('data-start-anyway=""');
    // The sessions list: the next is the user's move, not a run's.
    expect(plain).toContain('Run 3 Your move');
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
    expect(text(review(followUpAttempts.prNeedsYou, views.active, true))).not.toContain('Autopilot has started');
    expect(text(review({ ...followUpAttempts.prNeedsYou, runner: 'MCP' }, on, true))).not.toContain(
      'Autopilot has started',
    );
  });

  it('says why no run can start on waiting comments of a pull request opened by hand', () => {
    const hand = {
      ...followUpAttempts.quiet,
      openedBy: 'HAND' as const,
      reviewFeedback: { readAt: null, threads: [feedbackThread()] },
    };
    const html = review(hand, views.active, true);
    expect(html).toContain('data-panel="review-comments"');
    expect(html).toContain('data-status="COMMENTS_WAIT"');
    expect(text(html)).toContain(
      '1 comment waits for an answer You opened this pull request yourself, so no run can add to it: answer these on GitHub.',
    );
    expect(text(html)).not.toContain('under way');
    expect(html).not.toContain('data-start=');
  });

  it('describes the note box to screen readers: its hint and a live counter', () => {
    const html = review(followUpAttempts.prNeedsYou, views.active, true);
    expect(html).toContain('aria-describedby="note-next-run-changes-hint note-next-run-changes-count"');
    expect(html).toContain('id="note-next-run-changes-count" aria-live="polite"');
  });

  it('shows the user’s note on the run it went with', () => {
    const noted = {
      ...followUpAttempts.review,
      followUpOf: { ...followUpAttempts.review.followUpOf!, trigger: 'own' as const, reason: 'Fix the docs example.' },
    };
    const html = review(noted);
    const activity = html.slice(html.indexOf('data-tab-panel="activity"'));
    expect(activity).toContain('data-run-note=""');
    expect(text(activity)).toContain('Your note Fix the docs example.');
    // In the details, after the cost and the timeline: not above what the agent did.
    expect(html.indexOf('data-run-note')).toBeGreaterThan(html.indexOf('data-panel="agent-did"'));
    expect(html.indexOf('data-run-note')).toBeGreaterThan(html.indexOf('data-panel="timeline"'));
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
      expect(html).not.toContain('data-start=');
      expect(html).not.toContain('data-move=');
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
    expect(plain).toContain('Follows up pull request #1419');
    expect(html).toContain('href="https://github.com/driftwood-js/driftwood/pull/1419"');
    expect(html).toContain('href="/contribute/attempts/A_1"');
    expect(plain).toContain('The new commits');
    expect(html).toContain('data-file="src/router/normalize-path.ts"');
    expect(html).toContain('data-check="SECRETS"');
    expect(text(html.slice(html.indexOf('data-tab-panel="activity"')))).toContain('$1.12 of your $5 limit');
  });

  it('a run without commits says so, and opens on its checks', () => {
    const html = review(followUpAttempts.repliesOnly);
    const changes = html.slice(html.indexOf('data-tab-panel="changes"'), html.indexOf('data-tab-panel="checks"'));
    expect(text(changes)).toContain('This run made no commits.');
    expect(html).toMatch(/<div data-state="active"[^>]*data-tab-panel="checks"/);
  });

  it("a run's DONE event says what it did", () => {
    const done = { state: 'DONE' as const, detail: null, at: '2026-10-28T11:58:00.000Z' };
    const timeline = (item: ContributeAttemptDetail) => {
      const html = review({ ...item, state: 'DONE', events: [...item.events, done] });
      return text(html.slice(html.indexOf('data-panel="timeline"')));
    };
    const repliesOnly = timeline(followUpAttempts.repliesOnly);
    expect(repliesOnly).toContain('11:58 Done');
    expect(repliesOnly).not.toContain('Pushed to the pull request');
    expect(timeline(followUpAttempts.review)).toContain('11:58 Pushed the new commits');
  });

  it('pushes its commits from the run’s card, with no title or description to edit', () => {
    const html = review(followUpAttempts.review);

    expect(html).toContain('data-move="run-ready"');
    expect(text(html)).toContain('The run · ready for you Push the commits');
    expect(text(html)).toContain(
      "The new commits go onto pull request #1419's branch on your fork, in your name, signed off as its first commits were.",
    );
    expect(text(html)).toContain('Discard run');
    expect(html).not.toContain('data-pr-form');
    expect(html).not.toContain('name="title"');
    expect(html).not.toContain('name="body"');
    expect(html).not.toContain('data-panel="approval"');
  });

  it('finishes one with replies only', () => {
    const plain = text(review(followUpAttempts.repliesOnly));

    expect(plain).toContain('Finish the follow-up');
    expect(plain).toContain('The agent made no commits this run');
    expect(plain).toContain('Approve the replies you want posted, here or once it is finished');
    expect(plain).not.toContain('Finish it, then approve');
  });

  it('shows the push under way in one line, without the steps of a new pull request', () => {
    const html = review(followUpAttempts.submitting);

    expect(html).toContain('data-status="SUBMITTING"');
    expect(text(html)).toContain('Pushing the run');
    expect(html).not.toContain('aria-label="Submission steps"');
    expect(html).not.toContain('data-move=');
  });

  it('says a DONE run pushed only with a sha, and its replies still going out', () => {
    const html = review(followUpAttempts.done);

    expect(html).toContain('data-state="DONE"');
    expect(html).toContain('data-status="REPLIES_POSTING"');
    expect(text(html)).toContain("Posting the run's replies");
    expect(text(html)).not.toContain('Pushed to the pull request');
    const pushed = review({ ...followUpAttempts.done, replyDrafts: [], round: followUpRun() });
    expect(pushed).toContain('data-status="PUSHED"');
    expect(text(pushed)).toContain('Run 1 pushed 46de700');
    const none = review({
      ...followUpAttempts.done,
      patch: null,
      replyDrafts: [],
      round: followUpRun({ pushedSha: null, replied: 0 }),
    });
    expect(text(none)).toContain('Run 1 is done, nothing to post');
    expect(text(none)).not.toContain('pushed');
  });

  it('says nothing was pushed when it stopped or was discarded', () => {
    expect(text(review(followUpAttempts.stopped))).toContain('nothing was pushed or posted');
    expect(text(review(followUpAttempts.discarded))).toContain('You discarded it.');
    expect(text(review(followUpAttempts.discarded))).not.toContain('went back to the pool');
    // A stop the next run would hit too says what to do first, and where.
    const html = review(followUpAttempts.stopped);
    expect(html).toContain('data-status="STOPPED"');
    expect(text(html)).toContain('Stopped: reached your $5 limit per run');
    expect(text(html)).toContain('Open More limits →');
    expect(html).toContain('href="/contribute/settings/budget#more-limits"');
    expect(text(html)).toContain(
      'To give the next run more room, raise "Each run" under More limits in Budget and pacing.',
    );
    expect(text(review(followUpAttempts.discarded))).not.toContain('Open More limits');
  });

  it('says the pull request it follows up is not available yet without the field', () => {
    expect(text(review({ ...followUpAttempts.review, followUpOf: undefined }))).toContain(
      'The pull request it follows up is not available yet.',
    );
  });
});

describe('a run’s replies on its page', () => {
  /** A done run whose reply GitHub refused for a reason no other reply has: its row opens with it. */
  const lone = (patch: Partial<ContributeReplyDraft>) =>
    review({
      ...followUpAttempts.review,
      state: 'DONE',
      replyDrafts: [
        replyDraft({
          state: 'FAILED',
          commentUrl: 'https://github.com/driftwood-js/driftwood/pull/1419#discussion_r901',
          lastError: {
            reason: 'no_answer',
            note: 'GitHub did not answer. Approve again later.',
            at: NOW.toISOString(),
          },
          ...patch,
        }),
      ],
    });

  it('opens a reply that failed alone, with its note, its copy box, its thread and Try again', () => {
    const html = lone({});
    expect(html).toContain('data-panel="review-comments"');
    expect(html).toContain('data-reply-error="no_answer"');
    expect(text(html)).toContain('GitHub did not answer. Approve again later.');
    expect(html).toContain('data-reply-text');
    expect(html).toContain('aria-label="Copy the reply to maintainer-mo on src/router/normalize-path.ts:3"');
    expect(html).toContain('href="https://github.com/driftwood-js/driftwood/pull/1419#discussion_r901"');
    expect(text(html)).toContain('Open the thread ↗');
    expect(text(html)).toContain('Try again');
    expect(text(html)).not.toContain('Approve again Post');
  });

  it('copies what was last sent, mark and prefix included; a reply waiting for its commit is not to copy yet', () => {
    expect(text(lone({ body: '🤖 Fixed in 46de700: Good catch.' }))).toContain('🤖 Fixed in 46de700: Good catch.');
    const waiting = lone({ prefix: 'Fixed in <commit>: ', body: null });
    expect(text(waiting)).toContain('Fixed in the new commit:');
    expect(waiting).not.toContain('aria-label="Copy the reply');
    expect(text(waiting)).toContain('You can copy it once its commits are on the pull request.');
  });

  it("links where to ask the organization on a lone refusal, by the app's page or the list of apps", () => {
    const failed = (id?: string) => {
      vi.stubEnv('AUTH_GITHUB_CONTRIBUTE_ID', id ?? '');
      try {
        return lone({
          lastError: {
            reason: 'org_restricted',
            note: 'The organization has not approved the app.',
            at: NOW.toISOString(),
          },
        });
      } finally {
        vi.unstubAllEnvs();
      }
    };
    const app = failed('Ov23liAbc');
    expect(app).toContain('data-reply-error="org_restricted"');
    expect(app).toContain('data-org-access="app"');
    expect(app).toContain('href="https://github.com/settings/connections/applications/Ov23liAbc"');
    expect(text(app)).toContain('Request access for the organization ↗');
    const apps = failed();
    expect(apps).toContain('data-org-access="apps"');
    expect(apps).toContain('href="https://github.com/settings/applications"');
    expect(lone({ lastError: { reason: 'forbidden', note: 'No.', at: NOW.toISOString() } })).not.toContain(
      'data-org-access',
    );
  });

  it("refused push by the repository's organization: the card says it once, with where to ask, and no grant bounce", () => {
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
    expect(html).toContain('data-move="run-ready"');
    expect(text(html)).toContain('The run · the push failed');
    expect(html).toContain('data-org-access');
    expect(text(html)).not.toContain('Allow on GitHub');
    const connected = { ...views.active, grantAvailable: true, grant: { connected: true, login: 'octocat' } };
    expect(grantNeededOf(connected, refused)).toBe(false);
  });

  it('keeps a posted link that does not point at GitHub as no link', () => {
    const html = review({
      ...followUpAttempts.done,
      replyDrafts: [replyDraft({ state: 'POSTED', posted: true, url: 'javascript:alert(1)' })],
    });
    expect(html).not.toContain('javascript:');
  });

  it('asks before posting: only the confirm posts', () => {
    const source = readFileSync(new URL('./approve-reply-button.tsx', import.meta.url), 'utf8');
    expect(source.match(/approveReply\(/g)).toHaveLength(1);
    const approve = source.slice(source.indexOf('const approve = '), source.indexOf('return ('));
    expect(approve).toContain('approveReply(draftId, asComment)');
    expect(source.match(/onConfirm=\{approve\}/g)).toHaveLength(1);
    expect(source).not.toMatch(/onClick=\{approve\}/);
  });

  it("holds a run's replies back until its commits are pushed: said once, no post button", () => {
    const html = review(followUpAttempts.review);
    expect(text(html).match(/Push them first, then approve the reply\./g)).toHaveLength(1);
    expect(text(html)).not.toContain('Post this reply');
    // Once pushed, a reply left out is a Draft row that can still be posted from its row.
    expect(review({ ...followUpAttempts.done, replyDrafts: [replyDraft({ draftId: 'D_2' })] })).toContain(
      'data-row-state="draft-not-sent"',
    );
  });

  it('escapes the drafted text and the comment it answers: both are untrusted', () => {
    const html = review({
      ...followUpAttempts.done,
      replyDrafts: [
        replyDraft({
          text: '<img src=x onerror=alert(1)>',
          comment: { commentId: 'RC_2', author: '<b>x</b>', path: null, line: null, excerpt: '<script>1</script>' },
        }),
      ],
    });
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<script>1');
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
    ).toBe(
      'Autopilot opens about a month after launch. Until then every pull request waits for your review, and your record keeps counting.',
    );
    expect(autopilotErrorMessage('INVALID', 'autopilot unlocks after 3 pull requests merged through GitRanks')).toBe(
      'Autopilot is locked: it unlocks after 3 pull requests merged through GitRanks.',
    );
    expect(autopilotErrorMessage('INVALID', 'Something else was locked')).toBe('Something else was locked');
  });
});

describe('autopilot', () => {
  /** Its row on the Settings summary, and what its How autopilot works dialog opens: the description and the record. */
  const settings = (view: ContributeView) =>
    renderToStaticMarkup(
      <>
        <SettingsScreen view={view} now={NOW} />
        {view.contributor ? <AutopilotHowItWorks autopilot={view.contributor.autopilot} /> : null}
        {view.contributor ? <AutopilotRecord autopilot={view.contributor.autopilot} /> : null}
      </>,
    );

  it('says it opens after launch month while it is not open, with the record and the toggle off', () => {
    const html = settings(views.autopilotComing);
    const plain = text(html);

    expect(html).toContain('data-autopilot-available="false"');
    expect(plain).toContain('After launch month');
    expect(plain).toContain(AUTOPILOT_LAUNCH_LINE);
    expect(plain).toContain('How autopilot works');
    expect(plain).not.toContain('Details');
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
    expect(text(html)).toContain('After launch month');
  });

  it('says it is not available yet while the API does not answer whether it is open', () => {
    const html = settings(views.active);

    expect(html).toContain('data-autopilot-available="unknown"');
    expect(text(html)).toContain('After launch month');
    expect(text(html)).toContain(AUTOPILOT_LAUNCH_LINE);
    expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*disabled=""/);
  });

  it('says every limit before it is on: when it submits, the hour, what it never does, follow-ups, GitHub, lock', () => {
    const plain = text(settings(views.autopilotUnlocked));

    expect(plain).not.toContain(AUTOPILOT_LAUNCH_LINE);
    for (const heading of ['When it submits', 'An hour to stop it', 'What it never does', 'Follow-ups', 'On GitHub']) {
      expect(plain).toContain(heading);
    }
    expect(plain).toContain(
      'Submit on beginner issues (labels such as good first issue, first-timers-only, newcomers, easy)',
    );
    expect(plain).toContain("Submit on a repository whose maintainers don't allow autopilot");
    expect(plain).toContain('it may start up to 2 runs on that pull request, on your key');
    expect(plain).toContain("Opened by @you's autopilot, not reviewed by a human");
    expect(plain).toContain('It unlocks after 3 of your pull requests are merged through GitRanks. Two closed');
  });

  it('asks before turning it on, in six lines that name the beginner issues', () => {
    const plain = text(renderToStaticMarkup(<AutopilotConfirmLines />));

    expect(AUTOPILOT_CONFIRM_LINES).toHaveLength(6);
    expect(plain).toContain("Never on beginner issues, or on repositories that don't allow autopilot");
    expect(plain).toContain('Up to 2 follow-up runs per pull request, on your key.');
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
    expect(text(mailed)).toContain('Before each submission we email you at m•••@gmail.com.');
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

  it('says autopilot left a beginner issue to the user, naming the label, and an issue it could not read', () => {
    const held = (reviewReason: ContributeAttemptDetail['reviewReason'], reviewReasonSource: string | null) =>
      text(
        review({
          ...followUpAttempts.pendingAutosubmit,
          state: 'REVIEW',
          autosubmitAt: null,
          autopilot: false,
          reviewReason,
          reviewReasonSource,
        }),
      );
    expect(held('beginner_issue', 'good first issue')).toContain(
      'Autopilot did not submit it: it never submits on beginner issues (good first issue), so it waits for your review.',
    );
    expect(held('beginner_issue', null)).toContain('it never submits on beginner issues, so it waits');
    expect(held('issue_unread', null)).toContain('we could not read the issue to check its labels');
    expect(held('repo_manual_only', 'CONTRIBUTING.md')).toContain(
      'this repository asks for a person’s review (CONTRIBUTING.md)',
    );
  });

  it('counts down to the submission on an attempt waiting for it, with Stop', () => {
    const html = review(followUpAttempts.pendingAutosubmit);

    expect(html).toContain('data-move="autopilot"');
    expect(text(html)).toContain('Autopilot · 42 min left Autopilot opens this pull request at 12:42 UTC');
    expect(html).toContain('data-autosubmit-at="2026-10-28T12:42:00.000Z"');
    expect(text(html)).toContain('It submits in 42 minutes, at Oct 28, 12:42 UTC');
    expect(html).toContain('data-stop-autopilot="A_1"');
    expect(text(html)).toContain('Stop and review');
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

    const draft = review({ ...followUpAttempts.done, replyDrafts: [replyDraft({ state: 'ARCHIVED' as never })] });
    // A state it does not know sits in the closed Dismissed group, with no action.
    expect(text(draft)).toContain('Dismissed · 1');
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

  it('lists the waiting comments in one list, each to Address or Ignore, the ignored apart, the card starting them', () => {
    const html = prOpen();
    const plain = text(html);
    expect(html).toContain('data-panel="review-comments"');
    expect(plain).toContain('Review comments 3 waiting read 10 minutes ago');
    // Bots and people are no longer separate lists: a bot is a chip on its row.
    expect(plain).not.toContain('Bots ·');
    expect(plain).not.toContain('People ·');
    // Ignored in an earlier round: in its own closed group, not counted.
    expect(plain).toContain('Ignored · 1');
    expect(plain).toContain('Address 3 comments from coderabbitai and maintainer-mo');
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(3);
    // The card starts the round, under the head; the list is outside it.
    expect(html.indexOf('data-panel="review-comments"')).toBeGreaterThan(html.indexOf('data-start="next-run"'));
    // Strangers' words are text, never markup.
    expect(html).not.toContain('<b>title</b>');
  });

  it('shows no comments while a run is under way, and the outline Start a run anyway without them', () => {
    const busy = prOpen({ followUps: followUps({ used: 1, manualRuns: 1, currentAttemptId: 'A_F1' }) });
    // The next step is the run's while it works: the page shows the first attempt, its line pointing at the run.
    expect(busy).not.toContain('data-panel="review-comments"');
    expect(text(busy)).toContain('The run is under way Watch the run →');
    const none = prOpen({ reviewFeedback: { readAt: null, threads: [] } });
    expect(none).not.toContain('data-panel="review-comments"');
    expect(none).toContain('data-start="next-run"');
    const quiet = review(followUpAttempts.quiet, views.active, true);
    expect(quiet).toContain('data-start-anyway=""');
  });

  it('shows the run as four steps in its line: reading, fixing once the work is sent, then our checks', () => {
    const run = (patch: Partial<ContributeAttemptDetail>) => review({ ...followUpAttempts.review, ...patch });
    const reading = run({
      state: 'RUNNING',
      events: [{ state: 'RUNNING', detail: 'follow_up: no claim', at: '2026-10-28T11:00:00.000Z' }],
    });
    expect(reading).toContain('data-status="RUNNING"');
    expect(text(reading)).toContain('The run is reading the comments');
    expect(reading).toMatch(/data-step="Reading" data-step-state="current"/);
    expect(text(reading)).toMatch(/Reading : now .*Fixing : next .*Checks : next .*Ready : next/);
    const fixing = run({
      state: 'RUNNING',
      events: [
        { state: 'RUNNING', detail: 'go: budget raised to $5.00, the work sent', at: '2026-10-28T11:01:00.000Z' },
      ],
    });
    expect(fixing).toMatch(/data-step="Fixing" data-step-state="current"/);
    expect(fixing).toMatch(/data-step="Reading" data-step-state="done"/);
    expect(run({ state: 'CHECKS' })).toMatch(/data-step="Checks" data-step-state="current"/);
    expect(text(run({ state: 'CHECKS' }))).toContain('The run is running checks');
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

  it('shows each comment’s outcome in one list, the checks in the Checks tab, and one push on the card', () => {
    const html = review(inReview());
    const plain = text(html);
    expect(html).toContain('data-panel="review-comments"');
    expect(html).toContain('data-check-status="NOT_RUN"');
    expect(plain).toContain('The tests could not run');
    expect(plain).toContain('Fixed');
    expect(plain).toContain('Not changed');
    expect(plain).toContain('Question for you');
    expect(plain).toContain('Question for you: Trim too, or only collapse?');
    // A question with no answer opens with its field; its group is Needs you, the rest Ready to post.
    expect(plain).toContain('Needs you · 1');
    expect(plain).toContain('Ready to post · 3');
    // The bot's fixed thread resolves after its reply; the person's stays open for its reviewer.
    expect(plain).toContain('then resolves the thread');
    expect(html).toContain('data-move="run-ready"');
    expect(plain).toContain('The tests could not run: The tests could not run in the sandbox');
    expect(plain).toContain('Push anyway');
    expect(plain).toContain('Discard run');
    expect(html).not.toContain('data-panel="follow-up-result"');
    expect(html).not.toContain('data-panel="replies"');
    // The head, then what the agent did, then the comments, then the details: no Replies tab.
    expect(plain.match(/What the agent did/g)).toHaveLength(1);
    expect(html.indexOf('data-session-head')).toBeLessThan(html.indexOf('data-panel="agent-did"'));
    expect(html.indexOf('data-panel="agent-did"')).toBeLessThan(html.indexOf('data-panel="review-comments"'));
    expect(html.indexOf('data-panel="review-comments"')).toBeLessThan(html.indexOf('data-session-tabs'));
    expect(html).not.toContain('data-tab="replies"');
  });

  it('blocks the push on a failed rail, saying so, and makes Discard run the main button', () => {
    const html = review(
      inReview({ checkStatus: { status: 'BLOCKED', note: 'It cannot be pushed: it changes a GitHub workflow.' } }),
    );
    const plain = text(html);
    expect(plain).toContain("These commits can't be pushed");
    expect(plain).toContain(
      'It cannot be pushed: it changes a GitHub workflow. Discard the run, or answer the threads on GitHub yourself.',
    );
    expect(html).toMatch(/data-variant="destructive"[^>]*>Discard run/);
    expect(plain).not.toContain('Push anyway');
  });

  it('after the push: the run’s line, and each reply posted, resolved or not posted', () => {
    const html = review(
      inReview({
        state: 'DONE',
        round: followUpRun({ fixed: 5, replied: 2, resolved: 1 }),
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
    expect(html).toContain('data-status="PUSHED"');
    expect(plain).toContain('Run 1 pushed 46de700 5 fixed · 2 replied · 1 resolved');
    expect(plain).toContain('Replied · resolved');
    expect(plain).toContain('Replied');
    expect(plain).toContain('GitHub refused the reply: the conversation is locked.');
    expect(plain).not.toContain('Push and reply');
    expect(html).toContain('href="https://github.com/driftwood-js/driftwood/pull/1419#discussion_r905"');
  });

  it('lines the rounds up on the pull request’s page', () => {
    const html = prOpen({
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
    });
    const plain = text(html);
    const rail = text(html.slice(html.indexOf('<nav'), html.indexOf('</nav>')));
    expect(plain).toContain('Run 1 Pushed 46de700');
    expect(plain).toContain('Run 2 Stopped');
    // A tile is its title, its pill and one line: the tallies are the run's own page's to say.
    expect(rail).not.toContain('5 fixed · 2 replied');
    expect(plain).toContain('2 runs · $0.43');
    expect(plain).not.toMatch(/rounds? (used|left)/);
  });

  it('never stops silently: each end says what happened and what the user can do', () => {
    const noGo = review({
      ...followUpAttempts.stopped,
      endReason: 'NO_GO',
      endDetail: 'The comments ask for a redesign.',
    });
    expect(noGo).toContain('data-status="STOPPED"');
    expect(text(noGo)).toContain('Stopped: the agent said no-go');
    expect(text(noGo)).toContain('nothing was pushed or posted');
    expect(text(noGo)).toContain('Its reason: The comments ask for a redesign.');
    const empty = text(review({ ...followUpAttempts.stopped, endReason: 'CHECKS_FAILED', endDetail: 'not_empty' }));
    expect(empty).toContain('Stopped: the agent wrote no commit and no reply');
  });

  it('never takes more than a run can: past 20 comments it asks to ignore the rest first', () => {
    const many = Array.from({ length: 22 }, (_, index) =>
      feedbackThread({ commentId: `C_${index}`, threadId: `T_${index}` }),
    );
    const plain = text(prOpen({ reviewFeedback: { readAt: null, threads: many } }));
    expect(plain).toContain('Address 22 comments');
    expect(plain).toContain('A run takes 20 comments at most. Set 2 to Ignore: they stay out of every run');
  });

  it('says what an older stop really was', () => {
    const older = text(review({ ...followUpAttempts.stopped, endReason: 'CHECKS_FAILED', endDetail: 'tests_passed' }));
    expect(older).toContain('Stopped: our checks stopped it');
    expect(older).not.toContain('wrote no commit');
  });

  it('after the push, keeps a reply that did not go with it to post from its row', () => {
    const html = review(inReview({ state: 'DONE', replyDrafts: [flowDraft({ draftId: 'D_9' })] }));
    expect(html).toContain('data-row-state="draft-not-sent"');
    expect(text(html)).toContain('Draft');
  });

  it('shows a round with no reply as the flow’s: the card pushes its commits, no list', () => {
    const html = review(inReview({ replyDrafts: [] }));
    expect(html).toContain('data-move="run-ready"');
    expect(html).not.toContain('data-panel="review-comments"');
    expect(text(html)).toContain('Push anyway');
  });

  it('keeps the drafts one by one on an API without the flow, the card pushing the commits', () => {
    const html = review(followUpAttempts.review);
    expect(html).toContain('data-panel="review-comments"');
    expect(html).toContain('data-move="run-ready"');
    expect(text(html)).toContain('Push the commits');
    expect(html).not.toContain('data-row-state="draft-review"');
  });
});

describe('the next step, for each thing only the user can do', () => {
  const next = (item: ContributeAttemptDetail) => review(item, views.active, true);
  const stoppedWith = (outcome: 'STOPPED' | 'PUSH_FAILED', detail: string) => ({
    ...nextForYou,
    needsYou: {
      since: '',
      signals: [
        { kind: 'RUN_ENDED' as const, at: '2026-10-28T10:52:00.000Z', detail, attemptId: 'A_OC1', round: 1, outcome },
      ],
    },
  });

  it('shows what run 1 found and the bot\'s verdict on one card: the steps, GitHub, "I\'ve done it"', () => {
    const html = next(nextForYou);
    const plain = text(html);
    expect(html).toContain('data-move="found"');
    expect(plain).toContain('Bot blocks merge Do what clawsweeper asks');
    expect(plain).toContain('clawsweeper · blocks the merge · 8 hours ago');
    expect(plain).toContain('Run 1 · Oct 28, 10:52 UTC · $0.31');
    expect(plain).toContain(
      "What to do Open PR #190186 on GitHub and find clawsweeper's comment: it says what it wants. Do this there: Add real behavior proof to the PR description: redacted terminal output, logs or a recording of a stopped run",
    );
    // Why only the user can: a review bot answers the person behind the pull request.
    expect(plain).toContain('clawsweeper is a review bot on the repo: it holds the merge until what it asks is done');
    expect(plain).toContain('Open #190186 on GitHub ↗');
    expect(html).toContain('href="https://github.com/openclaw/openclaw/pull/190186"');
    expect(html).toContain('data-kinds="BOT_BLOCKED,RUN_ENDED"');
    // The card's GitHub link is the view's main button; a run is one disclosure away.
    expect(html).toMatch(
      /data-variant="default"[^>]*href="https:\/\/github.com\/openclaw|href="https:\/\/github.com\/openclaw\/openclaw\/pull\/190186"[^>]*data-variant="default"/,
    );
    expect(html).toContain('data-start-anyway=""');
  });

  it('gives a run that stopped the next run, or the user’s own hands', () => {
    const html = next(stoppedWith('STOPPED', 'It reached your limit for one attempt'));
    const plain = text(html);
    expect(html).toContain('data-move="stopped"');
    expect(plain).toContain('Run 1 stopped Run 1 stopped');
    expect(plain).toContain(
      'It reached your limit for one attempt. Nothing was pushed or posted, so the pull request is as it was before the run.',
    );
    expect(html).toContain('data-start="try-run"');
    expect(plain).toContain('Try run 2');
    expect(plain).toContain("I'll handle it");
  });

  it('gives a run whose commits failed to push the next run, or the user’s own hands', () => {
    const html = next(stoppedWith('PUSH_FAILED', 'The branch changed on GitHub: the commits no longer apply.'));
    const plain = text(html);
    expect(html).toContain('data-move="stopped"');
    expect(plain).toContain("Run 1 not pushed Run 1's commits weren't pushed");
    expect(plain).toContain('They never reached the pull request, so it is as it was before the run.');
    expect(plain).toContain('What to do Read why it stopped, above');
    expect(plain).toContain('Click Try run 2, write in its note what to do differently');
    expect(plain).toContain('Try run 2');
    expect(plain).toContain("I'll handle it");
    expect(plain).toContain(
      "Run 1's commits could not be pushed (The branch changed on GitHub: the commits no longer apply). Make the change again",
    );
  });

  it('gives the comment that signs an agreement to copy, and leaves its line out of the rules card', () => {
    const html = next(nextForAgreement);
    const plain = text(html);
    expect(html).toContain('data-move="agreement"');
    expect(plain).toContain('Agreement to sign Sign the DCO with a comment');
    expect(plain.split('I have read the DCO Document and I hereby sign the DCO')).toHaveLength(2);
    expect(html).toContain('aria-label="Copy the comment"');
    expect(plain).toContain('Read the DCO first');
    expect(plain).toContain('Open #23935 on GitHub ↗ (opens in a new tab) I posted it');
    expect(html).not.toContain('data-move="rules"');
  });

  it('signs off and pushes, says what the force-push does, and how it went', () => {
    const html = next(nextForDco);
    const plain = text(html);
    expect(html).toContain('data-move="dco"');
    expect(plain).toContain('Sign-off missing Sign off the commits');
    expect(plain).toContain('the branch is rewritten (a force-push)');
    expect(html).toContain('href="https://developercertificate.org/"');
    expect(html).toContain('data-sign-off="A_T"');
    expect(plain).toContain('Sign off and push');

    // While it is on its way, the move waits: the next step's line says it.
    const sending = next({
      ...nextForDco,
      prFix: { kind: 'SIGN_OFF', state: 'SENDING', note: null, at: '2026-10-28T11:59:00.000Z' },
    });
    expect(sending).toContain('data-status="SIGNING_OFF"');
    expect(text(sending)).toContain('Signing off the commits Rewriting them with your sign-off.');
    const failed = next({
      ...nextForDco,
      prFix: { kind: 'SIGN_OFF', state: 'FAILED', note: 'The branch moved.', at: '2026-10-28T11:59:00.000Z' },
    });
    expect(text(failed)).toContain('A fix failed Sign off the commits');
    expect(text(failed)).toContain("The sign-off didn't go through: The branch moved.");
    expect(text(failed)).toContain('Try the sign-off again');
    expect(text(failed)).toContain('git rebase --signoff HEAD~N, then git push --force-with-lease');
    // A pull request opened by hand: the steps by hand, its commits the user's, and Mark as handled.
    const byHand = next({ ...nextForDco, openedBy: 'HAND' });
    expect(byHand).not.toContain('data-sign-off');
    expect(text(byHand)).toContain('Sign off your commits');
    expect(text(byHand)).toContain('and yours went out without one');
    expect(text(byHand)).toContain(
      'Run git rebase --signoff HEAD~N, where N is the number of commits on the pull request',
    );
    expect(byHand).toContain('data-kinds="DCO"');
  });

  it('warns of the close a silent pull request faces: keep it open, or close it, and no run for it', () => {
    const html = next(nextForSilent);
    const plain = text(html);
    expect(html).toContain('data-move="silent"');
    expect(plain).toContain('No answer in 30 days No answer in 30 days');
    expect(plain).toContain(
      "No one has looked at this PR for 30 days. We'll close it on Nov 12 to keep your profile tidy.",
    );
    expect(plain).toContain('or when a run last pushed to it, whichever came last');
    expect(plain).toContain('A word from someone else before Nov 12 clears this and keeps it open.');
    expect(plain).not.toMatch(/mark (it )?as handled/i);
    expect(plain).toContain('Done with it? Close it on GitHub yourself, or leave it: GitRanks closes it on Nov 12.');
    expect(plain).toContain('Keep it open Open #5120 on GitHub ↗');
    // "Keep it open" is the card's main button.
    expect(html).toMatch(/data-variant="default"[^>]*>Keep it open/);
    expect(html).toContain('data-kinds="SILENT"');
    expect(html).not.toContain('data-run-item');
  });

  it('says why the repo left Contribute, and leaves closing the pull request to the user', () => {
    const html = next(nextForRepoOut);
    const plain = text(html);
    expect(html).toContain('data-move="repo-out"');
    expect(html).toContain('data-repo-out="hostile_close"');
    expect(plain).toContain('Repo out of Contribute The repo left Contribute');
    expect(plain).toContain(
      'This repo is out of Contribute: a maintainer asked us to stay away. You may want to close this PR.',
    );
    expect(plain).toContain('No run goes out from GitRanks here; you can still answer on GitHub yourself.');
    expect(plain).toContain('Keep it open Open #5121 on GitHub ↗');
    expect(html).toMatch(/data-variant="default"[^>]*>Keep it open/);
    expect(html).toContain('data-kinds="REPO_OUT"');

    const misses = (detail: string | null) =>
      text(
        next({
          ...nextForRepoOut,
          needsYou: { since: '', signals: [{ kind: 'REPO_OUT', at: NOW.toISOString(), detail }] },
        }),
      );
    expect(misses('pr_misses')).toContain(
      'This repo has left our PRs unanswered; it is out of the shared pool for 90 days.',
    );
    expect(misses('pr_misses')).toContain('Close or keep the pull request open');
    expect(misses(null)).toContain('This repo is out of Contribute. You may want to close this PR.');
  });

  it('starts the run with the failing checks ticked and the note filled in', () => {
    const plain = text(next(nextForChecks));
    expect(plain).toContain('Check failing Start run 2 on the failing checks');
    expect(plain).toContain('Run 2 works on A check started failing: lint, test (ubuntu) · 2 hours ago');
    expect(plain).toContain('Fix the failing checks (lint, test (ubuntu)).');
    expect(plain).toContain('Start run 2');
  });

  it('leads with the comments to choose, the note filled in from them', () => {
    const html = next(nextForRun);
    const plain = text(html);
    expect(plain).toContain('Changes requested Address 2 comments from ana-kelp');
    expect(html).toContain('data-panel="review-comments"');
    expect(plain).toContain(
      'Fix the failing checks (lint, test (ubuntu)) and address the 2 review comments from @ana-kelp.',
    );
  });

  it("never calls a run back for review working: its card on the run's page, the first attempt's line pointing at it", () => {
    const ready = {
      ...nextForRun,
      followUps: followUps({
        used: 2,
        currentAttemptId: 'A_F2',
        history: [followUpRun({ attemptId: 'A_F1' }), followUpRun({ round: 2, attemptId: 'A_F2', state: 'REVIEW' })],
      }),
    };
    const run = {
      ...followUpAttempts.review,
      attemptId: 'A_F2',
      followUpOf: { ...followUpOf, attemptId: 'A_8', prId: 'PR_8' },
    };
    const html = renderToStaticMarkup(<ReviewScreen view={views.active} attempt={ready} current={run} now={NOW} />);
    expect(html).toContain('data-session-head="status"');
    expect(text(html)).toContain('Your move is on run 2 →');
    expect(html).toContain('href="/contribute/attempts/A_8/runs/A_F2?move=run-ready"');
    expect(text(html)).not.toMatch(/Run 2 (is )?working/i);
    const own = renderToStaticMarkup(<ReviewScreen view={views.active} attempt={run} first={ready} now={NOW} />);
    expect(own).toContain('data-move="run-ready"');
    expect(text(own)).toContain('Run 2 · ready for you');
  });

  it('says on the other sessions where the move is, with the way to it', () => {
    const html = review(nextForAgreement);
    expect(text(html)).toContain('Your pull request is open Your move is in the next step →');
    expect(html).toContain('href="/contribute/attempts/A_C?session=next&amp;move=agreement"');
  });
});
