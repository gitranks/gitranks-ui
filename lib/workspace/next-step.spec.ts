import { describe, expect, it } from 'vitest';

import type { ContributeAttemptDetail } from './contribute.types';
import { contributionMovesOf, headOf } from './contribution-moves';
import { contributionOf, defaultNoteOf, nextStepOf } from './next-step';
import { feedbackThread, followUp, followUps } from '@/lib/contribute/__fixtures__/contribute-attempts';
import { NOW, views } from '@/lib/contribute/__fixtures__/contribute-views';
import {
  nextForAgreement,
  nextForChecks,
  nextForCheckYours,
  nextForConversation,
  nextForDco,
  nextForRepoOut,
  nextForRun,
  nextForSilent,
  nextForYou,
  signal,
} from '@/lib/contribute/__fixtures__/needs-you';

/** The contribution's moves, as the page reads them beside the first attempt. */
const movesOf = (first: ContributeAttemptDetail, current?: ContributeAttemptDetail) =>
  contributionMovesOf({ view: views.active, first, current, now: NOW });

describe('defaultNoteOf', () => {
  it('fills the note in from the failing checks and the comments, with who wrote them', () => {
    const threads = [
      feedbackThread({ author: 'ana' }),
      feedbackThread({ commentId: 'C_2', author: 'ana' }),
      feedbackThread({ commentId: 'C_3', author: 'bo' }),
    ];
    expect(defaultNoteOf([signal('CHECK_FAILED', { detail: 'lint, test' })], threads)).toBe(
      'Fix the failing checks (lint, test) and address the 3 review comments from @ana and @bo.',
    );
    expect(defaultNoteOf([signal('CHECK_FAILED', { detail: 'lint' })], [])).toBe('Fix the failing check (lint).');
    expect(defaultNoteOf([signal('CHANGES_REQUESTED'), signal('COMMENT')], [])).toBe(
      'Address the requested changes and answer the new comment on the pull request.',
    );
    expect(defaultNoteOf([], [feedbackThread({ author: null })])).toBe('Address the review comment.');
    expect(defaultNoteOf([], [])).toBe('');
  });
});

describe('nextStepOf', () => {
  it('recommends the run on what it can act on, its note filled in, with nothing left to the user', () => {
    const step = nextStepOf(nextForRun, false, NOW);
    expect(step.run).toMatchObject({
      round: 2,
      open: true,
      recommended: true,
      kinds: ['CHANGES_REQUESTED', 'CHECK_FAILED'],
      note: 'Fix the failing checks (lint, test (ubuntu)) and address the 2 review comments from @ana-kelp.',
    });
    expect(step.user).toEqual([]);
    expect([step.rules, step.dco]).toEqual([null, null]);
    expect(movesOf(nextForRun).moves.map(({ card }) => card)).toEqual(['next-run']);
  });

  it("gives a bot's block and a run's finding one card, what the run found, and \"I've done it\" for both", () => {
    const step = nextStepOf(nextForYou, false, NOW);
    expect(step.run.recommended).toBe(false);
    expect(step.user).toEqual([
      {
        kind: 'found',
        kinds: ['BOT_BLOCKED', 'RUN_ENDED'],
        bot: {
          by: 'clawsweeper',
          verdict: 'Blocked before merge — 1 item remains: Add real behavior proof',
          at: '2026-10-28T04:00:00.000Z',
        },
        run: {
          round: 1,
          outcome: 'no_go',
          detail:
            'Add real behavior proof to the PR description: redacted terminal output, logs or a recording of a stopped run',
          at: '2026-10-28T10:52:00.000Z',
          costUsd: 0.31,
        },
      },
    ]);
  });

  it('gives a run that stopped its own card, to try the next', () => {
    const stopped = signal('RUN_ENDED', { detail: 'Ran out of budget', round: 1, outcome: 'STOPPED' });
    const step = nextStepOf({ ...nextForYou, needsYou: { since: '', signals: [stopped] } }, false, NOW);
    expect(step.user).toEqual([
      expect.objectContaining({ kind: 'stopped', kinds: ['RUN_ENDED'], run: expect.objectContaining({ round: 1 }) }),
    ]);
  });

  it('gives a run whose commits failed to push the same card, its note to make the change again', () => {
    const failed = signal('RUN_ENDED', { detail: 'the branch moved', round: 1, outcome: 'PUSH_FAILED' });
    const step = nextStepOf({ ...nextForYou, needsYou: { since: '', signals: [failed] } }, false, NOW);
    expect(step.user).toEqual([
      expect.objectContaining({ kind: 'stopped', run: expect.objectContaining({ round: 1, outcome: 'push_failed' }) }),
    ]);
    expect(step.run.note).toBe(
      "Run 1's commits could not be pushed (the branch moved). Make the change again on the pull request as it is now.",
    );
  });

  it('gives an agreement signed by a comment its card, and leaves its line out of the rules card', () => {
    const step = nextStepOf(nextForAgreement, false, NOW);
    expect(step.user).toEqual([
      {
        kind: 'agreement',
        kinds: ['CLA'],
        agreement: 'DCO',
        signComment: 'I have read the DCO Document and I hereby sign the DCO',
        signUrl: 'https://github.com/lantern-ui/lantern/blob/main/.github/DCO.md',
        check: 'DCO',
      },
    ]);
    expect(step.rules).toBeNull();
  });

  it('gives a missing sign-off the DCO card: to push on a pull request of ours, by hand on one opened by hand', () => {
    expect(nextStepOf(nextForDco, false, NOW).dco).toEqual({ missing: true, fix: null, canPush: true });
    expect(nextStepOf({ ...nextForDco, openedBy: 'HAND' }, false, NOW).dco?.canPush).toBe(false);
    const sending = {
      kind: 'SIGN_OFF' as const,
      state: 'SENDING' as const,
      note: null,
      at: '2026-10-28T11:00:00.000Z',
    };
    expect(nextStepOf({ ...nextForDco, needsYou: null, prFix: sending }, false, NOW).dco).toEqual({
      missing: false,
      fix: sending,
      canPush: true,
    });
    // The sign-off's fix is the DCO card's, never the rules card's.
    expect(nextStepOf({ ...nextForDco, prFix: sending }, false, NOW).rules).toBeNull();
  });

  it("gives the rules card the repo's rules, and a title with no fix read a card of its own", () => {
    const issue = { kind: 'TITLE' as const, check: null, message: 'Use type(scope): summary', suggestion: 'fix: x' };
    expect(nextStepOf({ ...nextForDco, needsYou: null, prIssues: [issue] }, false, NOW).rules).toEqual({
      issues: [issue],
      fix: null,
    });
    const title = signal('TITLE', { detail: 'Fix the thing' });
    expect(nextStepOf({ ...nextForDco, needsYou: { since: '', signals: [title] } }, false, NOW).user).toEqual([
      { kind: 'title', kinds: ['TITLE'], title: 'Fix the thing' },
    ]);
  });

  it('gives a silent pull request and a repo out of Contribute a card each, and no run for them', () => {
    const silent = nextStepOf(nextForSilent, false, NOW);
    expect(silent.user).toEqual([
      { kind: 'silent', kinds: ['SILENT'], closesOn: '2026-11-12', at: '2026-10-28T06:00:00.000Z' },
    ]);
    expect(silent.run).toMatchObject({ recommended: false, signals: [], kinds: [], note: '' });
    expect(movesOf(nextForSilent).moves.map(({ card }) => card)).toEqual(['silent']);

    const out = nextStepOf(nextForRepoOut, false, NOW);
    expect(out.user).toEqual([
      { kind: 'repo-out', kinds: ['REPO_OUT'], reason: 'hostile_close', at: '2026-10-28T07:00:00.000Z' },
    ]);
    expect(out.run).toMatchObject({ recommended: false, signals: [] });
    const unknown = signal('REPO_OUT', { detail: 'something_new' });
    expect(nextStepOf({ ...nextForRepoOut, needsYou: { since: '', signals: [unknown] } }, false, NOW).user).toEqual([
      expect.objectContaining({ kind: 'repo-out', reason: null }),
    ]);
  });

  it('gives a comment in the conversation and the checks only the user can clear a card each, and no run for them', () => {
    const talk = nextStepOf(nextForConversation, false, NOW);
    expect(talk.user).toEqual([{ kind: 'conversation', kinds: ['CONVERSATION'], at: '2026-10-28T09:30:00.000Z' }]);
    // A run may still start with the user's own note; none is recommended, nothing is ticked or filled in for it.
    expect(talk.run).toMatchObject({ open: true, recommended: false, signals: [], kinds: [], note: '' });
    expect(movesOf(nextForConversation).moves.map(({ card, kinds }) => `${card}:${kinds}`)).toEqual([
      'conversation:conversation',
    ]);

    const yours = nextStepOf(nextForCheckYours, false, NOW);
    expect(yours.user).toEqual([
      {
        kind: 'check-yours',
        kinds: ['CHECK_YOURS'],
        detail:
          'deploy-preview: a maintainer must approve the preview for a fork, ask in the pull request; e2e (merge): bring the base branch into yours, it fails only on the merge',
        round: 2,
        at: '2026-10-28T10:20:00.000Z',
      },
    ]);
    expect(yours.run).toMatchObject({ recommended: false, signals: [], kinds: [], note: '' });
    expect(movesOf(nextForCheckYours).moves.map(({ card, kinds }) => `${card}:${kinds}`)).toEqual([
      'check-yours:check-yours',
    ]);
    // No "run recommended" card for either, alone or together.
    const together = {
      ...nextForConversation,
      needsYou: { since: '', signals: [signal('CONVERSATION'), signal('CHECK_YOURS', { detail: null })] },
    };
    expect(nextStepOf(together, false, NOW).run).toMatchObject({ recommended: false, signals: [] });
    expect(movesOf(together).moves.map(({ card }) => card)).toEqual(['conversation', 'check-yours']);
    expect(nextStepOf(together, false, NOW).user[1]).toMatchObject({ kind: 'check-yours', detail: null, round: null });
  });

  it('still recommends the run for what it can act on beside them, and leaves both out of it', () => {
    const beside = {
      ...nextForRun,
      needsYou: {
        since: '',
        signals: [
          ...(nextForRun.needsYou?.signals ?? []),
          signal('CONVERSATION'),
          signal('CHECK_YOURS', { detail: 'deploy-preview: approve it', round: 1 }),
        ],
      },
    };
    const step = nextStepOf(beside, false, NOW);
    expect(step.run).toMatchObject({
      open: true,
      recommended: true,
      kinds: ['CHANGES_REQUESTED', 'CHECK_FAILED'],
      // The note is the run's own work: neither the conversation nor the user's checks are in it.
      note: 'Fix the failing checks (lint, test (ubuntu)) and address the 2 review comments from @ana-kelp.',
    });
    expect(step.user.map(({ kind }) => kind)).toEqual(['conversation', 'check-yours']);
    expect(movesOf(beside).moves.map(({ card }) => card)).toEqual(['next-run', 'conversation', 'check-yours']);
    // A review comment and a conversation comment at once: the run answers the first, the second is the user's.
    const comments = {
      ...nextForChecks,
      needsYou: { since: '', signals: [signal('COMMENT'), signal('CONVERSATION')] },
    };
    expect(nextStepOf(comments, false, NOW).run).toMatchObject({
      recommended: true,
      kinds: ['COMMENT'],
      note: 'Answer the new comment on the pull request.',
    });
    expect(movesOf(comments).moves.map(({ card, kinds }) => `${card}:${kinds}`)).toEqual([
      'next-run:comment',
      'conversation:conversation',
    ]);
  });

  it('offers no run in a repo that said no to AI-made PRs, whatever else waits; one out of the pool only keeps it', () => {
    const beside = (detail: string) =>
      nextStepOf(
        {
          ...nextForRun,
          needsYou: {
            since: '',
            signals: [...(nextForRun.needsYou?.signals ?? []), signal('REPO_OUT', { detail })],
          },
        },
        false,
        NOW,
      );
    for (const detail of ['hostile_close', 'closed_no_ai']) {
      const step = beside(detail);
      expect(step.run).toMatchObject({ open: false, recommended: false });
      expect(step.user).toEqual([expect.objectContaining({ kind: 'repo-out', reason: detail })]);
    }
    expect(beside('pr_misses').run).toMatchObject({ open: true, recommended: true });
    // On the other sessions, the repo's no leads: the first attempt's line points at it.
    const saidNo = { since: '', signals: [signal('REPO_OUT', { detail: 'hostile_close' })] };
    const head = headOf(movesOf({ ...nextForRun, reviewFeedback: null, needsYou: saidNo }), 'first');
    expect(head.kind === 'status' && head.elsewhere?.kinds).toEqual(['repo-out']);
  });

  it('sees nothing waiting on a quiet pull request', () => {
    const quiet = nextStepOf({ ...nextForDco, needsYou: null }, false, NOW);
    expect([quiet.user, quiet.rules, quiet.dco, quiet.run.signals]).toEqual([[], null, null, []]);
    expect(movesOf({ ...nextForDco, needsYou: null }).moves).toEqual([]);
  });
});

describe('the move on the other sessions', () => {
  it("leads with the pull request's move as Needs you does, the comments too, and points at the run at work", () => {
    const checks = movesOf(nextForChecks);
    expect(checks.moves[0]).toMatchObject({ card: 'next-run', kinds: ['check'], session: 'next' });
    expect(movesOf({ ...nextForRun, needsYou: null }).moves[0]).toMatchObject({
      kinds: ['threads'],
      title: 'Address 2 comments from ana-kelp',
    });
    const run = followUp({
      attemptId: 'A_F2',
      state: 'CHECKS',
      createdAt: '2026-10-28T11:50:00.000Z',
      followUpOf: { ...followUp().followUpOf!, attemptId: 'A_8', prId: 'PR_8' },
    });
    const underWay = { ...nextForRun, followUps: followUps({ used: 2, currentAttemptId: 'A_F2' }) };
    const working = movesOf(underWay, run);
    expect(working.moves).toEqual([]);
    expect(working.sessions.first?.statusLead).toBe('Run 2 is running checks');
    expect(working.sessions['run:A_F2']?.pill).toEqual({ label: 'Working', tone: 'violet', live: true });
    expect(movesOf({ ...nextForDco, needsYou: null }).moves).toEqual([]);
    // A run back for review: its own move, held by the run, never "working".
    const ready = movesOf(underWay, { ...run, state: 'REVIEW' });
    expect(ready.moves[0]).toMatchObject({ card: 'run-ready', session: 'run:A_F2', kindLine: 'Run 2 · ready for you' });
  });

  it('reads the first attempt as a list reads its pull request, and nothing before there is one', () => {
    expect(contributionOf(nextForAgreement)).toMatchObject({
      attemptId: 'A_C',
      issueNumber: 3870,
      conventions: { cla: { signComment: 'I have read the DCO Document and I hereby sign the DCO' } },
    });
    expect(contributionOf({ ...nextForAgreement, pullRequest: null })).toBeNull();
  });
});
