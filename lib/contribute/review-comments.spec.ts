import { describe, expect, it } from 'vitest';

import { detail, feedbackThread, flowDraft, followUp, followUps, replyDraft } from './__fixtures__/contribute-attempts';
import { resolvesOf } from './comment-actions';
import type { ContributeAttemptState, ContributeReplyDraft } from './contribute.types';
import type { ActionId } from './hard-stop';
import {
  type CommentRowItem,
  chipOf,
  firstAttemptDraftsOf,
  groupsOf,
  ownLinesOf,
  type PostContext,
  postActionOf,
  resolveLinesOf,
  rowActionsOf,
  rowStateOf,
  rowTargetOf,
  rowVersionOf,
  runModeOf,
  shortWhereOf,
  summaryOf,
} from './review-comments';

const NONE: ReadonlySet<string> = new Set();
const ctx = (runState: ContributeAttemptState = 'DONE') => ({
  runState,
  saidElsewhere: NONE,
});

const post = (patch: Partial<PostContext> = {}): PostContext => ({
  blocked: new Set(),
  prOpen: true,
  replyBlock: null,
  grantConnected: false,
  grantAvailable: true,
  ...patch,
});

const failed = (reason: string, patch: Partial<ContributeReplyDraft> = {}) =>
  flowDraft({
    state: 'FAILED',
    lastError: { reason, note: `Refused (${reason}).`, at: '2026-10-28T11:59:00.000Z' },
    ...patch,
  });

const rows = (drafts: ContributeReplyDraft[], mode: Parameters<typeof rowStateOf>[0] = 'perReply'): CommentRowItem[] =>
  drafts.map((draft) => ({ key: draft.draftId, state: rowStateOf(mode, draft, ctx()), draft }));

describe('a review comment’s row state', () => {
  it('reads the mode first: the same failed draft is a draft in review, read-only, or not posted after', () => {
    const draft = failed('transient');
    expect(rowStateOf('review', draft, ctx('REVIEW'))).toBe('draft-review');
    expect(rowStateOf('readOnly', draft, ctx('PENDING_AUTOSUBMIT'))).toBe('read-only');
    expect(rowStateOf('perReply', draft, ctx())).toBe('not-posted-own');
    expect(rowStateOf('perReply', draft, { runState: 'DONE', saidElsewhere: new Set(['transient']) })).toBe(
      'not-posted-elsewhere',
    );
  });

  it('gives every state from its data', () => {
    expect(rowStateOf('perReply', flowDraft({ send: true }), ctx('SUBMITTING'))).toBe('posting');
    expect(rowStateOf('perReply', flowDraft({ send: true }), ctx('DONE'))).toBe('posting');
    expect(rowStateOf('perReply', flowDraft({ state: 'POSTING' }), ctx())).toBe('posting');
    expect(rowStateOf('perReply', flowDraft({ state: 'POSTED', resolveState: 'RESOLVING' }), ctx())).toBe('posting');
    expect(rowStateOf('perReply', flowDraft({ state: 'POSTED' }), ctx())).toBe('posted');
    expect(rowStateOf('perReply', flowDraft({ state: 'POSTED', asComment: true }), ctx())).toBe('posted-comment');
    expect(rowStateOf('perReply', flowDraft({ state: 'POSTED', resolveState: 'RESOLVED' }), ctx())).toBe(
      'posted-resolved',
    );
    expect(rowStateOf('perReply', flowDraft({ state: 'POSTED', resolveState: 'FAILED' }), ctx())).toBe(
      'resolve-failed',
    );
    expect(rowStateOf('perReply', flowDraft({ text: '', outcome: 'NEEDS_YOU' }), ctx())).toBe('left-for-github');
    expect(rowStateOf('perReply', flowDraft({ text: '' }), ctx())).toBe('no-reply');
    expect(rowStateOf('perReply', flowDraft(), ctx('REVIEW'))).toBe('draft-not-sent');
    expect(rowStateOf('perReply', flowDraft({ state: 'DISMISSED', dismissedReason: 'POSTED_BY_HAND' }), ctx())).toBe(
      'dismissed-by-hand',
    );
    expect(rowStateOf('perReply', flowDraft({ state: 'DISMISSED', dismissedReason: 'NOT_NEEDED' }), ctx())).toBe(
      'dismissed',
    );
    expect(rowStateOf('perReply', flowDraft({ state: 'DISMISSED', dismissedReason: 'THREAD_RESOLVED' }), ctx())).toBe(
      'thread-resolved',
    );
    for (const mode of ['review', 'readOnly', 'perReply'] as const) {
      expect(rowStateOf(mode, flowDraft({ state: 'ARCHIVED' as never }), ctx())).toBe('unknown');
    }
  });

  it('asks a question only in review, and only while it has no answer', () => {
    expect(rowStateOf('review', flowDraft({ outcome: 'NEEDS_YOU', text: '' }), ctx('REVIEW'))).toBe('needs-you');
    expect(rowStateOf('review', flowDraft({ outcome: 'NEEDS_YOU', text: 'It is fine.' }), ctx('REVIEW'))).toBe(
      'draft-review',
    );
    expect(rowStateOf('perReply', flowDraft({ outcome: 'NEEDS_YOU', text: '' }), ctx())).toBe('left-for-github');
  });

  it('keeps a dismissed reply’s own state in a read-only list', () => {
    expect(rowStateOf('readOnly', flowDraft({ state: 'DISMISSED' }), ctx('DISCARDED'))).toBe('dismissed');
  });

  it('reads a run’s mode from its state and its API', () => {
    expect(runModeOf(followUp(), true)).toBe('review');
    expect(runModeOf(followUp(), false)).toBe('perReply');
    expect(runModeOf(followUp({ state: 'PENDING_AUTOSUBMIT' }), true)).toBe('readOnly');
    expect(runModeOf(followUp({ state: 'DISCARDED' }), true)).toBe('readOnly');
    expect(runModeOf(followUp({ state: 'DISCARDED', patch: null }), true)).toBe('perReply');
    expect(runModeOf(followUp({ state: 'DONE' }), true)).toBe('perReply');
  });
});

describe('a reply’s post action', () => {
  it('takes the first match of five branches', () => {
    expect(postActionOf(failed('grant_missing'), post({ grantConnected: true }))).toEqual({
      kind: 'retry',
      asComment: false,
    });
    expect(postActionOf(failed('grant_missing', { asComment: true }), post({ grantConnected: true }))).toEqual({
      kind: 'retry',
      asComment: true,
    });
    expect(postActionOf(failed('grant_revoked'), post())).toEqual({ kind: 'grant' });
    expect(postActionOf(failed('grant_revoked'), post({ grantAvailable: false }))).toBeNull();
    expect(postActionOf(failed('transient', { asComment: true }), post())).toEqual({ kind: 'retry', asComment: true });
    expect(postActionOf(failed('invalid', { asComment: true, canPostAsComment: true }), post())).toBeNull();
    expect(postActionOf(failed('forbidden', { canPostAsComment: true }), post())).toEqual({ kind: 'as-comment' });
    expect(postActionOf(failed('org_restricted', { canPostAsComment: true }), post())).toEqual({ kind: 'as-comment' });
    expect(postActionOf(failed('error'), post())).toEqual({ kind: 'retry', asComment: false });
    expect(postActionOf(failed('not_found'), post())).toBeNull();
  });

  it('offers none under a stop on replies, on a PR that is not open, or before the run’s commits are on it', () => {
    expect(postActionOf(failed('error'), post({ blocked: new Set<ActionId>(['post_reply']) }))).toBeNull();
    expect(postActionOf(failed('error'), post({ prOpen: false }))).toBeNull();
    expect(postActionOf(failed('error'), post({ replyBlock: 'Push them first.' }))).toBeNull();
  });

  it('keeps Post as a comment on rows the card speaks for, Try again and Dismiss on rows the list’s line speaks for', () => {
    const draft = failed('org_restricted', { canPostAsComment: true });
    expect(rowActionsOf('not-posted-elsewhere', draft, { ...post(), byCard: true })).toEqual({
      post: { kind: 'as-comment' },
      dismiss: false,
      discard: false,
    });
    expect(rowActionsOf('not-posted-elsewhere', failed('transient'), { ...post(), byCard: false })).toEqual({
      post: { kind: 'retry', asComment: false },
      dismiss: true,
      discard: false,
    });
  });

  it('offers Discard comment only on a thread’s reply in review, even under a stop', () => {
    const stopped = { ...post({ blocked: new Set<ActionId>(['push', 'post_reply']) }), byCard: false };
    expect(rowActionsOf('draft-review', flowDraft(), stopped).discard).toBe(true);
    expect(rowActionsOf('draft-review', flowDraft({ comment: null }), stopped).discard).toBe(false);
    expect(rowActionsOf('posted', flowDraft(), stopped).discard).toBe(false);
  });
});

describe('the rows’ words and groups', () => {
  it('colours Not posted amber for a block, red otherwise, shared or alone', () => {
    for (const reason of ['org_restricted', 'forbidden', 'grant_missing', 'grant_revoked']) {
      expect(chipOf('not-posted-own', failed(reason))?.tone).toBe('amber');
      expect(chipOf('not-posted-elsewhere', failed(reason))?.tone).toBe('amber');
    }
    expect(chipOf('not-posted-own', failed('error'))?.tone).toBe('red');
    expect(chipOf('posted-resolved')).toEqual({ label: 'Replied · resolved', tone: 'green', check: true });
    expect(chipOf('thread-resolved')).toBeNull();
    expect(chipOf('unknown', flowDraft({ state: 'ARCHIVED' as never }))?.label).toBe('Archived');
  });

  it('shows "resolves" for a bot’s thread with the setting unanswered, a person’s only with it on', () => {
    expect(resolvesOf(flowDraft(), undefined)).toBe(true);
    const person = flowDraft({ bot: false });
    expect(resolvesOf(person, undefined)).toBe(false);
    expect(resolvesOf(person, true)).toBe(true);
    expect(resolvesOf(flowDraft({ outcome: 'NEEDS_YOU' }), true)).toBe(false);
  });

  it('groups by what the user does, in order, never by edits', () => {
    const drafts = [
      flowDraft({ draftId: 'D_1', state: 'DISMISSED', dismissedReason: 'THREAD_RESOLVED' }),
      flowDraft({ draftId: 'D_2', state: 'POSTED' }),
      failed('transient', { draftId: 'D_3' }),
      flowDraft({ draftId: 'D_4', text: '', outcome: 'NEEDS_YOU' }),
      flowDraft({ draftId: 'D_5', text: '' }),
      flowDraft({ draftId: 'D_6', state: 'DISMISSED' }),
    ];
    const groups = groupsOf(rows(drafts), 'perReply');
    expect(groups.map(({ id, rows: list }) => [id, list.map(({ key }) => key)])).toEqual([
      ['not-posted', ['D_3']],
      ['posted', ['D_2', 'D_4', 'D_5']],
      ['resolved', ['D_1']],
      ['dismissed', ['D_6']],
    ]);
    expect(groups.find(({ id }) => id === 'resolved')?.collapsed).toBe(true);
    const review = groupsOf(
      rows([flowDraft({ draftId: 'Q', outcome: 'NEEDS_YOU', text: '' }), flowDraft()], 'review'),
      'review',
    );
    expect(review.map(({ id }) => id)).toEqual(['needs-you', 'ready']);
  });

  it('folds an open group past 7 rows to its first 5, never in review, and says what opens a row first', () => {
    const many = Array.from({ length: 9 }, (_, index) => flowDraft({ draftId: `D_${index}`, state: 'POSTED' }));
    const groups = groupsOf(rows(many), 'perReply');
    expect(groups[0].more).toBe(4);
    expect(groupsOf(rows(many, 'review'), 'review')[0]?.more ?? 0).toBe(0);
    expect(rowTargetOf(groups, 'D_7')).toEqual({ group: 'posted', openGroup: false, showMore: true });
    expect(rowTargetOf(groups, 'D_1')).toEqual({ group: 'posted', openGroup: false, showMore: false });
    const resolved = groupsOf(
      rows([flowDraft({ draftId: 'R', state: 'DISMISSED', dismissedReason: 'THREAD_RESOLVED' })]),
      'perReply',
    );
    expect(rowTargetOf(resolved, 'R')).toEqual({ group: 'resolved', openGroup: true, showMore: false });
    expect(rowTargetOf(resolved, 'nope')).toBeNull();
  });

  it('names a thread by its file and line', () => {
    expect(shortWhereOf({ path: 'src/router/normalize-path.ts', line: 3 })).toBe('normalize-path.ts:3');
    expect(shortWhereOf({ path: 'README.md', line: null })).toBe('README.md');
    expect(shortWhereOf({ path: null, line: null })).toBe('');
  });

  it('changes a row’s version with its draft and its run, or the first attempt’s freshness', () => {
    const draft = flowDraft();
    const run = followUp();
    const before = rowVersionOf(draft, { run });
    expect(rowVersionOf({ ...draft, state: 'POSTED' }, { run })).not.toBe(before);
    expect(rowVersionOf(draft, { run: { ...run, updatedAt: '2026-10-29T00:00:00.000Z' } })).not.toBe(before);
    const first = detail({ followUps: followUps() });
    const own = rowVersionOf(draft, { first });
    expect(rowVersionOf(draft, { first: { ...first, followUps: followUps({ currentAttemptId: 'A_F2' }) } })).not.toBe(
      own,
    );
  });
});

describe('the list’s own lines', () => {
  const card = (reasons: Record<string, string[]>) => (runId: string) => new Set(reasons[runId] ?? []);

  it('says a shared reason the card does not, once per run', () => {
    const drafts = [failed('transient', { draftId: 'D_1' }), failed('transient', { draftId: 'D_2' })];
    expect(ownLinesOf(drafts, card({ A_F1: ['transient'] }))).toEqual([]);
    expect(ownLinesOf(drafts, card({})).map(({ reason, drafts: list }) => [reason, list.length])).toEqual([
      ['transient', 2],
    ]);
  });

  it('says nothing for a reason a single reply has, nor for review rows', () => {
    expect(ownLinesOf([failed('transient')], card({}))).toEqual([]);
    const inReview = [failed('transient', { draftId: 'D_1' }), failed('transient', { draftId: 'D_2' })].map(
      (draft) => ({ ...draft, inReview: true }) as ContributeReplyDraft,
    );
    expect(ownLinesOf(inReview, card({}))).toEqual([]);
  });

  it('says a shared resolve failure once under Posted', () => {
    const drafts = [
      flowDraft({
        draftId: 'D_1',
        state: 'POSTED',
        resolveState: 'FAILED',
        lastError: { reason: 'forbidden', note: 'No access to resolve.', at: '' },
      }),
      flowDraft({
        draftId: 'D_2',
        state: 'POSTED',
        resolveState: 'FAILED',
        lastError: { reason: 'forbidden', note: 'No access to resolve.', at: '' },
      }),
      flowDraft({
        draftId: 'D_3',
        state: 'POSTED',
        resolveState: 'FAILED',
        lastError: { reason: 'transient', note: 'Busy.', at: '' },
      }),
    ];
    expect(resolveLinesOf(drafts)).toEqual([{ reason: 'forbidden', note: 'No access to resolve.', count: 2 }]);
  });

  it('lists on the first attempt only the drafts of runs its rail does not show', () => {
    const drafts = [
      replyDraft({ draftId: 'D_1', attemptId: 'A_F1' }),
      replyDraft({ draftId: 'D_2', attemptId: 'A_F9' }),
    ];
    const listed = detail({
      replyDrafts: drafts,
      followUps: followUps({ history: [{ round: 1, attemptId: 'A_F1' } as never] }),
    });
    expect(firstAttemptDraftsOf(listed).map(({ draftId }) => draftId)).toEqual(['D_2']);
    expect(firstAttemptDraftsOf(detail({ replyDrafts: drafts, followUps: followUps() }))).toHaveLength(2);
  });
});

describe('the section’s header', () => {
  it('counts the waiting threads set to Address and says when they were read', () => {
    const threadRows: CommentRowItem[] = [feedbackThread(), feedbackThread({ commentId: 'C_2', ignored: true })].map(
      (thread) => ({ key: thread.commentId, state: thread.ignored ? 'ignored' : 'waiting', thread }),
    );
    expect(
      summaryOf(threadRows, 'waiting', null, {
        addressed: 1,
        readAt: '2026-10-28T11:48:00.000Z',
        now: new Date('2026-10-28T12:00:00.000Z'),
      }),
    ).toEqual({ count: { label: '1 waiting', tone: 'amber' }, fact: 'read 12 minutes ago' });
  });

  it('tallies a review, says "N drafted" on an older API, and what was replied and resolved after', () => {
    const review = rows(
      [
        flowDraft(),
        flowDraft({ draftId: 'D_2', outcome: 'SKIPPED' }),
        flowDraft({ draftId: 'D_3', outcome: 'NEEDS_YOU' }),
      ],
      'review',
    );
    expect(summaryOf(review, 'review', { state: 'REVIEW', hasPatch: true, flow: true }).fact).toBe(
      '1 fixed · 1 not changed · 1 for you',
    );
    const older = rows([replyDraft(), replyDraft({ draftId: 'D_2' })]);
    expect(summaryOf(older, 'perReply', { state: 'REVIEW', hasPatch: true, flow: false }).fact).toBe('2 drafted');
    const after = rows([
      flowDraft({ state: 'POSTED', resolveState: 'RESOLVED' }),
      flowDraft({ draftId: 'D_2', state: 'POSTED' }),
      flowDraft({ draftId: 'D_3', state: 'DISMISSED', dismissedReason: 'THREAD_RESOLVED' }),
    ]);
    expect(summaryOf(after, 'perReply', { state: 'DONE', hasPatch: true, flow: true }).fact).toBe(
      '2 replied · 2 resolved',
    );
    const resolved = rows(
      Array.from({ length: 7 }, (_, index) =>
        flowDraft({ draftId: `D_${index}`, state: 'DISMISSED', dismissedReason: 'THREAD_RESOLVED' }),
      ),
    );
    expect(summaryOf(resolved, 'perReply', { state: 'DONE', hasPatch: true, flow: true }).fact).toBe(
      '7 fixed · all resolved',
    );
    const nothing = rows([failed('transient'), failed('transient', { draftId: 'D_2' })]);
    expect(summaryOf(nothing, 'perReply', { state: 'DONE', hasPatch: true, flow: true }).fact).toBe('2 fixed');
    expect(
      summaryOf(rows([flowDraft()], 'readOnly'), 'readOnly', { state: 'DISCARDED', hasPatch: true, flow: true }).fact,
    ).toBe('Nothing posted');
  });
});
