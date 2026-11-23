import 'server-only';

import { loadLearnCourse } from './course.data';
import { type CourseShareState, courseShareStateOf } from './course-share';
import { loadLearnAddress } from './lesson-page.data';

/** A course's state for its copy and its picture, from the same cached reads as its page (the course's tag). */
export const loadCourseShareState = (slug: string): Promise<CourseShareState> =>
  courseShareStateOf(slug, {
    course: loadLearnCourse,
    address: (asked) => loadLearnAddress('course', asked),
  });
