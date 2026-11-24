import { NextResponse } from 'next/server';

import { loadSkillsFixes } from '@/lib/skills/skills.data';
import type { SkillsFixesAnswer } from '@/lib/skills/skills.types';
import { isGithubLogin } from '@/utils/profile-refresh';

const KEPT = { 'Cache-Control': 'public, max-age=60' };
const NO_STORE = { 'Cache-Control': 'no-store' };

/** A cursor as the API writes one: short, and plain characters only. */
const CURSOR = /^[\w=+/-]{1,200}$/;

/**
 * The next fixes of a person's public page, for "Show 20 more": read signed out, the same for everyone. `{ fixes: null }`
 * without a public page, for a login or a cursor that cannot be one, and on a failure, which is never kept.
 */
export async function GET(request: Request, { params }: RouteContext<'/api/skills/[login]/fixes'>) {
  const { login } = await params;
  const after = new URL(request.url).searchParams.get('after');
  if (!isGithubLogin(login) || !after || !CURSOR.test(after)) {
    return NextResponse.json({ fixes: null } satisfies SkillsFixesAnswer, { headers: NO_STORE });
  }
  const fixes = await loadSkillsFixes(login, after);
  return NextResponse.json({ fixes: fixes.value } satisfies SkillsFixesAnswer, {
    headers: fixes.failed ? NO_STORE : KEPT,
  });
}
