import { describe, expect, it } from 'vitest';

import { midFinishedRow, mineFinishedOnly, mineFull, seniorRow, tallgrassRow } from './__fixtures__/mine';
import { justDoneRow, longNameRow, mineMany, mineNone, mineOne, tallgrassFinishedRow } from './__fixtures__/mine-page';
import {
  finishedDayOf,
  finishedLineOf,
  interviewsMineOf,
  isEmptyMine,
  marksOf,
  mineViewOf,
  progressLineOf,
} from './mine';

const NOW = new Date('2026-11-27T12:00:00.000Z');
const UTC = 'UTC';

describe('the line of a plan in progress', () => {
  it('says the round and what comes next', () => {
    expect(progressLineOf(seniorRow)).toEqual(['Round 3 of 5', 'Next: Graphs, 11 lessons']);
    expect(progressLineOf(longNameRow)).toEqual([
      'Round 4 of 6',
      'Next: The system design interview at Northwind, 7 lessons',
    ]);
  });

  it('says a round just done, and one lesson in the singular', () => {
    expect(progressLineOf(justDoneRow)).toEqual(['Round 2 of 5 is done', 'Next: Graphs, 1 lesson']);
  });

  it('counts the rounds with no item as rounds of the plan', () => {
    expect(tallgrassRow.rounds.length).toBeGreaterThan(1);
    expect(progressLineOf(tallgrassRow)[0]).toBe(`Round 1 of ${tallgrassRow.rounds.length}`);
  });

  it('never writes a zero: no count of lessons, no round, no next thing', () => {
    expect(progressLineOf({ ...seniorRow, next: { ...seniorRow.next!, lessons: 0 } })).toEqual([
      'Round 3 of 5',
      'Next: Graphs',
    ]);
    expect(progressLineOf({ ...seniorRow, here: null, next: null })).toEqual([]);
    expect(progressLineOf({ ...seniorRow, here: 0 })).toEqual(['Next: Graphs, 11 lessons']);
    expect(progressLineOf({ ...seniorRow, rounds: [], plan: { ...seniorRow.plan, roundCount: 0 } })).toEqual([
      'Next: Graphs, 11 lessons',
    ]);
  });
});

describe('the marks of a plan in progress', () => {
  it('draws a round done, the round the person is on, and the rounds to come', () => {
    expect(marksOf(seniorRow)).toEqual(['done', 'done', 'current', 'to_come', 'to_come']);
    expect(marksOf(justDoneRow)).toEqual(['done', 'done', 'current', 'to_come', 'to_come']);
  });

  it('keeps the tick of a round passed out of order, and a round with no item reads as one to come', () => {
    const row = {
      ...seniorRow,
      here: 1,
      rounds: [
        { key: 'a', state: 'started' as const },
        { key: 'b', state: 'none' as const },
        { key: 'c', state: 'done' as const },
      ],
    };
    expect(marksOf(row)).toEqual(['current', 'to_come', 'done']);
  });
});

describe('the line of a finished plan', () => {
  it('says how many rounds and the day, without the year in this year', () => {
    expect(finishedLineOf(midFinishedRow, NOW, UTC)).toEqual(['All 5 rounds done', 'finished 30 Oct']);
  });

  it('writes the year of a day in another year', () => {
    expect(finishedDayOf(tallgrassFinishedRow.finishedAt, NOW, UTC)).toBe('2 Dec 2025');
  });

  it('reads the day in the person’s time zone', () => {
    expect(finishedDayOf('2026-11-12T23:30:00.000Z', NOW, 'UTC')).toBe('12 Nov');
    expect(finishedDayOf('2026-11-12T23:30:00.000Z', NOW, 'Asia/Tokyo')).toBe('13 Nov');
  });

  it('says one round in the singular, and leaves out what it cannot read', () => {
    const one = { ...midFinishedRow, rounds: [midFinishedRow.rounds[0]] };
    expect(finishedLineOf(one, NOW, UTC)).toEqual(['1 round done', 'finished 30 Oct']);
    expect(finishedLineOf({ ...midFinishedRow, finishedAt: 'not a day' }, NOW, UTC)).toEqual(['All 5 rounds done']);
    expect(finishedLineOf({ ...midFinishedRow, finishedAt: null }, NOW, UTC)).toEqual(['All 5 rounds done']);
    expect(
      finishedLineOf({ ...midFinishedRow, rounds: [], plan: { ...midFinishedRow.plan, roundCount: 0 } }, NOW, UTC),
    ).toEqual(['Finished 30 Oct']);
  });
});

describe('My interviews as the page draws it', () => {
  it('lists the plans in progress worked on last first, then the finished ones finished last first', () => {
    const view = mineViewOf(mineMany, NOW, UTC);
    expect(view.inProgress.map((row) => row.title)).toEqual([
      'Northwind · Site reliability engineer, mid level and senior, all teams and all offices',
      'Northwind · Senior software engineer',
      'Northwind · Staff software engineer',
    ]);
    expect(view.finished.map((row) => row.title)).toEqual([
      'Northwind · Mid level software engineer',
      'Tallgrass · Site reliability engineer',
    ]);
  });

  it('links each row to its plan, with marks in progress and none finished', () => {
    const view = mineViewOf(mineFull, NOW, UTC);
    expect(view.inProgress[0]).toMatchObject({
      href: '/interviews/northwind/senior-software-engineer',
      company: { slug: 'northwind', name: 'Northwind' },
      line: ['Round 3 of 5', 'Next: Graphs, 11 lessons'],
      marks: ['done', 'done', 'current', 'to_come', 'to_come'],
    });
    expect(view.finished[0]).toMatchObject({
      href: '/interviews/northwind/mid-software-engineer',
      line: ['All 5 rounds done', 'finished 30 Oct'],
      marks: null,
    });
  });

  it('keeps the API’s order among plans worked on at the same time, and puts an unread time last', () => {
    const same = { ...tallgrassRow, workedAt: seniorRow.workedAt };
    const unread = { ...longNameRow, workedAt: 'never' };
    const view = mineViewOf({ inProgress: [unread, same, seniorRow], finished: [] }, NOW, UTC);
    expect(view.inProgress.map((row) => row.href)).toEqual([
      '/interviews/tallgrass/site-reliability-engineer',
      '/interviews/northwind/senior-software-engineer',
      '/interviews/northwind/mid-senior-site-reliability-engineer',
    ]);
  });

  it('knows when there is nothing to list', () => {
    expect(isEmptyMine(mineNone)).toBe(true);
    expect(isEmptyMine(mineOne)).toBe(false);
    expect(isEmptyMine(mineFinishedOnly)).toBe(false);
  });
});

describe("the route's answer", () => {
  it('takes the plans as the API answers them', () => {
    expect(interviewsMineOf(mineFull)).toEqual(mineFull);
  });

  it('is null for an answer that is not one, and leaves out a row it cannot draw', () => {
    expect(interviewsMineOf(null)).toBeNull();
    expect(interviewsMineOf({ inProgress: [] })).toBeNull();
    expect(interviewsMineOf([])).toBeNull();
    const broken = { ...seniorRow, plan: { ...seniorRow.plan, company: null } };
    expect(interviewsMineOf({ inProgress: [broken, seniorRow, 'row'], finished: [{}] })).toEqual(mineOne);
  });
});
