import 'server-only';

import { loadLearnProjectOpenIssues } from './course.data';
import { courseMarkdownResponse } from './course-markdown-response';
import { loadProjectCourseShareState } from './course-share.data';
import { learnProjectRouteOfSegments, projectOfRoute } from './paths';

/**
 * A project course's Markdown copy by its address's segments (`owner`, `name`, or `login`): the course's copy with its
 * project's lines, following the page's own gate; not found for segments that name no GitHub project.
 */
export async function projectCourseMarkdownResponse(segments: readonly string[]): Promise<Response> {
  const route = learnProjectRouteOfSegments(segments);
  if (!route) {
    return new Response('Not found\n', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'private, no-store' },
    });
  }
  return courseMarkdownResponse(route.slug, () => loadProjectCourseShareState(route), {
    asked: 'project',
    openIssues: () => loadLearnProjectOpenIssues(projectOfRoute(route)),
  });
}
