import { projectCourseMarkdownResponse } from '@/lib/learn/project-course-markdown';

/**
 * An organisation's course as Markdown, for agents: the proxy answers `/learn/orgs/<login>.md` from here, since a
 * page and a route handler cannot share a segment.
 */
export async function GET(_request: Request, { params }: RouteContext<'/api/learn/projects/orgs/[login]/course.md'>) {
  return projectCourseMarkdownResponse([(await params).login]);
}
