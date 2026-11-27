import { describe, expect, it } from 'vitest';

import {
  northwindCard,
  northwindEngineeringManagerCard,
  northwindMidSeniorSreCard,
  northwindSeniorSoftwareEngineerCard,
  tallgrassCard,
  tallgrassSreCard,
} from './__fixtures__/companies';
import { midFinishedRow, myHomeNone, myHomeOne, myHomeTwo, seniorRow, tallgrassRow } from './__fixtures__/mine';
import {
  andListOf,
  companiesLineOf,
  HOME_QUESTIONS,
  HOME_STEPS,
  interviewsHomeViewOf,
  LANDING_HOME_VIEW,
  planBoxOf,
  planRowNameOf,
  planSizeOf,
  plansCountOf,
  positionsLineOf,
  roundOfLine,
} from './home';
import { INTERVIEWS_HOME_DESCRIPTION, INTERVIEWS_HOME_METADATA, INTERVIEWS_HOME_TITLE } from './home-seo';

describe('interviewsHomeViewOf', () => {
  it('is the landing for no read, a failed one, one of another shape, and no plan in progress', () => {
    expect(interviewsHomeViewOf(null)).toBe(LANDING_HOME_VIEW);
    expect(interviewsHomeViewOf(undefined)).toBe(LANDING_HOME_VIEW);
    expect(interviewsHomeViewOf({ plans: 'no' } as never)).toBe(LANDING_HOME_VIEW);
    expect(interviewsHomeViewOf({ plans: [{ plan: null }] } as never)).toBe(LANDING_HOME_VIEW);
    expect(interviewsHomeViewOf(myHomeNone)).toBe(LANDING_HOME_VIEW);
    expect(interviewsHomeViewOf({ plans: [midFinishedRow] })).toBe(LANDING_HOME_VIEW);
  });

  it('is the person’s home with the plan worked on last first, and the others after', () => {
    const view = interviewsHomeViewOf(myHomeTwo);
    expect(view.kind).toBe('mine');
    if (view.kind !== 'mine') return;
    expect(view.first).toBe(seniorRow);
    expect(view.others).toEqual([tallgrassRow]);
    expect([...view.companies]).toEqual(['northwind', 'tallgrass']);
  });

  it('has no other plans with one plan', () => {
    const view = interviewsHomeViewOf(myHomeOne);
    expect(view.kind === 'mine' && view.others).toEqual([]);
  });
});

describe('a company card', () => {
  it('names its positions in one line, the first with its capital letter', () => {
    expect(positionsLineOf(northwindCard)).toBe('Software engineer, site reliability engineer, engineering manager');
    expect(positionsLineOf(tallgrassCard)).toBe('Site reliability engineer');
  });

  it('counts its plans, and draws no zero', () => {
    expect(plansCountOf(northwindCard)).toBe('7 plans');
    expect(plansCountOf(tallgrassCard)).toBe('1 plan');
    expect(plansCountOf({ ...tallgrassCard, plans: [] })).toBe('');
  });
});

describe('a plan as a row', () => {
  it('uses the plan’s one name, with "all levels" for a position’s one plan and the company’s level names', () => {
    expect(planRowNameOf(northwindSeniorSoftwareEngineerCard)).toBe('Senior software engineer');
    expect(planRowNameOf(northwindSeniorSoftwareEngineerCard, { levelNames: true })).toBe(
      'Senior software engineer, N3',
    );
    expect(planRowNameOf(northwindMidSeniorSreCard, { levelNames: true })).toBe(
      'Site reliability engineer, mid level and senior, N2 and N3',
    );
    expect(planRowNameOf(tallgrassSreCard, { levelNames: true })).toBe('Site reliability engineer, all levels');
    expect(planRowNameOf(northwindEngineeringManagerCard, { levelNames: true })).toBe(
      'Engineering manager, all levels',
    );
  });

  it('says its size, leaving out a part at zero', () => {
    expect(planSizeOf(northwindMidSeniorSreCard)).toBe('4 rounds · 38 lessons');
    expect(planSizeOf({ ...tallgrassSreCard, roundCount: 1, lessons: 1, projects: 1 })).toBe(
      '1 round · 1 lesson · 1 project',
    );
    expect(planSizeOf({ ...tallgrassSreCard, roundCount: 0, lessons: 0, projects: 0 })).toBe('');
  });

  it('says the round the person is on, or nothing', () => {
    expect(roundOfLine(seniorRow)).toBe('round 3 of 5');
    expect(roundOfLine(tallgrassRow)).toBe('round 1 of 3');
    expect(roundOfLine(midFinishedRow)).toBe('');
  });

  it('joins names with "and"', () => {
    expect(andListOf([])).toBe('');
    expect(andListOf(['N1'])).toBe('N1');
    expect(andListOf(['N1', 'N2', 'N3'])).toBe('N1, N2 and N3');
  });
});

describe('the box of the plan to go on with', () => {
  it('names the plan, the round and the next part, which opens its next lesson inside the plan', () => {
    expect(planBoxOf(seniorRow)).toEqual({
      title: 'Northwind · Senior software engineer',
      round: 'round 3 of 5',
      done: '',
      next: {
        name: 'Graphs',
        lessons: '11 lessons',
        href: '/learn/lessons/graphs-4?plan=northwind/senior-software-engineer',
      },
      plan: '/interviews/northwind/senior-software-engineer',
    });
  });

  it('says a round just done, and opens the plan when the next part names no lesson', () => {
    const box = planBoxOf({
      ...seniorRow,
      justDone: 2,
      next: seniorRow.next && { ...seniorRow.next, lesson: null, lessons: 0 },
    });
    expect(box.done).toBe('Round 2 is done.');
    expect(box.next).toEqual({ name: 'Graphs', lessons: '', href: '/interviews/northwind/senior-software-engineer' });
  });

  it('has no next part when the read names none', () => {
    expect(planBoxOf({ ...seniorRow, next: null }).next).toBeNull();
  });
});

describe('the landing’s words', () => {
  it('says how many companies there are to start with, as a word, and only the second sentence past twelve', () => {
    expect(companiesLineOf(10)).toBe(
      'Ten to start with. More come when public sources describe a company’s interviews well enough.',
    );
    expect(companiesLineOf(2)).toMatch(/^Two to start with\./);
    expect(companiesLineOf(16)).toBe('More come when public sources describe a company’s interviews well enough.');
    expect(companiesLineOf(0)).not.toMatch(/\b0\b/);
  });

  it('has three steps and five questions, each with an answer', () => {
    expect(HOME_STEPS).toHaveLength(3);
    expect(HOME_QUESTIONS.map((one) => one.question)).toEqual([
      'Is a plan official?',
      'How do you know what a company asks?',
      'Does anyone see which interview I prepare for?',
      'What does it cost?',
      'Why is my company not here?',
    ]);
    for (const { answer } of HOME_QUESTIONS) expect(answer.length).toBeGreaterThan(10);
  });

  it('says the plans are not publicly visible, and never that they are never shared or which setting removes them', () => {
    const text = HOME_QUESTIONS.map((one) => one.answer).join(' ');
    expect(text).toContain('Your interview plans are not publicly visible.');
    expect(text).not.toMatch(/never share|Delete all data|promise|pass the interview/i);
  });
});

describe('Interviews home’s metadata', () => {
  it('has the title and description of its share picture, and is not indexed while Interviews is closed', () => {
    expect(INTERVIEWS_HOME_METADATA.title).toEqual({ absolute: INTERVIEWS_HOME_TITLE });
    expect(INTERVIEWS_HOME_TITLE).toBe('Interview plans for engineers · GitRanks');
    expect(INTERVIEWS_HOME_METADATA.description).toBe(INTERVIEWS_HOME_DESCRIPTION);
    expect(INTERVIEWS_HOME_METADATA.alternates?.canonical).toBe('/interviews');
    expect(INTERVIEWS_HOME_METADATA.robots).toEqual({ index: false, follow: false });
  });
});
