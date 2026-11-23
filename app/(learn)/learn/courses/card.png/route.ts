import type { NextRequest } from 'next/server';

import { coursesCardResponse } from '@/components/learn/share/course-card-response';
import { loadLearnCourses } from '@/lib/learn/course.data';

/** The picture a posted link to all courses shows. */
export async function GET(req: NextRequest) {
  return coursesCardResponse(req.nextUrl.search, loadLearnCourses);
}
