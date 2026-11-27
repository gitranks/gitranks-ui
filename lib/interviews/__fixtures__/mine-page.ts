import type { InterviewPlanRow, InterviewsMine } from '../types';
import { northwindMidSeniorSreCard, northwindStaffSoftwareEngineerCard } from './companies';
import { midFinishedRow, seniorRow, tallgrassRow } from './mine';

/*
 * My interviews in the cases its designs draw beyond the frame's two: one plan, no plan, a long name with many plans,
 * a round just done, and two plans finished.
 */

/** One plan in progress: no "Finished" part. */
export const mineOne: InterviewsMine = { inProgress: [seniorRow], finished: [] };

/** No plan in progress and none finished (a stopped plan is not in the answer). */
export const mineNone: InterviewsMine = { inProgress: [], finished: [] };

/** A plan with a long name, on round 4 of 6, worked on last. */
export const longNameRow: InterviewPlanRow = {
  plan: {
    ...northwindMidSeniorSreCard,
    name: 'Site reliability engineer, mid level and senior, all teams and all offices',
    roundCount: 6,
  },
  state: 'in_progress',
  finishedAt: null,
  workedAt: '2026-11-27T10:00:00.000Z',
  here: 4,
  justDone: null,
  rounds: [
    { key: 'site-reliability-engineer/mid-senior/rounds/1', state: 'done' },
    { key: 'site-reliability-engineer/mid-senior/rounds/2', state: 'done' },
    { key: 'site-reliability-engineer/mid-senior/rounds/3', state: 'done' },
    { key: 'site-reliability-engineer/mid-senior/rounds/4', state: 'started' },
    { key: 'site-reliability-engineer/mid-senior/rounds/5', state: 'to_come' },
    { key: 'site-reliability-engineer/mid-senior/rounds/6', state: 'to_come' },
  ],
  next: {
    round: 'site-reliability-engineer/mid-senior/rounds/4',
    roundName: 'System design',
    item: 'system-design-basics/scaling-a-service',
    itemName: 'The system design interview at Northwind',
    lessons: 7,
    lesson: 'one-server-to-many',
  },
};

/** A plan whose round 2 was just finished: the row says so, and the mark of round 3 is the current one. */
export const justDoneRow: InterviewPlanRow = {
  plan: northwindStaffSoftwareEngineerCard,
  state: 'in_progress',
  finishedAt: null,
  workedAt: '2026-11-25T12:00:00.000Z',
  here: 3,
  justDone: 2,
  rounds: [1, 2, 3, 4, 5].map((number) => ({
    key: `software-engineer/staff/rounds/${number}`,
    state: number <= 2 ? ('done' as const) : ('to_come' as const),
  })),
  next: {
    round: 'software-engineer/staff/rounds/3',
    roundName: 'Coding interviews',
    item: 'algorithms/graphs',
    itemName: 'Graphs',
    lessons: 1,
    lesson: 'graphs-1',
  },
};

/** A second finished plan, finished before the mid level one. */
export const tallgrassFinishedRow: InterviewPlanRow = {
  ...tallgrassRow,
  state: 'finished',
  finishedAt: '2025-12-02T09:00:00.000Z',
  workedAt: '2025-12-02T09:00:00.000Z',
  here: null,
  rounds: tallgrassRow.rounds.map(({ key }) => ({ key, state: 'done' as const })),
  next: null,
};

/** Many plans, as the API might answer them in any order: three in progress, two finished. */
export const mineMany: InterviewsMine = {
  inProgress: [justDoneRow, seniorRow, longNameRow],
  finished: [tallgrassFinishedRow, midFinishedRow],
};
