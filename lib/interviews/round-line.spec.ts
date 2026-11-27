import { describe, expect, it } from 'vitest';

import {
  seniorFinished,
  seniorInProgress,
  seniorNotStarted,
  seniorStopped,
  tallgrassStarted,
} from './__fixtures__/mine';
import { seniorJumped, seniorStartedToday } from './__fixtures__/plan-mine';
import { northwindSeniorPlan, tallgrassSrePlan } from './__fixtures__/plans';
import { roundLineOf, roundPointOf } from './round-line';
import type { InterviewPlanMine } from './types';

const senior = northwindSeniorPlan.rounds;
const points = (marks: ReturnType<typeof roundLineOf>) => marks.map((mark) => mark.point);
/** The pieces of line between the rounds, in order: the one below each round but the last. */
const joins = (marks: ReturnType<typeof roundLineOf>) => marks.slice(0, -1).map((mark) => mark.below);

describe("a round's point", () => {
  it('is a tick once done, ringed for the round the person is in or started, else plain', () => {
    expect(roundPointOf(1, 'done', 3)).toBe('done');
    expect(roundPointOf(3, 'started', 3)).toBe('here');
    expect(roundPointOf(3, 'to_come', 3)).toBe('here');
    expect(roundPointOf(4, 'started', 3)).toBe('started');
    expect(roundPointOf(4, 'to_come', 3)).toBe('plain');
    expect(roundPointOf(2, 'none', null)).toBe('plain');
    expect(roundPointOf(2, undefined, null)).toBe('plain');
  });
});

describe('the line of rounds', () => {
  it('is grey all along, with plain points, for someone with no plan', () => {
    const marks = roundLineOf(senior, null, { after: true });
    expect(points(marks)).toEqual(['plain', 'plain', 'plain', 'plain', 'plain']);
    expect(joins(marks)).toEqual(['grey', 'grey', 'grey', 'grey']);
  });

  it('starts with no line above the first round, and goes on dashed after the last when something follows', () => {
    const marks = roundLineOf(senior, null, { after: true });
    expect(marks[0].above).toBe('none');
    expect(marks.at(-1)?.below).toBe('dashed');
    expect(roundLineOf(senior, null, { after: false }).at(-1)?.below).toBe('none');
  });

  it("joins every piece's ends: the line below one round is the line above the next", () => {
    const marks = roundLineOf(senior, seniorJumped, { after: true });
    for (let index = 1; index < marks.length; index++) expect(marks[index].above).toBe(marks[index - 1].below);
  });

  it('is solid behind the person and grey ahead', () => {
    const marks = roundLineOf(senior, seniorInProgress, { after: true });
    expect(points(marks)).toEqual(['done', 'done', 'here', 'plain', 'plain']);
    expect(joins(marks)).toEqual(['solid', 'solid', 'grey', 'grey']);
  });

  it('is solid only between a passed round and the next passed or current one: a jump stands alone', () => {
    const marks = roundLineOf(senior, seniorJumped, { after: true });
    expect(points(marks)).toEqual(['done', 'done', 'here', 'started', 'done']);
    expect(joins(marks)).toEqual(['solid', 'solid', 'grey', 'grey']);
    expect(marks[4].below).toBe('dashed');
  });

  it('keeps a round passed before the plan started ticked, with grey on both sides', () => {
    const marks = roundLineOf(senior, seniorStartedToday, { after: true });
    expect(points(marks)).toEqual(['here', 'done', 'started', 'plain', 'plain']);
    expect(joins(marks)).toEqual(['grey', 'grey', 'grey', 'grey']);
  });

  it('has no round "You are here" outside a plan in progress, whatever the read says', () => {
    const stopped = roundLineOf(senior, { ...seniorStopped, here: 2 }, { after: true });
    expect(points(stopped)).toEqual(['done', 'plain', 'plain', 'plain', 'plain']);
    expect(joins(stopped)).toEqual(['grey', 'grey', 'grey', 'grey']);
    expect(points(roundLineOf(senior, { ...seniorNotStarted, here: 1 }, { after: true }))).not.toContain('here');
    expect(points(roundLineOf(senior, { ...seniorFinished, here: 5 }, { after: true }))).toEqual(Array(5).fill('done'));
  });

  it('is solid all the way for a finished plan', () => {
    const marks = roundLineOf(senior, seniorFinished, { after: true });
    expect(points(marks)).toEqual(['done', 'done', 'done', 'done', 'done']);
    expect(joins(marks)).toEqual(['solid', 'solid', 'solid', 'solid']);
  });

  it('shows what was learned on a plan not started or stopped, with no round "You are here"', () => {
    expect(points(roundLineOf(senior, seniorNotStarted, { after: true }))).toEqual([
      'plain',
      'done',
      'started',
      'plain',
      'plain',
    ]);
    const stopped = roundLineOf(senior, seniorStopped, { after: true });
    expect(points(stopped)).toEqual(['done', 'plain', 'plain', 'plain', 'plain']);
    expect(joins(stopped)).toEqual(['grey', 'grey', 'grey', 'grey']);
  });

  it('runs through a round with nothing to do once the person is past it, and never ticks it', () => {
    const rounds = tallgrassSrePlan.rounds;
    const past: InterviewPlanMine = {
      ...tallgrassStarted,
      here: 3,
      rounds: tallgrassStarted.rounds.map((round) =>
        round.number === 1
          ? { ...round, state: 'done', items: round.items.map((item) => ({ ...item, done: item.of })) }
          : round,
      ),
    };
    const marks = roundLineOf(rounds, past, { after: false });
    expect(points(marks)).toEqual(['done', 'plain', 'here']);
    expect(joins(marks)).toEqual(['solid', 'solid']);
    expect(marks[2].below).toBe('none');

    const start = roundLineOf(rounds, tallgrassStarted, { after: false });
    expect(points(start)).toEqual(['here', 'plain', 'plain']);
    expect(joins(start)).toEqual(['grey', 'grey']);
  });
});
