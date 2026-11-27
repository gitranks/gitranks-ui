// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CourseHeader } from './course-header';
import {
  algorithmsCourse,
  checkSavedMine,
  djangoCourse,
  goCourse,
  kubernetesCourse,
  progressMine,
} from '@/lib/learn/__fixtures__/course';
import type { LearnCourse, LearnCourseMine, LearnCourseNumbers } from '@/lib/learn/course';

const LONG_DASH = String.fromCodePoint(0x2014);

function draw(course: LearnCourse, mine: LearnCourseMine | null = null, projectIssues: number | null = null) {
  const host = document.createElement('div');
  host.innerHTML = renderToStaticMarkup(
    <CourseHeader course={course} mine={mine} language="python" onLanguage={() => {}} projectIssues={projectIssues} />,
  );
  return host.querySelector('header') as HTMLElement;
}

const withNumbers = (course: LearnCourse, numbers: LearnCourseNumbers): LearnCourse => ({ ...course, numbers });

/** A part as it reads: its words, with a space where a part of it ends (as the row's gaps draw one). */
const wordsOf = (part: Node): string => {
  const pieces: string[] = [];
  const walker = document.createTreeWalker(part, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) pieces.push(node.textContent ?? '');
  return pieces.join(' ').replace(/\s+/g, ' ').trim();
};

/** The row of facts, one entry for each of its parts, in order. */
const factsOf = (head: Element) => [...head.querySelectorAll('[data-course-facts] > *')].map(wordsOf);

/** The parts of the head under the way back, in reading order, each named by what it is. */
const orderOf = (head: Element) =>
  [...head.children].map((part) => {
    if (part.tagName === 'A') return 'back';
    if (part.tagName === 'H1') return 'name';
    if (part.hasAttribute('data-project-author')) return 'author';
    if (part.hasAttribute('data-course-facts')) return 'facts';
    return 'about';
  });

const full: LearnCourseNumbers = { learners: 1240, goodShare: 94, issuesFixed: 212 };
const none: LearnCourseNumbers = { learners: null, goodShare: null, issuesFixed: null };
const fewer: LearnCourseNumbers = { learners: 9, goodShare: 94, issuesFixed: 4 };

describe("a course's head: a topic course", () => {
  it('reads the name, what it is about, then one row: the kind, lessons and groups, learners, fixes, the language', () => {
    const head = draw(withNumbers(algorithmsCourse, full));
    expect(orderOf(head)).toEqual(['back', 'name', 'about', 'facts']);
    expect(head.querySelector('p')?.textContent).toBe(algorithmsCourse.about);
    expect(factsOf(head)).toEqual([
      'Topic course',
      '86 lessons in 9 groups',
      '1,240 learners',
      '212 real issues fixed',
      'Examples in Python',
    ]);
    expect(head.querySelector('[data-course-fixed]')?.getAttribute('href')).toBe(
      '/learn/courses/algorithms/real-world?fixed=1',
    );
  });

  it('puts the choice of example language at the right end of the row', () => {
    const head = draw(algorithmsCourse);
    const last = head.querySelector('[data-course-facts] > :last-child');
    expect(last?.hasAttribute('data-course-examples')).toBe(true);
    expect(last?.className).toContain('ml-auto');
    expect(last?.querySelector('button')?.getAttribute('aria-label')).toBe('Examples in Python. Change the language');
  });

  it('draws no learners and no fixes while there are none worth showing, and never a zero', () => {
    for (const numbers of [none, fewer, { learners: 0, goodShare: 0, issuesFixed: 0 }]) {
      const head = draw(withNumbers(algorithmsCourse, numbers));
      expect(factsOf(head), JSON.stringify(numbers)).toEqual([
        'Topic course',
        '86 lessons in 9 groups',
        'Examples in Python',
      ]);
      expect(head.textContent).not.toMatch(/\b0\b/);
    }
  });

  it('names its one language without a choice, and draws no language when it has none', () => {
    const one = draw({ ...algorithmsCourse, languages: ['rust'] });
    expect(factsOf(one).at(-1)).toBe('Examples in Rust');
    expect(one.querySelector('button')).toBeNull();
    const zero = draw({ ...algorithmsCourse, languages: [] });
    expect(zero.querySelector('[data-course-examples]')).toBeNull();
    expect(factsOf(zero)).toEqual(['Topic course', '86 lessons in 9 groups', '1,240 learners']);
  });

  it('draws a long name and a long description whole', () => {
    const name = 'Algorithms and data structures for people who write code every day and want it fast';
    const about = 'How to store data and work through it fast. '.repeat(8).trim();
    const head = draw({ ...algorithmsCourse, name, about });
    expect(head.querySelector('h1')?.textContent).toBe(name);
    expect(head.querySelector('h1')?.className).toContain('text-balance');
    expect(head.querySelector('p')?.textContent).toBe(about);
    expect(head.querySelector('p')?.className).toContain('max-w-[70ch]');
  });
});

describe("a course's head: a language course", () => {
  it('names its one language at the right end, with no group count for its one group', () => {
    const head = draw(goCourse);
    expect(orderOf(head)).toEqual(['back', 'name', 'about', 'facts']);
    expect(factsOf(head)).toEqual(['Language course', '104 lessons', '318 learners', 'Examples in Go only']);
    expect(head.querySelector('[data-course-examples]')?.className).toContain('ml-auto');
    expect(head.querySelector('button')).toBeNull();
  });

  it('with fixes and with nothing worth showing', () => {
    expect(factsOf(draw(withNumbers(goCourse, full)))).toEqual([
      'Language course',
      '104 lessons',
      '1,240 learners',
      '212 real issues fixed',
      'Examples in Go only',
    ]);
    expect(factsOf(draw(withNumbers(goCourse, none)))).toEqual([
      'Language course',
      '104 lessons',
      'Examples in Go only',
    ]);
  });

  it('names both languages of one language with and without types', () => {
    const head = draw({ ...goCourse, languages: ['javascript', 'typescript'] });
    expect(factsOf(head).at(-1)).toBe('Examples in JavaScript and TypeScript only');
  });
});

describe("a course's head: a project course", () => {
  it('says who wrote it under what it is about, then the row with the project’s links and no example language', () => {
    const head = draw(djangoCourse, null, 9);
    expect(orderOf(head)).toEqual(['back', 'name', 'about', 'author', 'facts']);
    expect(factsOf(head)).toEqual([
      'Repository course',
      '2 lessons in 2 groups',
      'Python',
      'django/django on GitHub (opens in a new tab)',
      'Django on GitRanks',
      '9 open issues to fix',
    ]);
    expect(head.querySelector('[data-course-examples]')).toBeNull();
  });

  it('with learners and fixes, they come before the project’s links', () => {
    const head = draw(withNumbers(djangoCourse, full));
    expect(factsOf(head).slice(0, 5)).toEqual([
      'Repository course',
      '2 lessons in 2 groups',
      '1,240 learners',
      '212 real issues fixed',
      'Python',
    ]);
  });

  it('an organisation’s course: its kind, one group, its links', () => {
    const head = draw(kubernetesCourse);
    expect(orderOf(head)).toEqual(['back', 'name', 'about', 'author', 'facts']);
    expect(factsOf(head).slice(0, 3)).toEqual(['Org course', '2 lessons', 'Go']);
    expect(head.querySelector('[data-course-examples]')).toBeNull();
  });
});

describe("a course's head for a learner", () => {
  it("puts the learner's figures in the place of the lessons and groups, in the same row", () => {
    const head = draw(withNumbers(algorithmsCourse, full), progressMine);
    expect(factsOf(head)).toEqual([
      'Topic course',
      '10 of 86 learned · 4 practised · 1 mastered · Mark lessons you already know',
      '1,240 learners',
      '212 real issues fixed',
      'Examples in Python',
    ]);
    expect(head.querySelector('[data-course-facts] [data-course-line="mine"] a')?.getAttribute('href')).toBe(
      '/learn/check/algorithms',
    );
  });

  it('only marked lessons: the marks, as the door to what they know', () => {
    const head = draw(algorithmsCourse, checkSavedMine);
    expect(head.querySelector('[data-course-line]')?.textContent).toBe('37 marked as known');
    expect(head.querySelector('[data-course-line] a')?.getAttribute('href')).toBe('/learn/check/algorithms?known');
  });
});

describe("every course's head", () => {
  it('no longer says "Works in any language", how long a lesson takes, or how the course is rated', () => {
    for (const course of [withNumbers(algorithmsCourse, full), goCourse, djangoCourse, kubernetesCourse]) {
      const text = draw(course).textContent ?? '';
      expect(text, course.slug).not.toContain('any language');
      expect(text, course.slug).not.toContain('two minutes');
      expect(text, course.slug).not.toContain('rate it good');
      expect(text, course.slug).not.toContain('94%');
      expect(text, course.slug).not.toContain(LONG_DASH);
    }
  });
});
