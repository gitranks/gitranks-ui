import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { loadLearnSign } from '@/lib/learn/learn-sign.data';
import { loadLearnLessonMine } from '@/lib/learn/lesson-page.data';
import { MAIN_LANGUAGE_QUERY } from '@/lib/learn/paths';
import { loadLearnMainLanguage } from '@/lib/learn/setup.data';

/**
 * The signed-in person's side of a lesson, read in the browser after the lesson's page is up: `{ mine, mainLanguage }`.
 * `mine` is null signed out (without asking the API), when Learn is not open to them, and on any failure.
 * `mainLanguage` is their setup's main language, the one every example opens in: read only on the lesson's page's ask
 * (`?main=1`) and only when their side came, apart so it fails alone; null otherwise. `learnOnboarded` is the Learn
 * sign, read beside their side so it fails alone: true or false, null signed out and when it cannot be read; the page
 * then keeps its buttons as before the sign and replays nothing. Never kept: an answer changes it.
 */
export const GET = auth(async function GET(req: AuthRequest, { params }) {
  const { slug } = (await params) as { slug: string };
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const [mine, learnOnboarded] = viewer
    ? await Promise.all([loadLearnLessonMine(slug, viewer), loadLearnSign(viewer)])
    : [null, null];
  const askMain = req.nextUrl.searchParams.get(MAIN_LANGUAGE_QUERY) === '1';
  const mainLanguage = viewer && mine && askMain ? await loadLearnMainLanguage(viewer) : null;
  return NextResponse.json(
    { mine, mainLanguage, learnOnboarded },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
});
