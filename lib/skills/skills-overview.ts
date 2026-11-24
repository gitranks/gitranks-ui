import type { SkillsBriefAnswer, SkillsMine, SkillsNumbers, SkillsState } from './skills.types';
import type { LearnQueueTopRow } from '@/lib/learn/learn-queue-top';

/*
 * The Skills block on a profile's overview, the owner's box above it, and what the owner's view adds to both. Pure:
 * the overview decides from these alone.
 */

/** Which products the owner uses: what the box on their profile follows. */
export type SkillsSides = Pick<SkillsMine, 'usesContribute' | 'usesLearn'>;

/** The owner's view as their profile's overview reads it: where the page stands and its numbers alone. */
export type SkillsOverviewMine = SkillsSides & {
  state: SkillsState;
  page: { login: string; numbers: SkillsNumbers } | null;
};

/** The owner's own block, for a page only they see: its numbers and its state. */
export type SkillsOwnBlock = { numbers: SkillsNumbers; state: 'HIDDEN' };

/**
 * What the owner's own profile overview reads of Skills (`GET /api/me/skills/profile?login=`): which products they
 * use (null when it cannot be read, or for anyone else), their own block, and the top of their Learn list when that
 * is what their box shows.
 */
export type SkillsProfileAnswer = {
  sides: SkillsSides | null;
  block: SkillsOwnBlock | null;
  learnRows: LearnQueueTopRow[] | null;
};

/** The answer for anyone but the owner, and when nothing can be read. */
export const NO_SKILLS_PROFILE: SkillsProfileAnswer = { sides: null, block: null, learnRows: null };

/**
 * What the owner's box holds, by the products they use: `neither` (issues picked for them, with a way into each
 * product), `learns` (the top of their own Learn list), `contributes` (Contribute's own box, for someone who
 * contributes or uses both). Their sides unread: Contribute's own box.
 */
export type OwnerBoxCase = 'neither' | 'learns' | 'contributes';

export function ownerBoxCaseOf(sides: SkillsSides | null): OwnerBoxCase {
  if (!sides || sides.usesContribute) return 'contributes';
  return sides.usesLearn ? 'learns' : 'neither';
}

/** The block as drawn: its numbers, and the owner's state for a page only they see. */
export type OverviewBlock = { numbers: SkillsNumbers; ownState: SkillsState | null };

/**
 * The owner's own block: only for a page they alone see (`HIDDEN`) that has numbers.
 * On a page everyone sees, the owner reads the public block like everyone else.
 */
export function ownBlockOf(mine: SkillsOverviewMine | null): SkillsOwnBlock | null {
  if (!mine?.page || mine.state !== 'HIDDEN') return null;
  return { numbers: mine.page.numbers, state: mine.state };
}

/**
 * The block for a reader: the owner's own one when their page is theirs alone, else the public numbers everyone gets.
 * Null, no block, before either answer or without a page.
 */
export function overviewBlockOf(brief: SkillsBriefAnswer | null, own: SkillsOwnBlock | null): OverviewBlock | null {
  if (own) return { numbers: own.numbers, ownState: own.state };
  if (brief?.brief) return { numbers: brief.brief.numbers, ownState: null };
  return null;
}
