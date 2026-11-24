import { describe, expect, it } from 'vitest';

import { algorithmsCourse, courseCards, goCourse } from './__fixtures__/course';
import {
  courseCardFiguresOf,
  courseCardSubOf,
  courseCardVersionOf,
  courseShareDescriptionOf,
  coursesCardFiguresOf,
  issuesFixedOf,
} from './course-share-card';

describe("a course's picture", () => {
  it('says the kind and the languages under the name', () => {
    expect(courseCardSubOf(algorithmsCourse)).toBe('A topic course, with examples in 7 languages');
    expect(courseCardSubOf({ kind: 'TOPIC', languages: ['python'] })).toBe('A topic course, with examples in Python');
    expect(courseCardSubOf({ kind: 'TOPIC', languages: [] })).toBe('A topic course');
    expect(courseCardSubOf(goCourse)).toBe('A language course: Go');
    expect(courseCardSubOf({ kind: 'LANGUAGE', languages: ['javascript', 'typescript'] })).toBe(
      'A language course: JavaScript and TypeScript',
    );
  });

  it('shows the lessons always, the learners from 10, and never a zero', () => {
    expect(courseCardFiguresOf(algorithmsCourse)).toEqual([
      { value: '86', label: 'lessons' },
      { value: '1,240', label: 'learners' },
    ]);
    expect(courseCardFiguresOf({ lessons: 86, numbers: { learners: 9, goodShare: null } })).toEqual([
      { value: '86', label: 'lessons' },
    ]);
    expect(courseCardFiguresOf({ lessons: 1, numbers: { learners: null, goodShare: null } })).toEqual([
      { value: '1', label: 'lesson' },
    ]);
    expect(courseCardFiguresOf({ lessons: 0, numbers: { learners: 0, goodShare: 0 } })).toEqual([]);
  });

  it('draws the real issues fixed with the course from 5, beside its lessons and its learners', () => {
    const numbers = { ...algorithmsCourse.numbers, issuesFixed: 37 };
    expect(courseCardFiguresOf({ ...algorithmsCourse, numbers })).toEqual([
      { value: '86', label: 'lessons' },
      { value: '1,240', label: 'learners' },
      { value: '37', label: 'real issues fixed with it' },
    ]);
    expect(courseCardFiguresOf({ lessons: 9, numbers: { learners: null, goodShare: null, issuesFixed: 5 } })).toEqual([
      { value: '9', label: 'lessons' },
      { value: '5', label: 'real issues fixed with it' },
    ]);
    for (const issuesFixed of [4, 0, null, undefined]) {
      expect(issuesFixedOf({ issuesFixed }), String(issuesFixed)).toBeNull();
    }
    expect(courseCardVersionOf({ ...algorithmsCourse, numbers })).not.toBe(courseCardVersionOf(algorithmsCourse));
    // Under 5 nothing is drawn: the same picture.
    expect(courseCardVersionOf({ ...algorithmsCourse, numbers: { ...numbers, issuesFixed: 4 } })).toBe(
      courseCardVersionOf(algorithmsCourse),
    );
  });

  it('is a new address when anything it draws changes', () => {
    const version = courseCardVersionOf(algorithmsCourse);
    expect(courseCardVersionOf({ ...algorithmsCourse })).toBe(version);
    expect(courseCardVersionOf({ ...algorithmsCourse, name: 'Algorithms' })).not.toBe(version);
    expect(courseCardVersionOf({ ...algorithmsCourse, numbers: { learners: 1300, goodShare: 94 } })).not.toBe(version);
    // A rating is not drawn: it changes nothing.
    expect(courseCardVersionOf({ ...algorithmsCourse, numbers: { learners: 1240, goodShare: 50 } })).toBe(version);
  });

  it('describes the course in its preview', () => {
    expect(courseShareDescriptionOf(algorithmsCourse)).toBe('86 short lessons, each with one question.');
    expect(courseShareDescriptionOf({ lessons: 1 })).toBe('One short lesson, with one question.');
    // No zero: a course whose lessons are all gone for a moment.
    expect(courseShareDescriptionOf({ lessons: 0 })).toBe('Short lessons, each with one question.');
  });
});

describe("all courses' picture", () => {
  it('counts the courses and their lessons, never a zero', () => {
    expect(coursesCardFiguresOf(courseCards)).toEqual([
      { value: '11', label: 'courses' },
      { value: '961', label: 'lessons' },
    ]);
    expect(coursesCardFiguresOf([])).toEqual([]);
  });
});
