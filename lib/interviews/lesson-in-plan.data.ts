import 'server-only';

import { doc } from './interviews.documents';
import { type LessonInPlan, type LessonPlace, lessonInPlanOf, type PlanAddress } from './lesson-in-plan';
import { loadInterviewPlan } from './plan.data';
import { loadInterviewPlanMine } from './plan-mine.data';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/*
 * A lesson opened from a plan, for the signed-in person: asked for that person alone, never kept.
 */

/** Whether the person's lesson is held: learned in a plan, in a course they have not started, and not repeated. */
export const LessonHeldDocument = doc<{ learnLessonMine: { held: boolean } | null }, { slug: string }>(
  'query LessonHeld($slug: String!) { learnLessonMine(slug: $slug) { held } }',
);

/** Whether the lesson is held for the person; false on any failure, which leaves Learn's own line. */
async function loadLessonHeld(githubLogin: string, slug: string): Promise<boolean> {
  try {
    const { learnLessonMine } = await graphqlDirect(LessonHeldDocument, { slug }, { source: 'ssr', githubLogin });
    return learnLessonMine?.held === true;
  } catch {
    return false;
  }
}

/**
 * The lesson inside the person's plan: the plan (the cached public read), where they stand in it, and whether the
 * lesson is held, read side by side. Null unless their plan is in progress and holds the lesson; null when
 * Interviews is not open to them, and on any failure of the plan's reads.
 */
export async function loadLessonInPlan(
  githubLogin: string,
  address: PlanAddress,
  lesson: LessonPlace,
): Promise<LessonInPlan | null> {
  const [page, mine, held] = await Promise.all([
    loadInterviewPlan(address.company, address.plan),
    loadInterviewPlanMine(githubLogin, address.company, address.plan),
    loadLessonHeld(githubLogin, lesson.slug),
  ]);
  return page && mine ? lessonInPlanOf(page, mine, lesson, held) : null;
}
