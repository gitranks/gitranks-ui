import { CourseGoneView } from '@/components/learn/course/course-gone';
import { LEARN_MISSING_TEXT } from '@/lib/learn/course-gone';

/** A project with no course: a 404 that says so, naming nothing, with the way to all courses. */
export default function ProjectCourseNotFound() {
  return <CourseGoneView text={LEARN_MISSING_TEXT} state="missing" />;
}
