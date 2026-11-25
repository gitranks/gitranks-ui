/*
 * A lesson in real projects (page 53): the lesson's open issues and the merged fixes that used it, two groups always in
 * this order. A group with nothing in it says so in its own place, so the other never moves up.
 */

/** The sentence under the title. */
export const REAL_PROJECTS_SENTENCE =
  'Open issues in real open-source projects that this lesson helps you fix, and merged fixes that used it.';

/** The visible title: "Find duplicates in one pass with a set: in real projects". */
export const realProjectsTitleOf = (name: string): string => `${name}: in real projects`;

/** The two groups' names. */
export const REAL_PROJECTS_GROUPS = { open: 'Open', fixed: 'Fixed' } as const;

/** The dashed box in the place of the open issues when the lesson has none at all. */
export const OPEN_NONE = {
  title: 'No open issue needs this lesson right now',
  text: 'New issues come in every day.',
} as const;

/** The dashed box in the place of the fixes when none is merged yet. */
export const FIXED_NONE = {
  title: 'No fix yet',
  text: 'When someone fixes a real issue with this lesson and the fix is merged, it shows here.',
} as const;

/** How many fixes the group shows at a time. */
export const FIXES_PAGE = 10;

/** What the page reads to choose its ends: the person's own rows (null for a visitor), the shared rows, the fixes. */
export type RealProjectsRead = { own: number | null; shared: number; fixes: number };

/**
 * What each group draws:
 * - `open`: `rows`; `none` (the dashed box: no open issue for the lesson at all); `narrowed` (the person's own view
 *   has none while the shared list has some: the list's own ends, with the switch that would show something);
 * - `fixed`: `rows` or `none`.
 * `made` is false when the lesson has neither an open issue in the shared list nor a merged fix: no page then.
 */
export type RealProjectsEnds = { made: boolean; open: 'rows' | 'none' | 'narrowed'; fixed: 'rows' | 'none' };

export function realProjectsEndsOf({ own, shared, fixes }: RealProjectsRead): RealProjectsEnds {
  const made = shared > 0 || fixes > 0;
  const mine = own ?? shared;
  const open = mine > 0 ? 'rows' : shared > 0 ? 'narrowed' : 'none';
  return { made, open, fixed: fixes > 0 ? 'rows' : 'none' };
}

/**
 * The count under the fixes, as the list of fixes words it: "Showing 10 of 23 fixes", then "23 fixes" once all show.
 * Only when there are more than ten; with ten or fewer no count shows.
 */
export function fixesCountLineOf(shown: number, total: number): string | null {
  const all = Math.max(total, shown);
  if (all <= FIXES_PAGE) return null;
  return shown < all ? `Showing ${shown} of ${all} fixes` : `${all} fixes`;
}

/** "Show 10 more", "Show 3 more": how many the next press adds, at most ten; null when all are shown. */
export function showMoreOf(shown: number, total: number): string | null {
  const left = total - shown;
  return left > 0 ? `Show ${Math.min(FIXES_PAGE, left)} more` : null;
}
