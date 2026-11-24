import type { Route } from 'next';

import type { SkillsMine, SkillsNumbers, SkillsState } from './skills.types';
import { countOf } from './skills-figures';
import { LEARN_HOME_PATH, LEARN_PROGRESS_PATH } from '@/lib/learn/paths';
import { ABOUT_PATH, WORKSPACE_PATHS } from '@/lib/workspace/paths';
import type { LearnFixMade } from '@/lib/workspace/pull-request-page.types';

/*
 * What the owner of a Skills page sees of it, by its state: the strip at the top, the page for someone with nothing on
 * it yet, the box about the other product at the end, and the block's line on the overview. Pure, from the owner's
 * view alone.
 */

/** A strip's action: copy the page's link, hide the page, show it again. */
export type StripAction = 'copy' | 'hide' | 'show';

/** The strip: who can see the page, in two parts (the first in bold), its buttons, and the way to Learn's progress. */
export type StripWords = {
  strong: string;
  rest: string;
  actions: StripAction[];
  progress: Route | null;
};

/** The strip at the top of the owner's own page, in every state; Learn's progress for someone who learns. */
export function stripOf(mine: Pick<SkillsMine, 'state' | 'usesLearn'>): StripWords {
  const progress = mine.usesLearn ? LEARN_PROGRESS_PATH : null;
  switch (mine.state) {
    case 'PUBLIC':
      return { strong: 'Everyone can see this page.', rest: '', actions: ['copy', 'hide'], progress };
    case 'HIDDEN':
    // An older API may still answer `PRIVATE`: drawn as `HIDDEN`.
    case 'PRIVATE':
      return { strong: 'Only you can see this page.', rest: '', actions: ['show'], progress };
    default:
      return {
        strong: 'Only you can see this page',
        rest: ', until you send a pull request or learn a lesson.',
        actions: [],
        progress: null,
      };
  }
}

/** A product's box: its promotion, or the step that puts the first thing on the page; "Only you see this" at the end. */
export type ProductBox = { product: LearnFixMade; mode: 'promo' | 'step'; onlyYou: boolean };

/** The page for someone with nothing on it yet: its heading and line, whether the list's numbers show, its boxes. */
export type StartWords = { heading: string; line: string; numbers: boolean; boxes: ProductBox[] };

/**
 * `NEW` (uses neither product) and `NOTHING_YET` (uses one or both, nothing to show): the heading, the line, the box
 * about our list of issues on `NEW` alone, then one box for each product, a step for a product the person uses. Null
 * for a page with something on it.
 */
export function startOf(mine: Pick<SkillsMine, 'state' | 'usesContribute' | 'usesLearn'>): StartWords | null {
  if (mine.state !== 'NEW' && mine.state !== 'NOTHING_YET') return null;
  const boxes: ProductBox[] = [
    {
      product: 'CONTRIBUTE',
      mode: mine.state === 'NOTHING_YET' && mine.usesContribute ? 'step' : 'promo',
      onlyYou: false,
    },
    {
      product: 'LEARN',
      mode: mine.state === 'NOTHING_YET' && mine.usesLearn ? 'step' : 'promo',
      onlyYou: false,
    },
  ];
  const line = 'Fixes that real projects merged, and lessons you learned: a page you can show an employer.';
  return {
    heading: 'This page shows what you fix and learn with GitRanks',
    line:
      mine.state === 'NOTHING_YET' && mine.usesContribute && mine.usesLearn
        ? `${line} There are two ways to fill it, and you can use both.`
        : line,
    numbers: mine.state === 'NEW',
    boxes,
  };
}

/**
 * The box about the other product at the end of a page with something on it, for someone who uses one product: only
 * its owner sees it.
 */
export function otherBoxOf(mine: Pick<SkillsMine, 'state' | 'usesContribute' | 'usesLearn'>): ProductBox | null {
  if (mine.state !== 'PUBLIC' && mine.state !== 'HIDDEN' && mine.state !== 'PRIVATE') return null;
  if (mine.usesContribute && !mine.usesLearn) return { product: 'LEARN', mode: 'promo', onlyYou: true };
  if (mine.usesLearn && !mine.usesContribute) return { product: 'CONTRIBUTE', mode: 'promo', onlyYou: true };
  return null;
}

/** A product box's words, the same on every page that draws it. */
export const PRODUCT_BOX: Record<
  LearnFixMade,
  {
    name: string;
    who: string;
    points: [string, string];
    promo: { label: string; href: Route };
    step: { text: string; label: string; href: Route };
  }
> = {
  CONTRIBUTE: {
    name: 'GitRanks Contribute',
    who: 'For skilled developers who want to help open-source projects and build a portfolio.',
    points: [
      'Your AI agent fixes a real issue. You check the fix and send the pull request.',
      'Every fix a project merges shows on this page, with how it was made.',
    ],
    promo: { label: 'See GitRanks Contribute', href: ABOUT_PATH },
    step: {
      text: 'No pull request sent yet. The first one you send shows here.',
      label: 'Pick an issue',
      href: WORKSPACE_PATHS.contribute,
    },
  },
  LEARN: {
    name: 'GitRanks Learn',
    who: 'For developers who want to get better at what they do, or learn a new area.',
    points: [
      'Short lessons, each with one question to answer.',
      'Then a fix in a real project, with a walkthrough that teaches you the change.',
    ],
    promo: { label: 'See GitRanks Learn', href: LEARN_HOME_PATH },
    step: {
      text: 'No lesson learned yet. The first one you learn shows here.',
      label: 'Start learning',
      href: LEARN_HOME_PATH,
    },
  },
};

/** The line the owner reads on the overview's block of a page only they see; null on a page everyone sees. */
export function blockOwnerLineOf(state: SkillsState): { text: string; link: string | null } | null {
  // An older API may still answer `PRIVATE`: drawn as `HIDDEN`.
  if (state === 'HIDDEN' || state === 'PRIVATE')
    return { text: 'Only you see this block. Your Skills page is hidden.', link: 'Open your Skills page' };
  return null;
}

/**
 * The block's link to the tab, naming what is listed there: "All 6 fixes", "All 3 courses", "All fixes and courses",
 * or "See the fix" and "See the course" for one; no link with nothing listed.
 */
export function blockLinkOf(numbers: Pick<SkillsNumbers, 'fixes' | 'courses'>): string | null {
  const { fixes, courses } = numbers;
  if (fixes > 0 && courses > 0) return 'All fixes and courses';
  if (fixes > 0) return fixes === 1 ? 'See the fix' : `All ${countOf(fixes)} fixes`;
  if (courses > 0) return courses === 1 ? 'See the course' : `All ${countOf(courses)} courses`;
  return null;
}
