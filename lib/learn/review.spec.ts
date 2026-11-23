import { describe, expect, it } from 'vitest';

import { reviewDone } from './__fixtures__/review';
import {
  nothingDueOf,
  reviewAnswerInputOf,
  reviewChangeLineOf,
  reviewEndSummaryOf,
  reviewEndTitleOf,
  reviewMoreWordsOf,
  reviewPillsOf,
} from './review';

describe("the line under an answered review's card", () => {
  it('says Practised now at depth 2, and Mastered now at the top', () => {
    expect(reviewChangeLineOf('PRACTISED', false)).toEqual({
      lead: 'Practised now.',
      text: 'It was Learned. It comes back in 10 days.',
      depth: 2,
    });
    expect(reviewChangeLineOf('MASTERED', false)).toMatchObject({ lead: 'Mastered now.', depth: 3 });
  });

  it('brings a wrong pick and "I don\'t remember" back tomorrow, with no depth and nothing lost', () => {
    const wrong = reviewChangeLineOf('BACK_TOMORROW', false);
    const forgot = reviewChangeLineOf('BACK_TOMORROW', true);
    expect(wrong).toMatchObject({ lead: 'It comes back tomorrow.', depth: null });
    expect(wrong.text).toContain('A wrong pick only brings it back sooner');
    expect(forgot).toMatchObject({ lead: 'It comes back tomorrow.', depth: null });
    expect(forgot.text).toContain('Nothing is lost');
  });
});

describe("the review's end", () => {
  it('gives each change its pills', () => {
    expect(reviewPillsOf('PRACTISED').map((pill) => pill.text)).toEqual(['Practised now', 'comes back in 10 days']);
    expect(reviewPillsOf('MASTERED').map((pill) => pill.text)).toEqual(['Mastered now']);
    expect(reviewPillsOf('BACK_TOMORROW').map((pill) => pill.text)).toEqual(['comes back tomorrow']);
  });

  it('titles a whole set, a set of one, and a set with more waiting', () => {
    expect(reviewEndTitleOf(6, 0)).toBe('You repeated all 6 lessons');
    expect(reviewEndTitleOf(1, 0)).toBe('You repeated your one lesson');
    expect(reviewEndTitleOf(10, 14)).toBe('You repeated 10 lessons');
    expect(reviewEndTitleOf(1, 3)).toBe('You repeated 1 lesson');
  });

  it('sums up what changed, naming only what happened: never a zero', () => {
    expect(reviewEndSummaryOf(reviewDone)).toBe(
      '3 moved from Learned to Practised, 1 from Practised to Mastered. 2 come back tomorrow.',
    );
    expect(reviewEndSummaryOf([{ change: 'MASTERED' }])).toBe('1 moved from Practised to Mastered.');
    expect(reviewEndSummaryOf([{ change: 'BACK_TOMORROW' }])).toBe('1 comes back tomorrow.');
    expect(reviewEndSummaryOf([{ change: 'PRACTISED' }])).toBe('1 moved from Learned to Practised.');
    expect(reviewEndSummaryOf([])).toBe('');
  });

  it('says how many more wait, in one and in many', () => {
    expect(reviewMoreWordsOf(14)).toBe('That is today’s set. 14 more are due, and they wait for you.');
    expect(reviewMoreWordsOf(1)).toBe('That is today’s set. 1 more is due, and it waits for you.');
  });
});

describe('with nothing due', () => {
  const now = new Date(2026, 10, 23, 9);
  const at = (days: number, hour = 6) => new Date(2026, 10, 23 + days, hour).toISOString();
  const time = (hour: number) =>
    new Date(2026, 10, 23, hour).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  it('says when the next review is in the reader’s own days, with its lessons', () => {
    expect(nothingDueOf(at(1), 4, now)).toEqual({
      title: 'Nothing is due today',
      text: 'Your next review is tomorrow, with 4 lessons.',
    });
    expect(nothingDueOf(at(2), 3, now).text).toBe('Your next review is in 2 days, with 3 lessons.');
  });

  it('never says "today" above a review that opens later the same day, read from the same clock', () => {
    // A due time at the start of a day in another zone: 14:00 here.
    const words = nothingDueOf(at(0, 14), 1, now);
    expect(words).toEqual({
      title: 'Nothing is due yet',
      text: `Your next review opens at ${time(14)}, with 1 lesson.`,
    });
    expect(`${words.title} ${words.text}`).not.toMatch(/today/);
    // A due time that passed while the page was read.
    expect(nothingDueOf(at(0, 8), 2, now)).toEqual({
      title: 'Nothing is due yet',
      text: 'Your next review opens in a moment, with 2 lessons.',
    });
  });

  it('says what brings a review when none is coming, and never a zero', () => {
    for (const [when, count] of [
      [null, 0],
      [at(2), 0],
      ['not a date', 3],
    ] as const) {
      const words = nothingDueOf(when, count, now);
      expect(words).toEqual({
        title: 'Nothing is due today',
        text: 'A lesson you learn comes back here three days later, so it stays.',
      });
    }
  });
});

describe("a review's answer as the page sends it", () => {
  it('takes a pick, or "I don\'t remember" alone, with a language or none', () => {
    expect(reviewAnswerInputOf({ item: 'abc.123', picked: 1, forgot: false, language: 'python' })).toEqual({
      item: 'abc.123',
      picked: 1,
      forgot: false,
      language: 'python',
    });
    expect(reviewAnswerInputOf({ item: 'abc', picked: [0, 2], language: null })).toMatchObject({ picked: [0, 2] });
    expect(reviewAnswerInputOf({ item: 'abc', picked: null, forgot: true, language: null })).toEqual({
      item: 'abc',
      picked: null,
      forgot: true,
      language: null,
    });
  });

  it('refuses anything else', () => {
    const good = { item: 'abc', picked: 1, forgot: false, language: 'python' };
    for (const bad of [
      { ...good, item: '' },
      { ...good, item: 'has space' },
      { ...good, item: 'x'.repeat(201) },
      { ...good, item: 7 },
      { ...good, forgot: 'yes' },
      { ...good, forgot: true },
      { ...good, picked: undefined },
      { ...good, picked: { at: 1 } },
      { ...good, language: 'Python 3!' },
      { ...good, language: 3 },
    ]) {
      expect(reviewAnswerInputOf(bad)).toBeNull();
    }
    expect(reviewAnswerInputOf(null as never)).toBeNull();
  });
});
