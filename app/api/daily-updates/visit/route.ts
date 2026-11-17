import { callDailyUpdates, json, notSignedIn, viewerOf } from '../api-call';
import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import type { DailyUpdatesVisitResult } from '@/types/daily-updates.types';

/** A signed-in visit: it keeps the visitor's daily updates on for 7 more days, or starts them again. */
export const POST = auth(async function POST(req: AuthRequest) {
  const viewer = viewerOf(req);
  if (!viewer) {
    return notSignedIn();
  }

  const answer = await callDailyUpdates<DailyUpdatesVisitResult>(viewer, '/daily-updates/visit', 'POST');
  return answer.ok ? json(answer.body) : json({ message: 'The visit was not counted' }, answer.status);
});
