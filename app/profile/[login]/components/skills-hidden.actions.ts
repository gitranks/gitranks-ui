'use server';

import { revalidateTag } from 'next/cache';

import { skillsTag } from '@/lib/skills/paths';
import { setSkillsHidden } from '@/lib/skills/skills.data';
import type { SkillsHiddenResult, SkillsMine } from '@/lib/skills/skills.types';
import { viewerLogin } from '@/lib/workspace/contribute.data';

/**
 * Hides the signed-in person's own Skills page, or shows it to everyone again: always the session's own page, never
 * one named in the arguments. Everything cached under the page's tag (the page, its numbers) expires at once, so
 * other people get "not found", or the page again, on their next visit.
 */
export async function setSkillsHiddenAction(hidden: boolean): Promise<SkillsHiddenResult> {
  if (typeof hidden !== 'boolean') return { ok: false, error: 'FAILED' };
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { ok: false, error: 'SIGNED_OUT' };
  let mine: SkillsMine | null;
  try {
    mine = await setSkillsHidden(githubLogin, hidden);
  } catch {
    return { ok: false, error: 'FAILED' };
  }
  revalidateTag(skillsTag(githubLogin), { expire: 0 });
  return { ok: true, mine };
}
