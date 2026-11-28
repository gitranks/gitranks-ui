import type { Route } from 'next';

import type { SkillsMine, SkillsNumbers, SkillsState } from './skills.types';
import { countOf } from './skills-figures';
import { BUILD_HOME_PATH, BUILD_PROJECTS_PATH } from '@/lib/build/paths';
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

/**
 * The strip at the top of the owner's own page, in every state; Learn's progress for someone who learns. `build`:
 * Build is open to the owner, so a built project is one more way to fill an empty page.
 */
export function stripOf(mine: Pick<SkillsMine, 'state' | 'usesLearn'>, build = false): StripWords {
  const progress = mine.usesLearn ? LEARN_PROGRESS_PATH : null;
  switch (mine.state) {
    case 'PUBLIC':
      return { strong: 'Everyone can see this page.', rest: '', actions: ['copy', 'hide'], progress };
    case 'HIDDEN':
      return { strong: 'Only you can see this page.', rest: '', actions: ['show'], progress };
    default:
      return {
        strong: 'Only you can see this page',
        rest: build
          ? ', until you send a pull request, build a project or learn a lesson.'
          : ', until you send a pull request or learn a lesson.',
        actions: [],
        progress: null,
      };
  }
}

/** The products a box is about: the two that make fixes, and Build. */
export type SkillsProduct = LearnFixMade | 'BUILD';

/** A product's box: its promotion, or the step that puts the first thing on the page; "Only you see this" at the end. */
export type ProductBox = { product: SkillsProduct; mode: 'promo' | 'step'; onlyYou: boolean };

/** The page for someone with nothing on it yet: its heading and line, whether the list's numbers show, its boxes. */
export type StartWords = { heading: string; line: string; numbers: boolean; boxes: ProductBox[] };

/**
 * `NEW` (uses no product) and `NOTHING_YET` (uses one or more, nothing to show): the heading, the line, the box about
 * our list of issues on `NEW` alone, then one box for each product, a step for a product the person uses. With
 * `build` (Build is open to the owner) the three boxes are Learn, Build, Contribute, of equal weight; without it, Build
 * is not named and the two boxes keep their order. Null for a page with something on it.
 */
export function startOf(
  mine: Pick<SkillsMine, 'state' | 'usesContribute' | 'usesLearn'> & Partial<Pick<SkillsMine, 'usesBuild'>>,
  build = false,
): StartWords | null {
  if (mine.state !== 'NEW' && mine.state !== 'NOTHING_YET') return null;
  const empty = mine.state === 'NOTHING_YET';
  const boxOf = (product: SkillsProduct, uses: boolean): ProductBox => ({
    product,
    mode: empty && uses ? 'step' : 'promo',
    onlyYou: false,
  });
  const contribute = boxOf('CONTRIBUTE', mine.usesContribute);
  const learn = boxOf('LEARN', mine.usesLearn);
  if (build) {
    const uses = [mine.usesLearn, mine.usesBuild === true, mine.usesContribute].filter(Boolean).length;
    const line =
      'Fixes that real projects merged, projects you built, and lessons you learned: a page you can show an employer.';
    return {
      heading: 'This page shows what you fix, build and learn with GitRanks',
      line: empty && uses > 1 ? `${line} There are three ways to fill it, and you can use them all.` : line,
      // The approved page for someone new is the three boxes alone.
      numbers: false,
      boxes: [learn, boxOf('BUILD', mine.usesBuild === true), contribute],
    };
  }
  const line = 'Fixes that real projects merged, and lessons you learned: a page you can show an employer.';
  return {
    heading: 'This page shows what you fix and learn with GitRanks',
    line:
      empty && mine.usesContribute && mine.usesLearn
        ? `${line} There are two ways to fill it, and you can use both.`
        : line,
    numbers: mine.state === 'NEW',
    boxes: [contribute, learn],
  };
}

/**
 * The box about the other product at the end of a page with something on it, for someone who uses one product: only
 * its owner sees it.
 */
export function otherBoxOf(mine: Pick<SkillsMine, 'state' | 'usesContribute' | 'usesLearn'>): ProductBox | null {
  if (mine.state !== 'PUBLIC' && mine.state !== 'HIDDEN') return null;
  if (mine.usesContribute && !mine.usesLearn) return { product: 'LEARN', mode: 'promo', onlyYou: true };
  if (mine.usesLearn && !mine.usesContribute) return { product: 'CONTRIBUTE', mode: 'promo', onlyYou: true };
  return null;
}

/** A product box's words, the same on every page that draws it. */
export const PRODUCT_BOX: Record<
  SkillsProduct,
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
  BUILD: {
    name: 'GitRanks Build',
    who: 'For developers who want to make a real thing and know how it works inside.',
    points: [
      'Your AI agent builds a small project with you, one step at a time.',
      'A short test at the end. Every project you build shows on this page.',
    ],
    promo: { label: 'See GitRanks Build', href: BUILD_HOME_PATH },
    step: {
      text: 'No project built yet. The first one you build shows here.',
      label: 'Pick a project',
      href: BUILD_PROJECTS_PATH,
    },
  },
};

/** The line the owner reads on the overview's block of a page only they see; null on a page everyone sees. */
export function blockOwnerLineOf(state: SkillsState): { text: string; link: string | null } | null {
  if (state === 'HIDDEN')
    return { text: 'Only you see this block. Your Skills page is hidden.', link: 'Open your Skills page' };
  return null;
}

/** How many built projects the numbers count: their "projects built" figure, 0 without one. */
export function builtCountOf(numbers: Partial<Pick<SkillsNumbers, 'figures'>>): number {
  const figure = numbers.figures?.find((each) => each.key === 'PROJECTS_BUILT');
  const value = figure?.value ?? 0;
  return Number.isInteger(value) && value > 0 ? value : 0;
}

/**
 * The block's link to the tab, naming what is listed there, in the tab's order (fixes, projects, courses): "All 6
 * fixes", "All 3 projects", "All 3 courses", "All fixes and courses", "All fixes, projects and courses", or "See the
 * fix", "See the project" and "See the course" for one; no link with nothing listed. Built projects count once the
 * numbers carry them.
 */
export function blockLinkOf(
  numbers: Pick<SkillsNumbers, 'fixes' | 'courses'> & Partial<Pick<SkillsNumbers, 'figures'>>,
): string | null {
  const { fixes, courses } = numbers;
  const builds = builtCountOf(numbers);
  const listed = [
    { count: fixes, one: 'fix', many: 'fixes' },
    { count: builds, one: 'project', many: 'projects' },
    { count: courses, one: 'course', many: 'courses' },
  ].filter((kind) => kind.count > 0);
  const [only] = listed;
  if (!only) return null;
  if (listed.length === 1) return only.count === 1 ? `See the ${only.one}` : `All ${countOf(only.count)} ${only.many}`;
  const names = listed.map((kind) => kind.many);
  return `All ${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}
