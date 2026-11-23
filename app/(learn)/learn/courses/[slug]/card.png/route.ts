import type { NextRequest } from 'next/server';

import { courseCardResponse } from '@/components/learn/share/course-card-response';
import { loadCourseShareState } from '@/lib/learn/course-share.data';

/** The picture a posted link to a course shows. */
export async function GET(req: NextRequest, { params }: RouteContext<'/learn/courses/[slug]/card.png'>) {
  const { slug } = await params;
  return courseCardResponse(slug, req.nextUrl.search, () => loadCourseShareState(slug));
}
