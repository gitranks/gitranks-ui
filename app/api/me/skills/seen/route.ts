import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { markSkillsSeen } from '@/lib/skills/skills.data';
import { SKILLS_SEEN_COOKIE, skillsSeenCookieOptions } from '@/lib/skills/skills-seen';

/**
 * The signed-in person opened their own Skills tab: its "New" mark goes. The API keeps it for someone with a GitRanks
 * row and never makes one; this browser keeps it in a cookie for everyone, so someone with no row loses the mark too.
 */
export const POST = auth(async function POST(req: AuthRequest) {
  const headers = { 'Cache-Control': 'private, no-store' };
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  if (!viewer) return NextResponse.json({ message: 'Not authenticated' }, { status: 401, headers });
  const marked = await markSkillsSeen(viewer);
  const response = NextResponse.json({ marked }, { headers });
  response.cookies.set(SKILLS_SEEN_COOKIE, '1', skillsSeenCookieOptions(process.env.NODE_ENV === 'production'));
  return response;
});
