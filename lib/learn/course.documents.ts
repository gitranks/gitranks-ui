import { parse } from 'graphql';

import type {
  LearnCourse,
  LearnCourseCard,
  LearnCourseMineCard,
  LearnLessonFixesListed,
  LearnLessonListItem,
} from './course';
import type { LearnProject } from './paths';
import type DocumentNode from '@/types/typed-document-node';

/*
 * The reads and the write of all courses and a course: the courses, the lessons and a course as everyone reads them;
 * the signed-in person's side of all courses and their level; their rating of a course. A course's own side is read
 * with `LearnCourseMineDocument`, which a lesson's page shares.
 */

const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

const LINK = 'slug title';
/** A project course's project, as its card and its page name it. */
const PROJECT = 'project { name repo org language githubUrl onGitranks covers checkedAt }';
/** A course's card: a project course's carries its project; a course of the section Interviews, its section. */
export const COURSE_CARD_FIELDS = `slug name kind covers languages lessons numbers { learners goodShare } ${PROJECT} section`;
const CARD = COURSE_CARD_FIELDS;
/** A course whole, as everyone reads it: its groups name their repository and the group about contributing. */
const COURSE = `${CARD} numbers { issuesFixed } about
      groups { slug name repo contributing lessons { slug title level paused } }
      next { ${CARD} } checkOffered changedAt`;

/** Every live course, in the order the list shows them: the same for everyone. */
export const LearnCoursesDocument = doc<{ learnCourses: LearnCourseCard[] }>(
  `query LearnCourses { learnCourses { ${CARD} } }`,
);

/** Every live lesson of every course, paused ones included, for the search of all courses. */
export const LearnLessonsDocument = doc<{ learnLessons: LearnLessonListItem[] }>(
  `query LearnLessons { learnLessons { slug title level course { ${LINK} } group { ${LINK} } paused changedAt } }`,
);

/**
 * Which live lessons have a listed merged fix, for the sitemap alone: its own read, so the list of courses never asks for
 * it and keeps its own time.
 */
export const LearnLessonsFixesListedDocument = doc<{ learnLessons: LearnLessonFixesListed[] }>(
  'query LearnLessonsFixesListed { learnLessons { slug course { slug } paused fixesListed } }',
);

/** A course whole: the same for everyone. Null when it is not live, or not one of ours. */
export const LearnCourseDocument = doc<{ learnCourse: LearnCourse | null }, { slug: string }>(
  `query LearnCourse($slug: String!) {
    learnCourse(slug: $slug) { ${COURSE} }
  }`,
);

/** A project course by its project, exactly one of a repository and an organisation: whole, the same for everyone. */
export const LearnProjectCourseDocument = doc<{ learnProjectCourse: LearnCourse | null }, LearnProject>(
  `query LearnProjectCourse($repo: String, $org: String) {
    learnProjectCourse(repo: $repo, org: $org) { ${COURSE} }
  }`,
);

/** A project course's open issues to fix, alone: they change through the day, the course does not. */
export const LearnProjectOpenIssuesDocument = doc<
  { learnProjectCourse: { openIssues: number | null } | null },
  LearnProject
>(
  `query LearnProjectOpenIssues($repo: String, $org: String) {
    learnProjectCourse(repo: $repo, org: $org) { openIssues }
  }`,
);

/** The signed-in person's courses; null when Learn is not open to them. */
export const LearnCoursesMineDocument = doc<{ learnCoursesMine: LearnCourseMineCard[] | null }>(
  `query LearnCoursesMine {
    learnCoursesMine { course { ${CARD} } learned practised mastered known due next { ${LINK} } finishedAt }
  }`,
);

/** The signed-in person's level, from their setup or our guess of it; null when Learn is not open to them. */
export const LearnSetupLevelDocument = doc<{ learnSetupOfMine: { level: number | null } | null }>(
  'query LearnSetupLevel { learnSetupOfMine { level } }',
);

/** "Good" or "Not good" on a course the person finished. */
export const SendLearnCourseFeedbackDocument = doc<
  { sendLearnFeedback: boolean | null },
  { course: string; good: boolean }
>(
  'mutation SendLearnCourseFeedback($course: String!, $good: Boolean!) { sendLearnFeedback(course: $course, good: $good) }',
);
