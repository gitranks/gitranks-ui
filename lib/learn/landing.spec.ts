import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://example.test';
});
vi.mock('server-only', () => ({}));

import { algorithmsCourse, courseCards } from './__fixtures__/course';
import { tryLessons } from './__fixtures__/learn-home-page';
import { outputLesson, setExampleCodes, setLesson } from './__fixtures__/lesson-page';
import { landingMarkdownResponse } from './course-markdown-response';
import {
  LANDING_COURSES_PER_KIND,
  LANDING_QUESTIONS,
  LANDING_SEARCH_TITLE,
  LANDING_STEPS,
  landingSectionsOf,
  learnLandingMarkdownOf,
  TRY_LESSONS_MAX,
  TRY_TEXT_MAX,
  tryCoursesOf,
  tryLanguagesLineOf,
  tryLessonOf,
  tryTextOf,
} from './landing';
import { LEARN_LANDING_MARKDOWN_PATH, LEARN_LANDING_MARKDOWN_ROUTE, learnLandingMarkdownRouteOf } from './paths';
import { learnCourseMetadata, learnCoursesMetadata, learnIndexedWhile } from './seo/course';
import { LANDING_DESCRIPTION, learnLandingJsonLd, learnLandingMetadata } from './seo/landing';
import { learnLessonMetadata } from './seo/lesson';

const NO_INDEX = { index: false, follow: false };
const many = (count: number, kind: 'TOPIC' | 'LANGUAGE') =>
  Array.from({ length: count }, (_, n) => ({ ...courseCards[0], slug: `${kind}-${n}`, kind }));

describe("the landing's courses", () => {
  it('shows the first four of each kind, topics first, a kind with none left out', () => {
    const sections = landingSectionsOf([...many(6, 'LANGUAGE'), ...many(5, 'TOPIC')]);
    expect(sections.map((section) => [section.kind, section.courses.length])).toEqual([
      ['TOPIC', LANDING_COURSES_PER_KIND],
      ['LANGUAGE', LANDING_COURSES_PER_KIND],
    ]);
    expect(landingSectionsOf(many(2, 'LANGUAGE')).map((section) => section.kind)).toEqual(['LANGUAGE']);
    expect(landingSectionsOf([])).toEqual([]);
  });

  it('offers the first lesson of at most five topic courses at the top, never of a language course', () => {
    const offered = tryCoursesOf([...many(3, 'LANGUAGE'), ...many(7, 'TOPIC')]);
    expect(offered).toHaveLength(TRY_LESSONS_MAX);
    expect(offered.every((course) => course.kind === 'TOPIC')).toBe(true);
    expect(tryCoursesOf(many(3, 'LANGUAGE'))).toEqual([]);
  });
});

describe('the lesson at the top', () => {
  it("opens with the lesson's first whole sentences that fit, as plain text", () => {
    const text = tryTextOf(setLesson.body);
    expect(text.startsWith('The slow way to find a duplicate is to compare every item with every other item.')).toBe(
      true,
    );
    expect(text).not.toContain('**');
    expect(text.length).toBeLessThanOrEqual(TRY_TEXT_MAX);
    expect(text).toMatch(/[.!?]$/);
  });

  it('clips one long sentence that does not fit', () => {
    const text = tryTextOf(`${'word '.repeat(80)}end.`);
    expect(text.length).toBeLessThanOrEqual(TRY_TEXT_MAX);
    expect(text.length).toBeGreaterThan(0);
  });

  it('shows the example in Python when the lesson has it, and names every language it comes in', () => {
    const lesson = tryLessonOf({
      lesson: setLesson,
      examples: [
        { name: 'other', codes: [] },
        { name: 'main', codes: setExampleCodes },
      ],
      questionCodes: [],
    });
    expect(lesson.code?.language).toBe('python');
    expect(lesson.languages).toEqual(setExampleCodes.map((code) => code.language));
    expect(lesson.text).toBe(tryTextOf(setLesson.body));
  });

  it('shows the first language without Python, and no example for a lesson with none', () => {
    const go = setExampleCodes.filter((code) => code.language !== 'python');
    expect(tryLessonOf({ lesson: setLesson, examples: [{ name: 'x', codes: go }], questionCodes: [] }).code).toBe(
      go[0],
    );
    const none = tryLessonOf({ lesson: outputLesson, examples: [], questionCodes: [] });
    expect([none.code, none.languages]).toEqual([null, []]);
  });

  it('says the other languages an example comes in, and nothing for one language', () => {
    expect(tryLanguagesLineOf('python', ['python', 'javascript', 'go', 'rust'])).toBe(
      'Python here. Every example also comes in JavaScript, Go and Rust.',
    );
    expect(tryLanguagesLineOf('python', ['python', 'go'])).toBe('Python here. Every example also comes in Go.');
    expect(tryLanguagesLineOf('python', ['python'])).toBeNull();
    expect(tryLanguagesLineOf('python', [])).toBeNull();
  });
});

describe("the landing's Markdown copy", () => {
  it('is the landing in words, every course linked to its own copy', () => {
    const markdown = learnLandingMarkdownOf(courseCards);
    expect(markdown.startsWith('# GitRanks Learn\n\n')).toBe(true);
    expect(markdown).toContain('The page: https://example.test/learn\n');
    expect(markdown).toContain(`1. ${LANDING_STEPS[0].title} (Learned). `);
    expect(markdown).toContain(
      'All courses: https://example.test/learn/courses (Markdown: https://example.test/learn/courses.md)',
    );
    for (const course of courseCards) {
      expect(markdown).toContain(`](https://example.test/learn/courses/${course.slug}.md): `);
    }
    expect(markdown).toContain('For maintainers: https://example.test/learn/maintainers');
    for (const each of LANDING_QUESTIONS) expect(markdown).toContain(`### ${each.question}\n\n${each.answer}`);
    expect(markdown).not.toContain(String.fromCodePoint(0x2014));
  });

  it('leaves the courses out when there are none', () => {
    const markdown = learnLandingMarkdownOf([]);
    expect(markdown).not.toContain('## Courses');
    expect(markdown).toContain('## How it works');
  });

  it('is answered at /learn.md through its route, and at no other address', () => {
    expect(LEARN_LANDING_MARKDOWN_PATH).toBe('/learn.md');
    expect(learnLandingMarkdownRouteOf('/learn.md')).toBe(LEARN_LANDING_MARKDOWN_ROUTE);
    expect(learnLandingMarkdownRouteOf('/learn')).toBeNull();
    expect(learnLandingMarkdownRouteOf('/learn/courses.md')).toBeNull();
  });
});

describe("the landing's Markdown copy, answered", () => {
  it('is not found, never kept, while Learn is not open to everyone, and reads no course', async () => {
    const courses = vi.fn(async () => courseCards);
    for (const open of [async () => false, async () => Promise.reject(new Error('down'))]) {
      const response = await landingMarkdownResponse(open, courses);
      expect(response.status).toBe(404);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      expect(await response.text()).not.toContain('#');
    }
    expect(courses).not.toHaveBeenCalled();
  });

  it('is the copy once open, never indexed, the landing named as the canonical', async () => {
    const response = await landingMarkdownResponse(
      async () => true,
      async () => courseCards,
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(learnLandingMarkdownOf(courseCards));
    expect(Object.fromEntries(response.headers)).toMatchObject({
      'content-type': 'text/markdown; charset=utf-8',
      'x-robots-tag': 'noindex',
      link: '</learn>; rel="canonical"',
    });
  });

  it('is the copy without the courses when they cannot be read', async () => {
    const response = await landingMarkdownResponse(
      async () => true,
      async () => Promise.reject(new Error('down')),
    );
    expect([response.status, await response.text()]).toEqual([200, learnLandingMarkdownOf([])]);
  });
});

describe("the landing's metadata", () => {
  it('names the landing for search engines, its address, its copy and the courses picture', () => {
    const metadata = learnLandingMetadata(courseCards, true);
    expect(metadata.title).toEqual({ absolute: LANDING_SEARCH_TITLE });
    expect(metadata.description).toBe(LANDING_DESCRIPTION);
    expect(LANDING_DESCRIPTION.length).toBeLessThanOrEqual(158);
    expect(metadata.alternates?.canonical).toBe('/learn');
    expect(JSON.stringify(metadata.alternates)).toContain('/learn.md');
    expect(metadata.robots).toBeUndefined();
  });

  it('is never indexed while the switch that opens Learn to everyone is closed', () => {
    expect(learnLandingMetadata(courseCards, false).robots).toEqual(NO_INDEX);
    expect(learnLandingMetadata([], false).alternates?.canonical).toBe('/learn');
  });

  it('is the courses, the lesson at the top and the questions as structured data', () => {
    const payloads = learnLandingJsonLd(courseCards, setLesson) as { '@type': string }[];
    expect(payloads.map((payload) => payload['@type'])).toEqual(['ItemList', 'LearningResource', 'FAQPage']);
    expect(payloads[1]).toMatchObject({
      name: setLesson.title,
      url: 'https://example.test/learn/lessons/find-duplicates-with-a-set',
      isPartOf: { '@type': 'Course', name: 'Algorithms and data structures' },
    });
    expect((payloads[2] as unknown as { mainEntity: unknown[] }).mainEntity).toHaveLength(LANDING_QUESTIONS.length);
  });

  it('leaves out the courses and the lesson when there are none', () => {
    const payloads = learnLandingJsonLd([], null) as { '@type': string }[];
    expect(payloads.map((payload) => payload['@type'])).toEqual(['FAQPage']);
    expect(learnLandingJsonLd(courseCards, tryLessons[0].lesson)).toHaveLength(3);
  });
});

describe("Learn's public pages while the switch that opens Learn to everyone is closed", () => {
  it('adds the do-not-index mark when closed, and changes nothing when open', () => {
    const metadata = { title: 'A page', robots: { index: true, follow: true } };
    expect(learnIndexedWhile(metadata, true)).toBe(metadata);
    expect(learnIndexedWhile(metadata, false)).toEqual({ title: 'A page', robots: NO_INDEX });
  });

  it("marks a course's page, all courses (searched or not) and a lesson's page", () => {
    const course = algorithmsCourse;
    expect(learnCourseMetadata(course).robots).toBeUndefined();
    expect(learnCourseMetadata(course, { open: false }).robots).toEqual(NO_INDEX);
    expect(learnCoursesMetadata(courseCards, { searched: false, open: false }).robots).toEqual(NO_INDEX);
    expect(learnCoursesMetadata(courseCards, { searched: true, open: false }).robots).toEqual(NO_INDEX);
    expect(learnLessonMetadata(setLesson).robots).toBeUndefined();
    expect(learnLessonMetadata(setLesson, { open: false }).robots).toEqual(NO_INDEX);
    expect(learnLessonMetadata(setLesson, { fact: true, open: false }).robots).toEqual(NO_INDEX);
  });
});
