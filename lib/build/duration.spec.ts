import { describe, expect, it } from 'vitest';

import { durationWordsOf } from './duration';
import { baseWordsOf } from './project';
import { projectFactsOf } from './project-card';
import { minutesWordsOf } from './step-page';

describe("a project's time, in words", () => {
  it.each([
    [5, 'about 5 minutes'],
    [10, 'about 10 minutes'],
    [14, 'about 15 minutes'],
    [15, 'about half an hour'],
    [20, 'about half an hour'],
    [30, 'about half an hour'],
    [40, 'about half an hour'],
    [45, 'about an hour'],
    [60, 'about an hour'],
    [90, 'about an hour and a half'],
    [100, 'about an hour and a half'],
    [120, 'about two hours'],
    [150, 'about two and a half hours'],
    [180, 'about three hours'],
    [720, 'about 12 hours'],
  ])('%i minutes read as %s', (minutes, words) => {
    expect(durationWordsOf(minutes)).toBe(words);
  });

  it('says nothing for no time', () => {
    expect(durationWordsOf(0)).toBe('');
    expect(durationWordsOf(-5)).toBe('');
    expect(durationWordsOf(Number.NaN)).toBe('');
  });

  it('reads the same on a card, on the project page and on the first step', () => {
    for (const minutes of [20, 40, 90, 150]) {
      const words = durationWordsOf(minutes);
      expect(projectFactsOf({ level: 1, baseSteps: 0, minutes })).toBe(`Easy · ${words}`);
      expect(baseWordsOf({ baseSteps: 2, minutes })).toBe(`2 steps, ${words}`);
      expect(minutesWordsOf(minutes)).toBe(words.charAt(0).toUpperCase() + words.slice(1));
    }
    expect(minutesWordsOf(0)).toBeNull();
  });
});
