import { describe, expect, it } from 'vitest';

import {
  checkPath,
  coursePath,
  fromLearn,
  isContentSlug,
  isLearnTag,
  LEARN_PULL_REQUESTS_PATH,
  LEARN_SETTINGS_PATH,
  learnCourseMinePath,
  learnCourseTag,
  learnLessonGonePath,
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
