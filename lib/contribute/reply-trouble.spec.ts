import { describe, expect, it } from 'vitest';

import { replyDraft } from './__fixtures__/contribute-attempts';
import type { ContributeReplyDraft } from './contribute.types';
import {
  BLOCK_REASONS,
  orgNameOf,
  RETRY_REASONS,
  reasonKeyOf,
  replyTroubleLineOf,
  replyTroubleOf,
} from './reply-trouble';

const failed = (id: string, reason: string | null, patch: Partial<ContributeReplyDraft> = {}) =>
  replyDraft({
    draftId: id,
    state: 'FAILED',
    lastError:
      reason === null ? null : { reason, note: `Refused: ${reason}. Do this.`, at: '2026-10-28T11:59:00.000Z' },
    ...patch,
  });

/** The card's border: amber when every reason is a block, red when any is not. */
const toneOf = (reasons: string[]) => (reasons.every((reason) => BLOCK_REASONS.has(reason)) ? 'amber' : 'red');

describe('replies that did not reach GitHub', () => {
  it('seven refused by the organization share one reason, said once', () => {
    const drafts = Array.from({ length: 7 }, (_, index) => failed(`D_${index}`, 'org_restricted'));
    const [run] = replyTroubleOf(drafts);
    expect(run.runId).toBe('A_F1');
    expect(run.failed).toHaveLength(7);
    expect(run.shared.map(({ reason, drafts: list }) => [reason, list.length])).toEqual([['org_restricted', 7]]);
    expect(run.alone).toEqual([]);
    expect(toneOf(run.shared.map(({ reason }) => reason))).toBe('amber');
    expect(RETRY_REASONS.has('org_restricted')).toBe(false);
  });

  it('one failure alone is its row’s to say', () => {
    const [run] = replyTroubleOf([failed('D_1', 'transient')]);
    expect(run.shared).toEqual([]);
    expect(run.alone.map(({ draftId }) => draftId)).toEqual(['D_1']);
  });

  it('three org, two no-answer and one invalid: two lines, most frequent first, one alone, red, a retry for the pair', () => {
    const drafts = [
      failed('D_1', 'no_answer'),
      failed('D_2', 'org_restricted'),
      failed('D_3', 'org_restricted'),
      failed('D_4', 'invalid'),
      failed('D_5', 'no_answer'),
      failed('D_6', 'org_restricted'),
    ];
    const [run] = replyTroubleOf(drafts);
    expect(run.shared.map(({ reason }) => reason)).toEqual(['org_restricted', 'no_answer']);
    expect(run.alone.map(({ draftId }) => draftId)).toEqual(['D_4']);
    expect(toneOf([...run.shared.map(({ reason }) => reason), ...run.alone.map(reasonKeyOf)])).toBe('red');
    // "Try all again" shows for the retryable pair, though the organization's refusal is among the reasons.
    expect(run.shared.some(({ reason }) => RETRY_REASONS.has(reason))).toBe(true);
  });

  it('two org and two forbidden: amber, and no retry', () => {
    const [run] = replyTroubleOf([
      failed('D_1', 'org_restricted'),
      failed('D_2', 'forbidden'),
      failed('D_3', 'org_restricted'),
      failed('D_4', 'forbidden'),
    ]);
    const reasons = run.shared.map(({ reason }) => reason);
    expect(toneOf(reasons)).toBe('amber');
    expect(reasons.some((reason) => RETRY_REASONS.has(reason))).toBe(false);
  });

  it('two failures on our side: red, retryable, its own words', () => {
    const [run] = replyTroubleOf([failed('D_1', 'error'), failed('D_2', 'error')]);
    expect(toneOf(['error'])).toBe('red');
    expect(RETRY_REASONS.has(run.shared[0].reason)).toBe(true);
    expect(replyTroubleLineOf('error', 2, 'driftwood-js', true)).toBe(
      'Something went wrong on our side, not in your replies. Try again.',
    );
  });

  it('keeps two runs apart, and leaves out resolve failures, dismissed, posted and in-review drafts', () => {
    const runs = replyTroubleOf([
      failed('D_1', 'transient'),
      failed('D_2', 'transient', { attemptId: 'A_F2', updatedAt: '2026-10-29T11:59:00.000Z' }),
      replyDraft({ draftId: 'D_3', state: 'POSTED', resolveState: 'FAILED' }),
      replyDraft({ draftId: 'D_4', state: 'DISMISSED' }),
      replyDraft({ draftId: 'D_5', state: 'POSTED' }),
      { ...failed('D_6', 'transient'), inReview: true } as ContributeReplyDraft,
    ]);
    expect(runs.map(({ runId, failed: list }) => [runId, list.length])).toEqual([
      ['A_F1', 1],
      ['A_F2', 1],
    ]);
  });

  it('a failure with no reason is unknown, and retryable', () => {
    expect(reasonKeyOf(failed('D_1', null))).toBe('unknown');
    expect(reasonKeyOf(failed('D_2', '  Transient '))).toBe('transient');
    expect(RETRY_REASONS.has('unknown')).toBe(true);
  });

  it('the grant reasons are a block and retryable, with the grant line', () => {
    const [run] = replyTroubleOf([failed('D_1', 'grant_revoked'), failed('D_2', 'grant_revoked')]);
    expect(toneOf(run.shared.map(({ reason }) => reason))).toBe('amber');
    expect(RETRY_REASONS.has('grant_revoked')).toBe(true);
    expect(replyTroubleLineOf('grant_revoked', 2, 'driftwood-js', false)).toBe(
      'GitRanks has no GitHub access to post them. Allow GitHub access again, then try again.',
    );
  });

  it('says each reason in plain words, many or one', () => {
    expect(replyTroubleLineOf('org_restricted', 7, 'driftwood-js', true)).toBe(
      "Your fixes are on the pull request. The replies are not: driftwood-js only lets apps it has approved post in review threads, and GitRanks isn't one of them yet.",
    );
    expect(replyTroubleLineOf('org_restricted', 1, 'driftwood-js', false)).toBe(
      "The reply is not: driftwood-js only lets apps it has approved post in review threads, and GitRanks isn't one of them yet.",
    );
    expect(replyTroubleLineOf('forbidden', 2, 'o', false)).toBe(
      'GitHub refused them: the conversation is locked or closed to you.',
    );
    expect(replyTroubleLineOf('not_found', 1, 'o', false)).toBe(
      'The comment it answers, or the pull request, is no longer on GitHub.',
    );
    expect(replyTroubleLineOf('no_answer', 3, 'o', false)).toBe("GitHub didn't answer when GitRanks posted them.");
    expect(replyTroubleLineOf('rate_limited', 2, 'o', false, 'Slow down a bit. Then retry.')).toBe('Slow down a bit.');
    expect(replyTroubleLineOf('rate_limited', 2, 'o', false, null)).toBe('GitHub refused them.');
    expect(orgNameOf('driftwood-js/driftwood')).toBe('driftwood-js');
  });
});
