import { describe, expect, it, vi } from 'vitest';

import { feedbackThread, flowDraft } from './__fixtures__/contribute-attempts';
import {
  type CommentActionsInit,
  type CommentState,
  callPush,
  callStart,
  commentActionsInit,
  commentActionsReducer,
  commentViewOf,
  editAfterTyping,
  isOff,
  pushSummaryOf,
  SETTING_ERROR,
} from './comment-actions';
import type { ActionId } from './hard-stop';

const init = (patch: Partial<CommentActionsInit> = {}): CommentActionsInit => ({
  session: { runId: 'A_F1' },
  prId: 'PR_1',
  prNumber: 1419,
  attemptId: 'A_F1',
  runState: 'REVIEW',
  approvedAt: null,
  flow: true,
  checkStatus: 'PASSED',
  hasCommits: true,
  drafts: [],
  threads: [],
  resolveHumans: false,
  blocked: new Set(),
  canStart: true,
  ...patch,
});

const threads = (count: number, ignored = false) =>
  Array.from({ length: count }, (_, index) =>
    feedbackThread({ commentId: `C_${index}`, threadId: `T_${index}`, ignored }),
  );

const reduce = (state: CommentState, ...events: Parameters<typeof commentActionsReducer>[1][]) =>
  events.reduce(commentActionsReducer, state);

describe('the comments’ state', () => {
  it('has threads exactly when some wait, an all-ignored list included, and replies only in a flow review', () => {
    expect(commentViewOf(init(), commentActionsInit(init())).threads).toBeNull();
    const ignored = init({ session: 'next', threads: threads(2, true) });
    expect(commentViewOf(ignored, commentActionsInit(ignored)).threads).not.toBeNull();
    const review = init({ drafts: [flowDraft()] });
    expect(commentViewOf(review, commentActionsInit(review)).replies).not.toBeNull();
    const done = init({ drafts: [flowDraft()], runState: 'DONE' });
    expect(commentViewOf(done, commentActionsInit(done)).replies).toBeNull();
    const older = init({ drafts: [flowDraft()], flow: false });
    expect(commentViewOf(older, commentActionsInit(older)).replies).toBeNull();
  });

  it('keeps each reply’s send after a push that came back, else sends the ones with words that are not questions', () => {
    const drafts = [
      flowDraft({ draftId: 'D_1', send: false }),
      flowDraft({ draftId: 'D_2', outcome: 'NEEDS_YOU', text: 'Which one?', send: true }),
    ];
    expect(commentActionsInit(init({ drafts })).edits).toEqual({
      D_1: { text: 'Made it a const.', send: true },
      D_2: { text: 'Which one?', send: false },
    });
    expect(commentActionsInit(init({ drafts, approvedAt: '2026-10-28T11:50:00.000Z' })).edits).toEqual({
      D_1: { text: 'Made it a const.', send: false },
      D_2: { text: 'Which one?', send: true },
    });
  });

  it('starts afresh from init: a new key gives no done, no error, and the read’s choices and edits', () => {
    const base = init({ session: 'next', threads: threads(2), drafts: [] });
    const moved = reduce(
      commentActionsInit(base),
      { type: 'choose', commentId: 'C_0', choice: 'ignore' },
      { type: 'went-through', source: 'start' },
    );
    expect(moved.done).toBe('start');
    const fresh = commentActionsInit(base);
    expect(fresh).toMatchObject({ done: null, error: null, pending: null, choice: { C_0: 'address', C_1: 'address' } });
  });

  it('saves a choice optimistically and puts it back on a failure, with the row’s error', () => {
    const base = init({ session: 'next', threads: threads(2) });
    const saving = reduce(commentActionsInit(base), { type: 'choose', commentId: 'C_0', choice: 'ignore' });
    expect(saving.choice.C_0).toBe('ignore');
    expect(saving.pending).toBeNull();
    expect(commentViewOf(base, saving).startState.disabled).toBe('Saving your choice…');
    const back = reduce(saving, { type: 'choose-failed', commentId: 'C_0', before: 'address', text: 'No.' });
    expect(back.choice.C_0).toBe('address');
    expect(back.error).toEqual({ source: 'choice', text: 'No.', key: 'C_0' });
    expect(commentViewOf(base, back).startState.disabled).toBeNull();
  });

  it('ticks a reply when the user writes into an empty one, and never re-ticks one they unticked', () => {
    expect(editAfterTyping({ text: '', send: false }, 'Yes')).toEqual({ text: 'Yes', send: true });
    expect(editAfterTyping({ text: 'Yes', send: false }, 'Yes, done')).toEqual({ text: 'Yes, done', send: false });
    expect(editAfterTyping({ text: 'Yes', send: true }, '')).toEqual({ text: '', send: true });
  });

  it('lists every reply not left out, a ticked one emptied by hand going unsent, and counts what posts and resolves', () => {
    const drafts = [
      flowDraft({ draftId: 'D_1' }),
      flowDraft({ draftId: 'D_2', bot: false, comment: { ...flowDraft().comment!, author: 'maintainer-mo' } }),
      flowDraft({ draftId: 'D_3', state: 'POSTED' }),
      flowDraft({ draftId: 'D_4' }),
    ];
    const base = init({ drafts });
    const state = reduce(
      commentActionsInit(base),
      { type: 'edit', draftId: 'D_4', edit: { text: '  ', send: true } },
      { type: 'discard', draftId: 'D_1' },
    );
    const view = commentViewOf(base, state);
    expect(view.replies?.input).toEqual([
      { draftId: 'D_2', text: 'Made it a const.', send: true },
      { draftId: 'D_4', text: '  ', send: false },
    ]);
    expect(view.replies?.posting).toBe(1);
    // A person's thread resolves only with the setting on.
    expect(view.replies?.resolving).toBe(0);
    expect(view.replies?.peopleThreads).toBe(1);
    const on = reduce(state, { type: 'setting', on: true }, { type: 'setting-saved' });
    expect(commentViewOf(base, on).replies?.resolving).toBe(1);
  });

  it('starts with the chosen comments, none when every thread was ignored at read, none from a plain Start', async () => {
    const startFollowUp = vi.fn(async () => ({ ok: true as const, data: { attemptId: 'A_F2' } }));
    const some = init({ session: 'next', threads: threads(3) });
    const chosen = commentViewOf(some, commentActionsInit(some)).threads?.scope ?? {};
    await callStart(some, 'note', chosen, { startFollowUp });
    expect(startFollowUp).toHaveBeenLastCalledWith('PR_1', ['C_0', 'C_1', 'C_2'], 'note');

    const ignored = init({ session: 'next', threads: threads(2, true) });
    const view = commentViewOf(ignored, commentActionsInit(ignored));
    expect(view.threads?.scope).toEqual({});
    expect(view.startState).toEqual({ hidden: false, disabled: null, busy: false });
    await callStart(ignored, '', view.threads?.scope ?? {}, { startFollowUp });
    expect(startFollowUp).toHaveBeenLastCalledWith('PR_1', undefined, '');
    await callStart(some, 'try', {}, { startFollowUp });
    expect(startFollowUp).toHaveBeenLastCalledWith('PR_1', undefined, 'try');
  });

  it('holds Start back in order: no run may add, the 20 limit, a save, then nothing chosen', () => {
    const many = threads(22);
    const hand = init({ session: 'next', threads: many, canStart: false });
    expect(commentViewOf(hand, commentActionsInit(hand)).startState).toEqual({
      hidden: true,
      disabled: null,
      busy: false,
    });
    const saidNo = init({ session: 'next', threads: many, blocked: new Set<ActionId>(['start_run']) });
    expect(commentViewOf(saidNo, commentActionsInit(saidNo)).startState.disabled).toBeNull();
    const over = init({ session: 'next', threads: many });
    const overView = commentViewOf(over, commentActionsInit(over));
    expect(overView.startState.hidden).toBe(true);
    expect(overView.startState.disabled).toMatch(/A run takes 20 comments at most\. Set 2 to Ignore/);
    // The plain Start is not held back by the limit or the choice.
    expect(overView.startPlainState).toEqual({ hidden: false, disabled: null, busy: false });
    expect(commentViewOf(hand, commentActionsInit(hand)).startPlainState.hidden).toBe(true);
    const some = init({ session: 'next', threads: threads(2) });
    const none = reduce(
      commentActionsInit(some),
      { type: 'choose', commentId: 'C_0', choice: 'ignore' },
      { type: 'chosen', commentId: 'C_0' },
      { type: 'choose', commentId: 'C_1', choice: 'ignore' },
      { type: 'chosen', commentId: 'C_1' },
    );
    expect(commentViewOf(some, none).startState).toEqual({
      hidden: false,
      disabled: 'Choose a comment to address',
      busy: false,
    });
  });

  it('holds Push back: nothing to push or post, blocked by our checks, or stopped', () => {
    const nothing = init({ hasCommits: false, drafts: [flowDraft({ send: false, outcome: 'NEEDS_YOU', text: '' })] });
    expect(commentViewOf(nothing, commentActionsInit(nothing)).pushState.disabled).toBe(
      'Tick a reply to post, or discard the run',
    );
    const older = init({ hasCommits: false, flow: false });
    expect(commentViewOf(older, commentActionsInit(older)).pushState).toEqual({
      hidden: false,
      disabled: null,
      busy: false,
    });
    const blockedRail = init({ checkStatus: 'BLOCKED' });
    expect(commentViewOf(blockedRail, commentActionsInit(blockedRail)).pushState.hidden).toBe(true);
    const stopped = init({ blocked: new Set<ActionId>(['push']) });
    expect(commentViewOf(stopped, commentActionsInit(stopped)).pushState.hidden).toBe(true);
  });

  it('hides the people’s setting when it is stopped or not answered', () => {
    const drafts = [flowDraft()];
    const unanswered = init({ drafts, resolveHumans: undefined });
    expect(commentViewOf(unanswered, commentActionsInit(unanswered)).replies?.resolveHumansState.hidden).toBe(true);
    const stopped = init({ drafts, blocked: new Set<ActionId>(['resolve_threads']) });
    expect(commentViewOf(stopped, commentActionsInit(stopped)).replies?.resolveHumansState.hidden).toBe(true);
    const saving = reduce(commentActionsInit(init({ drafts })), { type: 'setting', on: true });
    expect(commentViewOf(init({ drafts }), saving).replies?.resolveHumansState.busy).toBe(true);
    const failed = reduce(saving, { type: 'setting-failed', before: false });
    expect(failed.resolveHumans).toBe(false);
    expect(failed.error).toEqual({ source: 'setting', text: SETTING_ERROR });
  });

  it('sets pending from the long actions only; on success done takes the source, on failure the error', () => {
    const base = commentActionsInit(init({ session: 'next', threads: threads(1) }));
    expect(reduce(base, { type: 'choose', commentId: 'C_0', choice: 'ignore' }).pending).toBeNull();
    expect(reduce(base, { type: 'discard', draftId: 'D_1' }).pending).toBeNull();
    expect(reduce(base, { type: 'setting', on: true }).pending).toBeNull();
    const pushing = reduce(base, { type: 'start', source: 'push' });
    expect(pushing.pending).toBe('push');
    expect(isOff(null, pushing)).toBe(true);
    const done = reduce(pushing, { type: 'went-through', source: 'push' });
    expect(done).toMatchObject({ pending: null, done: 'push' });
    expect(isOff({ disabled: null, busy: false }, done)).toBe(true);
    const failed = reduce(pushing, { type: 'failed', source: 'push', text: 'No.' });
    expect(failed).toMatchObject({ pending: null, done: null, error: { source: 'push', text: 'No.' } });
    expect(isOff({ disabled: null, busy: false }, failed)).toBe(false);
  });

  it('puts a discarded comment back on a failure, with its error', () => {
    const base = commentActionsInit(init({ drafts: [flowDraft()] }));
    const back = reduce(
      base,
      { type: 'discard', draftId: 'D_1' },
      { type: 'discard-failed', draftId: 'D_1', text: 'No.' },
    );
    expect(back.dropped).toEqual([]);
    expect(back.error).toEqual({ source: 'discard', text: 'No.', key: 'D_1' });
  });

  it('pushes with the replies on the flow, as an approval without it', async () => {
    const approveFollowUp = vi.fn(async () => ({ ok: true as const, data: null }));
    const approveAttempt = vi.fn(async () => ({ ok: true as const, data: null }));
    const input = [{ draftId: 'D_1', text: 'Done.', send: true }];
    await callPush(init(), input, { approveFollowUp, approveAttempt });
    expect(approveFollowUp).toHaveBeenCalledWith('A_F1', 'Follow-up on pull request #1419', input);
    await callPush(init({ flow: false }), [], { approveFollowUp, approveAttempt });
    expect(approveAttempt).toHaveBeenCalledWith({
      id: 'A_F1',
      title: 'Follow-up on pull request #1419',
      body: '',
      dco: false,
    });
  });

  it('says what the push does, in today’s words', () => {
    expect(pushSummaryOf({ hasCommits: true, prNumber: 1419, posting: 3, resolving: 2 })).toBe(
      'pushes the new commits to pull request #1419, posts 3 replies, resolves 2 threads',
    );
    expect(pushSummaryOf({ hasCommits: false, prNumber: 1419, posting: 1, resolving: 0 })).toBe(
      'pushes nothing (no commits this run), posts 1 reply',
    );
    expect(pushSummaryOf({ hasCommits: true, prNumber: 1419, posting: 0, resolving: 0 })).toBe(
      'pushes the new commits to pull request #1419, posts no reply',
    );
    expect(pushSummaryOf({ hasCommits: true, prNumber: null, posting: 0, resolving: 0 })).toBe(
      'pushes the new commits to the pull request, posts no reply',
    );
  });
});
