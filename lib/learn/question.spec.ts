import { describe, expect, it } from 'vitest';

import { CAUSE_QUESTION, FIX_QUESTION, WARMUP } from './__fixtures__/lesson';
import { DONT_KNOW, optionsOf, pickOf } from './question';

describe("a lesson's question", () => {
  it('takes one pick for a single-answer question, any for a multi-answer one', () => {
    expect(pickOf(CAUSE_QUESTION, [], 'q2a1', true)).toEqual(['q2a1']);
    expect(pickOf(CAUSE_QUESTION, ['q2a1'], 'q2a2', true)).toEqual(['q2a2']);
    expect(pickOf(FIX_QUESTION, ['q3a1'], 'q3a3', true)).toEqual(['q3a1', 'q3a3']);
    expect(pickOf(FIX_QUESTION, ['q3a1', 'q3a3'], 'q3a1', false)).toEqual(['q3a3']);
  });

  it('adds "I don\'t know yet" to a warm-up question alone, where it stands alone among the picks', () => {
    expect(optionsOf(WARMUP[0]).map(({ id }) => id)).toEqual(['w1a', 'w1b', 'w1c']);
    expect(optionsOf(WARMUP[0], true).at(-1)).toEqual({ id: DONT_KNOW, text: "I don't know yet" });

    const multi = { ...WARMUP[0], type: 'MULTI' as const };
    expect(pickOf(multi, ['w1a', 'w1b'], DONT_KNOW, true)).toEqual([DONT_KNOW]);
    expect(pickOf(multi, [DONT_KNOW], 'w1a', true)).toEqual(['w1a']);
  });
});
