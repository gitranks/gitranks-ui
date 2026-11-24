import 'server-only';

import { loadSkillsBrief } from './skills.data';
import type { SkillsBrief } from './skills.types';

/** What a Skills picture is drawn from: the public numbers (null without a public page). */
export type SkillsCardRead = { brief: SkillsBrief | null; failed: boolean };

/** A Skills picture's read: the brief, kept under the person's tag (`skills:<login>`). A cached read that catches inside, so this never throws. */
export async function loadSkillsCard(login: string): Promise<SkillsCardRead> {
  const brief = await loadSkillsBrief(login);
  return { brief: brief.value, failed: brief.failed };
}
