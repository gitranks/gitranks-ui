import type { Route } from 'next';

import type { SkillsFix, SkillsFixes } from './skills.types';
import { dayWordsOf, type LinePart } from './skills-figures';
import { LEARN_FIXES_PAGE_BUILT } from '@/lib/learn/built-pages';
import { learnFixPath } from '@/lib/learn/paths';
import { prTimelinePath } from '@/lib/workspace/pr-timeline-path';
import type { LearnFixMade, LearnIssueLesson } from '@/lib/workspace/pull-request-page.types';

/*
 * "Fixes in real projects": where a fix's links lead, the words of its state and its lesson, and the line under the
 * heading. Pure, from the fixes alone.
 */

/** How many more fixes one press of the button adds. */
export const FIXES_PAGE = 20;

/**
 * Where a fix's title and "How it was made" lead. A fix made with Learn has its "Learn from it" view for its title, and
 * "How it was made" leads to the pull request's timeline; a fix made with Contribute has the timeline alone, so both
 * lead there. While the "Learn from it" view is not built, a Learn fix's title is plain text and "How it was made"
 * still leads to the timeline. While Learn is closed to the reader, a Learn fix is drawn as a plain fix, both leading
 * to the timeline. A fix whose page was hidden has no link to our pages: its GitHub links alone.
 */
export function fixLinksOf(
  fix: Pick<SkillsFix, 'repo' | 'number' | 'made' | 'page'>,
  { learnOpen = true }: { learnOpen?: boolean } = {},
): { title: Route | null; made: Route | null } {
  if (!fix.page) return { title: null, made: null };
  const pr = { nameWithOwner: fix.repo, number: fix.number };
  const timeline = prTimelinePath(pr);
  if (fix.made !== 'LEARN' || !learnOpen) return { title: timeline, made: timeline };
  return { title: LEARN_FIXES_PAGE_BUILT ? learnFixPath(pr) : null, made: timeline };
}

/** "merged 20 Nov" ("merged 20 Nov 2025" in another year than `now`'s), or "open, in review". */
export function fixStateWordsOf(fix: Pick<SkillsFix, 'state' | 'mergedAt'>, now: Date): string {
  if (fix.state !== 'MERGED') return 'open, in review';
  const day = dayWordsOf(fix.mergedAt, now);
  return day ? `merged ${day}` : 'merged';
}

/** The lesson a fix used, "Used …" once merged and "Uses …" while open; null for a fix with no lesson. */
export function fixLessonOf(
  fix: Pick<SkillsFix, 'state' | 'lesson'>,
): { verb: 'Used' | 'Uses'; lesson: LearnIssueLesson } | null {
  if (!fix.lesson) return null;
  return { verb: fix.state === 'MERGED' ? 'Used' : 'Uses', lesson: fix.lesson };
}

/** Whether each row says which product made it: only when both products made fixes. */
export const namesProduct = (made: readonly LearnFixMade[]) => made.includes('LEARN') && made.includes('CONTRIBUTE');

/** "with Learn", "with Contribute". */
export const MADE_WORDS: Record<LearnFixMade, string> = { LEARN: 'with Learn', CONTRIBUTE: 'with Contribute' };

/** The line under the heading, naming the products that made the fixes. */
export function fixesLineOf(made: readonly LearnFixMade[], login: string): LinePart[] {
  const learnOnly = made.length > 0 && made.every((one) => one === 'LEARN');
  if (learnOnly) {
    return [
      'Made with ',
      { product: 'LEARN' },
      `: an AI agent wrote each fix, and ${login} answered questions about it before it was sent.`,
    ];
  }
  const checked = `: an AI agent wrote each fix, and ${login} checked it before it was sent.`;
  if (namesProduct(made)) return ['Made with ', { product: 'CONTRIBUTE' }, ' or ', { product: 'LEARN' }, checked];
  return ['Made with ', { product: 'CONTRIBUTE' }, checked];
}

/** The button under the list: "Show 20 more", fewer when fewer are left; null when every fix is listed. */
export function moreFixesOf(fixes: Pick<SkillsFixes, 'rows' | 'total' | 'next'>): string | null {
  const left = fixes.total - fixes.rows.length;
  if (!fixes.next || left <= 0) return null;
  return `Show ${Math.min(FIXES_PAGE, left)} more`;
}

/**
 * The line under the list of the owner's own page while only they can see it, where the next fixes cannot be read:
 * how many more the numbers count. Null when every fix counted is listed.
 */
export function fixesLeftLineOf(counted: number, listed: number): string | null {
  const left = counted - listed;
  if (left <= 0) return null;
  return `And ${left} more, listed once your page is public.`;
}
