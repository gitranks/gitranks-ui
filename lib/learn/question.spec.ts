import { describe, expect, it } from 'vitest';

import { CAUSE_HINT, CAUSE_QUESTION, FIX_QUESTION, FIX_WHY, STEPS, WARMUP } from './__fixtures__/lesson';
import {
  answeredCountOf,
  codeSpansOf,
  DONT_KNOW,
  optionsOf,
  partsLabelOf,
  pickOf,
  shownOptionsOf,
  stepResultLabel,
  warmupAnswersOf,
} from './question';

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

  it('shows every option before it is checked, the picked ones marked', () => {
    const shown = shownOptionsOf(CAUSE_QUESTION.options, ['q2a2'], null);
    expect(shown.map(({ mark }) => mark)).toEqual(['plain', 'picked', 'plain']);
    expect(shown.every(({ why }) => why === null)).toBe(true);
  });

  it('after a wrong answer, shows only the picks with why they are not right, never the right answer', () => {
    const shown = shownOptionsOf(CAUSE_QUESTION.options, ['q2a1'], { correct: false, why: CAUSE_HINT });
    expect(shown).toEqual([
      expect.objectContaining({ mark: 'hint', why: CAUSE_HINT[0].why, option: CAUSE_QUESTION.options[0] }),
    ]);
  });

  it('after a right answer, shows every option with its why, the right ones marked', () => {
    const shown = shownOptionsOf(FIX_QUESTION.options, ['q3a1', 'q3a3'], { correct: true, why: FIX_WHY });
    expect(shown.map(({ mark }) => mark)).toEqual(['right', 'plain', 'right', 'plain']);
    expect(shown.map(({ why }) => why)).toEqual(FIX_WHY.map(({ why }) => why));
    expect(shown.map(({ picked }) => picked)).toEqual([true, false, true, false]);
  });

  it('sends the warm-up with every question answered: unanswered and "I don\'t know yet" alike', () => {
    expect(warmupAnswersOf(WARMUP, { w1: ['w1a'], w2: [DONT_KNOW] })).toEqual([
      { questionId: 'w1', picked: ['w1a'], dontKnow: false },
      { questionId: 'w2', picked: [], dontKnow: true },
      { questionId: 'w3', picked: [], dontKnow: true },
    ]);
    expect(answeredCountOf({ w1: ['w1a'], w2: [DONT_KNOW], w3: [] }, WARMUP)).toBe(2);
    // A question reported away no longer counts.
    expect(answeredCountOf({ w1: ['w1a'], w2: [DONT_KNOW] }, WARMUP.slice(1))).toBe(1);
  });

  it('names what a step covers, and how it went', () => {
    expect(STEPS.map(partsLabelOf)).toEqual(['Before', 'Cause', 'The fix', 'How it connects', 'Deep dive']);
    expect(partsLabelOf({ parts: ['before', 'cause'] })).toBe('Before and cause');
    expect(stepResultLabel({ stepId: 's1', state: 'TRY_N', tries: 3 })).toBe('Passed on try 3');
    expect(stepResultLabel({ stepId: 's1', state: 'KNEW', tries: 0 })).toBe('Knew it before');
  });

  it('splits `code` spans out of plain text, never reading anything else as markup', () => {
    expect(codeSpansOf('Are `/docs/` and `/docs` <b>one</b>?')).toEqual([
      { code: false, text: 'Are ' },
      { code: true, text: '/docs/' },
      { code: false, text: ' and ' },
      { code: true, text: '/docs' },
      { code: false, text: ' <b>one</b>?' },
    ]);
    expect(codeSpansOf('a lone ` tick')).toEqual([{ code: false, text: 'a lone ` tick' }]);
  });
});
