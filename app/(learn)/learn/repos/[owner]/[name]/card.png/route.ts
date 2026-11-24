import type { NextRequest } from 'next/server';

import { courseCardResponse } from '@/components/learn/share/course-card-response';
import { loadProjectCourseShareState } from '@/lib/learn/course-share.data';
import { learnProjectRouteOfSegments } from '@/lib/learn/paths';

/** The picture a posted link to a repository's course shows; not found for a project with no course. */
export async function GET(req: NextRequest, { params }: RouteContext<'/learn/repos/[owner]/[name]/card.png'>) {
  const { owner, name } = await params;
  const route = learnProjectRouteOfSegments([owner, name]);
  if (!route) return new Response('Not found\n', { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
  return courseCardResponse(route.slug, req.nextUrl.search, () => loadProjectCourseShareState(route));
}
