import type { LessonInPlan } from '../lesson-in-plan';
import { seniorInProgress } from './mine';
import { northwindSeniorPlan } from './plans';

/*
 * A lesson inside the made-up person's plan: Graphs, in round 3 of Northwind's senior plan, with three of its eleven
 * lessons learned; and the same part with every lesson but the last learned. The group's lessons and titles are the
 * kind Learn has.
 */

const [, , coding] = northwindSeniorPlan.rounds;
const graphsMine = seniorInProgress.rounds[2].items[0];

/** The titles of the Graphs group, as Learn's lesson page has them. */
export const graphsTitles = graphsMine.lessons.map((lesson, index) => ({
  slug: lesson.slug,
  title: index === 0 ? 'What a graph is' : `Graphs, lesson ${index + 1}`,
}));

/** The fourth lesson of Graphs, inside the plan: three learned before it, the lesson not held. */
export const graphsInPlan: LessonInPlan = {
  company: northwindSeniorPlan.company,
  plan: { slug: northwindSeniorPlan.slug, name: northwindSeniorPlan.name },
  round: { number: coding.number, title: coding.title },
  part: { key: 'algorithms/graphs', name: 'Graphs', course: 'Algorithms and data structures' },
  lessons: graphsMine.lessons,
  held: false,
};

/** The same part with every lesson but the last learned, the lessons held by the plan. */
export const graphsLastInPlan: LessonInPlan = {
  ...graphsInPlan,
  lessons: graphsMine.lessons.map((lesson, index, all) => ({ ...lesson, done: index < all.length - 1 })),
  held: true,
};
