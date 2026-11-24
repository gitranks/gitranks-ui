import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { loadSkillsMine } from '@/lib/skills/skills.data';
import type { SkillsMineAnswer } from '@/lib/skills/skills.types';
import { SKILLS_SEEN_COOKIE, tabNewOf } from '@/lib/skills/skills-seen';

/**
 * The signed-in person's own Skills page and where it stands, read in the browser once their page is up. The tab's
 * "New" holds only while this browser has not opened the tab. `{ mine: null, signedOut: true }` without a session (the
 * API is not asked); `{ mine: null }` when it cannot be read. Never kept.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const headers = { 'Cache-Control': 'private, no-store' };
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  if (!viewer) return NextResponse.json({ mine: null, signedOut: true } satisfies SkillsMineAnswer, { headers });
  const mine = await loadSkillsMine(viewer);
  const seen = req.cookies.get(SKILLS_SEEN_COOKIE)?.value;
  return NextResponse.json(
    {
      mine: mine ? { ...mine, tabNew: tabNewOf(mine.tabNew, seen) } : null,
      signedOut: false,
    } satisfies SkillsMineAnswer,
    { headers },
  );
});
