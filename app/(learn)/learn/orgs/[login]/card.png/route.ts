import type { NextRequest } from 'next/server';

import { courseCardResponse } from '@/components/learn/share/course-card-response';
import { loadProjectCourseShareState } from '@/lib/learn/course-share.data';
import { learnProjectRouteOfSegments } from '@/lib/learn/paths';

/** The picture a posted link to an organisation's course shows; not found for a project with no course. */
export async function GET(req: NextRequest, { params }: RouteContext<'/learn/orgs/[login]/card.png'>) {
  const route = learnProjectRouteOfSegments([(await params).login]);
  if (!route) return new Response('Not found\n', { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
  return courseCardResponse(route.slug, req.nextUrl.search, () => loadProjectCourseShareState(route));
}
