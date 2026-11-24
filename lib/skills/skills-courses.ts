import type { SkillsCourse, SkillsCourseKind, SkillsGroup, SkillsLesson } from './skills.types';
import { countOf, dayWordsOf } from './skills-figures';
import type { CourseSquare } from '@/lib/learn/course';
import type { LearnDepth } from '@/lib/learn/lesson-page';

/*
 * "Courses" on a Skills page: a course card's head, a group's count, the groups not started, a lesson's square and the
 * words its card and the legend give a depth. Pure, from the courses alone.
 */

/** A course's kind in words. */
export const COURSE_KIND_WORDS: Record<SkillsCourseKind, string> = {
  TOPIC: 'Topic course',
  LANGUAGE: 'Language course',
  REPOSITORY: 'Repository course',
  ORG: 'Org course',
};

/**
 * The counts under a course's name: "23 of 86 lessons learned · 6 practised · 1 mastered", or "All 62 lessons learned ·
 * 20 practised" once every lesson is learned. A part with nothing in it is left out.
 */
export function courseCountsOf(course: Pick<SkillsCourse, 'course' | 'learned' | 'practised' | 'mastered'>): string {
  const total = course.course.lessons;
  const learned =
    total === 1 && course.learned >= 1
      ? '1 lesson learned'
      : course.learned >= total
        ? `All ${countOf(total)} lessons learned`
        : `${countOf(course.learned)} of ${countOf(total)} ${total === 1 ? 'lesson' : 'lessons'} learned`;
  return [
    learned,
    ...(course.practised > 0 ? [`${countOf(course.practised)} practised`] : []),
    ...(course.mastered > 0 ? [`${countOf(course.mastered)} mastered`] : []),
  ].join(' · ');
}

/** "Finished on 12 Nov" ("Finished on 12 Nov 2025" in another year than `now`'s) for a course whose every shown lesson is learned; null otherwise. */
export function finishedWordsOf(course: Pick<SkillsCourse, 'finishedAt'>, now: Date): string | null {
  const day = dayWordsOf(course.finishedAt, now);
  return day ? `Finished on ${day}` : null;
}

/** A group's count: "all 8", or "7 of 12". */
export function groupCountOf(group: Pick<SkillsGroup, 'learned' | 'lessons'>): string {
  const total = group.lessons.length;
  return group.learned >= total ? `all ${countOf(total)}` : `${countOf(group.learned)} of ${countOf(total)}`;
}

/** "Not started: Linked lists, Trees, Graphs."; null when every group is started. */
export const notStartedLineOf = (names: readonly string[]) =>
  names.length ? `Not started: ${names.join(', ')}.` : null;

const SQUARE_KIND: Record<LearnDepth, CourseSquare['kind']> = {
  NONE: 'none',
  LEARNED: 'learned',
  PRACTISED: 'practised',
  MASTERED: 'mastered',
};

/** A lesson's square, in the course page's colours: its depth alone, never due here. */
export const squareOf = (lesson: Pick<SkillsLesson, 'depth'>): CourseSquare => ({
  kind: SQUARE_KIND[lesson.depth],
  due: false,
});

/** What each depth means, as the legend and a square's card say it. */
export const DEPTH_WORDS: Record<LearnDepth, string> = {
  NONE: 'Not learned yet',
  LEARNED: 'Learned: answered the lesson’s question',
  PRACTISED: 'Practised: right again, days later',
  MASTERED: 'Mastered: right again 10 days after that, or used in a merged fix',
};

/** The star's meaning. */
export const STAR_WORDS = 'A merged fix used this lesson';

/** A square's name for a screen reader: "Hash maps: practised", "…: mastered, used in a merged fix". */
export function squareLabelOf(lesson: Pick<SkillsLesson, 'title' | 'depth' | 'fix'>): string {
  const depth = lesson.depth === 'NONE' ? 'not learned' : lesson.depth.toLowerCase();
  return `${lesson.title}: ${depth}${lesson.fix ? ', used in a merged fix' : ''}`;
}

/** Whether any shown lesson carries the star: the legend names the star only then. */
export const hasStar = (courses: readonly Pick<SkillsCourse, 'groups'>[]) =>
  courses.some((course) => course.groups.some((group) => group.lessons.some((lesson) => lesson.fix)));
