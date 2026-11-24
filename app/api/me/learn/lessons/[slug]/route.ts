import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { loadLearnLessonMine } from '@/lib/learn/lesson-page.data';
import { loadLearnMainLanguage } from '@/lib/learn/setup.data';

/**
 * The signed-in person's side of a lesson, read in the browser after the lesson's page is up: `{ mine, mainLanguage }`.
 * `mine` is null signed out (without asking the API), when Learn is not open to them, and on any failure;
 * `mainLanguage` is their setup's main language, the one every example opens in, read apart so it fails alone. Never
 * kept: an answer changes it.
 */
export const GET = auth(async function GET(req: AuthRequest, { params }) {
  const { slug } = (await params) as { slug: string };
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const [mine, mainLanguage] = viewer
    ? await Promise.all([loadLearnLessonMine(slug, viewer), loadLearnMainLanguage(viewer)])
    : [null, null];
  return NextResponse.json({ mine, mainLanguage }, { headers: { 'Cache-Control': 'private, no-store' } });
});
