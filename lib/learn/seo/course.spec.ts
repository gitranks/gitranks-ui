import { describe, expect, it } from 'vitest';

import { algorithmsCourse, algorithmsCoursePaused, courseCards, lessonAt } from '../__fixtures__/course';
import { courseCardVersionOf, coursesCardVersionOf } from '../course-share-card';
import {
  learnCourseGoneMetadata,
  learnCourseJsonLd,
  learnCourseMetadata,
  learnCoursesJsonLd,
  learnCoursesMetadata,
} from './course';

describe("a course's metadata", () => {
  it('names the course, its own words, its address, its copy and its picture', () => {
    const metadata = learnCourseMetadata(algorithmsCourse);
    expect(metadata.title).toBe('Algorithms and data structures');
    expect(metadata.description).toBe(algorithmsCourse.about);
    expect(metadata.alternates?.canonical).toBe('/learn/courses/algorithms');
    expect(metadata.alternates?.types).toEqual({ 'text/markdown': '/learn/courses/algorithms.md' });
    expect(metadata.openGraph?.title).toBe('Algorithms and data structures · GitRanks Learn');
    expect(metadata.openGraph?.description).toBe('86 short lessons, each with one question.');
    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({
        url: expect.stringMatching(`/learn/courses/algorithms/card.png\\?v=${courseCardVersionOf(algorithmsCourse)}$`),
        alt: 'Algorithms and data structures',
      }),
    ]);
    expect(metadata.robots).toBeUndefined();
  });

  it('is a Course with its live lessons as its parts, and its breadcrumbs', () => {
    const [course, crumbs] = learnCourseJsonLd(algorithmsCoursePaused) as [
      { '@type': string; hasPart: { name: string }[]; provider: object },
      { itemListElement: { name: string }[] },
    ];
    expect(course['@type']).toBe('Course');
    expect(course.hasPart).toHaveLength(85);
    expect(course.hasPart.map((part) => part.name)).not.toContain(lessonAt('3-3').title);
    expect(course.provider).toEqual({ '@id': expect.stringContaining('#organization') });
    expect(crumbs.itemListElement.map((crumb) => crumb.name)).toEqual([
      'Learn',
      'All courses',
      'Algorithms and data structures',
    ]);
  });

  it('keeps a paused or removed course out of search engines', () => {
    expect(learnCourseGoneMetadata({ state: 'PAUSED' })).toEqual({
      title: 'This course is paused',
      robots: { index: false, follow: false },
    });
    expect(learnCourseGoneMetadata({ state: 'REMOVED' }).title).toBe('This course was removed');
    expect(learnCourseGoneMetadata(null).title).toBe('This course was removed');
  });
});

describe("all courses' metadata", () => {
  it('names the list as its own canonical, with its copy and the Learn picture', () => {
    const metadata = learnCoursesMetadata(courseCards, { searched: false });
    expect(metadata.title).toBe('All courses');
    expect(metadata.alternates?.canonical).toBe('/learn/courses');
    expect(metadata.alternates?.types).toEqual({ 'text/markdown': '/learn/courses.md' });
    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({
        url: expect.stringMatching(`/learn/courses/card.png\\?v=${coursesCardVersionOf(courseCards)}$`),
      }),
    ]);
    expect(metadata.robots).toBeUndefined();
  });

  it('names the full list as the page to index for a search, and keeps the search itself out, links followed', () => {
    const metadata = learnCoursesMetadata(courseCards, { searched: true });
    expect(metadata.alternates?.canonical).toBe('/learn/courses');
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it('is an ItemList of the courses, in order', () => {
    const [list] = learnCoursesJsonLd(courseCards) as [
      { '@type': string; numberOfItems: number; itemListElement: { position: number; name: string }[] },
    ];
    expect(list['@type']).toBe('ItemList');
    expect(list.numberOfItems).toBe(11);
    expect(list.itemListElement[0]).toMatchObject({ position: 1, name: 'Algorithms and data structures' });
  });
});
