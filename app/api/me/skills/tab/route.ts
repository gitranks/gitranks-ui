import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { loadSkillsTab } from '@/lib/skills/skills.data';
import type { SkillsTabAnswer } from '@/lib/skills/skills.types';
import { SKILLS_SEEN_COOKIE, tabNewOf } from '@/lib/skills/skills-seen';

/**
 * Whether the signed-in person's own Skills tab carries "New": until they first open it, in this browser too. False
 * without a session (the API is not asked) and when it cannot be read. Never kept.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const headers = { 'Cache-Control': 'private, no-store' };
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const tab = viewer ? await loadSkillsTab(viewer) : null;
  const seen = req.cookies.get(SKILLS_SEEN_COOKIE)?.value;
  return NextResponse.json({ tabNew: tabNewOf(tab?.tabNew === true, seen) } satisfies SkillsTabAnswer, { headers });
});
