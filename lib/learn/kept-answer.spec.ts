// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import {
  dropKeptAnswer,
  KEPT_ANSWER_KEY,
  KEPT_ANSWER_MS,
  type KeptAnswer,
  keptAnswerFor,
  keptAnswerOf,
  keptAnswerStepOf,
  readKeptAnswer,
  writeKeptAnswer,
} from './kept-answer';

const NOW = Date.parse('2026-11-25T12:00:00Z');
const kept: KeptAnswer = {
  slug: 'hash-maps',
  question: 'q1',
  picked: [0, 2],
  tries: 2,
  language: 'python',
  at: NOW - 5 * 60_000,
};
const stepOf = (over: Partial<Parameters<typeof keptAnswerStepOf>[0]> = {}) =>
  keptAnswerStepOf({ kept, slug: 'hash-maps', question: 'q1', answered: false, sign: true, now: NOW, ...over });

afterEach(() => window.localStorage.clear());

describe("a visitor's kept answer", () => {
  it('is replayed with the sign, on its lesson, while the lesson is unanswered and the question the same', () => {
    expect(stepOf()).toBe('replay');
  });

  it('is removed unsaved once the lesson is answered, or its question changed', () => {
    expect(stepOf({ answered: true })).toBe('drop');
    expect(stepOf({ question: 'q2' })).toBe('drop');
  });

  it('is not replayed after an hour, and is then removed, whatever the lesson', () => {
    expect(stepOf({ now: kept.at + KEPT_ANSWER_MS - 1 })).toBe('replay');
    expect(stepOf({ now: kept.at + KEPT_ANSWER_MS })).toBe('drop');
    expect(stepOf({ now: kept.at + KEPT_ANSWER_MS, slug: 'another' })).toBe('drop');
    // One given in the future is no answer of this browser's clock.
    expect(stepOf({ now: kept.at - 1 })).toBe('drop');
  });

  it('waits without the sign, when the sign cannot be read, and on another lesson', () => {
    expect(stepOf({ sign: false })).toBe('keep');
    expect(stepOf({ sign: null })).toBe('keep');
    expect(stepOf({ slug: 'another' })).toBe('keep');
    expect(stepOf({ kept: null })).toBe('keep');
  });

  it("is a lesson's own only while it is fresh", () => {
    expect(keptAnswerFor(kept, 'hash-maps', NOW)).toEqual(kept);
    expect(keptAnswerFor(kept, 'another', NOW)).toBeNull();
    expect(keptAnswerFor(kept, 'hash-maps', kept.at + KEPT_ANSWER_MS)).toBeNull();
    expect(keptAnswerFor(null, 'hash-maps', NOW)).toBeNull();
  });

  it('is read back only in the shape it was written in', () => {
    expect(keptAnswerOf(kept)).toEqual(kept);
    expect(keptAnswerOf({ ...kept, picked: 'myth', language: null })).toEqual({
      ...kept,
      picked: 'myth',
      language: null,
    });
    for (const broken of [
      null,
      'text',
      { ...kept, slug: '' },
      { ...kept, question: 3 },
      { ...kept, picked: { line: 1 } },
      { ...kept, picked: 'anything' },
      { ...kept, picked: [1, 'a'] },
      { ...kept, tries: 0 },
      { ...kept, tries: 1.5 },
      { ...kept, language: 3 },
      { ...kept, at: 'now' },
    ]) {
      expect(keptAnswerOf(broken)).toBeNull();
    }
  });

  it('is kept under one key, in place of any before, read back, and removed', () => {
    writeKeptAnswer({ ...kept, slug: 'first' });
    writeKeptAnswer(kept);
    expect(readKeptAnswer()).toEqual(kept);
    dropKeptAnswer();
    expect(window.localStorage.getItem(KEPT_ANSWER_KEY)).toBeNull();
    expect(readKeptAnswer()).toBeNull();
  });

  it('reads as none when the stored text is not a record', () => {
    window.localStorage.setItem(KEPT_ANSWER_KEY, '{not json');
    expect(readKeptAnswer()).toBeNull();
  });
});
