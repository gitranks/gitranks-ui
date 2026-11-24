import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { loadLearnQueueTop } from '@/lib/learn/learn-queue-top.data';
import { NO_SKILLS_PROFILE, ownBlockOf, ownerBoxCaseOf, type SkillsProfileAnswer } from '@/lib/skills/skills-overview';
import { loadSkillsOverview } from '@/lib/skills/skills-overview.data';
import { isProfileOwner } from '@/utils/profile-owner';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

/**
 * What the signed-in owner's own profile overview shows them of Skills (`?login=`): which products they use, their
 * own block when their page is theirs alone, and the top of their Learn list when that is what their box holds. The
 * same empty answer for anyone else, without asking the API, and when the view cannot be read. Never kept.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  if (!viewer || !isProfileOwner(viewer, req.nextUrl.searchParams.get('login'))) {
    return NextResponse.json(NO_SKILLS_PROFILE, { headers: NO_STORE });
  }
  const mine = await loadSkillsOverview(viewer);
  if (!mine) return NextResponse.json(NO_SKILLS_PROFILE, { headers: NO_STORE });
  const sides = { usesContribute: mine.usesContribute, usesLearn: mine.usesLearn };
  const learnRows = ownerBoxCaseOf(sides) === 'learns' ? await loadLearnQueueTop(viewer) : null;
  return NextResponse.json({ sides, block: ownBlockOf(mine), learnRows } satisfies SkillsProfileAnswer, {
    headers: NO_STORE,
  });
});
