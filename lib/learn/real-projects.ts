import { languageNameOf } from './learn-question';
import { myWalkthroughsOf } from './my-progress-fixes';
import { LEARN_MY_WALKTHROUGHS_MINE_PATH } from './paths';

/*
 * A lesson in real projects (page 53): the lesson's open issues and the merged fixes that used it, two groups always in
 * this order. A group with nothing in it says so in its own place, so the other never moves up.
 */

/** The sentence under the title. */
export const REAL_PROJECTS_SENTENCE =
  'Open issues in real open-source projects that this lesson helps you fix, and merged fixes that used it.';

/** The visible title: "Find duplicates in one pass with a set: in real projects". */
export const realProjectsTitleOf = (name: string): string => `${name}: in real projects`;

/** The words of a course's view, which has the same top and the same groups as a lesson's. */
export const REAL_PROJECTS_COURSE_SENTENCE =
  'Open issues in real open-source projects that this course helps you fix, and merged fixes that used its lessons.';

/** The words of the top and the two ends, for a lesson's view or a course's. */
export function realProjectsWordsOf(of: 'lesson' | 'course') {
  return of === 'lesson'
    ? { back: '← The lesson', sentence: REAL_PROJECTS_SENTENCE, openNone: OPEN_NONE, fixedNone: FIXED_NONE }
    : {
        back: '← The course',
        sentence: REAL_PROJECTS_COURSE_SENTENCE,
        openNone: OPEN_NONE_COURSE,
        fixedNone: FIXED_NONE_COURSE,
      };
}

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

/** A course's dashed boxes, in the same places. */
export const OPEN_NONE_COURSE = {
  title: 'No open issue needs this course right now',
  text: OPEN_NONE.text,
} as const;

export const FIXED_NONE_COURSE = {
  title: FIXED_NONE.title,
  text: 'When someone fixes a real issue with a lesson of this course and the fix is merged, it shows here.',
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

/** A fix's language as a person reads it ("Go", "JavaScript"); null when not known, and then left out of the row. */
export const fixLanguageWordsOf = (fix: { language?: string | null }): string | null =>
  typeof fix.language === 'string' && fix.language ? languageNameOf(fix.language) : null;

/** A pull request's key, as the "Passed" marks are matched: `owner/name#number`. */
export const fixKeyOf = (fix: { repo: string; number: number }): string => `${fix.repo}#${fix.number}`;

/**
 * The pull requests whose walkthrough the signed-in person passed, from their route, for the "Passed" marks; null on
 * any failure and when signed out, and then no mark is drawn.
 */
export async function readPassedFixes(): Promise<ReadonlySet<string> | null> {
  try {
    const res = await fetch(LEARN_MY_WALKTHROUGHS_MINE_PATH, { cache: 'no-store' });
    if (!res.ok) return null;
    const { walkthroughs } = (await res.json()) as { walkthroughs?: unknown };
    const rows = myWalkthroughsOf(walkthroughs);
    return rows ? new Set(rows.map(fixKeyOf)) : null;
  } catch {
    return null;
  }
}
