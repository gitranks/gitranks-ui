import {
  INTERVIEWS_HOME_PATH,
  interviewLessonPath,
  interviewNextPath,
  interviewPlanPath,
  interviewRoundPath,
  isInterviewCompanySlug,
  isInterviewPlanSlug,
  isInterviewSlug,
} from './paths';
import { itemsMineOf } from './plan';
import type { InterviewCompanyRef, InterviewPlanMine, InterviewPlanPage } from './types';
import type { LessonSetting, LessonSettingLine } from '@/lib/workspace/lesson-setting';

/*
 * A lesson inside a plan: Learn's lesson at its own address with `?plan=<company>/<plan>`. With the person's plan in
 * progress and a part of it that holds the lesson, three things follow the plan: the strip (the plan, the round, the
 * part), the main button after a right answer (the next lesson of the part, or the connecting screen after the last),
 * and the line under the answer. Anyone else gets the plain lesson. Pure: the route, the page and their specs read the
 * same answers.
 */

/** A plan's address as the lesson's query carries it. */
export type PlanAddress = { company: string; plan: string };

/** The plan a lesson's `?plan=` names: two slugs, `<company>/<plan>`; null for anything else. */
export function planQueryOf(value: string | null | undefined): PlanAddress | null {
  if (!value) return null;
  const parts = value.split('/');
  if (parts.length !== 2) return null;
  const [company, plan] = parts;
  return isInterviewCompanySlug(company) && isInterviewPlanSlug(plan) ? { company, plan } : null;
}

/** The lesson as its page knows it: its slug, and the slugs of its course and group. */
export type LessonPlace = { slug: string; course: string; group: string };

/** Whether a lesson's place has the shape of slugs, so the API is asked about it at all. */
export const isLessonPlace = (place: Partial<Record<keyof LessonPlace, unknown>>): place is LessonPlace =>
  [place.slug, place.course, place.group].every((slug) => typeof slug === 'string' && isInterviewSlug(slug));

/**
 * A lesson inside the person's plan: the plan, the round and the part that hold it, the part's lessons in order with
 * which are learned, and whether the lesson is held (learned in the plan and not repeated).
 */
export type LessonInPlan = {
  company: InterviewCompanyRef;
  plan: { slug: string; name: string };
  round: { number: number; title: string };
  part: { key: string; name: string; course: string };
  lessons: { slug: string; done: boolean }[];
  held: boolean;
};

/**
 * The lesson inside the plan, for the person: null unless their plan is in progress and one of its parts is the
 * lesson's group of its course (the first one, in the plan's order: a part is in a plan once).
 */
export function lessonInPlanOf(
  page: InterviewPlanPage,
  mine: InterviewPlanMine | null,
  lesson: Pick<LessonPlace, 'course' | 'group'>,
  held: boolean,
): LessonInPlan | null {
  if (mine?.state !== 'in_progress') return null;
  for (const round of page.rounds) {
    for (const item of round.items) {
      if (item.type !== 'lessons' || item.course.slug !== lesson.course || item.group.slug !== lesson.group) continue;
      return {
        company: page.company,
        plan: { slug: page.slug, name: page.name },
        round: { number: round.number, title: round.title },
        part: { key: item.key, name: item.group.name, course: item.course.name },
        lessons: itemsMineOf(mine).get(item.key)?.lessons ?? [],
        held,
      };
    }
  }
  return null;
}

/**
 * The lesson to open after this one, once this one is learned: the first one not learned after it in the part's
 * order, else the first one not learned before it. Null when every other lesson of the part is learned: this one is
 * then the last, and the part is done with it.
 */
export function nextInPartOf(lessons: readonly { slug: string; done: boolean }[], slug: string): string | null {
  const at = lessons.findIndex((lesson) => lesson.slug === slug);
  const open = (lesson: { slug: string; done: boolean }) => !lesson.done && lesson.slug !== slug;
  const after = lessons.slice(at + 1).find(open);
  return (after ?? lessons.slice(0, Math.max(at, 0)).find(open))?.slug ?? null;
}

/** The line under a right answer after the last lesson of a part. */
export const lastOfPartLineOf = (part: string): LessonSettingLine => ({
  lead: 'Learned.',
  tail: `That was the last lesson of ${part}.`,
});

/** The line under a right answer on a lesson the plan holds: it is not repeated. */
export const HELD_LINE: LessonSettingLine = {
  lead: 'Learned.',
  tail: 'Not repeated: it is part of your interview plan.',
};

/**
 * What Learn's lesson page does inside the plan: the strip "Interviews / Northwind · Senior software engineer /
 * Round 3 · Coding interviews / Graphs"; the main button, "Next: <the next lesson>" or, after the last, "Graphs is
 * done. See what is next" (the connecting screen); the line under the answer, the last lesson's or a held lesson's,
 * else Learn's own; and "Back to the plan". `titles`: the lessons of the lesson's group with their titles, as the page
 * has them.
 */
export function lessonSettingOf(
  inPlan: LessonInPlan,
  slug: string,
  titles: readonly { slug: string; title: string }[],
): LessonSetting {
  const company = inPlan.company.slug;
  const plan = inPlan.plan.slug;
  const planPath = interviewPlanPath(company, plan);
  // Without the person's lessons of the part (a read that did not carry them), the group's order alone.
  const lessons = inPlan.lessons.length ? inPlan.lessons : titles.map((lesson) => ({ ...lesson, done: false }));
  const next = nextInPartOf(lessons, slug);
  const title = next ? titles.find((lesson) => lesson.slug === next)?.title : undefined;
  return {
    crumbs: [
      { label: 'Interviews', href: INTERVIEWS_HOME_PATH },
      { label: `${inPlan.company.name} · ${inPlan.plan.name}`, href: planPath },
      {
        label: `Round ${inPlan.round.number} · ${inPlan.round.title}`,
        href: interviewRoundPath(company, plan, inPlan.round.number),
      },
      { label: inPlan.part.name },
    ],
    plan: `${company}/${plan}`,
    next: next
      ? { label: title ? `Next: ${title}` : 'Next lesson', href: interviewLessonPath(next, company, plan) }
      : {
          label: `${inPlan.part.name} is done. See what is next`,
          href: interviewNextPath(company, plan, inPlan.part.key),
        },
    lineOf: (held) => (next ? (held ? HELD_LINE : null) : lastOfPartLineOf(inPlan.part.name)),
    back: { label: 'Back to the plan', href: planPath },
    held: inPlan.held,
  };
}
