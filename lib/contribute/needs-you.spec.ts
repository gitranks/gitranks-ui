import { describe, expect, it } from 'vitest';

import { attempt, followUpOf, followUpRun } from './__fixtures__/contribute-attempts';
import { replyWaiting } from './__fixtures__/contribute-overview';
import { NOW, views } from './__fixtures__/contribute-views';
import {
  needsEverything,
  openPr,
  prsNeedingYou,
  prsOutcomes,
  runReady,
  runsInFlight,
  signal,
} from './__fixtures__/needs-you';
import type {
  ContributeAttempt,
  ContributeContribution,
  ContributePrSignalKind,
  ContributeView,
} from './contribute.types';
import * as needsYouModule from './needs-you';
import {
  botVerdictOf,
  clipped,
  type NeedsYouItem,
  type NeedsYouRead,
  needsYouItemsOf,
  runStepOf,
  shortLeftOf,
  shownItemsOf,
} from './needs-you';
import { NEEDS_YOU_MAX, NEEDS_YOU_READ } from './overview';

const read = (patch: Partial<NeedsYouRead> = {}): NeedsYouRead => ({
  reviews: [],
  replies: [],
  contributions: [],
  runs: [],
  ...patch,
});
const items = (patch: Partial<NeedsYouRead> = {}, view: ContributeView = views.active) =>
  needsYouItemsOf({ view, ...read(patch), now: NOW });
/** The one row of one open pull request. */
const rowOf = (pr: ContributeContribution, patch: Partial<NeedsYouRead> = {}): NeedsYouItem => {
  const { items: rows } = items({ contributions: [pr], ...patch });
  expect(rows).toHaveLength(1);
  return rows[0];
};
const externalOf = (item: NeedsYouItem) => (item.action && 'external' in item.action ? item.action.external : null);

describe('needsYouItemsOf: the setup', () => {
  it('asks for a new key when Anthropic refused it, and for a way when there is none', () => {
    const [key] = items({}, views.keyInvalid).items;
    expect(key).toMatchObject({
      kind: 'key',
      tone: 'red',
      pill: 'Key refused',
      where: 'Claude key …k3Qa',
      move: 'Anthropic refused your Claude key, so no run can start. Connect a working key.',
      action: { label: 'Connect a new key', href: '/contribute/connect' },
    });

    const [way] = items({}, views.onboardedNoPath).items;
    expect(way).toMatchObject({
      kind: 'no-way',
      pill: 'Not set up',
      move: 'Nothing can start until GitRanks has your Claude key or your own agent is connected.',
      action: { label: 'Add your Claude key', href: '/contribute/connect' },
      secondary: { label: 'Connect your own agent', href: '/contribute/connect?path=agent' },
    });
  });

  it('is complete only when every read answered', () => {
    expect(items().complete).toBe(true);
    for (const missing of ['reviews', 'replies', 'contributions'] as const) {
      expect(items({ [missing]: undefined }).complete).toBe(false);
    }
    // The runs in flight only name a run's step: unread, the rest is still complete.
    expect(items({ runs: undefined }).complete).toBe(true);
  });
});

describe('needsYouItemsOf: what waits for a review', () => {
  it('says a first attempt in review waits seven days, counting down from when it became ready', () => {
    const [row] = items({ reviews: [attempt({ reviewAt: '2026-10-24T12:00:00.000Z' })] }).items;
    expect(row).toMatchObject({
      kind: 'review',
      tone: 'violet',
      pill: 'Ready for review',
      where: 'driftwood-js/driftwood · issue #871',
      title: 'Nested layouts re-render on every navigation',
      move: 'This pull request opens only when you approve it. Check the change, then open it or discard it. It waits 3 more days.',
      action: { label: 'Review the change', href: '/contribute/attempts/A_1' },
    });
  });

  it("counts autopilot's minutes in the pill, soonest first, a first attempt's and a run's alike", () => {
    const first = attempt({
      attemptId: 'A_AUTO',
      state: 'PENDING_AUTOSUBMIT',
      autosubmitAt: '2026-10-28T12:42:00.000Z',
    });
    const run = attempt({
      attemptId: 'A_F9',
      kind: 'FOLLOW_UP',
      followUpOf,
      state: 'PENDING_AUTOSUBMIT',
      autosubmitAt: '2026-10-28T12:10:00.000Z',
      round: followUpRun({ round: 3 }),
    });
    const [soon, later] = items({ reviews: [first, run] }).items;
    expect(soon).toMatchObject({
      kind: 'run-autopilot',
      pill: 'Autopilot · 10 min',
      move: 'Autopilot pushes run 3 in 10 minutes. Check it, or stop it.',
      action: { label: 'Check before it pushes', href: '/contribute/attempts/A_1/runs/A_F9' },
    });
    expect(later).toMatchObject({
      kind: 'autopilot',
      tone: 'amber',
      pill: 'Autopilot · 42 min',
      move: 'Autopilot opens this pull request in 42 minutes. Check it, or stop it.',
      action: { label: 'Check before it submits' },
    });
  });

  it('asks for GitHub access on a bounced submit', () => {
    const bounced = attempt({
      submit: {
        step: 'FORK',
        waitUntil: null,
        fork: null,
        branch: null,
        lastError: { reason: 'grant_revoked', note: 'Revoked.', at: '2026-10-28T10:00:00.000Z' },
      },
    });
    expect(items({ reviews: [bounced] }, views.grantMissing).items[0]).toMatchObject({
      kind: 'grant',
      pill: 'GitHub access',
      move: 'Allow GitHub access so the pull request opens under your account.',
      action: { label: 'Allow GitHub access', href: '/contribute/attempts/A_1' },
    });
  });

  it('says what a run ready did from its round, with its drafts folded in, and holds its pull request to that row', () => {
    const drafts = [replyWaiting({ inReview: true }), replyWaiting({ draftId: 'D_2', inReview: true, comment: null })];
    const held = openPr({
      pullRequest: { ...openPr().pullRequest, prId: 'PR_1' },
      needsYou: { since: '2026-10-28T09:00:00.000Z', signals: [signal('COMMENT')] },
    });
    const { items: rows, counted } = items({ reviews: [runReady], replies: drafts, contributions: [held] });
    expect(counted).toBe(1);
    expect(rows[0]).toMatchObject({
      kind: 'run-ready',
      tone: 'violet',
      pill: 'Run 2 ready',
      where: 'driftwood-js/driftwood · PR #1419',
      move: 'Run 2 fixed 2 comments and drafted 2 replies. Approve to push and post.',
      action: { label: 'Review run 2', href: '/contribute/attempts/A_1/runs/A_F1' },
    });
  });

  it("says a run's tests did not pass, or that our checks block its push", () => {
    const failed = items({ reviews: [{ ...runReady, checkStatus: { status: 'FAILED', note: '' } }] }).items[0];
    expect(failed.move).toBe("Run 2's tests did not pass: push anyway or discard it.");
    const blocked = items({ reviews: [{ ...runReady, checkStatus: { status: 'BLOCKED', note: '' } }] }).items[0];
    expect(blocked.move).toBe("Our checks block run 2's push: discard it and start run 3 with a note.");
  });

  it("asks to approve or send back the user's own agent's change, and says the 48 hours its claim waits", () => {
    const own = attempt({ runner: 'MCP', agent: { name: 'CODEX', model: null }, reviewAt: '2026-10-28T07:00:00.000Z' });
    expect(items({ reviews: [own] }).items[0]).toMatchObject({
      kind: 'own-review',
      move: 'Your agent made this. Approve it or send it back with a note. It waits 43 more hours.',
      action: { label: 'Review the change' },
    });
    // Just ready: the whole wait.
    const fresh = attempt({ runner: 'MCP', reviewAt: NOW.toISOString() });
    expect(items({ reviews: [fresh] }).items[0].move).toBe(
      'Your agent made this. Approve it or send it back with a note. It waits 48 hours.',
    );
    // The wait is up: no wait is named.
    const over = attempt({ runner: 'MCP', reviewAt: '2026-10-26T11:00:00.000Z' });
    expect(items({ reviews: [over] }).items[0].move).toBe(
      'Your agent made this. Approve it or send it back with a note.',
    );
  });
});

describe('needsYouItemsOf: a Learn attempt', () => {
  it('asks to take the lesson, and waits from the later of the review and the last step passed', () => {
    const learn = attempt({
      runner: 'MCP',
      mode: 'LEARN',
      reviewAt: '2026-10-26T11:00:00.000Z',
      learnActiveAt: '2026-10-28T07:00:00.000Z',
    });
    expect(items({ reviews: [learn] }).items[0]).toMatchObject({
      kind: 'own-review',
      pill: 'Lesson ready',
      move: 'Your agent fixed this and wrote a lesson on it. Take the lesson, then approve the pull request. It waits 43 more hours.',
      action: { label: 'Take the lesson', href: '/learn/attempts/A_1' },
    });
    // No step passed yet: from the review alone, whose wait is up.
    const idle = attempt({ runner: 'MCP', mode: 'LEARN', reviewAt: '2026-10-26T11:00:00.000Z' });
    expect(items({ reviews: [idle] }).items[0].move).toBe(
      'Your agent fixed this and wrote a lesson on it. Take the lesson, then approve the pull request.',
    );
  });
});

describe('needsYouItemsOf: an open pull request', () => {
  it('leads with changes requested, starts the next run on the next step, and says what more waits', () => {
    expect(rowOf(prsNeedingYou.changes)).toMatchObject({
      kind: 'changes',
      tone: 'amber',
      pill: 'Changes requested',
      where: 'kelp-db/kelp · PR #1419',
      title: 'Add a --json flag to kelp status',
      move: 'A reviewer asked for changes. Start run 2 on them.',
      more: 1,
      action: { label: 'Start run 2', href: '/contribute/attempts/A_PR1419?session=next' },
    });
  });

  it('answers a comment and fixes a failing check with the next run', () => {
    expect(rowOf(prsNeedingYou.comment)).toMatchObject({
      kind: 'comment',
      pill: 'New comment',
      move: 'Someone commented on it. Let run 1 answer, or reply on GitHub.',
      action: { label: 'Answer with run 1', href: '/contribute/attempts/A_PR2205?session=next' },
    });
    expect(rowOf(prsNeedingYou.check)).toMatchObject({
      kind: 'check',
      tone: 'red',
      pill: 'Check failing',
      move: 'lint fails on your pull request. Start run 1 to fix it.',
      action: { label: 'Fix with run 1' },
    });
  });

  it('sends the user to GitHub on a pull request they opened by hand, where no run adds', () => {
    const row = rowOf({ ...prsNeedingYou.check, openedBy: 'HAND' });
    expect(row.move).toBe('lint fails on your pull request. Fix it on your branch.');
    expect(externalOf(row)).toBe('https://github.com/oxbow-dev/oxbow/pull/381');
    expect(row.secondary).toMatchObject({ label: "I've fixed it", handled: { kinds: ['CHECK_FAILED'], all: true } });
  });

  it('asks to approve the replies a run drafted outside a review, or to retry one GitHub refused', () => {
    const pr = prsNeedingYou.comment;
    const drafts = [replyWaiting({ prId: 'PR_2205', attemptId: 'A_TIDE1' })];
    const quiet = { ...pr, needsYou: null };
    expect(rowOf(quiet, { replies: drafts })).toMatchObject({
      kind: 'replies',
      pill: 'Replies to approve',
      move: 'A run drafted 1 reply to @maintainer-mo. Read and post them.',
      action: { label: 'Approve the reply', href: '/contribute/attempts/A_PR2205/runs/A_TIDE1' },
    });
    const failed = [replyWaiting({ prId: 'PR_2205', attemptId: 'A_TIDE1', state: 'FAILED' })];
    expect(rowOf(quiet, { replies: failed })).toMatchObject({
      kind: 'reply-failed',
      tone: 'red',
      pill: 'Reply not posted',
      move: "GitHub refused the reply. Retry it, or copy it from the run's page and post it on the pull request yourself.",
      action: { label: 'Retry the reply', href: '/contribute/attempts/A_PR2205/runs/A_TIDE1?move=reply-failed' },
    });
    // The API's note says why, and what to do.
    const noted = [
      replyWaiting({
        prId: 'PR_2205',
        attemptId: 'A_TIDE1',
        state: 'FAILED',
        lastError: {
          reason: 'forbidden',
          note: 'GitHub refused the reply: the conversation is locked.',
          at: '2026-10-28T11:00:00.000Z',
        },
      }),
    ];
    expect(rowOf(quiet, { replies: noted }).move).toBe('GitHub refused the reply: the conversation is locked.');
  });

  it('copies the comment that signs an agreement and opens the pull request, with "I posted it"', () => {
    const row = rowOf(prsNeedingYou.agreement);
    expect(row).toMatchObject({
      kind: 'agreement',
      pill: 'Agreement to sign',
      move: `Only you can sign the repo's DCO; its bot records it from this comment on PR #4021, word for word: "I have read the DCO Document and I hereby sign the DCO"`,
      action: {
        label: 'Copy and open the PR ↗',
        external: 'https://github.com/lantern-ui/lantern/pull/4021',
        copy: 'I have read the DCO Document and I hereby sign the DCO',
      },
      secondary: { label: 'I posted it', handled: { prId: 'PR_4021', kinds: ['CLA'], all: true } },
    });
  });

  it('links a CLA signed on a page to that page, else the pull request, with "I signed it"', () => {
    const row = rowOf(prsNeedingYou.cla);
    expect(row).toMatchObject({
      kind: 'cla',
      pill: 'CLA to sign',
      move: 'The repo merges code only from people who signed its CLA (its check: license/cla), and only you can sign it. Sign it on its page; this clears once the check passes.',
      secondary: { label: 'I signed it' },
    });
    expect(externalOf(row)).toBe('https://cla-assistant.io/fern-lang/fern');
    expect(externalOf(rowOf({ ...prsNeedingYou.cla, conventions: undefined }))).toBe(
      'https://github.com/fern-lang/fern/pull/2502',
    );
  });

  it("fixes the title, the description and the changelog on the next step's rules card", () => {
    expect(rowOf(prsNeedingYou.title)).toMatchObject({
      kind: 'title',
      pill: 'Title rule',
      move: 'The repo sets a rule for pull request titles, and this one breaks it. Fix it in one click.',
      action: { label: 'Fix the title', href: '/contribute/attempts/A_PR912?session=next' },
    });
    const template = {
      ...prsNeedingYou.title,
      needsYou: null,
      prIssues: [{ kind: 'TEMPLATE' as const, check: null, message: '', suggestion: null }],
    };
    expect(rowOf(template)).toMatchObject({ kind: 'description', pill: 'Description rule' });
    // No check: the repo leaves its template to the user, who fills it on GitHub from our drafts.
    expect(rowOf(template)).toMatchObject({
      move: "The repo's rules say the person who tested the change fills in the description, so the agent left it empty. Open it for what to write and tick, section by section.",
      action: { label: 'Fill in the description' },
    });
    // The row names the repo's file that asks it, so the user can see where the ask comes from.
    const source = { label: '.github/agents/pr-and-commit-rules.md', url: 'https://github.com/a/b/blob/HEAD/x' };
    expect(rowOf({ ...template, prIssues: [{ ...template.prIssues[0], source }] }).move).toMatch(
      /^The repo's rules \(in its \.github\/agents\/pr-and-commit-rules\.md\) say the person who tested/,
    );
    expect(
      rowOf({
        ...template,
        prIssues: [{ kind: 'TEMPLATE' as const, check: 'PR body', message: '', suggestion: null }],
      }),
    ).toMatchObject({ action: { label: 'Fix the description' } });
    const changelog = {
      ...template,
      prIssues: [{ kind: 'CHANGELOG' as const, check: null, message: '', suggestion: null }],
    };
    expect(rowOf(changelog)).toMatchObject({ kind: 'changelog', pill: 'Changelog rule' });
  });

  it("quotes a review bot's block and leads to what it asks", () => {
    expect(rowOf(prsNeedingYou.bot)).toMatchObject({
      kind: 'bot',
      pill: 'Bot blocks merge',
      move: 'clawsweeper holds the merge until you do what it asks: "Blocked before merge — 1 item remains: Add real behavior proof" Read what it asks.',
      action: { label: 'See what it asks', href: '/contribute/attempts/A_PR190186?session=next' },
    });
  });

  it('brings back a run that changed nothing with what it found, and one that stopped with the next run', () => {
    const found = rowOf({
      ...prsNeedingYou.found,
      needsYou: { since: '', signals: [prsNeedingYou.found.needsYou?.signals[1] ?? signal('RUN_ENDED')] },
    });
    expect(found).toMatchObject({
      kind: 'run-found',
      tone: 'amber',
      pill: 'Only you can do this',
      move: 'Run 1 changed nothing: Add real behavior proof to the PR description: redacted terminal output, logs or a recording of a stopped run.',
      action: { label: 'See what to do' },
    });
    expect(rowOf(prsNeedingYou.stopped)).toMatchObject({
      kind: 'run-stopped',
      tone: 'red',
      pill: 'Run 2 stopped',
      move: 'Run 2 stopped: It reached your limit for one attempt before the fix was done. Start run 3, or handle it yourself.',
      action: { label: 'Try run 3' },
    });
    expect(rowOf(prsNeedingYou.pushFailed)).toMatchObject({
      kind: 'push-failed',
      tone: 'red',
      pill: 'Run 2 not pushed',
      move: "Run 2's commits could not be pushed: The branch changed on GitHub: the commits no longer apply. Start run 3 to make the change again on the pull request as it is now.",
      action: { label: 'Try run 3' },
    });
    // The API's fallback when the push left no note only restates the failure: the row says it once.
    const bare = signal('RUN_ENDED', { detail: 'The push failed (patch_conflict)', round: 2, outcome: 'PUSH_FAILED' });
    expect(
      rowOf(openPr({ needsYou: { since: '', signals: [bare] }, followUps: prsNeedingYou.pushFailed.followUps })).move,
    ).toBe(
      "Run 2's commits could not be pushed. Start run 3 to make the change again on the pull request as it is now.",
    );
    // An API that does not answer the outcome yet: the run's no-go.
    const unread = signal('RUN_ENDED', { detail: 'Nothing to change.' });
    expect(rowOf(openPr({ needsYou: { since: '', signals: [unread] } })).kind).toBe('run-found');
  });

  it('signs off on the next step', () => {
    expect(rowOf(prsNeedingYou.dco)).toMatchObject({
      kind: 'dco',
      tone: 'red',
      pill: 'Sign-off missing',
      move: 'The repo needs your Signed-off-by on every commit, and only you can certify it. One click adds it; the code stays the same.',
      action: { label: 'Sign off and push', href: '/contribute/attempts/A_PR4410?session=next' },
    });
    expect(rowOf({ ...prsNeedingYou.dco, openedBy: 'HAND' }).action).toMatchObject({ label: 'See how to sign off' });
  });

  it('warns of the close a silent pull request faces, with one click to keep it open and no run', () => {
    expect(rowOf(prsOutcomes.silent)).toMatchObject({
      kind: 'silent',
      tone: 'amber',
      pill: 'No answer in 30 days',
      move: "No one has looked at this PR for 30 days. We'll close it on Nov 12 to keep your profile tidy. Click Keep it open to keep it, or close it yourself on GitHub.",
      action: { label: 'See your options', href: '/contribute/attempts/A_PR5120?session=next' },
      secondary: { label: 'Keep it open', handled: { prId: 'PR_5120', kinds: ['SILENT'], all: true } },
    });
    // A full ISO time names its day too; a day it cannot read says "soon".
    const at = (detail: string | null) =>
      rowOf(openPr({ needsYou: { since: '', signals: [signal('SILENT', { detail })] } })).move;
    expect(at('2026-11-12T06:40:00.000Z')).toContain("We'll close it on Nov 12 to keep");
    expect(at(null)).toContain("We'll close it soon to keep");
    expect(at('next week')).toContain("We'll close it soon to keep");
    // Opened by hand: the same, no run either way.
    expect(rowOf({ ...prsOutcomes.silent, openedBy: 'HAND' }).kind).toBe('silent');
  });

  it('says why a repo left Contribute and leaves closing the pull request to the user', () => {
    const out = (detail: string | null) =>
      rowOf(openPr({ needsYou: { since: '', signals: [signal('REPO_OUT', { detail })] } }));
    expect(rowOf(prsOutcomes.repoOut)).toMatchObject({
      kind: 'repo-out',
      tone: 'amber',
      pill: 'Repo out of Contribute',
      move: 'This repo is out of Contribute: a maintainer asked us to stay away. You may want to close this PR. Close it on GitHub, or click Keep it open.',
      action: { label: 'See your options', href: '/contribute/attempts/A_PR5121?session=next' },
      secondary: { label: 'Keep it open', handled: { prId: 'PR_5121', kinds: ['REPO_OUT'], all: true } },
    });
    expect(out('closed_no_ai').move).toBe(
      'This repo is out of Contribute: a maintainer said it takes no AI-made PRs. You may want to close this PR. Close it on GitHub, or click Keep it open.',
    );
    expect(out('pr_misses').move).toBe(
      'This repo has left our PRs unanswered; it is out of the shared pool for 90 days. Close it on GitHub if you no longer want it, or click Keep it open.',
    );
    // A reason this UI does not know yet: still out, no why.
    expect(out('something_new').move).toBe(
      'This repo is out of Contribute. You may want to close this PR. Close it on GitHub, or click Keep it open.',
    );
    // A comment beside the repo's no leads, answered on GitHub: no run goes to a repo that said no.
    const both = (detail: string) =>
      rowOf(openPr({ needsYou: { since: '', signals: [signal('COMMENT'), signal('REPO_OUT', { detail })] } }));
    expect(both('closed_no_ai')).toMatchObject({
      kind: 'comment',
      more: 1,
      move: 'Someone commented on it. Reply on GitHub.',
      action: { label: 'Reply on GitHub ↗' },
    });
    expect(
      rowOf(
        openPr({
          needsYou: {
            since: '',
            signals: [signal('CHANGES_REQUESTED'), signal('REPO_OUT', { detail: 'hostile_close' })],
          },
        }),
      ).move,
    ).toBe('A reviewer asked for changes. Make them on GitHub: no run adds to a pull request in a repo that said no.');
    // Out of the shared pool only: the user's own runs go on.
    expect(both('pr_misses')).toMatchObject({ kind: 'comment', move: expect.stringContaining('Let run') });
  });

  it('still says something of a kind this UI does not know yet', () => {
    const unknown = signal('SOMETHING_NEW' as ContributePrSignalKind, { detail: 'x' });
    expect(rowOf(openPr({ needsYou: { since: '', signals: [unknown] } }))).toMatchObject({
      kind: 'other',
      pill: 'Something changed',
    });
  });

  it('says a fix that failed in place of what it fixed, and what to do by hand, while that still waits', () => {
    expect(rowOf(prsNeedingYou.fixFailed)).toMatchObject({
      kind: 'fix-failed',
      tone: 'red',
      pill: 'A fix failed',
      move: 'Signing off the commits did not go through: The branch moved since GitRanks read it. Try again, or sign off by hand: git rebase --signoff HEAD~N (N: the commits on the pull request), then git push --force-with-lease.',
      more: 0,
      action: { label: 'See what happened', href: '/contribute/attempts/A_PR4411?session=next' },
    });
    // Once the check passes, the failed fix is old news.
    expect(items({ contributions: [{ ...prsNeedingYou.fixFailed, needsYou: null }] }).items).toEqual([]);
    const title = {
      ...prsNeedingYou.fixFailed,
      needsYou: null,
      prFix: { kind: 'TITLE' as const, state: 'FAILED' as const, note: null, at: '2026-10-28T11:00:00.000Z' },
      prIssues: [{ kind: 'TITLE' as const, check: null, message: '', suggestion: 'fix: x' }],
    };
    expect(rowOf(title)).toMatchObject({
      kind: 'fix-failed',
      move: 'Retitling the pull request did not go through. Try again, or make the change on GitHub.',
    });
    // A failed retitle says nothing over the description's rule.
    expect(rowOf({ ...title, prIssues: [{ ...title.prIssues[0], kind: 'TEMPLATE' as const }] }).kind).toBe(
      'description',
    );
  });
});

describe('needsYouItemsOf: the runs at work', () => {
  it('keeps a run the user started in place as a working row, its step and start, not counted', () => {
    const { items: rows, counted, working } = items({ contributions: [prsNeedingYou.working], runs: runsInFlight });
    expect([counted, working]).toEqual([0, 1]);
    expect(rows[0]).toMatchObject({
      kind: 'working',
      tone: 'violet',
      pill: 'Run 2 working',
      working: true,
      move: 'Reading comments · started 2 minutes ago. It comes back here when it is ready.',
      action: { label: 'Watch run 2', href: '/contribute/attempts/A_PR11195/runs/A_FAB2' },
    });
    // Its run not read (queued, or past the read): still in place, starting.
    expect(items({ contributions: [prsNeedingYou.working] }).items[0].move).toBe(
      'Under way. It comes back here when it is ready.',
    );
  });

  it('says a run pushing the commits the user approved, and one back for review as its review', () => {
    const pushing = { ...runsInFlight[0], state: 'SUBMITTING' as const };
    expect(rowOf(prsNeedingYou.working, { runs: [pushing] }).move).toBe('Pushing the commits you approved.');
    const back = { ...runsInFlight[0], state: 'REVIEW' as const };
    expect(rowOf(prsNeedingYou.working, { runs: [back] })).toMatchObject({
      kind: 'run-ready',
      working: false,
      pill: 'Run 2 ready',
      action: { label: 'Review run 2', href: '/contribute/attempts/A_PR11195/runs/A_FAB2' },
    });
  });

  it("says the user's own agent is on a run it did not read, from the pull request's maker", () => {
    expect(rowOf(prsNeedingYou.ownWorking)).toMatchObject({
      kind: 'own-working',
      move: 'Your agent is on it.',
      working: true,
    });
  });

  it("says how long the user's own agent holds its run", () => {
    expect(rowOf(prsNeedingYou.ownWorking, { runs: runsInFlight })).toMatchObject({
      kind: 'own-working',
      pill: 'Run 1 with your agent',
      move: 'Your agent holds it for another 3 hours.',
      working: true,
    });
  });

  it('holds a pull request a run pushed to as working until GitHub is read again, then shows what waits', () => {
    expect(rowOf(prsNeedingYou.pushed)).toMatchObject({
      kind: 'pushed',
      pill: 'Run 1 pushed',
      move: 'Pushed · reading the pull request again.',
      working: true,
      action: { label: 'See the pull request', href: '/contribute/attempts/A_PR1502' },
    });
    const done = attempt({
      attemptId: 'A_LOOM1',
      kind: 'FOLLOW_UP',
      state: 'DONE',
      followUpOf: { ...followUpOf, prId: 'PR_1502' },
      round: followUpRun({ round: 1, attemptId: 'A_LOOM1' }),
    });
    expect(rowOf(prsNeedingYou.pushed, { runs: [done] })).toMatchObject({
      move: 'Pushed 46de700 · reading the pull request again.',
      action: { label: 'Watch run 1', href: '/contribute/attempts/A_PR1502/runs/A_LOOM1' },
    });
    const read = {
      ...prsNeedingYou.pushed,
      pullRequest: { ...prsNeedingYou.pushed.pullRequest, syncedAt: '2026-10-28T11:59:00.000Z' },
    };
    expect(rowOf(read).kind).toBe('comment');
    // A run discarded: nothing was pushed, what waits is shown.
    expect(rowOf(prsNeedingYou.pushed, { runs: [{ ...done, state: 'DISCARDED' }] }).kind).toBe('comment');
  });

  it('shows the sign-off on its way, with nothing to click', () => {
    expect(rowOf(prsNeedingYou.signingOff)).toMatchObject({
      kind: 'signing-off',
      pill: 'Signing off',
      move: 'Rewriting the commits with your sign-off.',
      action: null,
      working: true,
    });
  });
});

describe('needsYouItemsOf: the order', () => {
  it('orders the setup, autopilot, the reviews, the replies, the pull requests oldest first, then the runs at work', () => {
    const {
      items: rows,
      counted,
      working,
    } = needsYouItemsOf({ view: views.keyInvalid, ...needsEverything(), now: NOW });
    // Each pull request's row by its first reason in the table's order: a bot's block before a run's finding.
    expect(rows.map(({ kind }) => kind)).toEqual([
      'key',
      'review',
      'run-ready',
      'bot',
      'bot',
      'changes',
      'comment',
      'check',
      'agreement',
      'cla',
      'title',
      'dco',
      'fix-failed',
      'run-stopped',
      'push-failed',
      'working',
      'pushed',
      'signing-off',
      'own-working',
    ]);
    expect([counted, working]).toEqual([15, 4]);
    expect(rows.slice(-4).every((row) => row.working)).toBe(true);
  });

  it('shows the first five that need the user, then every run at work', () => {
    const { items: rows } = needsYouItemsOf({ view: views.active, ...needsEverything(), now: NOW });
    const shown = shownItemsOf(rows, 5);
    expect(shown).toHaveLength(9);
    expect(shown.slice(0, 5).every((row) => !row.working)).toBe(true);
  });

  it('makes one row of drafts on a pull request the list did not read', () => {
    const { items: rows } = items({ contributions: undefined, replies: [replyWaiting()] });
    expect(rows).toEqual([
      expect.objectContaining({
        kind: 'replies',
        where: 'driftwood-js/driftwood · PR #1419',
        action: expect.objectContaining({ href: '/contribute/attempts/A_F1' }),
      }),
    ]);
  });

  it('leaves out closed and merged pull requests', () => {
    const merged = {
      ...prsNeedingYou.changes,
      pullRequest: { ...prsNeedingYou.changes.pullRequest, state: 'MERGED' as const },
    };
    expect(items({ contributions: [merged] }).items).toEqual([]);
  });
});

describe('the words', () => {
  it('reads a bot, its verdict, a step and a time left', () => {
    expect(botVerdictOf({ detail: 'clawsweeper: Blocked: add proof' })).toEqual({
      by: 'clawsweeper',
      verdict: 'Blocked: add proof',
    });
    expect(botVerdictOf({ detail: 'no bot named' })).toEqual({ by: null, verdict: 'no bot named' });
    expect(runStepOf({ state: 'RUNNING', followUpStep: 'FIXING' })).toBe('Fixing');
    expect(runStepOf({ state: 'CHECKS', followUpStep: null })).toBe('Checks');
    expect(runStepOf({ state: 'QUEUED' } as ContributeAttempt)).toBe('Starting');
    expect(shortLeftOf('2026-10-28T15:00:00.000Z', NOW)).toBe('3 h');
    expect(shortLeftOf(null, NOW)).toBeNull();
    expect(clipped('a  b\nc', 160)).toBe('a b c');
    expect(clipped('x'.repeat(200), 10)).toBe(`${'x'.repeat(9)}…`);
  });
});

describe('the review fixes', () => {
  const bounced = attempt({
    attemptId: 'A_GRANT',
    submit: {
      step: 'FORK',
      waitUntil: null,
      fork: null,
      branch: null,
      lastError: { reason: 'grant_missing', note: 'GitHub access is needed.', at: '2026-10-28T10:00:00.000Z' },
    },
  });

  it('shows a bounced review as a review once GitHub access is granted, and as GitHub access while unread', () => {
    const connected = { ...views.active, grant: { connected: true, login: 'octocat' } };
    expect(items({ reviews: [bounced] }, connected).items.map(({ kind }) => kind)).toEqual(['review']);
    expect(items({ reviews: [bounced] }, views.grantMissing).items.map(({ kind }) => kind)).toEqual(['grant']);
    expect(items({ reviews: [bounced] }, views.fieldsMissing).items.map(({ kind }) => kind)).toEqual(['grant']);
  });

  it('reads every review that can wait, oldest ready first, and counts them all', () => {
    expect(NEEDS_YOU_READ).toBeGreaterThanOrEqual(20);
    // As the API lists them: newest first.
    const reviews = Array.from({ length: 20 }, (_, index) =>
      attempt({ attemptId: `A_${index}`, reviewAt: new Date(Date.UTC(2026, 9, 28 - index)).toISOString() }),
    );
    const needs = items({ reviews });
    expect(shownItemsOf(needs.items, NEEDS_YOU_MAX).map(({ key }) => key)).toEqual([
      'A_19',
      'A_18',
      'A_17',
      'A_16',
      'A_15',
    ]);
    expect(needs.counted).toBe(20);
  });
});

describe('needsYouItemsOf: replies that did not post (one comment)', () => {
  const pr = { ...prsNeedingYou.comment, needsYou: null };
  const prId = pr.pullRequest.prId;
  const at = '2026-10-28T11:00:00.000Z';
  const reply = (runId: string, index: number, patch: Parameters<typeof replyWaiting>[0] = {}) =>
    replyWaiting({
      draftId: `D_${runId}_${index}`,
      prId,
      attemptId: runId,
      nameWithOwner: pr.nameWithOwner,
      prNumber: pr.pullRequest.number,
      postAs: 'THREAD',
      batchId: null,
      waitsForProbe: false,
      canGoInOneComment: false,
      heldBack: null,
      batchRetry: null,
      ...patch,
    });
  const refused = (runId: string, count: number, reason = 'org_restricted', patch = {}) =>
    Array.from({ length: count }, (_, index) =>
      reply(runId, index, {
        state: 'FAILED',
        canGoInOneComment: reason === 'org_restricted' || reason === 'forbidden',
        lastError: { reason, note: `GitHub refused it (${reason}). Post it yourself.`, at },
        ...patch,
      }),
    );
  const runs = [
    attempt({ attemptId: 'A_R1', kind: 'FOLLOW_UP', round: followUpRun({ round: 1, attemptId: 'A_R1' }) }),
    attempt({ attemptId: 'A_R2', kind: 'FOLLOW_UP', round: followUpRun({ round: 2, attemptId: 'A_R2' }) }),
  ];
  const href = (runId: string) => `/contribute/attempts/${pr.attemptId}/runs/${runId}?move=reply-failed`;
  const notPosted = (replies: ContributeReplyWaitingList) => {
    const row = items({ contributions: [pr], replies, runs }).items.find(({ kind }) => kind === 'reply-failed');
    expect(row).toBeDefined();
    return row!;
  };
  type ContributeReplyWaitingList = ReturnType<typeof refused>;

  it('posts several replies the organization kept out of their threads as one comment', () => {
    expect(notPosted(refused('A_R2', 7))).toMatchObject({
      tone: 'red',
      pill: 'Replies not posted',
      move: "Your 7 replies didn't reach GitHub: tidewave only lets apps it has approved post in review threads. Post them as one comment.",
      action: { label: 'Post as one comment', href: href('A_R2') },
    });
    expect(notPosted(refused('A_R2', 2, 'forbidden')).move).toBe(
      "Your 2 replies didn't reach their threads. Post them as one comment.",
    );
  });

  it('posts a lone refused reply as a comment, through the same path', () => {
    expect(notPosted(refused('A_R2', 1, 'forbidden'))).toMatchObject({
      pill: 'Reply not posted',
      move: "Your reply didn't reach its thread. Post it as a comment.",
      action: { label: 'Post as a comment', href: href('A_R2') },
    });
    expect(notPosted(refused('A_R2', 1)).move).toBe(
      "Your reply didn't reach its thread: tidewave only lets apps it has approved post in review threads. Post it as a comment.",
    );
  });

  it('leads with a failed comment: Try again by what it does, else Copy all, or Dismiss once the PR is gone', () => {
    const inComment = (retry: 'RESEND' | 'REBUILD' | null, reason: string) =>
      refused('A_R2', 3, reason, {
        batchId: 'B_1',
        postAs: 'ONE_COMMENT',
        batchRetry: retry,
        canGoInOneComment: false,
        lastError: { reason, note: 'GitHub did not answer clearly. Try again.', at },
      });
    expect(notPosted(inComment('RESEND', 'no_answer'))).toMatchObject({
      move: "Your 3 replies didn't post as one comment. GitHub did not answer clearly.",
      action: { label: 'Try again' },
    });
    expect(notPosted(inComment('REBUILD', 'invalid')).action).toMatchObject({ label: 'Try again' });
    expect(notPosted(inComment(null, 'org_restricted')).action).toMatchObject({ label: 'Copy all 3' });
    expect(notPosted(inComment(null, 'not_found')).action).toMatchObject({ label: 'Dismiss' });
    // GitHub access first, as the card asks for it.
    expect(notPosted(inComment('REBUILD', 'grant_revoked')).action).toMatchObject({ label: 'Allow GitHub access' });
  });

  it('says replies held back once, and they are not also replies to approve', () => {
    const held = Array.from({ length: 6 }, (_, index) =>
      reply('A_R2', index, {
        canGoInOneComment: true,
        heldBack: { reason: 'no_answer', note: 'GitHub did not answer the first reply in time.', at },
      }),
    );
    const fresh = reply('A_R2', 9);
    const rows = items({ contributions: [pr], replies: [...held, fresh], runs }).items;
    expect(rows).toHaveLength(1);
    const { candidatesOf } = needsYouModule;
    const candidates = candidatesOf({ pr, drafts: [...held, fresh], runs, now: NOW });
    expect(candidates.find(({ kind }) => kind === 'replies')?.move).toBe(
      'Run 2 drafted 1 reply to @maintainer-mo. Read and post them.',
    );
    expect(candidates.find(({ kind }) => kind === 'reply-failed')).toMatchObject({
      tone: 'amber',
      move: "Your 6 replies were held back: the first one didn't reach its thread (GitHub did not answer the first reply in time). Post them as one comment.",
      action: { label: 'Post as one comment', href: href('A_R2') },
    });
  });

  it('leaves out replies waiting for the run’s first reply: no row at all', () => {
    const waiting = Array.from({ length: 3 }, (_, index) =>
      reply('A_R2', index, { send: true, waitsForProbe: true, postAs: 'ONE_COMMENT' }),
    );
    expect(items({ contributions: [pr], replies: waiting, runs }).items).toEqual([]);
    // The same on a pull request the contributions read does not list.
    expect(items({ contributions: [], replies: waiting, runs }).items).toEqual([]);
  });

  it('takes one run: the newest with the leading case, the others named in one sentence', () => {
    const row = notPosted([...refused('A_R1', 2), ...refused('A_R2', 3)]);
    expect(row.move).toBe(
      "Your 3 replies didn't reach GitHub: tidewave only lets apps it has approved post in review threads. Post them as one comment. 2 from run 1 wait too: open the pull request's runs.",
    );
    expect(row.action).toMatchObject({ href: href('A_R2') });
  });

  it('leads with the first case on a mix, and names the rest', () => {
    const mix = [
      ...refused('A_R2', 4),
      ...refused('A_R2', 1, 'invalid').map((draft) => ({ ...draft, draftId: 'D_X' })),
    ];
    expect(notPosted(mix).move).toBe(
      "Your 4 replies didn't reach GitHub: tidewave only lets apps it has approved post in review threads. Post them as one comment. 1 more reply didn't post for another reason.",
    );
    const both = [...mix, ...refused('A_R1', 2)];
    expect(notPosted(both).move).toContain(
      "1 more reply didn't post for another reason, and 2 from run 1 wait too: open the pull request's runs.",
    );
  });

  it('retries other failures as before: several sharing a reason, or one', () => {
    expect(notPosted(refused('A_R2', 2, 'no_answer'))).toMatchObject({
      move: "Your 2 replies didn't reach GitHub. GitHub refused it (no_answer).",
      action: { label: 'Retry the replies' },
    });
    expect(notPosted(refused('A_R2', 1, 'no_answer'))).toMatchObject({
      move: 'GitHub refused it (no_answer). Post it yourself.',
      action: { label: 'Retry the reply' },
    });
  });

  it('applies the same rule to replies on a pull request the contributions read does not list', () => {
    const [row] = items({ contributions: [], replies: refused('A_R2', 7), runs }).items;
    expect(row).toMatchObject({
      key: `replies-${prId}`,
      kind: 'reply-failed',
      action: { label: 'Post as one comment', href: '/contribute/attempts/A_R2' },
    });
    expect(row.move).toContain("Your 7 replies didn't reach GitHub");
  });
});
