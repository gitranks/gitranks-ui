import { describe, expect, it } from 'vitest';

import { languageColorOf, languageColorsOf, learnRecordOf, learnRecordUrl, recordTopicsOf } from './learn-promo';
import { DEFAULT_LANGUAGE_COLOR } from '@/app/app.consts';

describe('language colours', () => {
  it("colours an issue's language from the profile's own, else the site's grey", () => {
    const colors = languageColorsOf([
      { name: 'TypeScript', color: '#3178c6' },
      { name: 'typescript', color: '#000000' },
      { name: 'Go', color: null },
      null,
    ]);
    expect(colors).toEqual({ typescript: '#3178c6' });
    expect(languageColorOf('TypeScript', colors)).toBe('#3178c6');
    expect(languageColorOf('Go', colors)).toBe(DEFAULT_LANGUAGE_COLOR);
    expect(languageColorOf(null)).toBe(DEFAULT_LANGUAGE_COLOR);
  });
});

describe('the Learn record', () => {
  it('is left out without a record or without a lesson', () => {
    expect(learnRecordOf(null)).toBeNull();
    expect(learnRecordOf(undefined)).toBeNull();
    expect(learnRecordOf({ lessons: 0, topics: ['A'], prsOpened: 1, prsMerged: 0 })).toBeNull();
  });

  it('keeps each topic once and counts below zero as none', () => {
    expect(learnRecordOf({ lessons: 2, topics: ['A', ' A ', '', 'B'], prsOpened: -1, prsMerged: 1 })).toEqual({
      login: null,
      lessons: 2,
      newThings: 0,
      topics: ['A', 'B'],
      prsOpened: 0,
      prsMerged: 1,
      reposHelped: 0,
    });
    expect(
      learnRecordOf({
        login: 'OctoCat',
        lessons: 1,
        newThings: 3,
        topics: [],
        prsOpened: 1,
        prsMerged: 1,
        reposHelped: 1,
      }),
    ).toMatchObject({ login: 'OctoCat', newThings: 3, reposHelped: 1 });
  });

  it('names five topics and counts the rest', () => {
    expect(recordTopicsOf(['a', 'b', 'c'])).toEqual({ shown: ['a', 'b', 'c'], more: 0 });
    expect(recordTopicsOf(['a', 'b', 'c', 'd', 'e', 'f', 'g'])).toEqual({ shown: ['a', 'b', 'c', 'd', 'e'], more: 2 });
  });

  it('is read at the login, and never at anything else', () => {
    expect(learnRecordUrl('OctoCat')).toBe('/api/learn/record/octocat');
    expect(learnRecordUrl('../x')).toBeNull();
    expect(learnRecordUrl('')).toBeNull();
  });
});
