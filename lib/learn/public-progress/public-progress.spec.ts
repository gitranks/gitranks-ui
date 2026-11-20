import { describe, expect, it } from 'vitest';

import type { LearnRecord } from '../learn.types';
import {
  isStoredSpelling,
  learnCardAddressOf,
  learnCardFiguresOf,
  learnCardUrlOf,
  learnCardVersionOf,
  publicNumbersOf,
  publicProgressDescriptionOf,
  shareStateOf,
} from './public-progress';

const record = (extra: Partial<LearnRecord> = {}): LearnRecord => ({
  login: 'octocat',
  lessons: 7,
  newThings: 19,
  topics: [],
  prsOpened: 3,
  prsMerged: 2,
  reposHelped: 2,
  ...extra,
});
const counts = { lessonsPassed: 7, newThings: 19, reposHelped: 2, prsMerged: 2, prsOpened: 3 };

describe('the public progress page and card', () => {
  it('names the card by its numbers, under the developer’s other images', () => {
    expect(learnCardVersionOf(record())).toBe('7-19-2');
    expect(learnCardUrlOf('octocat', record())).toBe('/badge/user/octocat/learn-card.png?v=7-19-2');
    expect(learnCardAddressOf('octocat')).toBe('gitranks.com/learn/progress/octocat');
  });

  it('says the numbers in the description, a part at 0 left out', () => {
    expect(publicProgressDescriptionOf(record())).toBe(
      'octocat passed 7 lessons on real open-source fixes and learned 19 new things. 2 repositories merged the fixes.',
    );
    expect(publicProgressDescriptionOf(record({ lessons: 1, newThings: 0, reposHelped: 1 }))).toBe(
      'octocat passed 1 lesson on real open-source fixes. 1 repository merged the fixes.',
    );
    expect(publicProgressDescriptionOf(record({ newThings: 1, reposHelped: 0 }))).toBe(
      'octocat passed 7 lessons on real open-source fixes and learned 1 new thing.',
    );
  });

  it('draws lessons passed always on the card, the other two figures only above 0', () => {
    expect(learnCardFiguresOf(record()).map(({ label }) => label)).toEqual([
      'lessons passed',
      'new things learned',
      'repos helped',
    ]);
    expect(learnCardFiguresOf(record({ lessons: 1, newThings: 0, reposHelped: 0 }))).toEqual([
      { value: '1', label: 'lesson passed' },
    ]);
    expect(publicNumbersOf(record()).map(({ value }) => value)).toEqual([7, 19, 2, 2]);
  });

  it('serves a record under its stored spelling alone', () => {
    expect(isStoredSpelling(record({ login: 'OctoCat' }), 'OctoCat')).toBe(true);
    expect(isStoredSpelling(record({ login: 'OctoCat' }), 'octocat')).toBe(false);
    expect(isStoredSpelling(record({ login: null }), 'octocat')).toBe(false);
  });

  it('tells the Share control what to say', () => {
    expect(shareStateOf({ ...counts, lessonsPassed: 0 }, null)).toBe('nothing');
    expect(shareStateOf(counts, null)).toBe('no-record');
    expect(shareStateOf(counts, { ...counts, lessonsPassed: 0 })).toBe('no-record');
    expect(shareStateOf(counts, { ...counts, prsOpened: 1 })).toBe('equal');
    expect(shareStateOf(counts, { ...counts, lessonsPassed: 5 })).toBe('differ');
    expect(shareStateOf(counts, { ...counts, prsMerged: 1 })).toBe('differ');
  });
});
