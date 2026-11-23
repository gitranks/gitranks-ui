import { describe, expect, it } from 'vitest';

import {
  COMMENT_MAX,
  isLanguageKey,
  lessonAnswerInputOf,
  lessonFeedbackInputOf,
  pickedOf,
} from './lesson-answer-input';

const answer = { slug: 'sets', question: 'q1', picked: 2, tries: 1, language: 'python' };

describe('pickedOf', () => {
  it('takes each kind of pick', () => {
    expect(pickedOf('myth')).toBe('myth');
    expect(pickedOf('fact')).toBe('fact');
    expect(pickedOf(0)).toBe(0);
    expect(pickedOf([2, 0, 1])).toEqual([2, 0, 1]);
    expect(pickedOf(['b', 'a'])).toEqual(['b', 'a']);
  });

  it('refuses anything else', () => {
    for (const bad of [null, undefined, -1, 1.5, 10_001, 'true', [], [1, 'a'], [''], ['x'.repeat(201)], { 0: 1 }]) {
      expect(pickedOf(bad), JSON.stringify(bad)).toBeNull();
    }
    expect(pickedOf(Array.from({ length: 21 }, (_, i) => i))).toBeNull();
  });
});

describe('lessonAnswerInputOf', () => {
  it('passes a well-formed answer on as it is', () => {
    expect(lessonAnswerInputOf(answer)).toEqual(answer);
    expect(lessonAnswerInputOf({ ...answer, language: null })).toEqual({ ...answer, language: null });
    expect(lessonAnswerInputOf({ ...answer, language: 'c++' })?.language).toBe('c++');
  });

  it('refuses a bad slug, question, pick, number of tries or language', () => {
    for (const bad of [
      { ...answer, slug: '_gone' },
      { ...answer, slug: 1 },
      { ...answer, question: '' },
      { ...answer, picked: 'maybe' },
      { ...answer, tries: 0 },
      { ...answer, tries: 1.5 },
      { ...answer, tries: 1001 },
      { ...answer, language: 'Python' },
      { ...answer, language: undefined },
      { ...answer, language: 'x'.repeat(21) },
    ]) {
      expect(lessonAnswerInputOf(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});

describe('lessonFeedbackInputOf', () => {
  it('takes a rating, with its comment trimmed, and an empty comment as none', () => {
    expect(lessonFeedbackInputOf({ lesson: 'sets', good: true })).toEqual({
      lesson: 'sets',
      good: true,
      comment: null,
    });
    expect(lessonFeedbackInputOf({ lesson: 'sets', good: false, comment: '  Too short. ' })).toEqual({
      lesson: 'sets',
      good: false,
      comment: 'Too short.',
    });
    expect(lessonFeedbackInputOf({ lesson: 'sets', good: false, comment: '   ' })?.comment).toBeNull();
    expect(lessonFeedbackInputOf({ lesson: 'sets', good: false, comment: 'x'.repeat(COMMENT_MAX) })).not.toBeNull();
  });

  it('refuses a bad lesson, a rating that is not yes or no, and a comment too long', () => {
    for (const bad of [
      { lesson: 'Sets', good: true },
      { lesson: 'sets', good: 'yes' },
      { lesson: 'sets', good: true, comment: 3 },
      { lesson: 'sets', good: true, comment: 'x'.repeat(COMMENT_MAX + 1) },
    ]) {
      expect(lessonFeedbackInputOf(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});

describe('isLanguageKey', () => {
  it("takes a language's key and nothing else", () => {
    for (const key of ['python', 'javascript', 'c-sharp', 'go']) expect(isLanguageKey(key), key).toBe(true);
    for (const key of ['', 'Python 3!', 3, null, undefined, 'x'.repeat(100)]) expect(isLanguageKey(key)).toBe(false);
  });
});
