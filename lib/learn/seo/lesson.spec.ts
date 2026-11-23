import { describe, expect, it } from 'vitest';

import { setLesson } from '../__fixtures__/lesson-page';
import {
  learnLessonGoneMetadata,
  learnLessonJsonLd,
  learnLessonMetadata,
  lessonDescriptionOf,
  lessonPlainTextOf,
} from './lesson';
import { absoluteUrl } from '@/lib/seo/site';

const FENCE = '```';

const lesson = {
  ...setLesson,
  slug: 'sets',
  publishedAt: '2026-11-20T00:00:00.000Z',
  body: [
    '## Why a set',
    '',
    'A **set** answers `x in seen` in constant time, so one [pass](https://example.com) is enough.',
    '',
    '[[example: main]]',
    '',
    '- It keeps *each* value once.',
    '',
    `${FENCE}python`,
    'seen = set()',
    FENCE,
    '',
    '[[visual: buckets]]',
  ].join('\n'),
};

/** The version every picture's address carries: the time the lesson last changed. */
const V = `?v=${Date.parse(lesson.changedAt).toString(36)}`;

describe('lessonPlainTextOf', () => {
  it('keeps the words and drops the Markdown, the code and the placed parts', () => {
    expect(lessonPlainTextOf(lesson.body)).toBe(
      'Why a set A set answers x in seen in constant time, so one pass is enough. It keeps each value once.',
    );
  });

  it('keeps underscores and stars inside words', () => {
    expect(lessonPlainTextOf('Use snake_case_names and 2*3*4.')).toBe('Use snake_case_names and 2*3*4.');
  });
});

describe('the metadata of a lesson of ours', () => {
  it('has its title, its own words clipped, its address as the canonical, and an article preview', () => {
    const metadata = learnLessonMetadata(lesson);
    expect(metadata.title).toBe(lesson.title);
    expect(metadata.description).toBe(lessonDescriptionOf(lesson));
    expect(metadata.alternates?.canonical).toBe('/learn/lessons/sets');
    expect(metadata.openGraph).toMatchObject({ type: 'article', publishedTime: lesson.publishedAt });
    expect(metadata.robots).toBeUndefined();
  });

  it('names its Markdown copy as an alternate', () => {
    expect(learnLessonMetadata(lesson).alternates?.types).toEqual({ 'text/markdown': '/learn/lessons/sets.md' });
  });

  it("shows the lesson's own picture, under its current version, with its title and its words", () => {
    const metadata = learnLessonMetadata(lesson);
    const image = {
      url: absoluteUrl(`/learn/lessons/sets/card.png${V}`),
      width: 1200,
      height: 630,
      alt: lesson.title,
    };
    const preview = { title: `${lesson.title} · GitRanks Learn`, description: lessonDescriptionOf(lesson) };
    expect(metadata.openGraph).toMatchObject({ ...preview, images: [image] });
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image', ...preview, images: [image] });
  });

  it("shows a shared fact's own picture and title, the page and its canonical staying the lesson's", () => {
    const metadata = learnLessonMetadata(lesson, { fact: true });
    const preview = {
      title: 'How one web request froze a server · GitRanks Learn',
      description: 'A fact from the lesson “Find duplicates in one pass with a set”.',
    };
    const images = [
      { url: absoluteUrl(`/learn/lessons/sets/fact.png${V}`), width: 1200, height: 630, alt: lesson.fact?.title },
    ];
    expect(metadata.openGraph).toMatchObject({ ...preview, images });
    expect(metadata.twitter).toMatchObject({ ...preview, images });
    expect(metadata.title).toBe(lesson.title);
    expect(metadata.alternates?.canonical).toBe('/learn/lessons/sets');
  });

  it("shows the lesson's own preview for ?fact when it has no fact", () => {
    const metadata = learnLessonMetadata({ ...lesson, fact: null }, { fact: true });
    expect(metadata.openGraph?.title).toBe(`${lesson.title} · GitRanks Learn`);
  });

  it('clips a long description to what search engines show', () => {
    const description = lessonDescriptionOf({ body: 'word '.repeat(100) });
    expect(description.length).toBeLessThanOrEqual(158);
    expect(description.endsWith('…')).toBe(true);
  });

  it('keeps a paused or removed lesson out of search, under its state as the title', () => {
    expect(learnLessonGoneMetadata({ state: 'PAUSED' })).toEqual({
      title: 'This lesson is paused',
      robots: { index: false, follow: false },
    });
    expect(learnLessonGoneMetadata({ state: 'REMOVED' }).title).toBe('This lesson was removed');
  });
});

describe("a lesson's structured data", () => {
  it('is a free lesson in its course, with its dates, its picture and its publisher', () => {
    const [resource] = learnLessonJsonLd(lesson);
    expect(resource).toMatchObject({
      '@type': 'LearningResource',
      url: absoluteUrl('/learn/lessons/sets'),
      name: lesson.title,
      description: lessonDescriptionOf(lesson),
      learningResourceType: 'Lesson',
      isAccessibleForFree: true,
      datePublished: lesson.publishedAt,
      dateModified: lesson.changedAt,
      image: absoluteUrl(`/learn/lessons/sets/card.png${V}`),
      isPartOf: {
        '@type': 'Course',
        name: 'Algorithms and data structures',
        url: absoluteUrl('/learn/courses/algorithms'),
      },
      about: 'Hash maps and sets',
    });
  });

  it('has its breadcrumbs: Learn, the course, the lesson', () => {
    const [, breadcrumbs] = learnLessonJsonLd(lesson) as [object, { itemListElement: object[] }];
    expect(breadcrumbs.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Learn', item: absoluteUrl('/learn') },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Algorithms and data structures',
        item: absoluteUrl('/learn/courses/algorithms'),
      },
      { '@type': 'ListItem', position: 3, name: lesson.title, item: absoluteUrl('/learn/lessons/sets') },
    ]);
  });
});
