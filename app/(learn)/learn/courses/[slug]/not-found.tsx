import { CourseGoneView } from '@/components/learn/course/course-gone';
import { LEARN_MISSING_TEXT } from '@/lib/learn/course-gone';

/** An unknown course, or a draft: a 404 that says so, naming nothing, with the way to all courses (page 33). */
export default function CourseNotFound() {
  return <CourseGoneView text={LEARN_MISSING_TEXT} state="missing" />;
}
