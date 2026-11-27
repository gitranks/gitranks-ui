import type { InterviewPlanMine, InterviewRoundState } from './types';

/*
 * The rounds of a plan on one line, as every page that draws it reads it: a point for each round and the line between
 * them. The line is solid behind the person and grey ahead; it is solid only between a passed round and the next
 * passed one or the one the person is in ("You are here"), so a round passed out of order keeps its tick and stands
 * alone. After the last round the line goes on dashed through what happens after the interviews, or ends there.
 * Pure: the plan's page, the connecting screen and their specs read the same answers.
 */

/**
 * A round's point: `done` (a tick), `here` (the round "You are here" points to), `started` (started out of order, a
 * ring) or `plain` (to come, a round with nothing to do, and every round for someone with no plan).
 */
export type RoundPoint = 'done' | 'here' | 'started' | 'plain';

/** A piece of the line: solid (behind the person), grey (ahead), dashed (after the interviews) or none. */
export type RoundSegment = 'solid' | 'grey' | 'dashed' | 'none';

/** One round on the line: its point, and the line above it and below it. */
export type RoundLineMark = { number: number; point: RoundPoint; above: RoundSegment; below: RoundSegment };

/** A round as the line needs it: its number, and whether it has anything to do (a round with no item has no state). */
export type RoundOnLine = { number: number; items: readonly unknown[] };

/** The person's state of each round by number; none for someone with no plan. */
const statesOf = (mine: Pick<InterviewPlanMine, 'rounds'> | null): Map<number, InterviewRoundState> =>
  new Map((mine?.rounds ?? []).map((round) => [round.number, round.state]));

/**
 * Whether the person is past a round: a round done, or a round with nothing to do that lies behind the round "You
 * are here" (or behind a plan whose rounds are all done). A round with nothing to do is never ticked, but the line
 * runs through it.
 */
function passedOf(
  round: RoundOnLine,
  state: InterviewRoundState | undefined,
  here: number | null,
  allDone: boolean,
): boolean {
  if (state === 'done') return true;
  if (round.items.length) return false;
  return here !== null ? round.number < here : allDone;
}

/** A round's point, from its state and the round "You are here" points to. */
export function roundPointOf(number: number, state: InterviewRoundState | undefined, here: number | null): RoundPoint {
  if (state === 'done') return 'done';
  if (here === number) return 'here';
  if (state === 'started') return 'started';
  return 'plain';
}

/**
 * The line of a plan's rounds for the person (`mine`, none for someone with no plan). `after`: something happens
 * after the interviews, so the line goes on dashed below the last round.
 */
export function roundLineOf(
  rounds: readonly RoundOnLine[],
  mine: Pick<InterviewPlanMine, 'rounds' | 'here'> | null,
  { after }: { after: boolean },
): RoundLineMark[] {
  const states = statesOf(mine);
  const here = mine?.here ?? null;
  const withItems = rounds.filter((round) => round.items.length);
  const allDone = !!mine && withItems.length > 0 && withItems.every((round) => states.get(round.number) === 'done');
  const passed = rounds.map((round) => passedOf(round, states.get(round.number), here, allDone));
  const joins = rounds
    .slice(1)
    .map(
      (next, index): RoundSegment => (passed[index] && (passed[index + 1] || next.number === here) ? 'solid' : 'grey'),
    );
  return rounds.map((round, index) => ({
    number: round.number,
    point: roundPointOf(round.number, states.get(round.number), here),
    above: index === 0 ? 'none' : joins[index - 1],
    below: index < rounds.length - 1 ? joins[index] : after ? 'dashed' : 'none',
  }));
}
