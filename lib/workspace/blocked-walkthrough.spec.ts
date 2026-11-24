import { describe, expect, it } from 'vitest';

import { PR_NOW, prList, prPage, prRow } from './__fixtures__/pull-request';
import { blockedReasonLineOf, blockedWalkthroughsOf, withBlockedWalkthroughs } from './blocked-walkthrough';
import { needsYouRowWordsOf, rowWordsOf } from './pull-request-list';
import { boxOf } from './pull-request-page';

const items = (...list: unknown[]) => ({ items: list });

describe('a walkthrough that waits for another pass', () => {
  it('words each reason as one line, and none for a reason it does not know or none at all', () => {
    expect(blockedReasonLineOf('wrong_key')).toBe('A question’s marked answer is wrong.');
    expect(blockedReasonLineOf('unclear')).toBe('A question is unclear.');
    expect(blockedReasonLineOf('off_topic')).toBe('A question is not about this fix.');
    expect(blockedReasonLineOf('two_fit')).toBe('More than one answer fits a question.');
    expect(blockedReasonLineOf('something_new')).toBeNull();
    expect(blockedReasonLineOf(null)).toBeNull();
  });

  it('takes the items of that kind alone, by their attempt, with the reason from its own read', () => {
    const kinds = items(
      { kind: 'LESSON_BLOCKED', attemptId: 'A_1' },
      { kind: 'LESSON_READY', attemptId: 'A_2' },
      { kind: 'LESSON_BLOCKED', attemptId: 'A_3' },
      { kind: 'LESSON_BLOCKED' },
      null,
    );
    const reasons = items(
      { kind: 'LESSON_BLOCKED', attemptId: 'A_1', facts: { blockedReason: 'two_fit' } },
      { kind: 'LESSON_BLOCKED', attemptId: 'A_3', facts: { blockedReason: null } },
    );
    expect([...blockedWalkthroughsOf(kinds, reasons)]).toEqual([
      ['A_1', { reason: 'More than one answer fits a question.' }],
      ['A_3', { reason: null }],
    ]);
    // The reasons' read failed (an API without the field): the kinds alone, no line.
    expect([...blockedWalkthroughsOf(kinds, null)]).toEqual([
      ['A_1', { reason: null }],
      ['A_3', { reason: null }],
    ]);
    expect(blockedWalkthroughsOf(null).size).toBe(0);
  });

  it('marks a walkthrough row of the list by its attempt, and leaves the list as it is without the read', () => {
    const list = prList({ rows: [prRow('WALKTHROUGH', { attemptId: 'A_1' }), prRow('APPROVE', { attemptId: 'A_2' })] });
    const blocked = new Map([
      ['A_1', { reason: 'A question is unclear.' }],
      ['A_2', { reason: null }],
    ]);
    const marked = withBlockedWalkthroughs(list, blocked);
    expect(marked.rows[0].walkthroughBlocked).toEqual({ reason: 'A question is unclear.' });
    // Only a row whose box is the walkthrough's: any other box says what it says.
    expect(marked.rows[1].walkthroughBlocked).toBeUndefined();
    expect(withBlockedWalkthroughs(list, null)).toBe(list);
  });

  it('never reads as ready on its row: another pass, the reason, and a button that promises no send-back', () => {
    const row = prRow('WALKTHROUGH', { walkthroughBlocked: { reason: 'A question is unclear.' } });
    // The row can't tell whether a send-back is left: the fix's page says what the person can do.
    expect(needsYouRowWordsOf(row)).toEqual({
      line: 'The fix walkthrough needs another pass',
      button: 'Send it back to your agent',
    });
    expect(rowWordsOf(row, PR_NOW)).toMatchObject({
      line: 'The fix walkthrough needs another pass',
      reason: 'A question is unclear.',
      button: 'Send it back to your agent',
    });
    expect(rowWordsOf(prRow('WALKTHROUGH', { walkthroughBlocked: { reason: null } }), PR_NOW).reason).toBeNull();
    // Not marked: as the list says.
    expect(rowWordsOf(prRow('WALKTHROUGH'), PR_NOW)).toMatchObject({
      line: 'The fix walkthrough is ready',
      reason: null,
      button: 'Start the walkthrough',
    });
  });

  it("says so in the pull request page's box, with the send-back as its one action", () => {
    const page = prPage({ made: 'LEARN', box: 'WALKTHROUGH', stage: 'WALKTHROUGH' });
    const words = boxOf(page, { now: PR_NOW, walkthroughBlocked: { reason: 'A question is unclear.' } });
    expect(words.title).toBe('The fix walkthrough needs another pass');
    expect(words.text).toBe('A question is unclear. Send it back to your agent, and it writes the questions again.');
    expect(words.actions).toEqual([{ id: 'sendBack', label: 'Send it back to your agent' }]);
    expect(boxOf(page, { now: PR_NOW, walkthroughBlocked: { reason: null } }).text).toBe(
      'Send it back to your agent, and it writes the questions again.',
    );
    expect(boxOf(page, { now: PR_NOW }).actions.map((action) => action.id)).toEqual(['walkthrough']);
  });

  it('never tells the person to send it back when it cannot go back, and says why', () => {
    const page = prPage({ made: 'LEARN', box: 'WALKTHROUGH', stage: 'WALKTHROUGH' });
    const noneLeft = boxOf(page, {
      now: PR_NOW,
      walkthroughBlocked: { reason: 'A question is unclear.', sendBack: 'none-left' },
    });
    expect(noneLeft.title).toBe('The fix walkthrough needs another pass');
    expect(noneLeft.text).toBe(
      'A question is unclear. No send-backs are left for this fix, so its questions can’t be written again. You can discard it below.',
    );
    expect(noneLeft.actions).toEqual([]);
    const notOwn = boxOf(page, { now: PR_NOW, walkthroughBlocked: { reason: null, sendBack: 'no' } });
    expect(notOwn.text).toBe('It can’t go back to your agent from here. You can discard it below.');
    expect(notOwn.actions).toEqual([]);
  });
});
