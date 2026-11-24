import { NextResponse } from 'next/server';

import { fetchLearnForVisitors } from '@/app/components/landing/landing-data';
import { loadSkillsBrief } from '@/lib/skills/skills.data';
import type { SkillsBriefAnswer } from '@/lib/skills/skills.types';
import { isGithubLogin } from '@/utils/profile-refresh';

/** The same answer for everyone, kept a minute in the browser; the read itself is kept fifteen minutes. */
const KEPT = { 'Cache-Control': 'public, max-age=60' };
const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * A person's Skills numbers, for the profile's Skills tab and block: read signed out, so every reader gets the same
 * answer. `{ brief: null }` without a public page, for anything that is not a login, and on a failure, which is never
 * kept. `learnOpen` says whether Learn is open to everyone: the parts leave out Learn's words until it is.
 */
export async function GET(_request: Request, { params }: RouteContext<'/api/skills/[login]'>) {
  const { login } = await params;
  if (!isGithubLogin(login)) {
    return NextResponse.json({ brief: null, learnOpen: false } satisfies SkillsBriefAnswer, { headers: KEPT });
  }
  const [brief, learnOpen] = await Promise.all([loadSkillsBrief(login), fetchLearnForVisitors()]);
  return NextResponse.json({ brief: brief.value, learnOpen } satisfies SkillsBriefAnswer, {
    headers: brief.failed ? NO_STORE : KEPT,
  });
}
