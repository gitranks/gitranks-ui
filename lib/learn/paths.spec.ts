import { describe, expect, it } from 'vitest';

import {
  checkPath,
  checkRouteOf,
  coursePath,
  courseRouteOf,
  fromLearn,
  isContentSlug,
  isLearnTag,
  LEARN_COURSES_CARD_PATH,
  LEARN_COURSES_MINE_PATH,
  LEARN_FIXES_TAG,
  LEARN_PULL_REQUESTS_PATH,
  LEARN_SETTINGS_PATH,
  learnCheckMinePath,
  learnCourseCardPath,
  learnCourseGonePath,
  learnCourseMarkdownRouteOf,
  learnCourseMinePath,
  learnCourseTag,
  learnEntityTag,
  learnFactCardPath,
  learnFixPath,
  learnFixTag,
  learnFixTagOf,
  learnIssuesMarkdownRouteOf,
  learnKnownPath,
  learnLessonCardPath,
  learnLessonGonePath,
  learnLessonMarkdownPath,
  learnLessonMarkdownRouteOf,
  learnLessonMinePath,
  learnLessonPath,
  learnLessonTag,
  learnProjectCourseCardPath,
  learnProjectCourseMarkdownPath,
  learnProjectCoursePath,
  learnProjectIssuesPath,
  learnReviewMinePath,
  learnReviewPath,
  markdownPathOf,
} from './paths';

describe("Learn's addresses", () => {
  it('builds a course, a check and a lesson by their slugs, encoded', () => {
    expect(coursePath('algorithms')).toBe('/learn/courses/algorithms');
    expect(checkPath('algorithms')).toBe('/learn/check/algorithms');
    expect(learnLessonPath('hash-sets')).toBe('/learn/lessons/hash-sets');
    expect(coursePath('a b')).toBe('/learn/courses/a%20b');
  });

  it('gives "What you know" and the person’s run of a check, encoded', () => {
    expect(learnKnownPath('algorithms')).toBe('/learn/check/algorithms?known');
    expect(learnCheckMinePath('a b')).toBe('/api/me/learn/check/a%20b');
  });

  it("gives the review of every course or of one, and the person's set behind it, encoded", () => {
    expect(learnReviewPath(null)).toBe('/learn/review');
    expect(learnReviewPath('algorithms')).toBe('/learn/review?course=algorithms');
    expect(learnReviewPath('a b')).toBe('/learn/review?course=a%20b');
    expect(learnReviewMinePath(null)).toBe('/api/me/learn/review');
    expect(learnReviewMinePath('a&b')).toBe('/api/me/learn/review?course=a%26b');
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

  it('takes the list of merged fixes and a fix, as the helpers write them', () => {
    expect(LEARN_FIXES_TAG).toBe('learn:fixes');
    expect(isLearnTag(LEARN_FIXES_TAG)).toBe(true);
    const tag = learnFixTag({ nameWithOwner: 'Octo-Labs/Scroll.Guard', number: 42 });
    expect(tag).toBe('learn:fix:octo-labs/scroll.guard#42');
    expect(isLearnTag(tag)).toBe(true);
    expect(learnFixTagOf(tag)).toBe(tag);
  });

  it("reads a fix's tag sent in any case as the lower-case one its pages carry", () => {
    expect(learnFixTagOf('learn:fix:Octo-Labs/Scroll.Guard#42')).toBe('learn:fix:octo-labs/scroll.guard#42');
    expect(isLearnTag('learn:fix:Octo-Labs/Scroll.Guard#42')).toBe(true);
  });

  it.each([
    'learn:fix',
    'learn:fix:',
    'learn:fix:octo/repo',
    'learn:fix:octo/repo#0',
    'learn:fix:octo/repo#007',
    'learn:fix:octo#7',
    'learn:fix:octo/repo/7',
    'learn:fix: octo/repo#7',
    'learn:fix:octo/repo#7 ',
    'learn:fix:github.com/octo/repo/pull/7',
    'learn:fix:octo/..#7',
    'Learn:fix:octo/repo#7',
  ])('refuses the fix tag %j', (tag) => {
    expect(learnFixTagOf(tag)).toBeNull();
    expect(isLearnTag(tag)).toBe(false);
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

  it("answers Issues' Markdown copies from their route, with the view carried", () => {
    expect(learnIssuesMarkdownRouteOf('/learn/issues.md')).toBe('/api/learn/issues.md');
    expect(learnIssuesMarkdownRouteOf('/learn/issues.md', '?language=go&fixed=1')).toBe(
      '/api/learn/issues.md?language=go&fixed=1',
    );
    // `at` is the route's own: a query never sets it.
    expect(learnIssuesMarkdownRouteOf('/learn/issues.md', '?at=lesson&lesson=x')).toBe('/api/learn/issues.md?lesson=x');
    expect(learnIssuesMarkdownRouteOf('/learn/lessons/binary-search/real-world.md')).toBe(
      '/api/learn/issues.md?lesson=binary-search&at=lesson',
    );
    expect(learnIssuesMarkdownRouteOf('/learn/courses/algorithms/real-world.md', '?language=go')).toBe(
      '/api/learn/issues.md?language=go&course=algorithms&at=course',
    );
    for (const path of [
      '/learn/issues',
      '/learn/issues.md/',
      '/learn/lessons/Binary-Search/real-world.md',
      '/learn/courses/a/b/real-world.md',
      '/learn/courses/algorithms.md',
      '/learn/lessons/binary-search/real-world',
    ]) {
      expect(learnIssuesMarkdownRouteOf(path), path).toBeNull();
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

  it("reads the course a course's check asks for, and nothing else", () => {
    expect(checkRouteOf('/learn/check/algorithms')).toBe('algorithms');
    expect(checkRouteOf('/learn/check/algorithms/')).toBe('algorithms');
    expect(checkRouteOf('/learn/check/Algorithms')).toBe('Algorithms');
    for (const path of ['/learn/check', '/learn/check/', '/learn/check/a/b', '/learn/courses/algorithms']) {
      expect(checkRouteOf(path), path).toBeNull();
    }
  });
});

describe("a project course's addresses", () => {
  const repo = { repo: 'django/django' };
  const org = { org: 'kubernetes' };

  it("finds a repository's course by its owner and name, and an organisation's by its login", () => {
    expect(learnProjectCoursePath(repo)).toBe('/learn/repos/django/django');
    expect(learnProjectCoursePath({ repo: 'Octo-Labs/scroll.guard' })).toBe('/learn/repos/Octo-Labs/scroll.guard');
    expect(learnProjectCoursePath(org)).toBe('/learn/orgs/kubernetes');
    expect(learnProjectCoursePath({ org: 'Nebula' })).toBe('/learn/orgs/Nebula');
  });

  it.each([
    ['an owner alone', { repo: 'owner' }],
    ['an empty repository', { repo: '' }],
    ['an empty owner', { repo: '/name' }],
    ['an empty name', { repo: 'owner/' }],
    ['two slashes', { repo: 'a/b/c' }],
    ['an empty login', { org: '' }],
  ])('refuses %s, in every address and tag', (_, project) => {
    expect(() => learnProjectCoursePath(project)).toThrow();
    expect(() => learnProjectCourseMarkdownPath(project)).toThrow();
    expect(() => learnProjectCourseCardPath(project)).toThrow();
    expect(() => learnProjectIssuesPath(project)).toThrow();
    expect(() => learnEntityTag(project)).toThrow();
  });

  it('encodes each segment, and keeps the slash between owner and name', () => {
    expect(learnProjectCoursePath({ repo: 'a b/c?d' })).toBe('/learn/repos/a%20b/c%3Fd');
    expect(learnProjectCoursePath({ org: 'a/b' })).toBe('/learn/orgs/a%2Fb');
  });

  it("gives the course's Markdown copy and picture at its page's address", () => {
    expect(learnProjectCourseMarkdownPath(repo)).toBe('/learn/repos/django/django.md');
    expect(learnProjectCourseMarkdownPath(org)).toBe('/learn/orgs/kubernetes.md');
    expect(learnProjectCourseCardPath(repo)).toBe('/learn/repos/django/django/card.png');
    expect(learnProjectCourseCardPath(org)).toBe('/learn/orgs/kubernetes/card.png');
  });

  it('narrows the Issues page to the project, and to its merged fixes with fixed=1', () => {
    expect(learnProjectIssuesPath(repo)).toBe('/learn/issues?repo=django/django');
    expect(learnProjectIssuesPath(repo, { fixed: true })).toBe('/learn/issues?repo=django/django&fixed=1');
    expect(learnProjectIssuesPath(org)).toBe('/learn/issues?org=kubernetes');
    expect(learnProjectIssuesPath(org, { fixed: false })).toBe('/learn/issues?org=kubernetes');
    expect(learnProjectIssuesPath(org, { fixed: true })).toBe('/learn/issues?org=kubernetes&fixed=1');
    expect(learnProjectIssuesPath({ repo: 'a&b/c=d' })).toBe('/learn/issues?repo=a%26b/c%3Dd');
  });
});

describe("a project's Learn card tags", () => {
  it('writes the tag of a repository and of an organisation in lower case, as the expire route takes them', () => {
    expect(learnEntityTag({ repo: 'Django/Django' })).toBe('learn:entity:repo:django/django');
    expect(learnEntityTag({ org: 'Kubernetes' })).toBe('learn:entity:org:kubernetes');
    expect(isLearnTag(learnEntityTag({ repo: 'Octo-Labs/Scroll.Guard_2' }))).toBe(true);
    expect(isLearnTag(learnEntityTag({ org: '-Jerry-' }))).toBe(true);
    expect(isLearnTag(learnEntityTag({ repo: `${'a'.repeat(39)}/${'b'.repeat(100)}` }))).toBe(true);
    expect(isLearnTag('learn:entity:repo:octo/.github')).toBe(true);
  });

  it.each([
    'learn:entity',
    'learn:entity:',
    'learn:entity:repo:',
    'learn:entity:repo:django',
    'learn:entity:repo:django/',
    'learn:entity:repo:/django',
    'learn:entity:repo:Django/django',
    'learn:entity:repo:a/b/c',
    'learn:entity:repo:octo/.',
    'learn:entity:repo:octo/..',
    'learn:entity:repo:octo.labs/x',
    `learn:entity:repo:${'a'.repeat(40)}/b`,
    `learn:entity:repo:a/${'b'.repeat(101)}`,
    'learn:entity:repo:octo/x\n',
    'learn:entity:org:',
    'learn:entity:org:Nebula',
    'learn:entity:org:a/b',
    'learn:entity:org:a_b',
    `learn:entity:org:${'a'.repeat(40)}`,
    'learn:entity:user:octocat',
    'Learn:entity:org:nebula',
  ])('refuses %j', (tag) => {
    expect(isLearnTag(tag)).toBe(false);
  });
});

describe('a Learn fix’s page', () => {
  it('lives under /learn/fixes, by the pull request', () => {
    expect(learnFixPath({ nameWithOwner: 'harbor-kit/relay', number: 58 })).toBe('/learn/fixes/harbor-kit/relay/58');
  });
});
