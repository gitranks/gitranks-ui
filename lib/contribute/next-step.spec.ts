import { describe, expect, it } from 'vitest';

import { attempt, feedbackThread, followUpOf, followUpRun, followUps } from './__fixtures__/contribute-attempts';
import { NOW } from './__fixtures__/contribute-views';
import { nextForAgreement, nextForChecks, nextForDco, nextForRun, nextForYou, signal } from './__fixtures__/needs-you';
import { contributionOf, defaultNoteOf, nextStepOf, nextStepWaits, yourMoveOf } from './next-step';

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
    const step = nextStepOf(nextForRun);
    expect(step.run).toMatchObject({
      round: 2,
      open: true,
      recommended: true,
      kinds: ['CHANGES_REQUESTED', 'CHECK_FAILED'],
      note: 'Fix the failing checks (lint, test (ubuntu)) and address the 2 review comments from @ana-kelp.',
    });
    expect(step.user).toEqual([]);
    expect([step.rules, step.dco]).toEqual([null, null]);
    expect(nextStepWaits(step)).toBe(true);
  });

  it("gives a bot's block and a run's finding one card, what the run found, and \"I've done it\" for both", () => {
    const step = nextStepOf(nextForYou);
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
    const step = nextStepOf({ ...nextForYou, needsYou: { since: '', signals: [stopped] } });
    expect(step.user).toEqual([
      expect.objectContaining({ kind: 'stopped', kinds: ['RUN_ENDED'], run: expect.objectContaining({ round: 1 }) }),
    ]);
  });

  it('gives an agreement signed by a comment its card, and leaves its line out of the rules card', () => {
    const step = nextStepOf(nextForAgreement);
    expect(step.user).toEqual([
      {
        kind: 'agreement',
        kinds: ['CLA'],
        agreement: 'DCO',
        signComment: 'I have read the DCO Document and I hereby sign the DCO',
        signUrl: 'https://github.com/carbon-design-system/carbon/blob/main/.github/DCO.md',
        check: 'DCO',
      },
    ]);
    expect(step.rules).toBeNull();
  });

  it('gives a missing sign-off the DCO card: to push on a pull request of ours, by hand on one opened by hand', () => {
    expect(nextStepOf(nextForDco).dco).toEqual({ missing: true, fix: null, canPush: true });
    expect(nextStepOf({ ...nextForDco, openedBy: 'HAND' }).dco?.canPush).toBe(false);
    const sending = {
      kind: 'SIGN_OFF' as const,
      state: 'SENDING' as const,
      note: null,
      at: '2026-10-28T11:00:00.000Z',
    };
    expect(nextStepOf({ ...nextForDco, needsYou: null, prFix: sending }).dco).toEqual({
      missing: false,
      fix: sending,
      canPush: true,
    });
    // The sign-off's fix is the DCO card's, never the rules card's.
    expect(nextStepOf({ ...nextForDco, prFix: sending }).rules).toBeNull();
  });

  it("gives the rules card the repo's rules, and a title with no fix read a card of its own", () => {
    const issue = { kind: 'TITLE' as const, check: null, message: 'Use type(scope): summary', suggestion: 'fix: x' };
    expect(nextStepOf({ ...nextForDco, needsYou: null, prIssues: [issue] }).rules).toEqual({
      issues: [issue],
      fix: null,
    });
    const title = signal('TITLE', { detail: 'Fix the thing' });
    expect(nextStepOf({ ...nextForDco, needsYou: { since: '', signals: [title] } }).user).toEqual([
      { kind: 'title', kinds: ['TITLE'], title: 'Fix the thing' },
    ]);
  });

  it('sees nothing waiting on a quiet pull request', () => {
    expect(nextStepWaits(nextStepOf({ ...nextForDco, needsYou: null }))).toBe(false);
  });
});

describe('yourMoveOf', () => {
  it("says the pull request's move as Needs you does, the comments too, and the run at work", () => {
    expect(yourMoveOf(nextForChecks, [], NOW)?.move).toBe(
      'lint, test (ubuntu) fail on your pull request. Start run 2 to fix it.',
    );
    expect(yourMoveOf({ ...nextForRun, needsYou: null }, [], NOW)).toMatchObject({
      move: '2 comments wait for an answer. Start run 2 on them.',
      working: false,
    });
    const run = attempt({
      attemptId: 'A_F2',
      kind: 'FOLLOW_UP',
      state: 'CHECKS',
      followUpOf,
      createdAt: '2026-10-28T11:50:00.000Z',
    });
    const underWay = { ...nextForRun, followUps: followUps({ used: 2, currentAttemptId: 'A_F2' }) };
    expect(yourMoveOf(underWay, [run], NOW)).toMatchObject({
      working: true,
      pill: 'Run 2 working',
      move: 'Checks · started 10 minutes ago. It comes back here when it is ready.',
    });
    expect(yourMoveOf({ ...nextForDco, needsYou: null }, [], NOW)).toBeNull();
    // A run back for review, known from the rounds alone: its review, never "working".
    const ready = {
      ...nextForRun,
      followUps: followUps({
        used: 2,
        currentAttemptId: 'A_F2',
        history: [followUpRun(), followUpRun({ round: 2, attemptId: 'A_F2', state: 'REVIEW', fixed: 1 })],
      }),
    };
    expect(yourMoveOf(ready, [], NOW)).toMatchObject({
      kind: 'run-ready',
      working: false,
      move: 'Run 2 fixed 1 comment. Approve to push it.',
      action: { label: 'Review run 2', href: '/contribute/attempts/A_F2' },
    });
  });

  it('reads the first attempt as a list reads its pull request, and nothing before there is one', () => {
    expect(contributionOf(nextForAgreement)).toMatchObject({
      attemptId: 'A_C',
      issueNumber: 18389,
      conventions: { cla: { signComment: 'I have read the DCO Document and I hereby sign the DCO' } },
    });
    expect(contributionOf({ ...nextForAgreement, pullRequest: null })).toBeNull();
  });
});
