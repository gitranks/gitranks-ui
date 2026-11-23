import { describe, expect, it } from 'vitest';

import {
  checkPath,
  coursePath,
  courseRouteOf,
  fromLearn,
  isContentSlug,
  isLearnTag,
  LEARN_COURSES_CARD_PATH,
  LEARN_COURSES_MINE_PATH,
  LEARN_PULL_REQUESTS_PATH,
  LEARN_SETTINGS_PATH,
  learnCourseCardPath,
  learnCourseGonePath,
  learnCourseMarkdownRouteOf,
  learnCourseMinePath,
  learnCourseTag,
  learnFactCardPath,
  learnLessonCardPath,
  learnLessonGonePath,
  learnLessonMarkdownPath,
  learnLessonMarkdownRouteOf,
  learnLessonMinePath,
  learnLessonPath,
  learnLessonTag,
  markdownPathOf,
} from './paths';

describe("Learn's addresses", () => {
  it('builds a course, a check and a lesson by their slugs, encoded', () => {
    expect(coursePath('algorithms')).toBe('/learn/courses/algorithms');
    expect(checkPath('algorithms')).toBe('/learn/check/algorithms');
    expect(learnLessonPath('hash-sets')).toBe('/learn/lessons/hash-sets');
    expect(coursePath('a b')).toBe('/learn/courses/a%20b');
  });

  it("gives a paused or removed lesson's page, and the person's side of a lesson and of a course, encoded", () => {
    expect(learnLessonGonePath('hash-sets')).toBe('/learn/lessons/_gone/hash-sets');
    expect(learnLessonMinePath('hash-sets')).toBe('/api/me/learn/lessons/hash-sets');
    expect(learnCourseMinePath('a b')).toBe('/api/me/learn/courses/a%20b');
  });

  it("knows a slug's shape: lowercase words and digits joined by dashes, not too long", () => {
    for (const slug of ['sets', 'hash-sets-2', 'a1']) expect(isContentSlug(slug), slug).toBe(true);
    for (const slug of ['', '_gone', '_missing', 'Sets', 'a b', '-x', 'x-', 'a--b', 'a/b', 'x'.repeat(200)]) {
      expect(isContentSlug(slug), slug).toBe(false);
    }
  });

  it("gives a page's Markdown copy at its own address", () => {
    expect(markdownPathOf(coursePath('algorithms'))).toBe('/learn/courses/algorithms.md');
  });

  it('says "from Learn" on a shared page, before the hash and after a query', () => {
    expect(LEARN_SETTINGS_PATH).toBe('/my/settings?from=learn');
    expect(LEARN_PULL_REQUESTS_PATH).toBe('/my/pull-requests?from=learn');
    expect(fromLearn('/my/settings#email')).toBe('/my/settings?from=learn#email');
    expect(fromLearn('/my/pull-requests?page=2')).toBe('/my/pull-requests?page=2&from=learn');
  });
});

describe("Learn's cache tags", () => {
  it('takes the list, a course and a lesson, as the helpers write them', () => {
    expect(isLearnTag('learn:courses')).toBe(true);
    expect(isLearnTag(learnCourseTag('algorithms'))).toBe(true);
    expect(isLearnTag(learnLessonTag('hash-sets-2'))).toBe(true);
    expect(isLearnTag(learnLessonTag('a'.repeat(100)))).toBe(true);
  });

  it.each([
    'learn:lessons',
    'learn:course:',
    'learn:lesson:Hash-Sets',
    'learn:lesson:hash--sets',
    'learn:lesson:-sets',
    'learn:course:sets-',
    `learn:lesson:${'a'.repeat(101)}`,
    'learn:lesson:sets\n',
    'learn:course:a/b',
    'learn:course:a:b',
    'Learn:courses',
  ])('refuses %j', (tag) => {
    expect(isLearnTag(tag)).toBe(false);
  });
});

describe("a lesson's Markdown copy and pictures", () => {
  it("lives at the page's address with .md, and its pictures under the page's address", () => {
    expect(learnLessonMarkdownPath('hash-sets')).toBe('/learn/lessons/hash-sets.md');
    expect(learnLessonCardPath('hash-sets')).toBe('/learn/lessons/hash-sets/card.png');
    expect(learnFactCardPath('hash-sets')).toBe('/learn/lessons/hash-sets/fact.png');
  });

  it("is answered from its route, for a slug of a lesson's shape only", () => {
    expect(learnLessonMarkdownRouteOf('/learn/lessons/hash-sets.md')).toBe('/api/learn/lessons/hash-sets/lesson.md');
    for (const path of [
      '/learn/lessons/hash-sets',
      '/learn/lessons/_gone.md',
      '/learn/lessons/Hash-Sets.md',
      '/learn/lessons/a/b.md',
      '/learn/lessons/.md',
      '/learn/lessons/hash-sets.md/x',
      '/learn/courses/algorithms.md',
      `/learn/lessons/${'x'.repeat(101)}.md`,
    ]) {
      expect(learnLessonMarkdownRouteOf(path), path).toBeNull();
    }
  });
});

describe("a course's addresses", () => {
  it("builds a course's picture, its gone page and the person's side of all courses", () => {
    expect(learnCourseCardPath('algorithms')).toBe('/learn/courses/algorithms/card.png');
    expect(LEARN_COURSES_CARD_PATH).toBe('/learn/courses/card.png');
    expect(learnCourseGonePath('algorithms')).toBe('/learn/courses/_gone/algorithms');
    expect(LEARN_COURSES_MINE_PATH).toBe('/api/me/learn/courses');
  });

  it("answers a course's Markdown copy and that of all courses from their route handlers, nothing else", () => {
    expect(learnCourseMarkdownRouteOf('/learn/courses.md')).toBe('/api/learn/courses/all.md');
    expect(learnCourseMarkdownRouteOf('/learn/courses/algorithms.md')).toBe('/api/learn/courses/algorithms/course.md');
    for (const path of [
      '/learn/courses/Algorithms.md',
      '/learn/courses/_gone.md',
      '/learn/courses/a/b.md',
      '/learn/courses.md/',
      '/learn/courses/algorithms',
      '/learn/lessons/algorithms.md',
    ]) {
      expect(learnCourseMarkdownRouteOf(path), path).toBeNull();
    }
  });

  it("reads the course a course's page asks for, and leaves the pages that are not a course", () => {
    expect(courseRouteOf('/learn/courses/algorithms')).toBe('algorithms');
    expect(courseRouteOf('/learn/courses/algorithms/')).toBe('algorithms');
    // The gate answers a segment of another shape as missing.
    expect(courseRouteOf('/learn/courses/Algorithms')).toBe('Algorithms');
    // Reached directly, the pages of a gone or a missing course are asked too, and answered missing: a real 404.
    expect(courseRouteOf('/learn/courses/_gone')).toBe('_gone');
    expect(courseRouteOf('/learn/courses/_missing')).toBe('_missing');
    for (const path of [
      '/learn/courses',
      '/learn/courses/',
      '/learn/courses/card.png',
      '/learn/courses/_gone/algorithms',
      '/learn/courses/algorithms/card.png',
    ]) {
      expect(courseRouteOf(path), path).toBeNull();
    }
  });
});
