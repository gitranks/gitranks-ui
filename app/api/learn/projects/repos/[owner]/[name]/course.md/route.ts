import { projectCourseMarkdownResponse } from '@/lib/learn/project-course-markdown';

/**
 * A repository's course as Markdown, for agents: the proxy answers `/learn/repos/<owner>/<name>.md` from here, since a
 * page and a route handler cannot share a segment.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<'/api/learn/projects/repos/[owner]/[name]/course.md'>,
) {
  const { owner, name } = await params;
  return projectCourseMarkdownResponse([owner, name]);
}
