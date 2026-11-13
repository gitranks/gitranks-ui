import { describe, expect, it } from 'vitest';

import {
  detail,
  feedbackThread,
  followUp,
  followUpAttempts,
  followUpRun,
  followUps,
  ownAgentAttempt,
  pullRequest,
} from './__fixtures__/contribute-attempts';
import { replyWaiting } from './__fixtures__/contribute-overview';
import { NOW, views } from './__fixtures__/contribute-views';
import { prNotes } from './__fixtures__/maintainers';
import {
  nextForAgreement,
  nextForDco,
  nextForProof,
  nextForRepoOut,
  nextForRun,
  nextForSilent,
  nextForYou,
  signal,
} from './__fixtures__/needs-you';
import type { ContributeAttemptDetail, ContributeReplyWaiting, ContributeView } from './contribute.types';
import {
  addressTitleOf,
  cardReasonsOf,
  contributionMovesOf,
  elsewhereLabelOf,
  headOf,
  type MovesInput,
} from './contribution-moves';
import { prItemOf } from './needs-you';
import { contributionOf } from './next-step';

const model = (first: ContributeAttemptDetail | undefined, patch: Partial<MovesInput> = {}) =>
  contributionMovesOf({ view: views.active, first, now: NOW, ...patch });

const cards = (first: ContributeAttemptDetail | undefined, patch: Partial<MovesInput> = {}) =>
  model(first, patch).moves.map(({ card, kinds, session }) => `${card}:${kinds.join('+')}@${session}`);

const failed = (id: string, reason: string, patch: Partial<ContributeReplyWaiting> = {}) =>
  replyWaiting({
    draftId: id,
    state: 'FAILED',
    lastError: { reason, note: `Refused (${reason}).`, at: '2026-10-28T11:59:00.000Z' },
    ...patch,
  });

/** The pull request #1419 after run 1 pushed, nothing new on it. */
const afterRun = (patch: Partial<ContributeAttemptDetail> = {}) =>
  detail({
    ...followUpAttempts.quiet,
    followUps: followUps({ used: 1, manualRuns: 1, history: [followUpRun()] }),
    ...patch,
  });

describe('the contribution’s moves: cards and who holds them', () => {
  it('puts what a run acts on in one next-run card, titled by the comments it takes', () => {
    const moves = model(nextForRun);
    expect(cards(nextForRun)).toEqual(['next-run:changes+check@next']);
    expect(moves.moves[0]).toMatchObject({
      tone: 'violet',
      kindLine: 'Changes requested',
      title: 'Address 2 comments from ana-kelp',
      chip: 'Next step',
    });
    expect(moves.nextTileTitle).toBe('Run 2');
    expect(moves.sessions.next?.pill).toEqual({ label: 'Your move', tone: 'amber' });
    // Any kind of the card opens it.
    const head = headOf(moves, 'next', 'check');
    expect(head.kind === 'card' && head.shown.card).toBe('next-run');
  });

  it('names who the comments are from, or "review comments" past three authors', () => {
    expect(addressTitleOf([{ author: 'a' }, { author: 'b' }, { author: 'a' }])).toBe('Address 3 comments from a and b');
    expect(addressTitleOf([{ author: 'a' }, { author: 'b' }, { author: 'c' }, { author: 'd' }])).toBe(
      'Address 4 review comments',
    );
  });

  it('gives the agreement its own card, by the kind present', () => {
    expect(cards(nextForAgreement)).toEqual(['agreement:agreement@next']);
    const page = {
      ...nextForAgreement,
      conventions: {
        ...nextForAgreement.conventions!,
        cla: { ...nextForAgreement.conventions!.cla!, signComment: null },
      },
    };
    expect(cards(page)[0]).toBe('agreement:cla@next');
  });

  it('holds a CLA rule with no CLA signal on the rules card, alone with the kind cla, in the agreement’s slot', () => {
    const page = detail({
      ...nextForDco,
      needsYou: { since: NOW.toISOString(), signals: [signal('DCO')] },
      prIssues: [{ kind: 'CLA', check: 'cla', message: 'Sign the CLA', suggestion: 'https://example.com/cla' }],
    });
    const moves = model(page).moves;
    expect(moves.map(({ card, kinds }) => `${card}:${kinds.join('+')}`)).toEqual(['rules:cla', 'dco:dco']);
    expect(moves[0].kindLine).toBe('CLA to sign');
    const head = headOf(model(page), 'next', 'cla');
    expect(head.kind === 'card' && head.shown.card).toBe('rules');
  });

  it('lists a signal-only title among other rule items, and alone as the whole card', () => {
    const both = detail({
      ...nextForDco,
      needsYou: { since: NOW.toISOString(), signals: [signal('TITLE')] },
      prIssues: [{ kind: 'TEMPLATE', check: null, message: 'Fill in the template', suggestion: null }],
    });
    const [rules] = model(both).moves;
    expect(rules.data.card === 'rules' && rules.data.items.map(({ kind, issue }) => [kind, !!issue])).toEqual([
      ['title', false],
      ['description', true],
    ]);
    expect(rules.title).toBe("The pull request breaks 2 of the repo's rules");
    const alone = detail({ ...both, prIssues: [] });
    expect(model(alone).moves[0]).toMatchObject({ card: 'rules', kinds: ['title'], title: 'Retitle the pull request' });
  });

  it('routes a failed fix: a sign-off to the DCO card, a retitle to the rules card', () => {
    const signOff = detail({
      ...nextForDco,
      prFix: { kind: 'SIGN_OFF', state: 'FAILED', note: 'Force-push refused.', at: '2026-10-28T11:00:00.000Z' },
    });
    expect(cards(signOff)).toEqual(['dco:dco+fix-failed@next']);
    expect(model(signOff).moves[0]).toMatchObject({ tone: 'red', kindLine: 'A fix failed' });
    for (const move of ['dco', 'fix-failed']) {
      const head = headOf(model(signOff), 'next', move);
      expect(head.kind === 'card' && head.shown.card).toBe('dco');
    }
    const retitle = detail({
      ...nextForDco,
      needsYou: null,
      prIssues: [{ kind: 'TITLE', check: 'semantic', message: 'Retitle', suggestion: 'fix: a title' }],
      prFix: { kind: 'TITLE', state: 'FAILED', note: 'Refused.', at: '2026-10-28T11:00:00.000Z' },
    });
    expect(cards(retitle)).toEqual(['rules:title+fix-failed@next']);
    const head = headOf(model(retitle), 'next', 'title');
    expect(head.kind === 'card' && head.shown.data.card === 'rules' && head.shown.data.items[0].failed).toBe(true);
  });

  it('holds back the DCO move while a sign-off is on its way', () => {
    const sending = detail({
      ...nextForDco,
      prFix: { kind: 'SIGN_OFF', state: 'SENDING', note: null, at: '2026-10-28T11:00:00.000Z' },
    });
    const moves = model(sending);
    expect(moves.moves).toEqual([]);
    expect(moves.signingOff).toBe(true);
  });

  it('tells what only the user can do: found, stopped, repo out, silent', () => {
    expect(cards(nextForYou)).toEqual(['found:bot+run-found@next']);
    expect(model(nextForYou).moves[0].title).toBe('Do what clawsweeper asks');
    expect(cards(nextForRepoOut)).toContain('repo-out:repo-out@next');
    expect(cards(nextForSilent)).toContain('silent:silent@next');
    const stopped = afterRun({
      needsYou: {
        since: NOW.toISOString(),
        signals: [signal('RUN_ENDED', { outcome: 'STOPPED', round: 1, detail: 'Ran out of budget.' })],
      },
    });
    expect(model(stopped).moves[0]).toMatchObject({ card: 'stopped', kinds: ['run-stopped'], title: 'Run 1 stopped' });
  });

  it('holds the proof on its own session, shown on the next step’s pane', () => {
    const review = model(nextForProof.review);
    const proof = review.moves.find(({ card }) => card === 'proof');
    expect(proof).toMatchObject({ session: 'proof', kinds: ['proof-review'], kindLine: 'Check the proof' });
    expect(review.sessions.proof?.pill).toEqual({ label: 'Check it', tone: 'amber' });
    const head = headOf(review, 'next');
    expect(head.kind === 'card' && head.held.some(({ session }) => session === 'proof')).toBe(true);
    // A proof at work waits for nobody: no move, its line.
    const working = model(nextForProof.working);
    expect(working.moves.some(({ card }) => card === 'proof')).toBe(false);
    expect(working.sessions.proof?.statusLead).toBe('Your agent is capturing the proof');
  });
});

describe('the gates', () => {
  it('gives a merged or closed pull request no moves of its own', () => {
    for (const state of ['MERGED', 'CLOSED'] as const) {
      const done = detail({ ...nextForRun, state, pullRequest: pullRequest({ state }) });
      expect(model(done, { replies: [failed('D_1', 'transient'), failed('D_2', 'transient')] }).moves).toEqual([]);
    }
  });

  it('holds the next step back right after a push, keeps the run’s reply moves, and reads the PR again', () => {
    const pushed = afterRun({
      needsYou: nextForRun.needsYou,
      followUps: followUps({ used: 1, history: [followUpRun()], lastEndedAt: '2026-10-28T11:50:00.000Z' }),
      pullRequest: pullRequest({ syncedAt: '2026-10-28T11:45:00.000Z' }),
    });
    const quiet = model(pushed);
    expect(quiet.moves).toEqual([]);
    expect(quiet.reading).toBe(true);
    expect(quiet.sessions['run:A_F1']?.statusLead).toBe('Run 1 pushed 46de700');
    const withReplies = model(pushed, { replies: [failed('D_1', 'transient'), failed('D_2', 'transient')] });
    expect(withReplies.moves.map(({ card, session }) => `${card}@${session}`)).toEqual(['reply-failed@run:A_F1']);
    const head = headOf(withReplies, 'run:A_F1');
    expect(head.kind).toBe('card');
  });

  it('leaves the next step and the proof out while a run is under way, its review and countdown included', () => {
    const run = followUp({ state: 'REVIEW' });
    const underWay = detail({ ...nextForRun, followUps: followUps({ used: 1, currentAttemptId: 'A_F1' }) });
    expect(cards(underWay, { current: run })).toEqual(['run-ready:run-ready@run:A_F1']);
    const countdown = followUp({ state: 'PENDING_AUTOSUBMIT', autosubmitAt: '2026-10-28T12:42:00.000Z' });
    const moves = model(underWay, { current: countdown });
    expect(moves.moves.map(({ card }) => card)).toEqual(['run-autopilot']);
    expect(moves.moves[0].kindLine).toBe('Autopilot · 42 min left');
    expect(moves.sessions['run:A_F1']?.pill).toEqual({ label: 'Your move', tone: 'amber' });
    expect(moves.nextTileTitle).toBeNull();
  });

  it('with comments waiting and no run allowed, makes no move: a "Next step" tile and its line', () => {
    const hand = detail({ ...nextForRun, needsYou: null, openedBy: 'HAND' });
    const moves = model(hand);
    expect(moves.moves).toEqual([]);
    expect(moves.nextTileTitle).toBe('Next step');
    expect(moves.noRun).toBe('hand');
    expect(moves.sessions.next?.statusLead).toBe('2 comments wait for an answer');
  });
});

describe('the next run’s kinds', () => {
  it('emits threads only with no changes or comment, and only while a run may start', () => {
    const threads = detail({ ...nextForRun, needsYou: null });
    expect(cards(threads)).toEqual(['next-run:threads@next']);
    expect(cards(detail({ ...threads, openedBy: 'HAND' }))).toEqual([]);
  });

  it('emits a recommended run only with no other next-run kind', () => {
    const recommended = afterRun({ followUps: followUps({ used: 1, recommended: true, history: [followUpRun()] }) });
    expect(cards(recommended)).toEqual(['next-run:run-recommended@next']);
    expect(model(recommended).moves[0]).toMatchObject({ kindLine: 'Recommended', title: 'Start run 2' });
    expect(cards(nextForRun)).not.toContain('next-run:run-recommended@next');
  });

  it('takes the GitHub variant on a pull request opened by hand, and under a maintainer’s stop', () => {
    const hand = detail({ ...nextForRun, reviewFeedback: null, openedBy: 'HAND' });
    const [move] = model(hand).moves;
    expect(move).toMatchObject({ card: 'next-run', tone: 'amber', title: 'Make the requested changes on GitHub' });
    expect(move.data.card === 'next-run' && move.data.noRun).toBe('hand');
    const stopped = model(nextForRun, { prNotes: prNotes({ stopped: { login: 'sam-w', at: NOW.toISOString() } }) });
    expect(stopped.mayStart).toBe(false);
    expect(stopped.moves[0].data.card === 'next-run' && stopped.moves[0].data.noRun).toBe('stopped');
    expect(stopped.nextTileTitle).toBe('Next step');
  });
});

describe('replies per run', () => {
  const page = afterRun({
    followUps: followUps({
      used: 2,
      history: [followUpRun(), followUpRun({ round: 2, attemptId: 'A_F2', at: '2026-10-29T10:00:00.000Z' })],
    }),
  });

  it('holds each run’s replies on that run, unsent ones before failed ones, oldest run first', () => {
    const replies = [
      failed('D_1', 'org_restricted'),
      failed('D_2', 'org_restricted'),
      replyWaiting({ draftId: 'D_3', attemptId: 'A_F2', createdAt: '2026-10-29T10:00:00.000Z' }),
      replyWaiting({ draftId: 'D_4', attemptId: 'A_F1', createdAt: '2026-10-28T11:00:00.000Z' }),
    ];
    const moves = model(page, { replies });
    expect(moves.moves.map(({ card, session }) => `${card}@${session}`)).toEqual([
      'replies@run:A_F1',
      'replies@run:A_F2',
      'reply-failed@run:A_F1',
    ]);
    expect(moves.sessions['run:A_F1']?.pill).toEqual({ label: 'Your move', tone: 'amber' });
    const failedMove = moves.moves[2];
    expect(failedMove).toMatchObject({ tone: 'amber', kindLine: 'Run 1 · replies not posted' });
    expect(failedMove.title).toBe("Your 2 replies didn't reach GitHub");
    expect([...cardReasonsOf(moves, 'A_F1')]).toEqual(['org_restricted']);
    expect([...cardReasonsOf(moves, 'A_F2')]).toEqual([]);
  });

  it('does not double drafts in review, nor count an approved reply the push sends', () => {
    const inReview = [{ ...failed('D_1', 'transient'), inReview: true }];
    expect(model(page, { replies: inReview }).moves).toEqual([]);
    const sending = [replyWaiting({ draftId: 'D_1', send: true })];
    expect(model(page, { replies: sending }).moves).toEqual([]);
  });

  it('makes no move of the first attempt’s own drafts, and holds a run the history does not list', () => {
    expect(model(page, { replies: [failed('D_1', 'transient', { attemptId: 'A_1' })] }).moves).toEqual([]);
    expect(cardReasonsOf(model(page, { replies: [failed('D_1', 'x', { attemptId: 'A_1' })] }), 'A_1').size).toBe(0);
    const unlisted = model(page, { replies: [failed('D_1', 'transient', { attemptId: 'A_F9' })] });
    expect(unlisted.moves.map(({ session }) => session)).toEqual(['run:A_F9']);
    expect(unlisted.moves[0].title).toBe("One reply didn't post");
    expect(unlisted.moves[0].tone).toBe('red');
  });
});

describe('sessions and their moves', () => {
  it('holds a run’s grant bounce on the run', () => {
    const view: ContributeView = { ...views.active, grant: { connected: false, login: null } };
    const bounced = followUp({
      submit: {
        step: 'PUSH',
        waitUntil: null,
        fork: null,
        branch: null,
        lastError: { reason: 'grant_missing', note: 'No access.', at: '2026-10-28T11:30:00.000Z' },
      },
    });
    const underWay = detail({ ...afterRun(), followUps: followUps({ used: 1, currentAttemptId: 'A_F1' }) });
    expect(cards(underWay, { view, current: bounced })).toEqual(['grant:grant@run:A_F1']);
  });

  it('keeps the own agent’s review an own-review when it came back, with the reason’s words', () => {
    const bounced = detail({
      ...ownAgentAttempt,
      submit: {
        step: 'PUSH',
        waitUntil: null,
        fork: 'octocat/driftwood',
        branch: 'b',
        lastError: { reason: 'invalid', note: 'GitHub refused it.', at: '2026-10-28T11:30:00.000Z' },
      },
    });
    const [move] = model(bounced).moves;
    expect(move).toMatchObject({
      card: 'own-review',
      kindLine: 'First attempt · the submit failed',
      title: 'GitHub refused the pull request as invalid',
    });
  });

  it('never depends on the session shown: the same moves, holders and order', () => {
    const underWay = detail({ ...nextForRun, followUps: followUps({ used: 1, currentAttemptId: 'A_F1' }) });
    const run = followUp();
    const without = model(underWay, { current: run }).moves;
    const withShown = model(underWay, { current: run, shown: run }).moves;
    expect(withShown).toEqual(without);
  });

  it('gives a run whose first attempt is not known its own moves only', () => {
    expect(cards(undefined, { shown: followUp() })).toEqual(['run-ready:run-ready@run:A_F1']);
    expect(cards(undefined, { shown: followUp({ state: 'DONE' }) })).toEqual([]);
  });

  it('shows on the next pane both its moves and the proof’s; ignores a stale or other pane’s move', () => {
    const both = detail({
      ...nextForProof.review,
      needsYou: { since: NOW.toISOString(), signals: [signal('DCO'), ...nextForProof.review.needsYou!.signals] },
    });
    const moves = model(both);
    const head = headOf(moves, 'next', 'nope');
    expect(head.kind === 'card' && head.held.map(({ session }) => session).sort()).toEqual(['next', 'proof']);
    expect(head.kind === 'card' && head.shown).toBe(
      moves.moves.find((move) => move.session === 'next' || move.session === 'proof'),
    );
    const first = headOf(moves, 'first', 'dco');
    expect(first.kind).toBe('status');
    expect(first.kind === 'status' && first.elsewhere?.session).toMatch(/next|proof/);
    expect(elsewhereLabelOf({ session: 'proof', chip: 'Proof' })).toBe('Your move is in the next step →');
    expect(elsewhereLabelOf({ session: 'run:A_F2', chip: 'Run 2' })).toBe('Your move is on run 2 →');
    expect(elsewhereLabelOf({ session: 'first', chip: 'First attempt' })).toBe('Your move is on the first attempt →');
  });
});

describe('pills', () => {
  it('gives every session that holds a move "Your move", and a run waiting for autopilot never "Ready for you"', () => {
    const underWay = detail({ ...nextForRun, followUps: followUps({ used: 1, currentAttemptId: 'A_F1' }) });
    const countdown = followUp({ state: 'PENDING_AUTOSUBMIT', autosubmitAt: '2026-10-28T12:42:00.000Z' });
    const labels = Object.values(model(underWay, { current: countdown }).sessions).map((each) => each?.pill.label);
    expect(labels).not.toContain('Ready for you');
    expect(model(underWay, { current: countdown }).sessions['run:A_F1']?.pill.label).toBe('Your move');
  });

  it('names the first attempt’s pull request by its state', () => {
    expect(model(followUpAttempts.quiet).sessions.first?.pill).toEqual({ label: 'PR open', tone: 'green' });
    expect(
      model(detail({ ...followUpAttempts.quiet, state: 'MERGED', pullRequest: pullRequest({ state: 'MERGED' }) }))
        .sessions.first?.pill,
    ).toEqual({ label: 'Merged', tone: 'violet' });
  });

  it('pills a run by how it ended: pushed with its sha, done, stopped, failed', () => {
    const page = afterRun({
      followUps: followUps({
        used: 3,
        history: [
          followUpRun(),
          followUpRun({ round: 2, attemptId: 'A_F2', pushedSha: null }),
          followUpRun({ round: 3, attemptId: 'A_F3', state: 'STOPPED', endReason: 'SUBMIT_FAILED', pushedSha: null }),
        ],
      }),
    });
    const sessions = model(page).sessions;
    expect(sessions['run:A_F1']?.pill).toEqual({ label: 'Pushed 46de700', tone: 'green' });
    expect(sessions['run:A_F2']?.pill).toEqual({ label: 'Done', tone: 'green' });
    expect(sessions['run:A_F3']?.pill).toEqual({ label: 'Failed', tone: 'red' });
  });

  it('titles the next tile "Next step" under a repo that said no while the next step holds a move', () => {
    const saidNo = detail({
      ...nextForRun,
      reviewFeedback: null,
      needsYou: {
        since: NOW.toISOString(),
        signals: [signal('CHANGES_REQUESTED'), signal('REPO_OUT', { detail: 'closed_no_ai' })],
      },
    });
    const moves = model(saidNo);
    expect(moves.hardStop?.kind).toBe('repo_said_no');
    expect(moves.nextTileTitle).toBe('Next step');
    expect(moves.moves.map(({ card }) => card)).toEqual(['next-run', 'repo-out']);
  });
});

describe('hard stops', () => {
  const stop = { prNotes: prNotes({ stopped: { login: 'sam-w', at: '2026-10-28T11:04:00.000Z' } }) };

  it('drops the proof’s review, reply and retry under a maintainer’s stop, and keeps the unreadable one', () => {
    expect(model(nextForProof.review, stop).moves.some(({ card }) => card === 'proof')).toBe(false);
    expect(model(nextForProof.cannot, stop).moves.some(({ card }) => card === 'proof')).toBe(false);
    expect(model(nextForProof.failed, stop).moves.some(({ card }) => card === 'proof')).toBe(false);
    const unreadable = detail({
      ...nextForProof.review,
      proof: { ...nextForProof.review.proof!, session: { ...nextForProof.review.proof!.session!, result: null } },
    });
    expect(model(unreadable, stop).moves.some(({ card }) => card === 'proof')).toBe(true);
    expect(model(nextForProof.notConnected, stop).moves.some(({ card }) => card === 'proof')).toBe(true);
  });

  it('keeps the fix-broken card under a repo that said no: only its start goes', () => {
    const saidNo = detail({
      ...nextForProof.fixBroken,
      needsYou: {
        since: NOW.toISOString(),
        signals: [...nextForProof.fixBroken.needsYou!.signals, signal('REPO_OUT', { detail: 'closed_no_ai' })],
      },
    });
    const proof = model(saidNo).moves.find(({ card }) => card === 'proof');
    expect(proof?.data.card === 'proof' && proof.data.mayStart).toBe(false);
  });

  it('withholds the retry under a stop, and while the account is suspended, and nothing else for it', () => {
    const noGo = detail({
      ...detail(),
      state: 'STOPPED',
      endReason: 'NO_GO',
      retry: { kind: 'OVERRIDE', takenBy: [] },
    });
    expect(cards(noGo)).toEqual(['retry:retry@first']);
    expect(cards(noGo, { view: views.suspended })).toEqual([]);
    const review = detail();
    expect(cards(review, { view: views.suspended })).toEqual(['review:review@first']);
  });

  it('turns the sign-off by hand under a maintainer’s stop', () => {
    const [dco] = model(nextForDco, stop).moves;
    expect(dco.data.card === 'dco' && dco.data.variant).toBe('by-hand');
  });
});

describe('the order', () => {
  it('leads with what Needs you leads with, when no stop holds', () => {
    const pages = [
      nextForRun,
      nextForAgreement,
      nextForDco,
      nextForYou,
      nextForSilent,
      nextForRepoOut,
      nextForProof.review,
    ];
    for (const page of pages) {
      const pr = contributionOf(page);
      const item = pr ? prItemOf({ pr, drafts: [], runs: [], now: NOW }) : null;
      const moves = model(page, {
        view: { ...views.active, ownAgent: { paths: { hosted: true, mcp: true }, tokens: [] } },
      }).moves;
      if (!item || item.working) continue;
      const lead = moves.find(({ kinds }) => !kinds.includes('threads') && !kinds.includes('run-recommended'));
      expect(lead?.kinds).toContain(item.kind === 'fix-failed' ? lead?.kinds[0] : item.kind);
    }
  });

  it('puts the session moves first, then the pull request’s, the reply slot after the run’s reasons', () => {
    const page = detail({
      ...nextForRun,
      followUps: followUps({ used: 1, recommended: true, history: [followUpRun()] }),
    });
    const replies = [failed('D_1', 'transient', { prId: 'PR_8' }), failed('D_2', 'transient', { prId: 'PR_8' })];
    expect(cards(page, { replies })).toEqual(['next-run:changes+check@next', 'reply-failed:reply-failed@run:A_F1']);
    const agreement = detail({ ...nextForAgreement, followUps: followUps({ used: 1, history: [followUpRun()] }) });
    expect(cards(agreement, { replies: replies.map((reply) => ({ ...reply, prId: 'PR_C' })) })).toEqual([
      'reply-failed:reply-failed@run:A_F1',
      'agreement:agreement@next',
    ]);
  });
});

describe('a first attempt’s own threads', () => {
  it('waits for a run with every thread ignored: no threads move, nothing waits', () => {
    const ignored = detail({
      ...afterRun(),
      reviewFeedback: { threads: [feedbackThread({ ignored: true })], readAt: NOW.toISOString() },
    });
    const moves = model(ignored);
    expect(moves.moves).toEqual([]);
    expect(moves.nextTileTitle).toBe('Run 2');
    expect(moves.sessions.next?.statusLead).toBe('Nothing waits on #1419');
  });
});
