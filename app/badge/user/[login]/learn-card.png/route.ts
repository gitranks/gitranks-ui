import type { NextRequest } from 'next/server';

import { drawLearnCard } from '@/lib/learn/public-progress/learn-card';
import { learnCardResponse } from '@/lib/learn/public-progress/learn-card-response';
import { loadPublicRecord } from '@/lib/learn/public-progress/public-progress.data';

/** The Learn progress card, with a developer's other images: the picture a link to their public progress page shows. */
export async function GET(req: NextRequest, { params }: RouteContext<'/badge/user/[login]/learn-card.png'>) {
  const { login } = await params;
  return learnCardResponse(login, req.nextUrl.searchParams.get('v'), loadPublicRecord, drawLearnCard);
}
