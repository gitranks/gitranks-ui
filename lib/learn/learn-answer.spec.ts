import { describe, expect, it } from 'vitest';

import {
  answerAfter,
  checkQuestion,
  mythQuestion,
  orderQuestion,
  pickAllQuestion,
  pickLineQuestion,
  pickOneQuestion,
} from './__fixtures__/learn-question';
import { answerStartOf, canSendOf, pickCountOf } from './learn-answer';
import { type LearnQuestion, verdictOf } from './learn-question';

const graded = (question: LearnQuestion, picked: Parameters<typeof verdictOf>[1]) => ({
  type: 'graded' as const,
  verdict: verdictOf(question, picked, 'python')!,
});

describe('answerStartOf', () => {
  it('starts put-in-order from its rows as given, the rest from nothing', () => {
    expect(answerStartOf(orderQuestion).picked).toEqual(['r1', 'r2', 'r3']);
    expect(answerStartOf(pickOneQuestion).picked).toBeNull();
  });

  it('holds the key of a keyed question only', () => {
    expect(answerStartOf(pickOneQuestion).key).toBe(pickOneQuestion);
    expect(answerStartOf(checkQuestion).key).toBeNull();
  });
});

describe('picking', () => {
  it('pick-one keeps one pick; pick-all toggles, smallest first', () => {
    expect(
      answerAfter(pickOneQuestion, [
        { type: 'pick', at: 0 },
        { type: 'pick', at: 2 },
      ]).picked,
    ).toBe(2);
    const all = answerAfter(pickAllQuestion, [
      { type: 'pick', at: 2 },
      { type: 'pick', at: 0 },
      { type: 'pick', at: 3 },
      { type: 'pick', at: 2 },
    ]);
    expect(all.picked).toEqual([0, 3]);
  });

  it('picks a line by its number, from 1', () => {
    expect(answerAfter(pickLineQuestion, [{ type: 'pick', at: 1 }]).picked).toBe(2);
  });

  it('ignores a pick past the options', () => {
    expect(answerAfter(pickOneQuestion, [{ type: 'pick', at: 5 }]).picked).toBeNull();
  });

  it('moves a row by dragging, and the picked row with the arrows', () => {
    expect(answerAfter(orderQuestion, [{ type: 'move', from: 2, to: 0 }]).picked).toEqual(['r3', 'r1', 'r2']);
    const stepped = answerAfter(orderQuestion, [
      { type: 'pick', at: 1 },
      { type: 'step', by: -1 },
    ]);
    expect(stepped.picked).toEqual(['r2', 'r1', 'r3']);
    expect(stepped.selected).toBe(0);
    // Past the top: nothing moves.
    expect(
      answerAfter(orderQuestion, [
        { type: 'pick', at: 0 },
        { type: 'step', by: -1 },
      ]).picked,
    ).toEqual(['r1', 'r2', 'r3']);
  });

  it('the extra choice clears a pick, and a pick clears it; put-in-order keeps its rows', () => {
    const extra = answerAfter(pickOneQuestion, [{ type: 'pick', at: 1 }, { type: 'extra' }]);
    expect(extra).toMatchObject({ extra: true, picked: null });
    expect(answerAfter(pickOneQuestion, [{ type: 'extra' }, { type: 'pick', at: 1 }])).toMatchObject({
      extra: false,
      picked: 1,
    });
    expect(answerAfter(orderQuestion, [{ type: 'extra' }]).picked).toEqual(['r1', 'r2', 'r3']);
  });
});

describe('canSendOf', () => {
  it('needs a pick of the kind’s shape, or the extra choice', () => {
    expect(canSendOf(pickOneQuestion, answerStartOf(pickOneQuestion))).toBe(false);
    expect(canSendOf(pickOneQuestion, answerAfter(pickOneQuestion, [{ type: 'pick', at: 0 }]))).toBe(true);
    expect(
      canSendOf(
        pickAllQuestion,
        answerAfter(pickAllQuestion, [
          { type: 'pick', at: 0 },
          { type: 'pick', at: 0 },
        ]),
      ),
    ).toBe(false);
    expect(canSendOf(orderQuestion, answerStartOf(orderQuestion))).toBe(true);
    expect(canSendOf(mythQuestion, answerStartOf(mythQuestion))).toBe(false);
    expect(canSendOf(checkQuestion, answerAfter(checkQuestion, [{ type: 'extra' }]))).toBe(true);
  });
});

describe('the page’s own verdict', () => {
  it('a wrong pick-one is crossed out and unpicked, and cannot be picked again', () => {
    const wrong = answerAfter(pickOneQuestion, [{ type: 'pick', at: 0 }, graded(pickOneQuestion, 0)]);
    expect(wrong).toMatchObject({ phase: 'open', picked: null, struck: [0], tries: 1, shown: { right: false } });
    expect(
      answerAfter(pickOneQuestion, [{ type: 'pick', at: 0 }, graded(pickOneQuestion, 0), { type: 'pick', at: 0 }])
        .picked,
    ).toBeNull();
  });

  it('a new pick clears a wrong verdict', () => {
    const again = answerAfter(pickOneQuestion, [
      { type: 'pick', at: 0 },
      graded(pickOneQuestion, 0),
      { type: 'pick', at: 2 },
    ]);
    expect(again.shown).toBeNull();
    expect(again.struck).toEqual([0]);
  });

  it('a right pick is done, with its tries', () => {
    const right = answerAfter(pickOneQuestion, [
      { type: 'pick', at: 0 },
      graded(pickOneQuestion, 0),
      { type: 'pick', at: 1 },
      graded(pickOneQuestion, 1),
    ]);
    expect(right).toMatchObject({ phase: 'done', tries: 2, shown: { right: true } });
    // Done: nothing moves any more.
    expect(
      answerAfter(pickOneQuestion, [{ type: 'pick', at: 1 }, graded(pickOneQuestion, 1), { type: 'pick', at: 2 }])
        .picked,
    ).toBe(1);
  });

  it('a wrong pick-all keeps its right picks and drops the wrong ones; a missed one says so', () => {
    const wrong = answerAfter(pickAllQuestion, [
      { type: 'pick', at: 0 },
      { type: 'pick', at: 1 },
      graded(pickAllQuestion, [0, 1]),
    ]);
    expect(wrong).toMatchObject({ picked: [0], struck: [1], shown: { right: false, missed: false } });
    const missed = answerAfter(pickAllQuestion, [{ type: 'pick', at: 0 }, graded(pickAllQuestion, [0])]);
    expect(missed).toMatchObject({ picked: [0], struck: [], shown: { right: false, missed: true } });
  });

  it('a wrong line is crossed out; a wrong order keeps its rows', () => {
    expect(answerAfter(pickLineQuestion, [{ type: 'pick', at: 1 }, graded(pickLineQuestion, 2)])).toMatchObject({
      picked: null,
      struck: [2],
    });
    expect(answerAfter(orderQuestion, [graded(orderQuestion, ['r1', 'r2', 'r3'])])).toMatchObject({
      phase: 'open',
      picked: ['r1', 'r2', 'r3'],
    });
  });

  it('myth or fact is done on any answer: one press answers', () => {
    expect(answerAfter(mythQuestion, [{ type: 'myth', answer: 'fact' }, graded(mythQuestion, 'fact')])).toMatchObject({
      phase: 'done',
      shown: { right: false },
    });
  });
});

describe('the call’s verdict', () => {
  const keyed: LearnQuestion = {
    ...checkQuestion,
    content: {
      options: [
        { text: '1', right: false, why: 'First in is last out.' },
        { text: '3', right: true, why: 'The last one in comes out first.' },
        { text: '2', right: false, why: 'Not the middle.' },
      ],
    },
  };

  it('waits while sending, and is done with the key the call brought', () => {
    const sending = answerAfter(checkQuestion, [{ type: 'pick', at: 0 }, { type: 'sending' }]);
    expect(sending.phase).toBe('sending');
    const done = answerAfter(checkQuestion, [
      { type: 'pick', at: 0 },
      { type: 'sending' },
      { type: 'answered', right: false, key: keyed, language: 'python' },
    ]);
    // A wrong answer of one try shows why the right one is right.
    expect(done).toMatchObject({
      phase: 'done',
      key: keyed,
      shown: { right: false, why: 'The last one in comes out first.' },
    });
  });

  it('marks the extra choice as the answer', () => {
    const done = answerAfter(checkQuestion, [
      { type: 'extra' },
      { type: 'sending' },
      { type: 'answered', right: false, key: keyed, language: 'python' },
    ]);
    expect(done.shown).toEqual({ right: false, why: 'The last one in comes out first.', extra: true });
  });

  it('keeps the pick when the call failed, to send again', () => {
    const failed = answerAfter(checkQuestion, [{ type: 'pick', at: 2 }, { type: 'sending' }, { type: 'failed' }]);
    expect(failed).toMatchObject({ phase: 'open', picked: 2, failed: true });
    expect(
      answerAfter(checkQuestion, [
        { type: 'pick', at: 2 },
        { type: 'sending' },
        { type: 'failed' },
        { type: 'pick', at: 1 },
      ]).failed,
    ).toBe(false);
  });

  it('ignores an answer that comes when nothing is sending', () => {
    expect(answerAfter(checkQuestion, [{ type: 'answered', right: true, key: null, language: null }]).phase).toBe(
      'open',
    );
  });
});

describe('pickCountOf', () => {
  it('counts options, lines and rows', () => {
    expect(pickCountOf(pickAllQuestion, null)).toBe(4);
    expect(pickCountOf(pickLineQuestion, 'python')).toBe(6);
    expect(pickCountOf(orderQuestion, null)).toBe(3);
    expect(pickCountOf(mythQuestion, null)).toBe(0);
  });
});
