import { describe, expect, it } from 'vitest';

import {
  northwindEngineeringManagerCard,
  northwindMidSeniorSreCard,
  northwindPage,
  northwindSeniorSoftwareEngineerCard,
  northwindTimeline,
  tallgrassPage,
  tallgrassSreCard,
} from './__fixtures__/companies';
import { midFinishedRow, myHomeTwo, seniorRow, tallgrassRow } from './__fixtures__/mine';
import {
  companyCountsOf,
  courseLineOf,
  coursesLineOf,
  disagreementsWordsOf,
  factsFromWordsOf,
  factWordsOf,
  leftOutWordsOf,
  myPlansAtOf,
  notOfficialWordsOf,
  planCardsOf,
  planLevelNamesOf,
  planLevelWordsOf,
  planSizeOf,
  plansNoteOf,
  roundMarksOf,
  roundOfWordsOf,
  valuesLineOf,
} from './company';
import type { InterviewCompanyPage } from './types';

describe("a plan's row on a company's page", () => {
  it('says the level in plain words: one level, several, and a position with one plan for every level', () => {
    expect(planLevelWordsOf(northwindSeniorSoftwareEngineerCard)).toBe('Senior');
    expect(planLevelWordsOf(northwindMidSeniorSreCard)).toBe('Mid level and senior');
    expect(planLevelWordsOf({ ...northwindMidSeniorSreCard, levels: ['entry', 'mid', 'senior'] })).toBe(
      'Entry level, mid level and senior',
    );
    expect(planLevelWordsOf(northwindEngineeringManagerCard)).toBe('All levels');
    expect(planLevelWordsOf(tallgrassSreCard)).toBe('All levels');
  });

  it('says a level as the plan names it', () => {
    for (const plan of planCardsOf(northwindPage)) {
      if (plan.levels.length === 1 && plan.slug !== plan.position.slug) {
        expect(plan.name.startsWith(planLevelWordsOf(plan))).toBe(true);
      }
    }
    expect(planLevelWordsOf({ ...northwindSeniorSoftwareEngineerCard, levels: ['principal'] })).toBe('Principal');
    expect(planLevelWordsOf({ ...northwindSeniorSoftwareEngineerCard, levels: ['lead'] })).toBe('lead');
  });

  it("names the company's own levels, and nothing when the sources give none", () => {
    expect(planLevelNamesOf(northwindSeniorSoftwareEngineerCard)).toBe('N3');
    expect(planLevelNamesOf(northwindMidSeniorSreCard)).toBe('N2 and N3');
    expect(planLevelNamesOf(tallgrassSreCard)).toBeNull();
  });

  it('says its size with no count of nothing', () => {
    expect(planSizeOf(northwindSeniorSoftwareEngineerCard)).toEqual(['5 rounds', '65 lessons']);
    expect(planSizeOf({ roundCount: 1, lessons: 1, projects: 1 })).toEqual(['1 round', '1 lesson', '1 project']);
    expect(planSizeOf({ roundCount: 5, lessons: 111, projects: 3 })).toEqual(['5 rounds', '111 lessons', '3 projects']);
    expect(planSizeOf({ roundCount: 0, lessons: 0, projects: 0 })).toEqual([]);
  });
});

describe("the head of a company's page", () => {
  it('counts the plans and positions and says the day of the last check', () => {
    expect(companyCountsOf(northwindPage)).toEqual(['7 plans', '3 positions', 'last checked 26 Nov 2026']);
    expect(companyCountsOf(tallgrassPage)).toEqual(['1 plan', '1 position', 'last checked 26 Nov 2026']);
    expect(companyCountsOf({ positions: [], checkedAt: 'soon' })).toEqual([]);
  });

  it('says the page is not official', () => {
    expect(notOfficialWordsOf('Northwind')).toBe('Not an official Northwind page. Built from public sources.');
  });
});

describe('the quiet line under the plans', () => {
  it('names the positions with no plan, a last word they share said once', () => {
    expect(leftOutWordsOf(['Frontend engineer', 'Machine learning engineer', 'Data engineer'])).toBe(
      'frontend, machine learning or data engineer',
    );
    expect(leftOutWordsOf(['Data engineer'])).toBe('data engineer');
    expect(leftOutWordsOf(['Data engineer', 'Engineering manager'])).toBe('data engineer or engineering manager');
    expect(leftOutWordsOf(['iOS engineer', 'SRE'])).toBe('iOS engineer or SRE');
    expect(leftOutWordsOf([])).toBeNull();
  });

  it('says why a position has no plan', () => {
    expect(plansNoteOf(northwindPage)).toBe(
      'No plan for data engineer yet: public sources do not describe those interviews at Northwind well enough.',
    );
  });

  it('says when one plan covers levels the sources do not tell apart, then the positions with no plan', () => {
    const both = { ...northwindMidSeniorSreCard, levelNames: [] };
    const page = { ...northwindPage, positions: [{ position: both.position, plans: [both] }] };
    expect(plansNoteOf({ ...page, leftOut: [] })).toBe(
      'Where sources do not tell two levels apart, one plan covers both.',
    );
    expect(plansNoteOf({ ...page, leftOut: ['Frontend engineer', 'Data engineer'] })).toBe(
      'Where sources do not tell two levels apart, one plan covers both. No plan for frontend or data engineer yet.',
    );
    const three = { ...both, levels: ['entry', 'mid', 'senior'] };
    expect(plansNoteOf({ ...page, leftOut: [], positions: [{ position: three.position, plans: [three] }] })).toBe(
      'Where sources do not tell levels apart, one plan covers them.',
    );
  });

  it('is not there when every plan names its levels and every position has one', () => {
    expect(plansNoteOf({ ...northwindPage, leftOut: [] })).toBeNull();
    expect(plansNoteOf(tallgrassPage)).toBeNull();
  });
});

describe("a company's facts", () => {
  it('says a value and its note as one text, and either alone', () => {
    expect(factWordsOf(northwindPage.process[0])).toBe(
      'Not allowed in live rounds. Northwind says any use ends the interview.',
    );
    expect(factWordsOf(northwindTimeline)).toBe('4 to 8 weeks. From the first call to the offer.');
    expect(factWordsOf(northwindPage.values[0])).toBe(
      'You follow a problem to its end, past the edge of your own team.',
    );
    expect(factWordsOf({ value: 'Video calls.', note: null })).toBe('Video calls.');
    expect(factWordsOf({ value: ' ', note: null })).toBeNull();
  });

  it('says how many values candidates report and how many the company states itself', () => {
    const reported = { basis: 'reported' as const };
    const official = { basis: 'official' as const };
    expect(valuesLineOf([reported, reported, reported, reported, official], 'Google')).toBe(
      'The four things candidates say every interviewer rates, and one thing Google states itself.',
    );
    expect(valuesLineOf([reported], 'Google')).toBe('One thing candidates say every interviewer rates.');
    expect(valuesLineOf([reported, official, official], 'Google')).toBe(
      'One thing candidates say every interviewer rates, and two things Google states itself.',
    );
    expect(valuesLineOf(northwindPage.values, 'Northwind')).toBe('The two things Northwind states it looks for.');
    expect(valuesLineOf([official], 'Northwind')).toBe('One thing Northwind states it looks for.');
    expect(valuesLineOf([], 'Northwind')).toBeNull();
  });

  it('says how many points the sources disagree on, with the first', () => {
    expect(disagreementsWordsOf(northwindPage.disagreements)).toBe(
      'Sources disagree on 3 points, for example whether the team match comes before or after the decision.',
    );
    expect(disagreementsWordsOf({ count: 1, example: 'How long the take-home takes.' })).toBe(
      'Sources disagree on one point: How long the take-home takes.',
    );
    expect(disagreementsWordsOf(null)).toBeNull();
    expect(disagreementsWordsOf({ count: 0, example: 'x' })).toBeNull();
    expect(disagreementsWordsOf({ count: 2, example: ' ' })).toBeNull();
  });
});

describe("the doors of a company's page", () => {
  it("says the company's own course and its size, with what it looks for only when the page lists it", () => {
    const course = northwindPage.course as NonNullable<InterviewCompanyPage['course']>;
    expect(courseLineOf(course, 'Northwind', true)).toBe(
      'A course of 12 lessons on how Northwind hires and what it looks for',
    );
    expect(courseLineOf({ ...course, lessons: 1 }, 'Northwind', false)).toBe(
      'A course of 1 lesson on how Northwind hires',
    );
    expect(courseLineOf({ ...course, lessons: 0 }, 'Northwind', false)).toBe('A course on how Northwind hires');
  });

  it("counts Learn's courses its plans use, and has no line for none", () => {
    expect(coursesLineOf(4)).toBe('4 courses in Learn that its plans use.');
    expect(coursesLineOf(1)).toBe('1 course in Learn that its plans use.');
    expect(coursesLineOf(0)).toBeNull();
  });

  it('counts the sources in the foot line, and names no count of nothing', () => {
    expect(factsFromWordsOf(21)).toBe('Facts from 21 public sources, written in our own words');
    expect(factsFromWordsOf(1)).toBe('Facts from 1 public source, written in our own words');
    expect(factsFromWordsOf(0)).toBe('Facts written in our own words');
  });
});

describe("the person's plans at a company", () => {
  it('keeps the plans in progress at this company, in the order of the read', () => {
    expect(myPlansAtOf(myHomeTwo, 'northwind')).toEqual([seniorRow]);
    expect(myPlansAtOf(myHomeTwo, 'tallgrass')).toEqual([tallgrassRow]);
    expect(myPlansAtOf({ plans: [midFinishedRow] }, 'northwind')).toEqual([]);
  });

  it('is none for anything that is not such a read', () => {
    for (const home of [undefined, null, 'x', {}, { plans: 'x' }, { plans: [null, 1, { state: 'in_progress' }] }]) {
      expect(myPlansAtOf(home, 'northwind')).toEqual([]);
    }
  });

  it('says where the person stands, and nothing without a round', () => {
    expect(roundOfWordsOf(seniorRow)).toBe('round 3 of 5');
    expect(roundOfWordsOf({ ...seniorRow, here: null })).toBeNull();
    expect(roundOfWordsOf({ ...seniorRow, here: 9 })).toBeNull();
  });

  it('marks the round the person is in, the rounds passed, and the rest', () => {
    expect(roundMarksOf(seniorRow)).toEqual(['done', 'done', 'here', 'ahead', 'ahead']);
    expect(
      roundMarksOf({
        here: 1,
        rounds: [
          { key: 'a', state: 'started' },
          { key: 'b', state: 'to_come' },
          { key: 'c', state: 'done' },
        ],
      }),
    ).toEqual(['here', 'ahead', 'done']);
  });
});
