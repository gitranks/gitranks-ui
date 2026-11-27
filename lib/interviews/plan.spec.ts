import { describe, expect, it } from 'vitest';

import { northwindSources, tallgrassSources } from './__fixtures__/companies';
import {
  seniorFinished,
  seniorFinishedReviewDue,
  seniorInProgress,
  seniorNotStarted,
  seniorRoundDone,
  seniorStopped,
  tallgrassStarted,
} from './__fixtures__/mine';
import { seniorJumped, seniorStartedToday } from './__fixtures__/plan-mine';
import { graphs, hashMaps, northwindSeniorPlan, tallgrassSrePlan } from './__fixtures__/plans';
import {
  boxMarksOf,
  daysWordsOf,
  factTextOf,
  itemStandingOf,
  jumpedAheadOf,
  learnLineOf,
  lessonsLearnedOf,
  levelWordsOf,
  minutesWordsOf,
  planBoxOf,
  planFactsOf,
  planNoticeOf,
  planSizeWordsOf,
  roundCountWordsOf,
  roundProgressWordsOf,
  roundSizeOf,
  roundSizeWordsOf,
  shortDayOf,
  startedTodayOf,
  startedWordsOf,
  thinWordsOf,
} from './plan';
import { roundLineOf } from './round-line';
import type { InterviewPlanMine, InterviewPlanPage } from './types';

const points = (marks: ReturnType<typeof roundLineOf>) => marks.map((mark) => mark.point);

const senior = northwindSeniorPlan;
const [recruiter, assessment, coding, design, values] = senior.rounds;
const NOW = new Date('2026-11-27T12:00:00.000Z');

describe('the round sizes', () => {
  it('draws a round with nothing to do as its facts, for everyone', () => {
    const takeHome = tallgrassSrePlan.rounds[1];
    expect(roundSizeOf(takeHome, null)).toBe('facts');
    expect(roundSizeOf(takeHome, tallgrassStarted)).toBe('facts');
  });

  it('draws every round closed for a visitor, and for a plan not started', () => {
    expect(senior.rounds.map((round) => roundSizeOf(round, null))).toEqual([
      'closed',
      'closed',
      'closed',
      'closed',
      'closed',
    ]);
    expect(senior.rounds.map((round) => roundSizeOf(round, seniorNotStarted))).toEqual([
      'closed',
      'row',
      'closed',
      'closed',
      'closed',
    ]);
  });

  it('draws a finished round as one row, the round "You are here" open, and the rest closed', () => {
    expect(senior.rounds.map((round) => roundSizeOf(round, seniorInProgress))).toEqual([
      'row',
      'row',
      'open',
      'closed',
      'closed',
    ]);
    expect(senior.rounds.map((round) => roundSizeOf(round, seniorJumped))).toEqual([
      'row',
      'row',
      'open',
      'closed',
      'row',
    ]);
    expect(senior.rounds.map((round) => roundSizeOf(round, seniorFinished))).toEqual([
      'row',
      'row',
      'row',
      'row',
      'row',
    ]);
  });
});

describe('"You are here", only on a plan in progress', () => {
  // Reads that carry a round "You are here" for a plan not in progress: the page draws none for them.
  const notStarted: InterviewPlanMine = { ...seniorNotStarted, here: 1 };
  const stopped: InterviewPlanMine = { ...seniorStopped, here: 2 };
  // A finished plan whose round 3 gained a lesson after it was finished.
  const finished: InterviewPlanMine = { ...seniorFinished, here: 3, rounds: seniorJumped.rounds };

  it('opens no round, rings no mark and sees no jump for a plan not started, stopped or finished', () => {
    for (const mine of [notStarted, stopped, finished]) {
      expect(senior.rounds.map((round) => roundSizeOf(round, mine))).not.toContain('open');
      expect(boxMarksOf(senior, mine)).not.toContain('here');
      expect(jumpedAheadOf(mine)).toBe(false);
      expect(points(roundLineOf(senior.rounds, mine, { after: true }))).not.toContain('here');
    }
  });

  it('keeps the box as it is for each of them', () => {
    expect(planBoxOf(senior, notStarted, { session: true }).kind).toBe('start');
    expect(planBoxOf(senior, stopped, { session: true }).kind).toBe('start');
    expect(planBoxOf(senior, stopped, { session: true, stoppedNow: true }).kind).toBe('stopped');
    expect(planBoxOf(senior, finished, { session: true }).kind).toBe('finished');
  });
});

describe("a round's words", () => {
  it('says how many and how long, never with a zero', () => {
    expect(roundCountWordsOf('1')).toBe('1 round');
    expect(roundCountWordsOf('2-3')).toBe('2 or 3 rounds');
    expect(roundCountWordsOf('1-3')).toBe('1 to 3 rounds');
    expect(roundCountWordsOf('0-1')).toBe('Up to 1 round');
    expect(roundCountWordsOf('0-2')).toBe('Up to 2 rounds');
    expect(roundCountWordsOf('0')).toBeNull();
    expect(roundCountWordsOf(null)).toBeNull();
    expect(roundCountWordsOf('a few')).toBeNull();
    expect(minutesWordsOf('45', '1')).toBe('45 minutes');
    expect(minutesWordsOf('45-60', '2-3')).toBe('45 to 60 minutes each');
    expect(minutesWordsOf('0', '1')).toBeNull();
    expect(minutesWordsOf(null, '1')).toBeNull();
    expect(roundSizeWordsOf(coding)).toBe('2 or 3 rounds, 45 to 60 minutes each');
    expect(roundSizeWordsOf(recruiter)).toBe('1 round, 30 minutes');
    expect(roundSizeWordsOf(tallgrassSrePlan.rounds[1])).toBe('Up to 1 round');
    expect(roundSizeWordsOf({ count: null, minutes: null })).toBeNull();
  });

  it('lists its groups of lessons on the closed card', () => {
    expect(learnLineOf(coding)).toBe('Graphs, Dynamic programming, Thinking aloud');
  });

  it("writes a thin round's line from its own sources", () => {
    expect(thinWordsOf(values, northwindSources)).toBe('Thin: this round rests on one guide.');
    expect(thinWordsOf(tallgrassSrePlan.rounds[2], tallgrassSources)).toBe(
      'Thin: this round rests on one report and one guide.',
    );
    expect(thinWordsOf({ sources: ['r1', 'r2', 'g1', 'o1'] }, northwindSources)).toBe(
      'Thin: this round rests on two reports, one guide and one page of the company.',
    );
    expect(thinWordsOf({ sources: [] }, northwindSources)).toBe('Thin: this round rests on few sources.');
  });

  it("says an item's standing: lessons to come, started, or learned", () => {
    expect(itemStandingOf(graphs, undefined)).toEqual({ kind: 'to_come', words: '11 lessons' });
    const mine = seniorInProgress.rounds[2].items[0];
    expect(itemStandingOf(graphs, mine)).toEqual({ kind: 'started', words: '3 of 11 learned' });
    expect(itemStandingOf(hashMaps, seniorInProgress.rounds[1].items[0])).toEqual({
      kind: 'done',
      words: '9 lessons learned',
    });
  });

  it('says how far a round started out of order is, and that the person went ahead', () => {
    expect(roundProgressWordsOf(design, seniorJumped)).toBe('8 of 16 lessons learned');
    expect(roundProgressWordsOf(coding, seniorInProgress)).toBe('3 of 28 lessons learned');
    expect(roundProgressWordsOf(design, seniorInProgress)).toBeNull();
    expect(jumpedAheadOf(seniorJumped)).toBe(true);
    expect(jumpedAheadOf(seniorInProgress)).toBe(false);
    expect(jumpedAheadOf(null)).toBe(false);
  });

  it('writes a fact after the interviews as sentences', () => {
    expect(factTextOf(senior.after[0])).toBe(
      '1 meeting. A group that did not interview you decides, and at which level.',
    );
    expect(factTextOf({ value: null, note: null })).toBe('');
  });
});

describe("the plan's head", () => {
  it('says the level, the rounds, the lessons and how long it takes', () => {
    expect(planFactsOf(senior)).toEqual([
      'Level N3',
      '5 rounds to prepare',
      '65 lessons',
      '4 to 8 weeks from the first call to the offer',
    ]);
    expect(planFactsOf(tallgrassSrePlan)).toEqual(['All levels', '3 rounds to prepare', '16 lessons']);
  });

  it('names several levels together, all levels, or none', () => {
    expect(levelWordsOf({ slug: 'mid-senior-sre', position: senior.position, levelNames: ['N2', 'N3'] })).toBe(
      'Levels N2 and N3',
    );
    expect(levelWordsOf({ slug: 'engineering-manager-x', position: senior.position, levelNames: [] })).toBeNull();
  });

  it('never draws a zero: no projects, no lessons', () => {
    expect(planSizeWordsOf(senior)).toBe('5 rounds · 65 lessons');
    expect(planSizeWordsOf({ roundCount: 5, lessons: 65, projects: 3 })).toBe('5 rounds · 65 lessons · 3 projects');
    const empty: InterviewPlanPage = { ...tallgrassSrePlan, lessons: 0, roundCount: 0, timeline: null };
    expect(planFactsOf(empty)).toEqual(['All levels']);
    expect(planSizeWordsOf(empty)).toBe('');
  });

  it('says it is not an official page, the day of the last check, and why all levels', () => {
    expect(planNoticeOf(senior)).toBe(
      'Not an official Northwind page. Built from public sources, last checked 26 Nov 2026.',
    );
    expect(planNoticeOf(tallgrassSrePlan)).toBe(
      'Not an official Tallgrass page. Built from public sources, last checked 26 Nov 2026. Sources do not tell the levels apart.',
    );
  });
});

describe('the box "what to do now"', () => {
  it('asks a visitor to sign in, and a session with no read to start', () => {
    expect(planBoxOf(senior, null, { session: false })).toEqual({ kind: 'visitor' });
    expect(planBoxOf(senior, seniorInProgress, { session: false })).toEqual({ kind: 'visitor' });
    expect(planBoxOf(senior, null, { session: true })).toEqual({ kind: 'start', learnedBefore: 0 });
  });

  it('offers to start a plan not started, with the lessons learned before', () => {
    expect(planBoxOf(senior, seniorNotStarted, { session: true })).toEqual({ kind: 'start', learnedBefore: 21 });
  });

  it('draws a stopped plan as one not started, with what was learned, once the moment has passed', () => {
    expect(planBoxOf(senior, seniorStopped, { session: true })).toEqual({ kind: 'start', learnedBefore: 6 });
    expect(planBoxOf(senior, seniorStopped, { session: true, stoppedNow: true })).toEqual({
      kind: 'stopped',
      stoppedAt: seniorStopped.stoppedAt,
      learned: 6,
    });
  });

  it('names the next thing of a plan in progress, and whether it was started', () => {
    const box = planBoxOf(senior, seniorInProgress, { session: true });
    expect(box).toMatchObject({ kind: 'progress', here: 3, learned: 18, learnedBefore: 0 });
    if (box.kind !== 'progress') throw new Error('progress');
    expect(box.next).toMatchObject({ round: coding, item: graphs, lesson: 'graphs-4', started: true, lessons: 11 });

    const today = planBoxOf(senior, seniorStartedToday, { session: true });
    if (today.kind !== 'progress') throw new Error('progress');
    expect(today).toMatchObject({ here: 1, learnedBefore: 21 });
    expect(today.next).toMatchObject({
      round: recruiter,
      lesson: 'a-story-in-three-parts',
      started: false,
      lessons: 6,
    });
  });

  it('says a round just finished, and leads into the next one', () => {
    const box = planBoxOf(senior, seniorRoundDone, { session: true });
    expect(box).toMatchObject({ kind: 'round', done: coding, here: 4 });
    if (box.kind !== 'round') throw new Error('round');
    expect(box.next).toMatchObject({ round: design, lesson: 'one-server-to-many', started: false });
  });

  it('says a finished plan, and whether a lesson of it is due in review', () => {
    expect(planBoxOf(senior, seniorFinished, { session: true })).toEqual({
      kind: 'finished',
      startedAt: seniorFinished.startedAt,
      finishedAt: seniorFinished.finishedAt,
      learned: 65,
      reviewDue: false,
    });
    expect(planBoxOf(senior, seniorFinishedReviewDue, { session: true })).toMatchObject({ reviewDue: true });
  });

  it('has no next thing when the read names an item the plan does not hold', () => {
    const box = planBoxOf(
      senior,
      { ...seniorInProgress, next: { round: coding.key, item: 'gone/group', lesson: null } },
      {
        session: true,
      },
    );
    expect(box).toMatchObject({ kind: 'progress', next: null });
  });

  it('marks the rounds: done, the one the person is in, and the rest', () => {
    expect(boxMarksOf(senior, seniorInProgress)).toEqual(['done', 'done', 'here', 'ahead', 'ahead']);
    expect(boxMarksOf(senior, seniorRoundDone)).toEqual(['done', 'done', 'done', 'here', 'ahead']);
    expect(boxMarksOf(senior, seniorFinished)).toEqual(['done', 'done', 'done', 'done', 'done']);
    expect(boxMarksOf(senior, null)).toEqual(['ahead', 'ahead', 'ahead', 'ahead', 'ahead']);
  });

  it('counts the lessons learned, of the plan or of some rounds', () => {
    expect(lessonsLearnedOf(seniorInProgress)).toBe(18);
    expect(lessonsLearnedOf(seniorInProgress, [1, 2])).toBe(15);
    expect(lessonsLearnedOf(null)).toBe(0);
    expect(assessment.items).toEqual([hashMaps]);
  });
});

describe('days, as the box says them', () => {
  it('says a short day, "today", and a span', () => {
    expect(shortDayOf('2026-11-20T09:00:00.000Z', 'UTC')).toBe('20 Nov');
    expect(shortDayOf('not a day', 'UTC')).toBeNull();
    expect(startedWordsOf('2026-11-27T09:00:00.000Z', NOW, 'UTC')).toBe('started today');
    expect(startedWordsOf('2026-11-20T09:00:00.000Z', NOW, 'UTC')).toBe('started 20 Nov');
    expect(startedWordsOf(null, NOW, 'UTC')).toBeNull();
    expect(startedTodayOf('2026-11-27T01:00:00.000Z', NOW, 'UTC')).toBe(true);
    expect(startedTodayOf('2026-11-27T01:00:00.000Z', NOW, 'America/Los_Angeles')).toBe(false);
    expect(daysWordsOf('2026-11-02T09:00:00.000Z', '2026-11-26T18:30:00.000Z', 'UTC')).toBe('2 Nov to 26 Nov');
    expect(daysWordsOf('2026-11-26T09:00:00.000Z', '2026-11-26T18:30:00.000Z', 'UTC')).toBe('26 Nov');
    expect(daysWordsOf(null, null, 'UTC')).toBeNull();
  });
});
