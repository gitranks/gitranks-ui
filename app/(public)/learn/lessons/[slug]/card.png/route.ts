import type { NextRequest } from 'next/server';

import { lessonCardResponse } from '@/components/learn/share/lesson-card-response';
import { loadLessonShareState } from '@/lib/learn/lesson-share.data';

/** The picture a posted link to a lesson shows. */
export async function GET(req: NextRequest, { params }: RouteContext<'/learn/lessons/[slug]/card.png'>) {
  const { slug } = await params;
  return lessonCardResponse('lesson', slug, req.nextUrl.search, () => loadLessonShareState(slug));
}
