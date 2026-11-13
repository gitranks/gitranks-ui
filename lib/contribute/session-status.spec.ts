import { describe, expect, it } from 'vitest';

import {
  attempts,
  decisionAttempts,
  detail,
  followUp,
  followUpAttempts,
  followUpRun,
  followUps,
  ownAgentAttempt,
  pullRequest,
  stopped,
} from './__fixtures__/contribute-attempts';
import { NOW, views } from './__fixtures__/contribute-views';
import { END_REASONS, ranOutCapOf } from './attempt-format';
import type { ContributeAttemptEndReason, ContributeSubmitError } from './contribute.types';
import { contributionMovesOf } from './contribution-moves';
import {
  bounceOf,
  firstStatusOf,
  nextStatusOf,
  noRunWhyOf,
  roundLeadOf,
  runStatusOf,
  settledStepsOf,
  stopReasonOf,
} from './session-status';

const first = (patch: Parameters<typeof detail>[0]) => firstStatusOf(detail(patch), { now: NOW });
const error = (reason: string, note = 'GitHub said no. Try later.'): ContributeSubmitError => ({
  reason,
  note,
  at: '2026-10-28T11:30:00.000Z',
});

describe('the first attempt’s status line', () => {
  it('says each live state with its lead', () => {
    expect(first({ state: 'QUEUED' })).toMatchObject({
      title: 'Queued',
      lead: { kind: 'pill', label: 'Queued' },
      fact: 'starts when your limits allow',
    });
    expect(first({ state: 'CLAIMING' })).toMatchObject({ title: 'Checking the issue is still free', live: true });
    expect(firstStatusOf(attempts.running, { now: NOW })).toMatchObject({
      title: 'The agent is working on it',
      lead: { kind: 'dot' },
      fact: 'started 3 hours ago · $0.40 of $5',
    });
    expect(
      firstStatusOf({ ...ownAgentAttempt, state: 'RUNNING', leaseUntil: '2026-10-28T18:00:00.000Z' }, { now: NOW }),
    ).toMatchObject({
      title: 'Your agent holds it',
      lead: { kind: 'pill', label: 'Your agent' },
      fact: 'for another 6 hours',
    });
    expect(firstStatusOf(attempts.checks, { now: NOW }).title).toBe('Running our checks');
    expect(
      first({
        state: 'SUBMITTING',
        submit: { step: 'FORK', waitUntil: null, fork: null, branch: null, lastError: null },
      }).title,
    ).toBe('Opening your pull request');
    expect(
      first({
        state: 'SUBMITTING',
        submit: {
          step: 'WAITING_CAP',
          waitUntil: '2026-10-29T00:00:00.000Z',
          fork: null,
          branch: null,
          lastError: null,
        },
      }),
    ).toMatchObject({ title: "Waiting for tomorrow's pull request slot", fact: 'opens at Oct 29, 00:00 UTC' });
  });

  it('says where the pull request stands: just opened, waiting, approved, merged, closed', () => {
    expect(
      first({ state: 'PR_OPEN', pullRequest: pullRequest({ openedAt: '2026-10-28T11:55:00.000Z' }) }),
    ).toMatchObject({
      title: 'Your pull request is open',
      lead: { kind: 'check' },
    });
    expect(first({ state: 'PR_OPEN', pullRequest: pullRequest() })).toMatchObject({
      title: 'Waiting for the maintainers',
      fact: 'GitRanks keeps reading the PR and brings you back when something needs you.',
    });
    expect(first({ state: 'PR_OPEN', pullRequest: pullRequest({ reviewDecision: 'APPROVED' }) }).title).toBe(
      'Approved, waiting for a merge',
    );
    expect(
      firstStatusOf(detail({ state: 'PR_OPEN', pullRequest: pullRequest() }), { now: NOW, elsewhere: true }).title,
    ).toBe('Your pull request is open');
    expect(first({ state: 'MERGED', pullRequest: pullRequest({ state: 'MERGED' }) })).toMatchObject({
      title: 'Merged',
      fact: 'counts toward your contribution stars',
    });
    expect(first({ state: 'CLOSED', pullRequest: pullRequest({ state: 'CLOSED' }) })).toMatchObject({
      title: 'Closed without merging',
      link: { label: 'See why on GitHub ↗', external: true },
    });
  });

  it('points at the run under way', () => {
    const line = firstStatusOf(followUpAttempts.underWay, {
      now: NOW,
      current: followUp({
        state: 'RUNNING',
        events: [{ state: 'RUNNING', detail: 'go: sent', at: NOW.toISOString() }],
      }),
      runNumber: 1,
    });
    expect(line).toMatchObject({ title: 'Run 1 is fixing', link: { label: 'Watch run 1 →' }, live: true });
  });

  it('says a stop short, its spend, and the end move’s link', () => {
    const budget = firstStatusOf(stopped('BUDGET'), { now: NOW });
    expect(budget).toMatchObject({
      title: 'Stopped: reached your $5 limit per run',
      lead: { kind: 'pill', label: 'Stopped' },
      link: { label: 'Open More limits →' },
    });
    expect(budget.fact).toMatch(/spent; the issue went back to the pool$/);
    const failed = firstStatusOf(
      detail({
        ...stopped('SUBMIT_FAILED'),
        submit: { step: 'PUSH', waitUntil: null, fork: null, branch: null, lastError: error('transient') },
      }),
      { now: NOW },
    );
    expect(failed).toMatchObject({
      title: 'Stopped: the pull request could not be opened',
      lead: { kind: 'pill', label: 'Failed', tone: 'red' },
    });
  });

  it('leaves the no-go’s reason and the limit note to the decisions card when it shows them', () => {
    const noGo = firstStatusOf(decisionAttempts.noGo, { now: NOW });
    expect(noGo.title).toBe('Stopped: the agent said no-go');
    expect(noGo.details.join(' ')).not.toMatch(/Someone else is on this one/);
    const plain = firstStatusOf(stopped('NO_GO', 'The issue is already fixed on main.'), { now: NOW });
    expect(plain.details.join(' ')).toMatch(/Its reason: The issue is already fixed on main\./);
  });

  it('says a check that ran out with its amount when the detail names it, and without when not', () => {
    expect(firstStatusOf(decisionAttempts.ranOut, { now: NOW }).title).toBe(
      'Stopped: ran out of the $0.60 check budget',
    );
    const time = detail({
      ...stopped('NO_GO', 'No verdict: it was on "Reading" when the check\'s 15-minute limit ran out.'),
      checkLimit: { limit: 'time', decided: false },
    });
    expect(stopReasonOf(time)).toBe('ran out of the 15-minute check limit');
    const bare = detail({ ...stopped('NO_GO', 'No verdict.'), checkLimit: { limit: 'budget', decided: false } });
    expect(stopReasonOf(bare)).toBe('ran out of the check budget');
    expect(stopReasonOf({ ...bare, checkLimit: { limit: 'time', decided: false } })).toBe(
      "ran out of the check's time limit",
    );
    expect(ranOutCapOf(decisionAttempts.ranOut.endDetail)).toEqual({ amount: '$0.60' });
    expect(ranOutCapOf(null)).toEqual({ amount: null });
  });

  it('says a discard, and a claim the repo refused', () => {
    const discarded = firstStatusOf(detail({ state: 'DISCARDED', endReason: 'CANCELLED' }), { now: NOW });
    expect(discarded).toMatchObject({ title: 'Discarded', lead: { kind: 'pill', label: 'Discarded' } });
    expect(discarded.fact).toBe(
      'It was cancelled before it finished. The issue went back to the pool, and nothing was submitted.',
    );
    const refused = firstStatusOf(detail({ state: 'DISCARDED', endReason: 'CANCELLED', endDetail: 'repo_no_gfi' }), {
      now: NOW,
    });
    expect(refused.fact).toMatch(/Nothing was submitted\.$/);
    expect(refused.details).toHaveLength(2);
  });

  it('says a state this UI does not know by its name', () => {
    expect(first({ state: 'ARCHIVED' as never })).toMatchObject({
      fact: 'More about this state is not available yet.',
    });
  });

  it('never ends empty, nor says "Pushed", for any end reason', () => {
    for (const reason of Object.keys(END_REASONS) as ContributeAttemptEndReason[]) {
      for (const state of ['STOPPED', 'DISCARDED'] as const) {
        for (const kind of ['FIRST', 'FOLLOW_UP'] as const) {
          const attempt = detail({ ...stopped(reason), state, kind });
          const line =
            kind === 'FIRST' ? firstStatusOf(attempt, { now: NOW }) : runStatusOf(attempt, { now: NOW, round: 2 });
          expect(line.title.trim()).not.toBe('');
          expect(line.title).not.toMatch(/Pushed/);
        }
      }
    }
  });
});

describe('a run’s status line', () => {
  const run = (patch: Parameters<typeof followUp>[0]) => runStatusOf(followUp(patch), { now: NOW, round: 2 });

  it('says each live state', () => {
    expect(run({ state: 'QUEUED' }).title).toBe('Run 2 is queued');
    expect(run({ state: 'CLAIMING' }).title).toBe('Run 2 is starting');
    const reading = run({ state: 'RUNNING', events: [] });
    expect(reading.title).toBe('Run 2 is reading the comments');
    expect(reading.bar?.map(({ label, state }) => `${label}:${state}`)).toEqual([
      'Reading:current',
      'Fixing:pending',
      'Checks:pending',
      'Ready:pending',
    ]);
    expect(run({ state: 'CHECKS' }).title).toBe('Run 2 is running checks');
    expect(run({ state: 'SUBMITTING' }).title).toBe('Pushing run 2');
  });

  it('says a pushed run with its sha, and never "Pushed" without one', () => {
    const pushed = runStatusOf(followUp({ state: 'DONE', replyDrafts: [] }), {
      now: NOW,
      round: 1,
      entry: followUpRun(),
      reading: true,
    });
    expect(pushed).toMatchObject({
      title: 'Run 1 pushed 46de700',
      fact: '2 fixed · 1 replied · reading the pull request again',
    });
    const noCommits = runStatusOf(followUp({ state: 'DONE', patch: null, replyDrafts: [] }), {
      now: NOW,
      round: 1,
      entry: followUpRun({ pushedSha: null, replied: 2 }),
    });
    expect(noCommits.title).toBe('Run 1 posted 2 replies');
    const nothing = runStatusOf(followUp({ state: 'DONE', patch: null, replyDrafts: [] }), {
      now: NOW,
      round: 1,
      entry: followUpRun({ pushedSha: null, replied: 0 }),
    });
    expect(nothing.title).toBe('Run 1 is done, nothing to post');
    expect(roundLeadOf(followUpRun({ pushedSha: null, replied: 0 }))).toBe('Run 1 is done, nothing to post');
  });

  it('says the replies still going out after the push', () => {
    expect(runStatusOf(followUpAttempts.done, { now: NOW, round: 1 }).title).toBe("Posting run 1's replies");
  });

  it('says a run that wrote nothing in plain words, with no commit words', () => {
    const empty = runStatusOf(
      followUp({ state: 'STOPPED', endReason: 'CHECKS_FAILED', endDetail: 'not_empty', patch: null }),
      { now: NOW, round: 2 },
    );
    expect(empty.title).toBe('Stopped: the agent wrote no commit and no reply');
    expect(empty.fact).toMatch(/nothing was pushed or posted$/);
    expect(runStatusOf(followUp({ state: 'DISCARDED', endReason: 'USER' }), { now: NOW, round: 2 }).fact).toMatch(
      /^You discarded it\. Nothing was pushed or posted\./,
    );
  });
});

describe('the next pane’s line', () => {
  it('says nothing waits, comments wait with no run, or the sign-off on its way', () => {
    expect(nextStatusOf({ prNumber: 1419, prUrl: null, waiting: 0, noRun: null, signingOff: false }).title).toBe(
      'Nothing waits on #1419',
    );
    expect(
      nextStatusOf({
        prNumber: 1419,
        prUrl: 'https://github.com/o/r/pull/1419',
        waiting: 3,
        noRun: 'hand',
        signingOff: false,
      }),
    ).toMatchObject({
      title: '3 comments wait for an answer',
      fact: noRunWhyOf('hand'),
      link: { label: 'Open #1419 on GitHub ↗' },
    });
    expect(noRunWhyOf('said-no')).toBe(
      'The repo said no to AI-made pull requests, so no run adds to this one: answer these on GitHub.',
    );
    expect(noRunWhyOf('stopped')).toBe('Answer them on GitHub.');
    expect(nextStatusOf({ prNumber: 1, prUrl: null, waiting: 0, noRun: null, signingOff: true }).title).toBe(
      'Signing off the commits',
    );
  });

  it('pairs each passive lead with its pill: the model reads the same line', () => {
    const model = contributionMovesOf({ view: views.active, first: followUpAttempts.quiet, now: NOW });
    expect(model.sessions.next).toEqual({
      pill: { label: 'Not started', tone: 'neutral' },
      statusLead: 'Nothing waits on #1419',
    });
    expect(model.sessions.first).toEqual({
      pill: { label: 'PR open', tone: 'green' },
      statusLead: 'Waiting for the maintainers',
    });
  });
});

describe('a submit that came back for approval', () => {
  it('says each reason with its tone, title and way on', () => {
    expect(bounceOf(error('org_restricted'), 'PUSH')).toMatchObject({
      tone: 'amber',
      title: "The organization hasn't approved GitRanks yet",
      tryAgain: true,
      secondary: 'org-access',
    });
    expect(bounceOf(error('sync_workflows'), 'SYNC')).toMatchObject({ secondary: 'fork-sync', tryAgain: true });
    expect(bounceOf(error('sync_conflict'), 'SYNC').secondary).toBe('fork-page');
    expect(bounceOf(error('branch_conflict'), 'PUSH').secondary).toBe('fork-branches');
    expect(bounceOf(error('fork_timeout'), 'FORK').why).toBe('Try again in a few minutes.');
    for (const reason of ['repo_busy', 'repo_month_cap', 'repo_open_cap', 'repo_open_cap_all_users']) {
      expect(bounceOf(error(reason), 'QUEUED')).toMatchObject({
        tone: 'amber',
        title: 'The repo takes no more pull requests from GitRanks for now',
        tryAgain: false,
        secondary: 'repo-rules',
      });
    }
    expect(bounceOf(error('invalid'), 'PULL_REQUEST')).toMatchObject({ tone: 'red', tryAgain: true });
    expect(bounceOf(error('no_contributor'), 'FORK')).toMatchObject({
      tryAgain: false,
      why: 'Sign in again, then approve again.',
    });
    expect(bounceOf(error('transient'), 'PUSH').title).toBe("The push to your fork didn't go through");
    expect(bounceOf(error('error'), 'FORK').title).toBe("Your fork wasn't created");
    expect(bounceOf(error('error'), 'QUEUED').title).toBe("The submit didn't go through");
    expect(bounceOf(error('transient', 'First sentence. Second one.'), 'PUSH').why).toBe('First sentence.');
  });

  it('settles the steps on one line', () => {
    expect(
      settledStepsOf({
        step: 'PUSH',
        lastError: error('transient'),
        steps: [
          { step: 'FORK', doneAt: '2026-10-28T11:00:00.000Z' },
          { step: 'SYNC', doneAt: '2026-10-28T11:01:00.000Z' },
        ],
      }),
    ).toBe('Fork ✓ · Sync ✓ · Push ✕ · Open PR · · Oct 28, 11:30 UTC');
  });

  it('gives a run whose branch moved no "again": discard, then the next run', () => {
    const run = followUp({
      submit: { step: 'PUSH', waitUntil: null, fork: null, branch: null, lastError: error('branch_conflict') },
    });
    const page = detail({ ...followUpAttempts.underWay, followUps: followUps({ used: 1, currentAttemptId: 'A_F1' }) });
    const [move] = contributionMovesOf({ view: views.active, first: page, current: run, now: NOW }).moves;
    expect(move).toMatchObject({
      card: 'run-ready',
      tone: 'amber',
      kindLine: 'Run 1 · the push failed',
      title: "Run 1's commits can't go onto the branch now",
    });
    expect(move.data.card === 'run-ready' && move.data.variant).toBe('branch-conflict');
  });
});
