import { describe, expect, it } from 'vitest';

import { algorithmsCourse, algorithmsCoursePaused, courseCards, goCourse, lessonAt } from './__fixtures__/course';
import { learnCourseMarkdownOf, learnCoursesMarkdownOf } from './course-markdown';
import { absoluteUrl } from '@/lib/seo/site';

const LONG_DASH = String.fromCodePoint(0x2014);

describe("a course's Markdown copy", () => {
  it('says what the page says to everyone: the course, its kind, count and numbers, its groups and lessons', () => {
    const text = learnCourseMarkdownOf(algorithmsCourse);
    expect(
      text.startsWith(`# Algorithms and data structures\n\nThe page: ${absoluteUrl('/learn/courses/algorithms')}\n`),
    ).toBe(true);
    expect(text).toContain(algorithmsCourse.about);
    expect(text).toContain('Topic course: it works in any language, with examples in Python, JavaScript, Go');
    expect(text).toContain('86 lessons in 9 groups. Each one takes about two minutes.');
    expect(text).toContain('1,240 learners · 94% rate it good.');
    expect(text).toContain('## Big-O');
    const first = lessonAt('1-1');
    expect(text).toContain(`1. [${first.title}](${absoluteUrl(`/learn/lessons/${first.slug}.md`)}) · Easy`);
    expect(
      text.endsWith(
        `## After this course\n\n[Databases and SQL](${absoluteUrl('/learn/courses/databases.md')}): Tables, joins, indexes and transactions.\n`,
      ),
    ).toBe(true);
    expect(text).not.toContain(LONG_DASH);
  });

  it('names a paused lesson in its place, without a link', () => {
    const paused = lessonAt('3-3');
    const text = learnCourseMarkdownOf(algorithmsCoursePaused);
    expect(text).toContain(`3. ${paused.title} · Easy · paused while we correct it`);
    expect(text).not.toContain(`/learn/lessons/${paused.slug}.md`);
  });

  it('shows no number not worth showing, and no zero', () => {
    const text = learnCourseMarkdownOf({ ...goCourse, numbers: { learners: 9, goodShare: null } });
    expect(text).toContain('A language course: Go.');
    expect(learnCourseMarkdownOf({ ...goCourse, languages: ['javascript', 'typescript'] })).toContain(
      'A language course: JavaScript and TypeScript.',
    );
    expect(text).not.toMatch(/learners|rate it good|\b0\b/);
    expect(text).not.toContain('## After this course');
  });
});

describe('the Markdown copy of all courses', () => {
  it('lists each kind, each course linked to its own copy with what it covers and its count', () => {
    const text = learnCoursesMarkdownOf(courseCards);
    expect(text).toContain('## Topics, in any language');
    expect(text).toContain('## Languages');
    expect(text).toContain(
      `- [Algorithms and data structures](${absoluteUrl('/learn/courses/algorithms.md')}): How to store data and work through it fast. 86 lessons. 1,240 learners · 94% rate it good.\n`,
    );
    expect(text).toContain(
      `- [PHP](${absoluteUrl('/learn/courses/php.md')}): From a first script to a modern application. 97 lessons.\n`,
    );
    expect(text).not.toContain(LONG_DASH);
  });

  it('says so when no course is open', () => {
    expect(learnCoursesMarkdownOf([])).toContain('No course is open yet.');
  });
});
