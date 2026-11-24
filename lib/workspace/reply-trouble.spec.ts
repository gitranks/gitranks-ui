import { describe, expect, it } from 'vitest';

import type { ContributeReplyDraft } from './contribute.types';
import { replyTroubleOf } from './reply-trouble';
import { replyDraft } from '@/lib/contribute/__fixtures__/contribute-attempts';

const failed = (id: string, reason: string | null, patch: Partial<ContributeReplyDraft> = {}) =>
  replyDraft({
    draftId: id,
    state: 'FAILED',
    lastError:
      reason === null ? null : { reason, note: `Refused: ${reason}. Do this.`, at: '2026-10-28T11:59:00.000Z' },
    ...patch,
  });

describe('replies that did not reach GitHub', () => {
  it('one failure alone is its row’s to say', () => {
    const [run] = replyTroubleOf([failed('D_1', 'transient')]);
    expect(run.shared).toEqual([]);
    expect(run.alone.map(({ draftId }) => draftId)).toEqual(['D_1']);
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
});
