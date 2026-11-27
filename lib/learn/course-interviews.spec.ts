import { describe, expect, it } from 'vitest';

import { courseBoxesOf, type LearnCourseMine } from './course';
import {
  type CourseCompanyOwn,
  companyCourseLessonsFactOf,
  companyCourseNoticeOf,
  companyPlansBoxesOf,
  companyPlansButtonOf,
  courseGroupInterviewsOf,
} from './course-interviews';
import { interviewSkillsCourse, northwindCourse } from '@/components/interviews/learn-gate/__fixtures__/course';
import { freshMine } from '@/lib/learn/__fixtures__/course';

const own: CourseCompanyOwn = {
  company: { slug: 'northwind', name: 'Northwind', logo: true },
  checked: '26 Nov 2026',
  plans: 7,
  plansHref: '/interviews/northwind',
  researchHref: '/interviews/about#interviews-about-facts',
};

/** A learner of Northwind's course, nothing learned, the first lesson next. */
const northwindMine: LearnCourseMine = {
  ...freshMine,
  slug: northwindCourse.slug,
  next: { slug: 'how-northwind-hires-1', title: 'The steps from the first call to the offer' },
};

describe("a company's own course", () => {
  it('has its plans in the middle, where other courses have the check, never lit', () => {
    const boxes = companyPlansBoxesOf(courseBoxesOf(northwindCourse, null), own);
    expect(boxes.first.kind).toBe('start');
    expect(boxes.middle).toEqual({ kind: 'plans', company: 'Northwind', plans: 7, href: '/interviews/northwind' });
    expect(boxes.last.kind).toBe('sign-in');
    expect(boxes.highlight).toBe('last');
  });

  it('keeps its plans for a learner, and the first lesson lit', () => {
    const boxes = companyPlansBoxesOf(courseBoxesOf(northwindCourse, northwindMine), own);
    expect(boxes.middle.kind).toBe('plans');
    expect(boxes.highlight).toBe('first');
  });

  it('gives the place to lessons due, as any course does', () => {
    const due = { ...northwindMine, learned: 2, due: 2 };
    expect(companyPlansBoxesOf(courseBoxesOf(northwindCourse, due), own).middle.kind).toBe('due');
  });

  it('keeps the boxes as they are with no plan, and for any other course', () => {
    const boxes = courseBoxesOf(northwindCourse, null);
    expect(companyPlansBoxesOf(boxes, { ...own, plans: 0 })).toBe(boxes);
    expect(companyPlansBoxesOf(boxes, null)).toBe(boxes);
  });

  it("words its plans' button for one plan and for many", () => {
    expect(companyPlansButtonOf('Northwind', 7)).toBe('See Northwind’s 7 plans');
    expect(companyPlansButtonOf('Tallgrass', 1)).toBe('See Tallgrass’s plan');
  });

  it('counts its lessons by round and ends its sentence with the notice', () => {
    expect(companyCourseLessonsFactOf(northwindCourse)).toBe('12 lessons, one group for each round');
    expect(companyCourseLessonsFactOf({ lessons: 4, groups: northwindCourse.groups.slice(0, 1) })).toBe('4 lessons');
    expect(companyCourseNoticeOf(own)).toBe('Not an official Northwind page.');
  });
});

describe('a course with no check', () => {
  it('offers the first lesson to a visitor, and no check', () => {
    const boxes = courseBoxesOf(interviewSkillsCourse, null);
    expect(boxes.first.kind).toBe('start');
    expect(boxes.middle.kind).not.toMatch(/^check/);
  });

  it('offers the first lesson to an experienced learner too: never "start with the check"', () => {
    const mine = { ...freshMine, slug: interviewSkillsCourse.slug, next: { slug: 'thinking-aloud-1', title: 'Say' } };
    const boxes = courseBoxesOf(interviewSkillsCourse, mine, { checkFirst: true });
    expect(boxes.first.kind).toBe('next');
    expect(boxes.middle.kind).not.toMatch(/^check/);
    expect(boxes.highlight).toBe('first');
  });
});

describe("a group's entry", () => {
  const interviews = {
    companies: [],
    groups: [
      { group: 'graphs', topic: 'graphs', companies: [own.company], basis: 'reported' as const },
      { group: 'trees', topic: 'trees', companies: [], basis: 'reported' as const },
    ],
    own: null,
  };

  it('is found by the group, only with a company', () => {
    expect(courseGroupInterviewsOf(interviews, 'graphs')?.topic).toBe('graphs');
    expect(courseGroupInterviewsOf(interviews, 'trees')).toBeNull();
    expect(courseGroupInterviewsOf(interviews, 'stacks')).toBeNull();
    expect(courseGroupInterviewsOf(null, 'graphs')).toBeNull();
  });
});
