import { describe, expect, it } from 'vitest';

import type { ContributeReplyBatch } from './contribute.types';
import {
  batchOfferOf,
  inOneComment,
  isHeldBack,
  isRequestKey,
  isToApprove,
  requestKeyOf,
  waitsForProbe,
  withRepliesPlanOf,
  withReplyPlansOf,
} from './one-comment';
import { detail, flowDraft } from '@/lib/contribute/__fixtures__/contribute-attempts';

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
    ['invalid', 'RESEND', { tryAgain: true, grantFirst: false, copy: false }],
    ['invalid', 'REBUILD', { tryAgain: true, grantFirst: false, copy: true }],
    ['not_sent', 'REBUILD', { tryAgain: true, grantFirst: false, copy: false }],
    ['grant_revoked', 'REBUILD', { tryAgain: true, grantFirst: true, copy: true }],
    ['org_restricted', null, { tryAgain: false, grantFirst: false, copy: true }],
    ['not_found', null, { tryAgain: false, grantFirst: false, copy: false }],
  ] as const)('%s, %s', (reason, retry, offer) => {
    expect(batchOfferOf(batch({ retry, lastError: { reason, note: '', at: 'x' } }))).toEqual(offer);
  });
});

describe('the one-comment-first read', () => {
  const attempt = {
    attemptId: 'A_1',
    replyDrafts: [{ draftId: 'D_1' }, { draftId: 'D_2' }],
  } as unknown as Parameters<typeof withRepliesPlanOf>[0];

  it("merges the run's flag and each reply's comment reason, and leaves them out for an older API", () => {
    const read = {
      attemptId: 'A_1',
      oneCommentFirst: true,
      replyDrafts: [{ draftId: 'D_1', commentReason: 'org_restricted' }],
    };
    expect(withRepliesPlanOf(attempt, read)).toMatchObject({
      oneCommentFirst: true,
      replyDrafts: [{ draftId: 'D_1', commentReason: 'org_restricted' }, { draftId: 'D_2' }],
    });
    const older = withRepliesPlanOf(attempt, { attemptId: 'A_1' });
    expect('oneCommentFirst' in older).toBe(false);
    expect(older.replyDrafts).toEqual(attempt.replyDrafts);
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
