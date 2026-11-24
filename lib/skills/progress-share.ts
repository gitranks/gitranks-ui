import { skillsPath } from './paths';
import type { SkillsState } from './skills.types';
import type { ProgressShare } from '@/lib/learn/progress/progress.types';

/**
 * Your progress' Share, from the owner's view of their Skills page: its link while everyone can see it, the way to it
 * while only they can, and "not yet" while nothing is on it. Null when the view could not be read: Share stays out.
 */
export function progressShareOf(login: string, mine: { state: SkillsState } | null | undefined): ProgressShare | null {
  if (!mine) return null;
  const path = skillsPath(login);
  switch (mine.state) {
    case 'PUBLIC':
      return { state: 'public', path };
    case 'HIDDEN':
      return { state: 'hidden', path };
    default:
      return { state: 'not-yet', path };
  }
}
