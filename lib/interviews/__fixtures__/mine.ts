import type {
  InterviewItem,
  InterviewItemMine,
  InterviewNext,
  InterviewPlanMine,
  InterviewPlanPage,
  InterviewPlanRow,
  InterviewRoundState,
  InterviewsBar,
  InterviewsMine,
  InterviewsMyHome,
} from '../types';
import { northwindMidSoftwareEngineerCard, northwindSeniorSoftwareEngineerCard, tallgrassSreCard } from './companies';
import { northwindSeniorPlan, tallgrassSrePlan } from './plans';

/*
 * A made-up person on the two plans, in each state the designs draw: not started (with lessons learned before),
 * in progress, a round just done, finished, stopped; their rows, their bar and the connecting screen's three cases.
 */

/** An item for the person, with its first `done` lessons learned. */
const itemMine = (item: InterviewItem, done: number): InterviewItemMine => {
  if (item.type !== 'lessons') return { key: item.key, done: 0, of: 0, next: null, lessons: [] };
  const slugs = [
    item.first,
    ...Array.from({ length: item.lessons - 1 }, (_, index) => `${item.group.slug}-${index + 2}`),
  ];
  return {
    key: item.key,
    done,
    of: item.lessons,
    next: done < item.lessons ? slugs[done] : null,
    lessons: slugs.map((slug, index) => ({ slug, done: index < done })),
  };
};

/** A round's state from its items, as the person's read works it out. */
const stateOf = (items: InterviewItemMine[]): InterviewRoundState => {
  if (!items.length) return 'none';
  if (items.every((item) => item.done === item.of)) return 'done';
  return items.some((item) => item.done > 0) ? 'started' : 'to_come';
};

/** The person's rounds of a plan, with how many lessons of each item they learned (by the item's key). */
const roundsOf = (plan: InterviewPlanPage, learned: Record<string, number>) =>
  plan.rounds.map((one) => {
    const items = one.items.map((item) => itemMine(item, learned[item.key] ?? 0));
    return { key: one.key, number: one.number, state: stateOf(items), items };
  });

/** Every lesson of a plan learned. */
const allOf = (plan: InterviewPlanPage) =>
  Object.fromEntries(
    plan.rounds.flatMap((one) => one.items.map((item) => [item.key, item.type === 'lessons' ? item.lessons : 0])),
  );

const mine = (fields: Partial<InterviewPlanMine> & Pick<InterviewPlanMine, 'state' | 'rounds'>): InterviewPlanMine => ({
  startedAt: null,
  finishedAt: null,
  stoppedAt: null,
  here: null,
  learnedBefore: 0,
  next: null,
  reviewDue: false,
  justDone: null,
  ...fields,
});

const [, , coding, design] = northwindSeniorPlan.rounds;

/** Signed in, not started: 21 of the plan's lessons learned before, in Learn. */
export const seniorNotStarted = mine({
  state: 'none',
  learnedBefore: 21,
  rounds: roundsOf(northwindSeniorPlan, {
    'algorithms/hash-maps': 9,
    'algorithms/graphs': 7,
    'interview-skills/thinking-aloud': 5,
  }),
});

/** In progress in round 3: two rounds done, Graphs started. */
export const seniorInProgress = mine({
  state: 'in_progress',
  startedAt: '2026-11-20T09:00:00.000Z',
  here: 3,
  rounds: roundsOf(northwindSeniorPlan, {
    'interview-skills/telling-your-story': 6,
    'algorithms/hash-maps': 9,
    'algorithms/graphs': 3,
  }),
  next: { round: coding.key, item: 'algorithms/graphs', lesson: 'graphs-4' },
});

/** Round 3 just done: the next thing is the first lesson of round 4. */
export const seniorRoundDone = mine({
  state: 'in_progress',
  startedAt: '2026-11-20T09:00:00.000Z',
  here: 4,
  justDone: 3,
  rounds: roundsOf(northwindSeniorPlan, {
    'interview-skills/telling-your-story': 6,
    'algorithms/hash-maps': 9,
    'algorithms/graphs': 11,
    'algorithms/dynamic-programming': 12,
    'interview-skills/thinking-aloud': 5,
  }),
  next: { round: design.key, item: 'system-design-basics/scaling-a-service', lesson: 'one-server-to-many' },
});

/** Every round done. */
export const seniorFinished = mine({
  state: 'finished',
  startedAt: '2026-11-02T09:00:00.000Z',
  finishedAt: '2026-11-26T18:30:00.000Z',
  rounds: roundsOf(northwindSeniorPlan, allOf(northwindSeniorPlan)),
});

/** Every round done, and a lesson of the plan due in Learn's review. */
export const seniorFinishedReviewDue: InterviewPlanMine = { ...seniorFinished, reviewDue: true };

/** Stopped after the first round: what was learned stays learned. */
export const seniorStopped = mine({
  state: 'stopped',
  startedAt: '2026-11-20T09:00:00.000Z',
  stoppedAt: '2026-11-25T10:00:00.000Z',
  rounds: roundsOf(northwindSeniorPlan, { 'interview-skills/telling-your-story': 6 }),
});

/** Tallgrass just started: nothing learned yet. The take-home round has no state. */
export const tallgrassStarted = mine({
  state: 'in_progress',
  startedAt: '2026-11-26T08:00:00.000Z',
  here: 1,
  rounds: roundsOf(tallgrassSrePlan, {}),
  next: {
    round: tallgrassSrePlan.rounds[0].key,
    item: 'interview-skills/telling-your-story',
    lesson: 'a-story-in-three-parts',
  },
});

/** The person's bar with a plan in progress or finished, and without. */
export const barMine: InterviewsBar = { mine: true };
export const barNone: InterviewsBar = { mine: false };

/** The senior plan as a row, in progress in round 3. */
export const seniorRow: InterviewPlanRow = {
  plan: northwindSeniorSoftwareEngineerCard,
  state: 'in_progress',
  finishedAt: null,
  workedAt: '2026-11-27T08:15:00.000Z',
  here: 3,
  justDone: null,
  rounds: seniorInProgress.rounds.map(({ key, state }) => ({ key, state })),
  next: {
    round: coding.key,
    roundName: coding.title,
    item: 'algorithms/graphs',
    itemName: 'Graphs',
    lessons: 11,
    lesson: 'graphs-4',
  },
};

/** Tallgrass's plan as a row, just started. */
export const tallgrassRow: InterviewPlanRow = {
  plan: tallgrassSreCard,
  state: 'in_progress',
  finishedAt: null,
  workedAt: '2026-11-26T08:00:00.000Z',
  here: 1,
  justDone: null,
  rounds: tallgrassStarted.rounds.map(({ key, state }) => ({ key, state })),
  next: {
    round: tallgrassSrePlan.rounds[0].key,
    roundName: 'Recruiter call',
    item: 'interview-skills/telling-your-story',
    itemName: 'Telling a clear story',
    lessons: 6,
    lesson: 'a-story-in-three-parts',
  },
};

/** Northwind's mid level plan, finished. */
export const midFinishedRow: InterviewPlanRow = {
  plan: northwindMidSoftwareEngineerCard,
  state: 'finished',
  finishedAt: '2026-10-30T17:00:00.000Z',
  workedAt: '2026-10-30T17:00:00.000Z',
  here: null,
  justDone: null,
  rounds: [1, 2, 3, 4, 5].map((number) => ({ key: `software-engineer/mid/rounds/${number}`, state: 'done' as const })),
  next: null,
};

/** The person's plans in progress, the one worked on last first. */
export const myHomeTwo: InterviewsMyHome = { plans: [seniorRow, tallgrassRow] };
/** One plan in progress. */
export const myHomeOne: InterviewsMyHome = { plans: [seniorRow] };
/** No plan in progress. */
export const myHomeNone: InterviewsMyHome = { plans: [] };

/** My interviews: two plans in progress and one finished. */
export const mineFull: InterviewsMine = { inProgress: [seniorRow, tallgrassRow], finished: [midFinishedRow] };
/** My interviews with only a finished plan. */
export const mineFinishedOnly: InterviewsMine = { inProgress: [], finished: [midFinishedRow] };

/** The connecting screen after Graphs: the next part of the same round comes. */
export const nextAfterPart: InterviewNext = {
  done: { kind: 'part', name: 'Graphs', lessons: 11 },
  mine: mine({
    ...seniorInProgress,
    rounds: roundsOf(northwindSeniorPlan, {
      'interview-skills/telling-your-story': 6,
      'algorithms/hash-maps': 9,
      'algorithms/graphs': 11,
    }),
    next: { round: coding.key, item: 'algorithms/dynamic-programming', lesson: 'overlapping-subproblems' },
  }),
};

/** The connecting screen after the last part of round 3. */
export const nextAfterRound: InterviewNext = {
  done: { kind: 'round', name: coding.title, lessons: 28 },
  mine: seniorRoundDone,
};

/** The connecting screen after the last part of the plan. */
export const nextAfterPlan: InterviewNext = {
  done: { kind: 'plan', name: northwindSeniorPlan.name, lessons: northwindSeniorPlan.lessons },
  mine: seniorFinished,
};
