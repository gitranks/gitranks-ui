import { doc, PROJECT_CARD } from './build.documents';
import type { BuildProjectCard } from './types';

/* What the doors into Build read: the projects that name a course, and the course of an issue's lesson. */

/** The projects that name a Learn course, in our order: the same for everyone. */
export const BuildCourseProjectsDocument = doc<{ buildCourseProjects: BuildProjectCard[] }, { course: string }>(
  `query BuildCourseProjects($course: String!) { buildCourseProjects(course: $course) { ${PROJECT_CARD} } }`,
);

/** The course a lesson belongs to: the same for everyone. */
export const BuildLessonCourseDocument = doc<{ learnLesson: { course: { slug: string } } | null }, { slug: string }>(
  'query BuildLessonCourse($slug: String!) { learnLesson(slug: $slug) { course { slug } } }',
);
