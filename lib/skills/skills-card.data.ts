import 'server-only';

import { loadSkillsBrief } from './skills.data';
import type { SkillsBrief } from './skills.types';
import { fetchLearnForVisitors } from '@/app/components/landing/landing-data';

/** What a Skills picture is drawn from: the public numbers (null without a public page) and the switch. */
export type SkillsCardRead = { brief: SkillsBrief | null; failed: boolean; learnOpen: boolean };

/**
 * A Skills picture's read: the brief, kept under the person's tag (`skills:<login>`), and whether Learn is open to
 * everyone. Both are cached reads that catch inside, so this never throws.
 */
export async function loadSkillsCard(login: string): Promise<SkillsCardRead> {
  const [brief, learnOpen] = await Promise.all([loadSkillsBrief(login), fetchLearnForVisitors()]);
  return { brief: brief.value, failed: brief.failed, learnOpen };
}
