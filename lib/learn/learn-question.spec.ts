import { describe, expect, it } from 'vitest';

import {
  checkQuestion,
  mythQuestion,
  orderQuestion,
  outputQuestion,
  pickAllQuestion,
  pickLineQuestion,
  pickOneQuestion,
} from './__fixtures__/learn-question';
import {
  codeOf,
  isKeyed,
  keyActionOf,
  linesOf,
  openNoteOf,
  optionsOf,
  orderItemsOf,
  rightOf,
  rightWhyOf,
  verdictOf,
  wirePickOf,
} from './learn-question';

describe('optionsOf', () => {
  it('reads a choice question’s options in order', () => {
    expect(optionsOf(pickOneQuestion).map((option) => option.text)).toEqual([
      'It has no repeated items',
      'It is sorted',
      'It has an even length',
    ]);
  });

  it('gives none when one option is not of the shape, so no index moves', () => {
    const broken = { ...pickOneQuestion, content: { options: [{ text: 'a' }, { nope: 1 }, { text: 'c' }] } };
    expect(optionsOf(broken)).toEqual([]);
  });

  it('gives none for another kind', () => {
    expect(optionsOf(mythQuestion)).toEqual([]);
  });
});

describe('orderItemsOf', () => {
  it('reads the rows in the order given', () => {
    expect(orderItemsOf(orderQuestion).map((item) => item.id)).toEqual(['r1', 'r2', 'r3']);
  });

  it('gives none when a row has no id', () => {
    expect(orderItemsOf({ ...orderQuestion, content: { items: [{ text: 'a' }] } })).toEqual([]);
  });
});

describe('isKeyed', () => {
  it('knows each kind’s key', () => {
    for (const question of [
      pickOneQuestion,
      pickAllQuestion,
      outputQuestion,
      pickLineQuestion,
      orderQuestion,
      mythQuestion,
    ]) {
      expect(isKeyed(question)).toBe(true);
    }
  });

  it('knows a keyless question', () => {
    expect(isKeyed(checkQuestion)).toBe(false);
    expect(isKeyed({ ...pickLineQuestion, content: {} })).toBe(false);
    expect(isKeyed({ ...orderQuestion, content: { items: orderItemsOf(orderQuestion) } })).toBe(false);
    expect(isKeyed({ ...mythQuestion, content: {} })).toBe(false);
  });
});

describe('codeOf and linesOf', () => {
  it('falls back to the question’s first language', () => {
    expect(codeOf(pickLineQuestion, 'ruby')?.language).toBe('python');
    expect(codeOf(pickOneQuestion, 'python')).toBeNull();
  });

  it('numbers the lines without a last empty one', () => {
    expect(linesOf('a\r\nb\n')).toEqual(['a', 'b']);
    expect(linesOf('a\n\nb')).toEqual(['a', '', 'b']);
    expect(linesOf('')).toEqual(['']);
  });
});

describe('verdictOf', () => {
  it('grades pick-one and predict-output by the option', () => {
    expect(verdictOf(pickOneQuestion, 1, null)).toMatchObject({ right: true, wrong: [] });
    expect(verdictOf(pickOneQuestion, 0, null)).toEqual({
      right: false,
      why: 'Repeated items are fine: the search still halves the list.',
      wrong: [0],
    });
    expect(verdictOf(outputQuestion, 1, 'python')?.right).toBe(true);
    expect(verdictOf(pickOneQuestion, 7, null)).toBeNull();
    expect(verdictOf(pickOneQuestion, null, null)).toBeNull();
  });

  it('grades pick-all as the whole set, crossing out only the wrong picks', () => {
    expect(verdictOf(pickAllQuestion, [0, 2], null)).toMatchObject({ right: true, wrong: [] });
    expect(verdictOf(pickAllQuestion, [0, 1], null)).toEqual({
      right: false,
      why: 'Keys are not kept in order: finding the smallest reads them all.',
      wrong: [1],
    });
    // Every pick true, one true one missed: nothing is crossed out, and nothing says which one is missing.
    expect(verdictOf(pickAllQuestion, [0], null)).toEqual({ right: false, why: null, wrong: [] });
    expect(verdictOf(pickAllQuestion, [], null)).toBeNull();
  });

  it('grades pick-line in the language the code is shown in', () => {
    expect(verdictOf(pickLineQuestion, 3, 'python')).toMatchObject({ right: true, wrong: [] });
    expect(verdictOf(pickLineQuestion, 2, 'python')).toMatchObject({ right: false, wrong: [2] });
    expect(verdictOf(pickLineQuestion, 2, 'python')?.why).toMatch(/runs once for each item/);
    expect(verdictOf(pickLineQuestion, 3, 'go')).toBeNull();
  });

  it('grades put-in-order by the whole order, saying nothing of which rows are wrong', () => {
    expect(verdictOf(orderQuestion, ['r2', 'r3', 'r1'], null)).toMatchObject({ right: true });
    expect(verdictOf(orderQuestion, ['r1', 'r2', 'r3'], null)).toEqual({ right: false, why: null, wrong: [] });
  });

  it('grades myth or fact, with its reason either way', () => {
    expect(verdictOf(mythQuestion, 'myth', null)?.right).toBe(true);
    expect(verdictOf(mythQuestion, 'fact', null)).toMatchObject({
      right: false,
      why: expect.stringContaining('index'),
    });
  });

  it('gives no verdict without a key', () => {
    expect(verdictOf(checkQuestion, 1, null)).toBeNull();
  });
});

describe('rightOf and rightWhyOf', () => {
  it('names what is right, by kind', () => {
    expect(rightOf(pickAllQuestion, null)).toEqual({ kind: 'options', indexes: [0, 2] });
    expect(rightOf(pickLineQuestion, 'python')).toEqual({ kind: 'line', line: 3 });
    expect(rightOf(orderQuestion, null)).toEqual({ kind: 'order', ids: ['r2', 'r3', 'r1'] });
    expect(rightOf(mythQuestion, null)).toEqual({ kind: 'myth', answer: 'myth' });
    expect(rightOf(checkQuestion, null)).toBeNull();
  });

  it('joins the right options’ reasons', () => {
    expect(rightWhyOf(pickAllQuestion, null)).toBe(
      'The key’s hash points straight at its bucket. Adding hashes the key and writes to its bucket.',
    );
    expect(rightWhyOf(pickLineQuestion, 'go')).toBeNull();
  });
});

describe('wirePickOf', () => {
  it('sends pick-all’s indexes smallest first, each once', () => {
    expect(wirePickOf([2, 0, 2])).toEqual([0, 2]);
    expect(wirePickOf(['r2', 'r1'])).toEqual(['r2', 'r1']);
    expect(wirePickOf(3)).toBe(3);
  });
});

describe('keyActionOf', () => {
  it('picks with the numbers, as far as there are things to pick', () => {
    expect(keyActionOf('PICK_ONE', '2', { count: 3, extra: false })).toEqual({ kind: 'pick', at: 1 });
    expect(keyActionOf('PICK_ONE', '4', { count: 3, extra: false })).toBeNull();
    expect(keyActionOf('MYTH_OR_FACT', '1', { count: 0, extra: false })).toBeNull();
  });

  it('gives 0 to the extra choice only where the place has one', () => {
    expect(keyActionOf('PICK_ONE', '0', { count: 3, extra: true })).toEqual({ kind: 'extra' });
    expect(keyActionOf('PICK_ONE', '0', { count: 3, extra: false })).toBeNull();
  });

  it('answers myth or fact with M and F, and moves rows with the arrows', () => {
    expect(keyActionOf('MYTH_OR_FACT', 'f', { count: 0, extra: false })).toEqual({ kind: 'myth', answer: 'fact' });
    expect(keyActionOf('PICK_ONE', 'm', { count: 3, extra: false })).toBeNull();
    expect(keyActionOf('PUT_IN_ORDER', 'ArrowUp', { count: 3, extra: false })).toEqual({ kind: 'step', by: -1 });
    expect(keyActionOf('PICK_ONE', 'ArrowUp', { count: 3, extra: false })).toBeNull();
    expect(keyActionOf('PICK_LINE', 'Enter', { count: 6, extra: false })).toEqual({ kind: 'main' });
  });
});

describe('openNoteOf', () => {
  it('counts pick-all’s picks', () => {
    expect(openNoteOf('PICK_ALL', [0, 2])).toBe('2 picked. Pick every one that is true, then check.');
    expect(openNoteOf('PICK_ALL', null)).toBe('Pick every one that is true, then check.');
  });
});
