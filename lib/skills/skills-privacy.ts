import type { SkillsMine } from './skills.types';

/*
 * The Settings row "Your Skills page": who can see it, and the choice between everyone and only its owner, the same
 * switch as the strip on the page. Pure, from the owner's view alone.
 */

/** The row: its line, and the choice when there is one (`hidden` is the choice made now). */
export type PrivacyRow = { line: string; choice: { hidden: boolean } | null };

/**
 * The row by the page's state: a choice on a page with something on it; while nothing is on it, or while only its
 * owner may see it (what it shows is all of GitRanks Learn, not open to everyone yet), the row says so with no choice.
 * Null when the view could not be read.
 */
export function privacyRowOf(mine: Pick<SkillsMine, 'state' | 'learnOpen'> | null | undefined): PrivacyRow | null {
  if (!mine) return null;
  switch (mine.state) {
    case 'PUBLIC':
      return { line: 'Everyone can see it.', choice: { hidden: false } };
    case 'HIDDEN':
      return { line: 'Only you can see it.', choice: { hidden: true } };
    case 'PRIVATE':
      return {
        line: 'Only you can see it for now: what it shows is from GitRanks Learn, which is not open to everyone yet.',
        choice: null,
      };
    default:
      return {
        line: mine.learnOpen
          ? 'Nothing is on it yet. It shows to everyone from your first pull request sent or lesson learned.'
          : 'Nothing is on it yet. It shows to everyone from your first pull request sent.',
        choice: null,
      };
  }
}

/** The row's line when the view could not be read. */
export const PRIVACY_UNREAD_LINE = 'Who can see it could not be read. Try again later.';
