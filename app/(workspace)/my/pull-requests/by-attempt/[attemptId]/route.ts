import { NextResponse } from 'next/server';

import { byAttemptTargetOf } from '@/lib/workspace/by-attempt';
import { loadAttemptRef } from '@/lib/workspace/contribute.data';

/**
 * One attempt's page by its id alone, for the links that know only the id (a list's row, an email, an agent): finds
 * the attempt and sends the browser on to its page, the query kept. A visitor, or an id that is not the viewer's, goes
 * to the attempt's page, which asks for the sign-in or answers the 404. Never kept by a cache: it answers per viewer.
 */
export async function GET(request: Request, { params }: RouteContext<'/my/pull-requests/by-attempt/[attemptId]'>) {
  const { attemptId } = await params;
  const url = new URL(request.url);
  const target = byAttemptTargetOf(attemptId, await loadAttemptRef(attemptId), url.searchParams);
  const response = NextResponse.redirect(new URL(target, url), 307);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
