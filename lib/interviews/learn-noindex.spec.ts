import { describe, expect, it } from 'vitest';

import { INTERVIEWS_OPEN_TO_EVERYONE } from './interviews-parts';
import { COURSE_NOT_READ, isInterviewsSectionCourse, withInterviewsSectionNoindex } from './learn-noindex';

describe("Learn's courses of the section Interviews and search engines", () => {
  const metadata = { title: 'Interview skills', alternates: { canonical: '/learn/courses/interview-skills' } };

  it('knows a course of the section: a company course, or one that says so', () => {
    expect(isInterviewsSectionCourse({ kind: 'COMPANY', section: 'INTERVIEWS' })).toBe(true);
    expect(isInterviewsSectionCourse({ kind: 'TOPIC', section: 'INTERVIEWS' })).toBe(true);
    expect(isInterviewsSectionCourse({ kind: 'COMPANY' })).toBe(true);
    expect(isInterviewsSectionCourse({ kind: 'TOPIC', section: null })).toBe(false);
    expect(isInterviewsSectionCourse({ kind: 'TOPIC' })).toBe(false);
    expect(isInterviewsSectionCourse(null)).toBe(false);
  });

  it('says noindex on its pages while Interviews is not open to everyone, and changes nothing else', () => {
    expect(INTERVIEWS_OPEN_TO_EVERYONE).toBe(false);
    expect(withInterviewsSectionNoindex(metadata, { kind: 'TOPIC', section: 'INTERVIEWS' })).toEqual({
      ...metadata,
      robots: { index: false, follow: false },
    });
    expect(withInterviewsSectionNoindex(metadata, { kind: 'TOPIC', section: null })).toBe(metadata);
    expect(withInterviewsSectionNoindex(metadata, undefined)).toBe(metadata);
  });

  it('a course not read might be of the section: not indexed while closed', () => {
    expect(withInterviewsSectionNoindex(metadata, COURSE_NOT_READ)).toEqual({
      ...metadata,
      robots: { index: false, follow: false },
    });
  });
});
