import type { NextRequest } from 'next/server';

import { lessonCardResponse } from '@/components/learn/share/lesson-card-response';
import { loadLessonShareState } from '@/lib/learn/lesson-share.data';

/** The picture a posted link to a lesson's fun fact (`?fact`) shows. */
export async function GET(req: NextRequest, { params }: RouteContext<'/learn/lessons/[slug]/fact.png'>) {
  const { slug } = await params;
  return lessonCardResponse('fact', slug, req.nextUrl.search, () => loadLessonShareState(slug));
}
