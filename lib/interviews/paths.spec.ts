import { describe, expect, it } from 'vitest';

import {
  INTERVIEWS_COURSES_TAG,
  INTERVIEWS_HOME_TAG,
  interviewCompanyPath,
  interviewCompanyTag,
  interviewCoursePath,
  interviewCourseTag,
  interviewLessonPath,
  interviewLogoPath,
  interviewNextPath,
  interviewPlanPath,
  interviewPlanTag,
  isInterviewCompanySlug,
  isInterviewPlanSlug,
  isInterviewSlug,
  isInterviewsPath,
  isInterviewsTag,
} from './paths';

describe("Interviews' addresses", () => {
  it("builds a company's page, a plan's, the connecting screen and a logo", () => {
    expect(interviewCompanyPath('northwind')).toBe('/interviews/northwind');
    expect(interviewPlanPath('northwind', 'senior-software-engineer')).toBe(
      '/interviews/northwind/senior-software-engineer',
    );
    expect(interviewNextPath('northwind', 'senior-software-engineer', 'round-1/hash-maps')).toBe(
      '/interviews/northwind/senior-software-engineer/next?after=round-1%2Fhash-maps',
    );
    expect(interviewLogoPath('northwind', 64)).toBe('/interviews/northwind/logo-64.png');
    expect(interviewLogoPath('northwind', 128)).toBe('/interviews/northwind/logo-128.png');
  });

  it("opens Learn's lesson with the plan in its query, and Learn's course as it is", () => {
    expect(interviewLessonPath('hash-maps-1', 'northwind', 'senior-software-engineer')).toBe(
      '/learn/lessons/hash-maps-1?plan=northwind/senior-software-engineer',
    );
    expect(interviewCoursePath('interviewing-at-northwind')).toBe('/learn/courses/interviewing-at-northwind');
  });

  it('names the cache tags the API expires', () => {
    expect(INTERVIEWS_HOME_TAG).toBe('interviews:home');
    expect(INTERVIEWS_COURSES_TAG).toBe('interviews:courses');
    expect(interviewCompanyTag('northwind')).toBe('interviews:company:northwind');
    expect(interviewPlanTag('northwind', 'sre')).toBe('interviews:plan:northwind:sre');
    expect(interviewCourseTag('algorithms')).toBe('interviews:course:algorithms');
  });
});

describe("Interviews' slugs and tags", () => {
  it('takes a slug of the shape, and keeps the own pages out of company and plan slugs', () => {
    expect(isInterviewSlug('northwind')).toBe(true);
    expect(isInterviewSlug('a1-b2')).toBe(true);
    for (const slug of ['', 'Northwind', 'a--b', '-a', 'a-', 'a_b', 'a.png', 'x'.repeat(101)]) {
      expect(isInterviewSlug(slug)).toBe(false);
    }
    expect(isInterviewCompanySlug('about')).toBe(false);
    expect(isInterviewCompanySlug('mine')).toBe(false);
    expect(isInterviewCompanySlug('next')).toBe(true);
    expect(isInterviewPlanSlug('next')).toBe(false);
    expect(isInterviewPlanSlug('about')).toBe(true);
  });

  it("knows Interviews' tags, and refuses any other shape", () => {
    for (const tag of [
      'interviews:home',
      'interviews:courses',
      'interviews:company:northwind',
      'interviews:plan:northwind:sre',
      'interviews:course:algorithms',
    ]) {
      expect(isInterviewsTag(tag)).toBe(true);
    }
    for (const tag of [
      'interviews:',
      'interviews:company:',
      'interviews:company:mine',
      'interviews:company:North',
      'interviews:plan:northwind',
      'interviews:plan:northwind:next',
      'interviews:plan:about:sre',
      'interviews:plan:northwind:sre:x',
      'interviews:course:',
      'build:projects',
      'learn:courses',
    ]) {
      expect(isInterviewsTag(tag)).toBe(false);
    }
  });

  it('closes every Interviews address, the Markdown copy included, and nothing else', () => {
    for (const path of [
      '/interviews',
      '/interviews/',
      '/interviews/about',
      '/interviews/northwind',
      '/interviews/northwind/logo-64.png',
      '/interviews/northwind/sre/next',
      '/interviews.md',
    ]) {
      expect(isInterviewsPath(path)).toBe(true);
    }
    for (const path of ['/interviewsx', '/interviews-at', '/interviews.mdx', '/learn/interviews', '/', '/build']) {
      expect(isInterviewsPath(path)).toBe(false);
    }
  });
});
