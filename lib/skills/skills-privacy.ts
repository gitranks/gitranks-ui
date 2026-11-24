import type { SkillsMine } from './skills.types';

/*
 * The Settings row "Your Skills page": who can see it, and the choice between everyone and only its owner, the same
 * switch as the strip on the page. Pure, from the owner's view alone.
 */

/** The row: its line, and the choice when there is one (`hidden` is the choice made now). */
export type PrivacyRow = { line: string; choice: { hidden: boolean } | null };

/**
 * The row by the page's state: a choice on a page with something on it; while nothing is on it, the row says so with
 * no choice. Null when the view could not be read.
 */
export function privacyRowOf(mine: Pick<SkillsMine, 'state'> | null | undefined): PrivacyRow | null {
  if (!mine) return null;
  switch (mine.state) {
    case 'PUBLIC':
      return { line: 'Everyone can see it.', choice: { hidden: false } };
    case 'HIDDEN':
      return { line: 'Only you can see it.', choice: { hidden: true } };
    // An older API may still answer `PRIVATE`: worded as `HIDDEN`, with no switch, as that API keeps it so.
    case 'PRIVATE':
      return { line: 'Only you can see it.', choice: null };
    default:
      return {
        line: 'Nothing is on it yet. It shows to everyone from your first pull request sent or lesson learned.',
        choice: null,
      };
  }
}

/** The row's line when the view could not be read. */
export const PRIVACY_UNREAD_LINE = 'Who can see it could not be read. Try again later.';
