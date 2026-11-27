import { describe, expect, it } from 'vitest';

import { courseCards, kubernetesCourse, lessonList } from './__fixtures__/course';
import { courseSectionsOf, coursesSearchOf, isWholeNameOf, type LearnCourseCard } from './course';
import {
  companyUseLineOf,
  courseCompanyUsesOf,
  coursesWithInterviewsOf,
  INTERVIEWS_SECTION_SHOWN_UP_TO,
  interviewsSectionShownOf,
  roundsWordsOf,
  sectionCompaniesOf,
} from './courses-interviews';
import {
  coursesInterviews,
  hundredCards,
  hundredCompanies,
  interviewSkillsCard,
  northwindCourseCard,
} from '@/components/interviews/learn-gate/__fixtures__/courses';

const listed = coursesWithInterviewsOf(courseCards, coursesInterviews);
const usesOf = (query: string) => courseCompanyUsesOf(coursesInterviews, query, listed);
const foundSlugs = (query: string, courses: readonly LearnCourseCard[] = listed) =>
  coursesSearchOf(courses, lessonList, query, courseCompanyUsesOf(coursesInterviews, query, courses)).sections.flatMap(
    (section) => section.found.map(({ course }) => course.slug),
  );

describe('the section Interviews on the list of all courses', () => {
  it('holds a company course and a course that says so, never under its kind, after the other sections', () => {
    const sections = courseSectionsOf(listed);
    expect(sections.map((section) => section.kind)).toEqual(['TOPIC', 'LANGUAGE', 'INTERVIEWS']);
    expect(sections[0].courses.map((course) => course.slug)).not.toContain('interview-skills');
    expect(sections[2]).toMatchObject({ title: 'Interviews', sub: 'What each company asks, round by round.' });
    expect(sections[2].courses.map((course) => course.slug)).toEqual(['interview-skills', 'interviewing-at-northwind']);
  });

  it("joins the section's courses to the list once, in the section's order", () => {
    expect(coursesWithInterviewsOf(courseCards, null)).toBe(courseCards);
    const twice = coursesWithInterviewsOf(
      [northwindCourseCard, ...courseCards, interviewSkillsCard],
      coursesInterviews,
    );
    expect(twice.map((course) => course.slug).slice(-2)).toEqual(['interview-skills', 'interviewing-at-northwind']);
    expect(twice).toHaveLength(courseCards.length + 2);
  });

  it('names the company of each course of the section, none for Interview skills', () => {
    const companies = sectionCompaniesOf(coursesInterviews);
    expect(companies.get('interviewing-at-northwind')?.name).toBe('Northwind');
    expect(companies.has('interview-skills')).toBe(false);
    expect(sectionCompaniesOf(null).size).toBe(0);
  });
});

describe("a company's line on a course its plans use", () => {
  it('joins the rounds in one phrase, a later name with its first letter small', () => {
    expect(roundsWordsOf([])).toBe('');
    expect(roundsWordsOf(['Coding interviews'])).toBe('Coding interviews');
    expect(roundsWordsOf(['Phone screen', 'Coding interviews'])).toBe('Phone screen and coding interviews');
    expect(roundsWordsOf(['Recruiter call', 'Values interview', 'AI interview'])).toBe(
      'Recruiter call, values interview and AI interview',
    );
  });

  it('says how many lessons, "all" when every one, and never a zero', () => {
    expect(companyUseLineOf({ rounds: ['Coding interviews'], lessons: 48 }, 86)).toBe('Coding interviews · 48 lessons');
    expect(companyUseLineOf({ rounds: ['Values interview'], lessons: 18 }, 18)).toBe(
      'Values interview · all 18 lessons',
    );
    expect(companyUseLineOf({ rounds: ['Values interview'], lessons: 1 }, 1)).toBe('Values interview · 1 lesson');
    expect(companyUseLineOf({ rounds: ['Values interview'], lessons: 0 }, 12)).toBe('Values interview');
    expect(companyUseLineOf({ rounds: [], lessons: 3 }, 12)).toBe('3 lessons');
  });
});

describe('the search finds a company by its whole name', () => {
  it('finds the courses its plans use, each with its line', () => {
    const uses = usesOf('northwind');
    expect([...uses.keys()]).toEqual(['algorithms', 'interview-skills', 'interviewing-at-northwind']);
    expect(uses.get('algorithms')).toEqual([
      { company: coursesInterviews.top[0], line: 'Online assessment and coding interviews · 32 lessons' },
    ]);
    expect(uses.get('interview-skills')?.[0].line).toBe('Recruiter call and coding interviews · all 11 lessons');
    // A course the list does not hold (not written yet) is not drawn.
    expect(uses.has('system-design-basics')).toBe(false);
    expect(foundSlugs('northwind')).toEqual(['algorithms', 'interview-skills', 'interviewing-at-northwind']);
  });

  it('by one of its other names, whatever the case and the accents', () => {
    expect([...usesOf('NORTHWIND labs').keys()]).toContain('algorithms');
    expect([...usesOf('  Nörthwind ').keys()]).toContain('algorithms');
  });

  it('part of a name finds only what it finds today', () => {
    expect(usesOf('north').size).toBe(0);
    expect(usesOf('').size).toBe(0);
    expect(courseCompanyUsesOf(null, 'northwind', listed).size).toBe(0);
    // "Interviewing at Northwind" starts a word with "north", so its name finds it, as any course's name does.
    expect(foundSlugs('north')).toEqual(['interviewing-at-northwind']);
  });

  it('two companies with a course in common each give their line', () => {
    expect(
      usesOf('tallgrass')
        .get('interview-skills')
        ?.map((use) => use.line),
    ).toEqual(['Recruiter call · 6 lessons']);
    expect(isWholeNameOf('Tallgrass', 'tallgrass')).toBe(true);
    expect(isWholeNameOf('Tallgrass', 'tall')).toBe(false);
  });

  it('a course found by its name and used by the typed company keeps its line', () => {
    const search = coursesSearchOf(listed, lessonList, 'northwind', usesOf('northwind'));
    const own = search.sections.flatMap((section) => section.found).find((found) => found.course.kind === 'COMPANY');
    expect(own?.uses?.[0].line).toBe('Values interview · 6 lessons');
  });
});

describe("the search finds a project course by its language's whole name", () => {
  const kubernetes: LearnCourseCard = { ...kubernetesCourse };

  it('"go" finds Kubernetes, written in Go; "g" does not', () => {
    expect(foundSlugs('go', [...courseCards, kubernetes])).toEqual(['go', 'kubernetes']);
    expect(foundSlugs('GO', [...courseCards, kubernetes])).toContain('kubernetes');
    expect(foundSlugs('g', [...courseCards, kubernetes])).not.toContain('kubernetes');
  });

  it('without Interviews\' part the search is today\'s: "go" finds Go alone', () => {
    const today = coursesSearchOf([...courseCards, kubernetes], lessonList, 'go');
    expect(today.sections.flatMap((section) => section.found.map(({ course }) => course.slug))).toEqual(['go']);
  });

  it('"company" finds the company courses by their kind', () => {
    expect(foundSlugs('company')).toEqual(['interviewing-at-northwind']);
  });
});

describe('the section Interviews with many companies', () => {
  const all = coursesWithInterviewsOf(courseCards, hundredCompanies);
  const found = coursesSearchOf(all, [], '').sections.find((section) => section.kind === 'INTERVIEWS')!.found;

  it('shows Interview skills and the top five companies, in their order', () => {
    expect(found).toHaveLength(101);
    const shown = interviewsSectionShownOf(found, hundredCompanies, { searched: false });
    expect(shown.map(({ course }) => course.slug)).toEqual([
      'interview-skills',
      'interviewing-at-company-3',
      'interviewing-at-company-1',
      'interviewing-at-company-4',
      'interviewing-at-company-5',
      'interviewing-at-company-9',
    ]);
  });

  it("once opened keeps the shown courses first, where they were, then the rest in the answer's order", () => {
    const first = interviewsSectionShownOf(found, hundredCompanies, { searched: false });
    const opened = interviewsSectionShownOf(found, hundredCompanies, { searched: false, all: true });
    expect(opened).toHaveLength(101);
    expect(opened.slice(0, first.length)).toEqual(first);
    expect(opened.slice(first.length, first.length + 3).map(({ course }) => course.slug)).toEqual([
      'interviewing-at-company-2',
      'interviewing-at-company-6',
      'interviewing-at-company-7',
    ]);
    expect(new Set(opened).size).toBe(101);
  });

  it('shows every course up to twelve, and with a search', () => {
    expect(INTERVIEWS_SECTION_SHOWN_UP_TO).toBe(12);
    const twelve = found.slice(0, 12);
    expect(interviewsSectionShownOf(twelve, hundredCompanies, { searched: false })).toBe(twelve);
    expect(interviewsSectionShownOf(found, hundredCompanies, { searched: true })).toBe(found);
    expect(hundredCards).toHaveLength(101);
  });
});
