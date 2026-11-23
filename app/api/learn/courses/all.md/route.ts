import { loadLearnCourses } from '@/lib/learn/course.data';
import { coursesMarkdownResponse } from '@/lib/learn/course-markdown-response';

/** The Markdown copy of all courses, for agents: the proxy answers `/learn/courses.md` from here. */
export async function GET() {
  return coursesMarkdownResponse(loadLearnCourses);
}
