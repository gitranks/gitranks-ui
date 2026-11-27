import type { Route } from 'next';
import { describe, expect, it } from 'vitest';

import {
  doorsAllBuilt,
  doorsInProgress,
  doorsMany,
  doorsNone,
  doorsOne,
  doorsPlaces,
  doorsTestLeft,
  doorsTwo,
} from './__fixtures__/doors';
import {
  courseLineOf,
  furtherProjectRowOf,
  issueBuildLineOf,
  issuesLineOf,
  nextCourseLineOf,
  placeWordsOf,
} from './doors';

const LESSON = {
  title: 'Find duplicates in one pass with a set',
  href: '/learn/lessons/find-duplicates' as Route,
  learned: false,
};

describe("the line under a course's numbers", () => {
  it('names the things, each to its project, and nothing more with three or fewer', () => {
    expect(courseLineOf(doorsTwo)).toEqual({
      items: [
        { slug: 'key-value-database', thing: 'a key-value database', href: '/build/key-value-database', place: null },
        { slug: 'interpreter', thing: 'an interpreter', href: '/build/interpreter', place: null },
      ],
      more: 0,
      moreHref: '/build/projects',
    });
  });

  it('names three, then how many more, to the list of projects', () => {
    const line = courseLineOf(doorsMany);
    expect(line?.items.map((item) => item.thing)).toEqual([
      'a key-value database',
      'an interpreter',
      'a search engine',
    ]);
    expect(line?.more).toBe(2);
  });

  it("says the person's place: a tick once built, the step of a build in progress, the test left", () => {
    expect(courseLineOf(doorsPlaces)?.items.map((item) => item.place)).toEqual([
      { kind: 'built' },
      { kind: 'step', number: 4, of: 18 },
    ]);
    expect(placeWordsOf({ kind: 'step', number: 4, of: 18 })).toBe(' (step 4 of 18)');
    expect(placeWordsOf({ kind: 'test_left' })).toBe(' (the test is left)');
    expect(placeWordsOf({ kind: 'built' })).toBeNull();
  });

  it('is not there when no project names the course, or nothing was read', () => {
    expect(courseLineOf(doorsNone)).toBeNull();
    expect(courseLineOf(null)).toBeNull();
  });
});

describe('Build\'s row in "Go further"', () => {
  it('offers a project not started, with its steps', () => {
    expect(furtherProjectRowOf(doorsOne)).toEqual({
      name: 'Build a key-value database',
      line: 'A project · 14 steps',
      href: '/build/key-value-database',
    });
  });

  it('follows a build in progress, and leads to the test once every step is built', () => {
    expect(furtherProjectRowOf(doorsInProgress)).toEqual({
      name: 'Your key-value database',
      line: 'Your build · step 9 of 14',
      href: '/build/key-value-database',
    });
    expect(furtherProjectRowOf(doorsTestLeft)).toEqual({
      name: 'Your key-value database',
      line: 'Your build · the test is left',
      href: '/build/key-value-database/test?language=python',
    });
  });

  it('is not there once every project is built, or none names the course', () => {
    expect(furtherProjectRowOf(doorsAllBuilt)).toBeNull();
    expect(furtherProjectRowOf(doorsNone)).toBeNull();
    expect(furtherProjectRowOf(null)).toBeNull();
  });

  it('words the other rows with no zero', () => {
    expect(nextCourseLineOf(64)).toBe('Next course · 64 lessons');
    expect(nextCourseLineOf(1)).toBe('Next course · 1 lesson');
    expect(issuesLineOf(2)).toBe('Real issues · 2 open');
  });
});

describe("the line at the end of an issue's page", () => {
  it('offers the lesson and the project while the lesson is new', () => {
    expect(issueBuildLineOf(LESSON, doorsOne)).toEqual({
      kind: 'both',
      lesson: { title: LESSON.title, href: LESSON.href },
      project: { thing: 'a key-value database', href: '/build/key-value-database' },
    });
  });

  it('offers only the project once the lesson is learned', () => {
    expect(issueBuildLineOf({ ...LESSON, learned: true }, doorsOne)?.kind).toBe('project');
  });

  it('offers only the lesson when no project uses it, or the person built it', () => {
    expect(issueBuildLineOf(LESSON, doorsNone)?.kind).toBe('lesson');
    expect(issueBuildLineOf(LESSON, doorsAllBuilt)?.kind).toBe('lesson');
  });

  it('is not there with the lesson learned and nothing left to build, or nothing read', () => {
    expect(issueBuildLineOf({ ...LESSON, learned: true }, doorsAllBuilt)).toBeNull();
    expect(issueBuildLineOf(LESSON, null)).toBeNull();
  });
});
