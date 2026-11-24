import 'server-only';

import { loadLearnCourse, loadLearnProjectCourse } from './course.data';
import { type CourseShareState, courseShareStateOf, projectCourseShareStateOf } from './course-share';
import { loadLearnAddress } from './lesson-page.data';
import { type LearnProjectRoute, projectOfRoute } from './paths';

/** A course's state for its copy and its picture, from the same cached reads as its page (the course's tag). */
export const loadCourseShareState = (slug: string): Promise<CourseShareState> =>
  courseShareStateOf(slug, {
    course: loadLearnCourse,
    address: (asked) => loadLearnAddress('course', asked),
  });

/** A project course's state for its copy and its picture, by its project, from the same cached reads as its page. */
export const loadProjectCourseShareState = (route: LearnProjectRoute): Promise<CourseShareState> => {
  const asked = { ...route, slug: route.slug.toLowerCase() };
  return projectCourseShareStateOf(asked, {
    course: (at) => loadLearnProjectCourse(projectOfRoute(at)),
    address: (at) => loadLearnAddress(at.kind, at.slug),
  });
};
