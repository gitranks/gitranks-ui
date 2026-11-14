import { describe, expect, it } from 'vitest';

import { detail, flowDraft } from './__fixtures__/contribute-attempts';
import { heldBackRun, oneCommentFailed, oneCommentPlan, orgRefusedOneComment } from './__fixtures__/session-head';
import type { ContributeReplyBatch } from './contribute.types';
import {
  batchOfferOf,
  inOneComment,
  isHeldBack,
  isRequestKey,
  isToApprove,
  noteSplitOf,
  oneCommentCardOf,
  partOf,
  previewOf,
  probeLineOf,
  requestKeyOf,
  waitsForProbe,
  withRepliesPlanOf,
  withReplyPlansOf,
} from './one-comment';

const batch = (patch: Partial<ContributeReplyBatch> = {}): ContributeReplyBatch => ({
  batchId: 'B_1',
  part: 1,
  parts: 1,
  draftIds: ['D_1'],
  state: 'FAILED',
  url: null,
  postedAt: null,
  lastError: { reason: 'no_answer', note: 'GitHub did not answer.', at: '2026-10-28T11:00:00.000Z' },
  retry: 'RESEND',
  ...patch,
});

describe('the replies plan, read on its own', () => {
  it('merges each draft’s plan by id, leaving what the read does not answer', () => {
    const drafts = [flowDraft({ draftId: 'D_1' }), flowDraft({ draftId: 'D_2' })];
    const merged = withReplyPlansOf(drafts, [{ draftId: 'D_1', postAs: 'ONE_COMMENT', batchId: 'B_1' }]);
    expect(merged[0]).toMatchObject({ postAs: 'ONE_COMMENT', batchId: 'B_1' });
    expect('waitsForProbe' in merged[0]).toBe(false);
    expect(merged[1]).toBe(drafts[1]);
    expect(withReplyPlansOf(drafts, undefined)).toBe(drafts);
  });

  it('merges the run’s plan over its detail, and leaves another attempt’s or an unanswered read', () => {
    const run = detail({ attemptId: 'A_F1', replyDrafts: [flowDraft({ draftId: 'D_1' })] });
    const read = {
      attemptId: 'A_F1',
      threadRepliesBlocked: null,
      probeFirst: true,
      oneComment: { draftIds: ['D_1'], bodies: ['Replies…'] },
      copyBodies: ['Replies…'],
      replyBatches: [],
      replyDrafts: [{ draftId: 'D_1', canGoInOneComment: true }],
    };
    expect(withRepliesPlanOf(run, read)).toMatchObject({
      threadRepliesBlocked: null,
      probeFirst: true,
      oneComment: { draftIds: ['D_1'] },
      copyBodies: ['Replies…'],
      replyBatches: [],
      replyDrafts: [{ draftId: 'D_1', canGoInOneComment: true }],
    });
    expect(withRepliesPlanOf(run, { ...read, attemptId: 'A_2' })).toBe(run);
    expect(withRepliesPlanOf(run, undefined)).toBe(run);
    const bare = withRepliesPlanOf(run, { attemptId: 'A_F1' });
    expect(
      ['threadRepliesBlocked', 'probeFirst', 'oneComment', 'copyBodies', 'replyBatches'].some((key) => key in bare),
    ).toBe(false);
  });
});

describe('a reply’s place in the plan', () => {
  it('tells replies held back and waiting for the first reply from those to approve', () => {
    const held = flowDraft({ heldBack: { reason: 'no_answer', note: 'No answer.', at: 'x' } });
    const waits = flowDraft({ waitsForProbe: true, send: true });
    expect([isHeldBack(held), isToApprove(held)]).toEqual([true, false]);
    expect([waitsForProbe(waits), isToApprove(waits)]).toEqual([true, false]);
    expect(isToApprove(flowDraft())).toBe(true);
    // Only a draft waits or is held back: once sent, it is its state that says.
    expect(isHeldBack({ ...held, state: 'POSTING' })).toBe(false);
    expect(inOneComment(flowDraft({ batchId: 'B_1' }))).toBe(true);
    expect(inOneComment(flowDraft({ postAs: 'ONE_COMMENT' }))).toBe(true);
    expect(inOneComment(flowDraft({ postAs: 'COMMENT' }))).toBe(false);
  });
});

describe('a failed comment’s offer', () => {
  it.each([
    ['no_answer', 'RESEND', { tryAgain: true, grantFirst: false, copy: false }],
    ['invalid', 'RESEND', { tryAgain: true, grantFirst: false, copy: true }],
    ['invalid', 'REBUILD', { tryAgain: true, grantFirst: false, copy: true }],
    ['not_sent', 'REBUILD', { tryAgain: true, grantFirst: false, copy: false }],
    ['grant_revoked', 'REBUILD', { tryAgain: true, grantFirst: true, copy: true }],
    ['org_restricted', null, { tryAgain: false, grantFirst: false, copy: true }],
    ['not_found', null, { tryAgain: false, grantFirst: false, copy: false }],
  ] as const)('%s, %s', (reason, retry, offer) => {
    expect(batchOfferOf(batch({ retry, lastError: { reason, note: '', at: 'x' } }))).toEqual(offer);
  });
});

describe('the replies-not-posted card', () => {
  it('posts what the API says one click would post, and copies every reply not posted', () => {
    const drafts = orgRefusedOneComment();
    const card = oneCommentCardOf({ ...oneCommentPlan(), replyDrafts: drafts }, drafts);
    expect(card.post?.draftIds).toHaveLength(7);
    expect(card.copy?.count).toBe(7);
    expect(card.copy?.text).toContain('Replies to 7 review comments by maintainer-mo.');
    expect(card.failedBatches).toEqual([]);
    expect(card.threadFailed).toHaveLength(7);
  });

  it('offers nothing of its own without the API’s plan', () => {
    const drafts = orgRefusedOneComment();
    expect(oneCommentCardOf(undefined, drafts)).toMatchObject({ post: null, copy: null, failedBatches: [] });
  });

  it('serves a failed comment only with a reply still failed in it, and posts nothing it would try again', () => {
    const { drafts, plan } = oneCommentFailed('invalid', 'Refused. Check the text.', 'REBUILD');
    const card = oneCommentCardOf({ ...plan, replyDrafts: drafts }, drafts);
    expect(card.failedBatches).toHaveLength(1);
    expect(card.failedBatches[0]).toMatchObject({ lead: 'Refused.', rest: 'Check the text.' });
    // Its own Try again builds it again: no second way to post the same replies.
    expect(card.post).toBeNull();
    expect(card.threadFailed).toEqual([]);
    // Its replies dismissed or posted since: not served.
    expect(oneCommentCardOf({ ...plan, replyDrafts: drafts }, []).failedBatches).toEqual([]);
  });

  it('keeps the replies held back apart', () => {
    const { drafts, plan } = heldBackRun();
    const held = drafts.filter(isHeldBack);
    const card = oneCommentCardOf({ ...plan, replyDrafts: drafts }, drafts.slice(0, 1), held);
    expect(card.heldBack).toHaveLength(6);
    expect(card.post?.draftIds).toHaveLength(6);
  });

  it('splits a note into its first sentence and the rest', () => {
    expect(noteSplitOf('GitHub refused it. Copy the replies.')).toEqual({
      lead: 'GitHub refused it.',
      rest: 'Copy the replies.',
    });
    expect(noteSplitOf('One sentence only')).toEqual({ lead: 'One sentence only', rest: null });
    expect(noteSplitOf(null)).toEqual({ lead: '', rest: null });
  });

  it('names a split comment’s parts', () => {
    expect(partOf(batch({ part: 2, parts: 3 }))).toBe('Part 2 of 3');
    expect(partOf(batch())).toBeNull();
    expect(previewOf(['a', 'b'])).toEqual([
      { title: 'Comment 1 of 2', body: 'a' },
      { title: 'Comment 2 of 2', body: 'b' },
    ]);
    expect(previewOf(['a'])).toEqual([{ title: null, body: 'a' }]);
  });
});

describe('the run’s approval line', () => {
  it('says the first reply is tried in its thread, by what is known of the organization', () => {
    const run = { nameWithOwner: 'driftwood-js/driftwood' };
    expect(
      probeLineOf({
        ...run,
        probeFirst: true,
        threadRepliesBlocked: { org: 'driftwood-js', since: 'x', lastRefusedAt: 'x' },
      }),
    ).toEqual({ org: 'driftwood-js', blocked: true });
    expect(probeLineOf({ ...run, probeFirst: true, threadRepliesBlocked: null })).toEqual({
      org: 'driftwood-js',
      blocked: false,
    });
    // A personal account's repo, or an API that does not say: no line.
    expect(probeLineOf({ ...run, probeFirst: false, threadRepliesBlocked: null })).toBeNull();
    expect(probeLineOf(run)).toBeNull();
  });
});

describe('a click’s key', () => {
  it('is of the shape the API takes', () => {
    expect(isRequestKey(requestKeyOf())).toBe(true);
    expect(requestKeyOf(() => 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d')).toBe('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d');
    expect(isRequestKey('short')).toBe(false);
    expect(isRequestKey('has spaces in it')).toBe(false);
    expect(isRequestKey('x'.repeat(65))).toBe(false);
  });
});
