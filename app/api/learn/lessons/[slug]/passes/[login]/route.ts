import { NextResponse } from 'next/server';

import { resultFactsOf } from '@/lib/learn/lesson-public';
import { readLessonResult } from '@/lib/learn/lesson-public.data';

/** Never kept: a take-down must reach the address at once. */
const HEADERS = { 'Cache-Control': 'no-store' };

/** The site's own address, for the absolute links in the answer. */
const originOf = (request: Request) => process.env.NEXT_PUBLIC_URI || new URL(request.url).origin;

/**
 * `/learn/lessons/<slug>/passes/<login>.json` (the proxy rewrites it here): the facts of a result page as JSON, from
 * the same read. A login with no public passed run, or a hidden lesson, answers 404; a lesson its author removed, 410.
 */
export async function GET(request: Request, { params }: RouteContext<'/api/learn/lessons/[slug]/passes/[login]'>) {
  const { slug, login } = await params;
  let answer: Awaited<ReturnType<typeof readLessonResult>>;
  try {
    answer = await readLessonResult(slug, login);
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: HEADERS });
  }
  if (answer?.kind === 'found')
    return NextResponse.json(resultFactsOf(answer.value, originOf(request)), { headers: HEADERS });
  if (answer?.visibility === 'REMOVED') {
    return NextResponse.json({ error: 'removed by its author' }, { status: 410, headers: HEADERS });
  }
  return NextResponse.json({ error: 'not found' }, { status: 404, headers: HEADERS });
}
