import type { NextRequest } from 'next/server';

import { loadLearnCourses } from '@/lib/learn/course.data';
import { coursesCardResponse } from '@/lib/learn/course-card';

/** The picture a posted link to all courses shows. */
export async function GET(req: NextRequest) {
  return coursesCardResponse(req.nextUrl.search, loadLearnCourses);
}
