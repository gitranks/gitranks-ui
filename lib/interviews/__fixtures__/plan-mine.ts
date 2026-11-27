import type { InterviewItemMine, InterviewPlanMine } from '../types';
import { seniorInProgress, seniorNotStarted } from './mine';
import { northwindSeniorPlan } from './plans';

/*
 * More of the made-up person on Northwind's senior plan, for the plan's page: the plan started today with lessons
 * learned before, and a person who went ahead of "You are here".
 */

/** An item with its first `done` lessons learned, its slugs as the shared fixtures make them. */
const itemOf = (key: string, done: number): InterviewItemMine => {
  const item = northwindSeniorPlan.rounds.flatMap((round) => round.items).find((one) => one.key === key);
  if (item?.type !== 'lessons') throw new Error(`no lessons item ${key}`);
  const slugs = [
    item.first,
    ...Array.from({ length: item.lessons - 1 }, (_, index) => `${item.group.slug}-${index + 2}`),
  ];
  return {
    key,
    done,
    of: item.lessons,
    next: done < item.lessons ? slugs[done] : null,
    lessons: slugs.map((slug, index) => ({ slug, done: index < done })),
  };
};

/** The person's rounds with how many lessons of each item they learned. */
const roundsWith = (learned: Record<string, number>): InterviewPlanMine['rounds'] =>
  northwindSeniorPlan.rounds.map((round) => {
    const items = round.items.map((item) => itemOf(item.key, learned[item.key] ?? 0));
    const state = items.every((item) => item.done === item.of)
      ? 'done'
      : items.some((item) => item.done > 0)
        ? 'started'
        : 'to_come';
    return { key: round.key, number: round.number, state, items };
  });

/** Started today: round 1 is next, and 21 lessons were learned before (round 2's whole group among them). */
export const seniorStartedToday: InterviewPlanMine = {
  ...seniorNotStarted,
  state: 'in_progress',
  startedAt: '2026-11-27T09:00:00.000Z',
  here: 1,
  next: {
    round: northwindSeniorPlan.rounds[0].key,
    item: 'interview-skills/telling-your-story',
    lesson: 'a-story-in-three-parts',
  },
};

/** Ahead of "You are here": rounds 1 and 2 done, Graphs started in round 3, round 4 started and round 5 done. */
export const seniorJumped: InterviewPlanMine = {
  ...seniorInProgress,
  rounds: roundsWith({
    'interview-skills/telling-your-story': 6,
    'algorithms/hash-maps': 9,
    'algorithms/graphs': 3,
    'system-design-basics/scaling-a-service': 8,
    'interviewing-at-northwind/northwind-values': 6,
  }),
};
