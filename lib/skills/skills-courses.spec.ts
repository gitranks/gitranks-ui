import { describe, expect, it } from 'vitest';

import { algorithmsCourse, databasesCourse, firstLessonCourse, goCourse, SKILLS_NOW } from './__fixtures__/skills';
import {
  courseCountsOf,
  finishedWordsOf,
  groupCountOf,
  hasStar,
  notStartedLineOf,
  squareLabelOf,
  squareOf,
} from './skills-courses';

describe('courseCountsOf', () => {
  it('counts learned of all, then practised and mastered when there are some', () => {
    expect(courseCountsOf(algorithmsCourse)).toBe('23 of 86 lessons learned · 6 practised · 1 mastered');
    expect(courseCountsOf(databasesCourse)).toBe('All 62 lessons learned · 20 practised');
    expect(courseCountsOf(firstLessonCourse)).toBe('1 of 86 lessons learned');
  });

  it('never shows a zero', () => {
    expect(courseCountsOf({ ...firstLessonCourse, practised: 0, mastered: 0 })).not.toMatch(/\b0\b/);
  });
});

describe('finishedWordsOf, groupCountOf, notStartedLineOf', () => {
  it('says when a course was finished, in UTC, with the year when it is not this year', () => {
    expect(finishedWordsOf(databasesCourse, SKILLS_NOW)).toBe('Finished on 12 Nov');
    expect(finishedWordsOf({ finishedAt: '2025-11-12T18:00:00Z' }, SKILLS_NOW)).toBe('Finished on 12 Nov 2025');
    expect(finishedWordsOf(goCourse, SKILLS_NOW)).toBeNull();
  });

  it('counts a group’s lessons', () => {
    expect(groupCountOf(databasesCourse.groups[0])).toBe('all 10');
    expect(groupCountOf(algorithmsCourse.groups[1])).toBe('7 of 12');
  });

  it('lists the groups not started', () => {
    expect(notStartedLineOf(['Trees', 'Graphs'])).toBe('Not started: Trees, Graphs.');
    expect(notStartedLineOf([])).toBeNull();
  });
});

describe('squares', () => {
  it('draws a lesson by its depth, never as due', () => {
    expect(squareOf({ depth: 'PRACTISED' })).toEqual({ kind: 'practised', due: false });
    expect(squareOf({ depth: 'NONE' })).toEqual({ kind: 'none', due: false });
  });

  it('names a square for a screen reader', () => {
    expect(squareLabelOf({ title: 'A queue', depth: 'MASTERED', fix: true })).toBe(
      'A queue: mastered, used in a merged fix',
    );
    expect(squareLabelOf({ title: 'A stack', depth: 'NONE', fix: false })).toBe('A stack: not learned');
  });

  it('knows when a merged fix used a lesson', () => {
    expect(hasStar([algorithmsCourse])).toBe(true);
    expect(hasStar([databasesCourse])).toBe(false);
  });
});
