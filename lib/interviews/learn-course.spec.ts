import { describe, expect, it } from 'vitest';

import { northwind, tallgrass } from './__fixtures__/companies';
import { forNoPlan, forNorthwindCourse } from './__fixtures__/learn';
import { forAlgorithmsCourse, tenCompanies } from './__fixtures__/learn-course';
import { midFinishedRow, myHomeOne, myHomeTwo, seniorRow, tallgrassRow } from './__fixtures__/mine';
import { justDoneRow, longNameRow } from './__fixtures__/mine-page';
import {
  askedAtHrefOf,
  askedAtOf,
  courseInterviewsOf,
  forCourseGroupOf,
  learnPlanRowOf,
  namedCompaniesOf,
  topicSentenceOf,
} from './learn-course';

describe('the companies a sentence names', () => {
  it('names one, two and three companies, and from the fourth on counts the rest', () => {
    expect(namedCompaniesOf(['A'])).toEqual({ named: ['A'], more: 0 });
    expect(namedCompaniesOf(['A', 'B', 'C'])).toEqual({ named: ['A', 'B', 'C'], more: 0 });
    expect(namedCompaniesOf(['A', 'B', 'C', 'D', 'E', 'F', 'G'])).toEqual({ named: ['A', 'B', 'C'], more: 4 });
  });

  it('names every company once the count is opened', () => {
    expect(namedCompaniesOf(['A', 'B', 'C', 'D'], true)).toEqual({ named: ['A', 'B', 'C', 'D'], more: 0 });
  });
});

describe("a lesson's sentence", () => {
  it('says candidates report the topic when any company states it from reports', () => {
    expect(topicSentenceOf({ topic: 'graphs', companies: [northwind], basis: 'reported' })).toEqual({
      before: 'Candidates report graphs in interviews at ',
      after: '.',
    });
    expect(topicSentenceOf({ topic: 'graphs', companies: [northwind], basis: 'both' })?.before).toBe(
      'Candidates report graphs in interviews at ',
    );
  });

  it("says the companies list it when every one states it on its own pages, in one company's words or many's", () => {
    expect(topicSentenceOf({ topic: 'complexity', companies: [northwind, tallgrass], basis: 'official' })).toEqual({
      before: '',
      after: ' list complexity among their interview topics.',
    });
    expect(topicSentenceOf({ topic: 'complexity', companies: [northwind], basis: 'official' })).toEqual({
      before: '',
      after: ' lists complexity among its interview topics.',
    });
  });

  it('says nothing with no company or no topic', () => {
    expect(topicSentenceOf({ topic: 'graphs', companies: [], basis: 'reported' })).toBeNull();
    expect(topicSentenceOf({ topic: '  ', companies: [northwind], basis: 'reported' })).toBeNull();
  });
});

describe('"Asked at" on a group\'s line', () => {
  it('draws up to three logos, then how many more, with every name for pointing and screen readers', () => {
    const seven = askedAtOf({ companies: tenCompanies.slice(0, 7), basis: 'reported' })!;
    expect(seven.logos.map((company) => company.slug)).toEqual(['northwind', 'tallgrass', 'company-3']);
    expect(seven.more).toBe('+4');
    expect(seven.names).toBe('Northwind, Tallgrass, Company 3, Company 4, Company 5, Company 6, Company 7');
    expect(seven.title).toBe(`Candidates report it at ${seven.names}`);
  });

  it('draws no count with three or fewer, never a zero', () => {
    const three = askedAtOf({ companies: tenCompanies.slice(0, 3), basis: 'reported' })!;
    expect(three.logos).toHaveLength(3);
    expect(three.more).toBe('');
    expect(askedAtOf({ companies: [tallgrass], basis: 'reported' })!.more).toBe('');
  });

  it("says who states it when the companies' own pages do", () => {
    expect(askedAtOf({ companies: [northwind], basis: 'official' })!.title).toBe(
      'Northwind lists it among its interview topics',
    );
    expect(askedAtOf({ companies: [northwind, tallgrass], basis: 'official' })!.title).toBe(
      'Northwind, Tallgrass list it among their interview topics',
    );
  });

  it('is not drawn with no company', () => {
    expect(askedAtOf({ companies: [], basis: 'reported' })).toBeNull();
  });

  it("leads to the one company's page, or to Interviews home when several ask it", () => {
    expect(askedAtHrefOf([tallgrass])).toBe('/interviews/tallgrass');
    expect(askedAtHrefOf([northwind, tallgrass])).toBe('/interviews');
  });
});

describe("Learn's view of one course's answer", () => {
  it('keeps the companies and the groups that name at least one company', () => {
    const view = courseInterviewsOf({
      ...forAlgorithmsCourse,
      groups: [
        ...forAlgorithmsCourse.groups,
        { group: 'linked-lists', topic: 'linked lists', companies: [], basis: 'reported' },
      ],
    })!;
    expect(view.companies).toHaveLength(10);
    expect(view.groups.map((entry) => entry.group)).not.toContain('linked-lists');
    expect(view.own).toBeNull();
  });

  it("gives a company's own course its company, the day its facts were checked, its plans and where they are", () => {
    expect(courseInterviewsOf(forNorthwindCourse)!.own).toEqual({
      company: northwind,
      checked: '26 Nov 2026',
      plans: 7,
      plansHref: '/interviews/northwind',
      researchHref: '/interviews/about#interviews-about-facts',
    });
  });

  it('is null for a course no plan uses, no answer, and an answer of another shape', () => {
    expect(courseInterviewsOf(forNoPlan)).toBeNull();
    expect(courseInterviewsOf(null)).toBeNull();
    expect(courseInterviewsOf({ nothing: true } as never)).toBeNull();
  });
});

describe('the row of the plan to go on with', () => {
  it('names the plan worked on last, where the person stands and the next part with its lessons', () => {
    expect(learnPlanRowOf(myHomeOne)).toEqual({
      company: northwind,
      title: 'Northwind · Senior software engineer',
      round: 'Round 3 of 5',
      next: 'Graphs, 11 lessons',
      href: '/learn/lessons/graphs-4?plan=northwind/senior-software-engineer',
      more: '',
      moreHref: '/interviews/mine',
    });
  });

  it('leads to the other plans on My interviews', () => {
    expect(learnPlanRowOf(myHomeTwo)!.more).toBe('1 more plan');
    expect(learnPlanRowOf({ plans: [seniorRow, tallgrassRow, longNameRow] })!.more).toBe('2 more plans');
  });

  it('names the next round once a round is just finished', () => {
    const row = learnPlanRowOf({ plans: [justDoneRow] })!;
    expect(row.round).toBe('Round 2 of 5 is done');
    expect(row.next).toBe('Coding interviews, round 3');
  });

  it('says one lesson in the words of one, and none at zero', () => {
    expect(learnPlanRowOf({ plans: [{ ...seniorRow, next: { ...seniorRow.next!, lessons: 1 } }] })!.next).toBe(
      'Graphs, 1 lesson',
    );
    expect(learnPlanRowOf({ plans: [{ ...seniorRow, next: { ...seniorRow.next!, lessons: 0 } }] })!.next).toBe(
      'Graphs',
    );
  });

  it('names a project as one', () => {
    const project = { ...seniorRow.next!, item: 'project/rate-limiter', itemName: 'Build a rate limiter', lessons: 4 };
    expect(learnPlanRowOf({ plans: [{ ...seniorRow, next: project }] })!.next).toBe('Build a rate limiter, a project');
  });

  it('opens the plan when the next part names no lesson', () => {
    expect(learnPlanRowOf({ plans: [{ ...seniorRow, next: { ...seniorRow.next!, lesson: null } }] })!.href).toBe(
      '/interviews/northwind/senior-software-engineer',
    );
  });

  it('is none with no plan, with every round done, and for a finished plan', () => {
    expect(learnPlanRowOf(null)).toBeNull();
    expect(learnPlanRowOf({ plans: [] })).toBeNull();
    expect(learnPlanRowOf({ plans: [{ ...seniorRow, next: null }] })).toBeNull();
    expect(learnPlanRowOf({ plans: [midFinishedRow] })).toBeNull();
  });

  it('skips a plan with nothing left for the next one worked on', () => {
    const row = learnPlanRowOf({ plans: [{ ...seniorRow, next: null }, tallgrassRow] })!;
    expect(row.title).toBe('Tallgrass · Site reliability engineer, all levels');
    expect(row.more).toBe('1 more plan');
  });

  it('keeps a long name whole', () => {
    expect(learnPlanRowOf({ plans: [longNameRow] })!.title).toBe(
      'Northwind · Site reliability engineer, mid level and senior, all teams and all offices',
    );
  });
});

describe("what a lesson's page carries of the course's answer", () => {
  it("is its group's entry alone, and nothing when its group has none", () => {
    expect(forCourseGroupOf(forAlgorithmsCourse, 'graphs')).toEqual({
      companies: [],
      groups: [forAlgorithmsCourse.groups.find((entry) => entry.group === 'graphs')],
      own: null,
    });
    expect(forCourseGroupOf(forAlgorithmsCourse, 'linked-lists')).toBeNull();
    expect(forCourseGroupOf(null, 'graphs')).toBeNull();
  });
});
