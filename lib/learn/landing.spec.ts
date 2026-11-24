import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://example.test';
});
vi.mock('server-only', () => ({}));

import { algorithmsCourse, courseCards } from './__fixtures__/course';
import { tryLessons } from './__fixtures__/learn-home-page';
import { outputLesson, setExampleCodes, setLesson } from './__fixtures__/lesson-page';
import type { LearnCourseCard } from './course';
import { landingMarkdownResponse } from './course-markdown-response';
import { LANDING_COURSES_LINE_EMPTY, landingCoursesLineOf } from './courses-line';
import {
  LANDING_COURSES_PER_KIND,
  LANDING_QUESTIONS,
  LANDING_SEARCH_TITLE,
  LANDING_STEPS,
  landingSectionsOf,
  landingTextOf,
  learnLandingMarkdownOf,
  TRY_LESSONS_MAX,
  TRY_TEXT_MAX,
  tryCoursesOf,
  tryLanguagesLineOf,
  tryLessonOf,
  tryTextOf,
} from './landing';
import { LEARN_LANDING_MARKDOWN_PATH, LEARN_LANDING_MARKDOWN_ROUTE, learnLandingMarkdownRouteOf } from './paths';
import { learnCourseMetadata, learnCoursesMetadata } from './seo/course';
import { landingDescriptionOf, learnLandingJsonLd, learnLandingMetadata } from './seo/landing';
import { learnLessonMetadata } from './seo/lesson';

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
    expect(tryLessonOf({ lesson: setLesson, examples: [{ name: 'main', codes: go }], questionCodes: [] }).code).toBe(
      go[0],
    );
    // A lesson whose only folder is its question's code has no example of its own.
    const questionOnly = tryLessonOf({ lesson: setLesson, examples: [{ name: 'q1', codes: go }], questionCodes: go });
    expect([questionOnly.code, questionOnly.languages]).toEqual([null, []]);
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

/** The live courses as they are listed today, in their order. */
const more = (slug: string, name: string): LearnCourseCard => ({ ...courseCards[0], slug, name });
const liveCourses = [
  more('algorithms', 'Algorithms and data structures'),
  more('javascript-and-typescript', 'JavaScript and TypeScript'),
  more('python', 'Python'),
  more('contributing-to-open-source', 'Contributing to open source'),
  more('working-with-llm-apis', 'Working with LLM APIs'),
];

describe("the landing's line of courses", () => {
  it('names the five live courses in their order, each by its name in a sentence', () => {
    expect(landingCoursesLineOf(liveCourses)).toBe(
      'Short lessons on algorithms, JavaScript and TypeScript, Python, open source and LLM APIs',
    );
  });

  it('names all six with six courses', () => {
    expect(landingCoursesLineOf([...liveCourses, more('go', 'Go')])).toBe(
      'Short lessons on algorithms, JavaScript and TypeScript, Python, open source, LLM APIs and Go',
    );
  });

  it('past six, names the first five and says how many more', () => {
    const seven = [...liveCourses, more('go', 'Go'), more('rust', 'Rust')];
    expect(landingCoursesLineOf(seven)).toBe(
      'Short lessons on algorithms, JavaScript and TypeScript, Python, open source, LLM APIs and 2 more courses',
    );
    expect(landingCoursesLineOf(courseCards)).toMatch(/ and 6 more courses$/);
  });

  it('goes by its own name for a course with no name in a sentence, and reads right for one or two', () => {
    expect(landingCoursesLineOf([more('go', 'Go')])).toBe('Short lessons on Go');
    expect(landingCoursesLineOf([more('python', 'Python'), more('go', 'Go')])).toBe('Short lessons on Python and Go');
  });

  it('never runs a course name with its own "and" into the joining "and": a short name only next to that "and"', () => {
    expect(landingCoursesLineOf([liveCourses[1]])).toBe('Short lessons on JavaScript and TypeScript');
    const [algorithms, js, python, openSource, llm] = liveCourses;
    expect(landingCoursesLineOf([algorithms, python, openSource, llm, js, more('go', 'Go')])).toBe(
      'Short lessons on algorithms, Python, open source, LLM APIs, JavaScript/TypeScript and Go',
    );
    expect(
      landingCoursesLineOf([algorithms, python, openSource, llm, js, more('go', 'Go'), more('rust', 'Rust')]),
    ).toBe('Short lessons on algorithms, Python, open source, LLM APIs, JavaScript/TypeScript and 2 more courses');
    expect(landingCoursesLineOf(liveCourses.slice(1, 3))).toBe('Short lessons on JavaScript/TypeScript and Python');
    expect(landingCoursesLineOf(liveCourses.slice(0, 2))).toBe('Short lessons on algorithms and JavaScript/TypeScript');
    expect(landingCoursesLineOf([liveCourses[2], liveCourses[1]])).toBe(
      'Short lessons on Python and JavaScript/TypeScript',
    );
  });

  it('is a plain line with no course, never a count of none', () => {
    expect(landingCoursesLineOf([])).toBe(LANDING_COURSES_LINE_EMPTY);
    expect(LANDING_COURSES_LINE_EMPTY).toBe('Short lessons on programming');
  });

  it('opens the words under the title, the same in the Markdown copy', () => {
    const text = landingTextOf(liveCourses);
    expect(
      text.startsWith('Short lessons on algorithms, JavaScript and TypeScript, Python, open source and LLM APIs. '),
    ).toBe(true);
    expect(learnLandingMarkdownOf(liveCourses)).toContain(`\n\n${text}\n\n`);
    expect(learnLandingMarkdownOf([])).toContain(`\n\n${LANDING_COURSES_LINE_EMPTY}. When you are ready`);
    for (const line of [text, landingTextOf([]), landingTextOf(courseCards)]) {
      expect(line).not.toMatch(/design patterns|system design|seven languages|\b0 more/);
      expect(line).not.toContain(String.fromCodePoint(0x2014));
    }
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
    expect(markdown).toContain('For maintainers: https://example.test/contribute/maintainers#learn');
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
  it('is the copy, never indexed, the landing named as the canonical', async () => {
    const response = await landingMarkdownResponse(async () => courseCards);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(learnLandingMarkdownOf(courseCards));
    expect(Object.fromEntries(response.headers)).toMatchObject({
      'content-type': 'text/markdown; charset=utf-8',
      'x-robots-tag': 'noindex',
      link: '</learn>; rel="canonical"',
    });
  });

  it('is the copy without the courses when they cannot be read', async () => {
    const response = await landingMarkdownResponse(async () => Promise.reject(new Error('down')));
    expect([response.status, await response.text()]).toEqual([200, learnLandingMarkdownOf([])]);
  });
});

describe("the landing's metadata", () => {
  it('names the landing for search engines, its address, its copy and the courses picture', () => {
    const metadata = learnLandingMetadata(courseCards);
    expect(metadata.title).toEqual({ absolute: LANDING_SEARCH_TITLE });
    expect(metadata.description).toBe(landingDescriptionOf(courseCards));
    expect(metadata.description?.length).toBeLessThanOrEqual(158);
    expect(
      learnLandingMetadata(liveCourses).description?.startsWith(
        'Short lessons on algorithms, JavaScript and TypeScript, Python, open source and LLM APIs. ',
      ),
    ).toBe(true);
    expect(metadata.alternates?.canonical).toBe('/learn');
    expect(JSON.stringify(metadata.alternates)).toContain('/learn.md');
    expect(metadata.robots).toBeUndefined();
  });

  it('names its Markdown copy, with or without courses', () => {
    expect(learnLandingMetadata([]).alternates?.canonical).toBe('/learn');
    expect(learnLandingMetadata(courseCards).alternates?.types).toEqual({ 'text/markdown': '/learn.md' });
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

describe("Learn's public pages", () => {
  it("are indexed: a course's page, all courses (a search's page is not) and a lesson's page", () => {
    expect(learnCourseMetadata(algorithmsCourse).robots).toBeUndefined();
    expect(learnCoursesMetadata(courseCards, { searched: false }).robots).toBeUndefined();
    expect(learnCoursesMetadata(courseCards, { searched: true }).robots).toEqual({ index: false, follow: true });
    expect(learnLessonMetadata(setLesson).robots).toBeUndefined();
    expect(learnLessonMetadata(setLesson, { fact: true }).robots).toBeUndefined();
  });
});
