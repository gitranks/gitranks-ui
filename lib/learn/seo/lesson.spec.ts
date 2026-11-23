import { describe, expect, it } from 'vitest';

import { learnLessonGoneMetadata, learnLessonMetadata, lessonDescriptionOf, lessonPlainTextOf } from './lesson';

const FENCE = '```';

const lesson = {
  slug: 'sets',
  title: 'Find duplicates in one pass with a set',
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
