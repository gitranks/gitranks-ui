import { courseMarkdownResponse } from '@/lib/learn/course-markdown-response';
import { loadCourseShareState } from '@/lib/learn/course-share.data';

/**
 * A course's Markdown copy, for agents: the proxy answers `/learn/courses/<slug>.md` from here, since a page and a
 * route handler cannot share the `[slug]` segment.
 */
export async function GET(_request: Request, { params }: RouteContext<'/api/learn/courses/[slug]/course.md'>) {
  const { slug } = await params;
  return courseMarkdownResponse(slug, () => loadCourseShareState(slug));
}
