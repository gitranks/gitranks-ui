import type { Route } from 'next';

import { toRepeatWords } from '@/lib/learn/course';
import { type CourseInLine, landingCoursesLineOf } from '@/lib/learn/courses-line';
import type { LearnLessonLink } from '@/lib/learn/lesson-page';
import { LEARN_HOME_PATH } from '@/lib/learn/paths';
import { nothingDueOf } from '@/lib/learn/review';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';
import { needsYouRowWordsOf } from '@/lib/workspace/pull-request-list';
import type { PullRequestBox } from '@/lib/workspace/pull-request-page.types';

/*
 * The home page's block for Contribute and Learn: two cards of one size, each with the product's name, a title, one
 * line and where it leads. A card promotes its product to someone who does not use it, and says what the product has
 * for them today to someone who does. Pure: the time comes in, so the words are the same wherever they are drawn.
 */

export type HomeContributeState = 'NEEDS_YOU' | 'OPEN' | 'NEW_ISSUES';
export type HomeLearnState = 'REVIEW_DUE' | 'NEXT_LESSON' | 'NEXT_REVIEW';

/** Contribute's card for its user, as the API answers it: the first pull request that needs them by its box. */
export type HomeContributeCard = {
  state: HomeContributeState;
  count: number | null;
  repo: string | null;
  box: PullRequestBox | null;
  round: number | null;
};

/** Learn's card for its user, as the API answers it. `at` is the next review's time. */
export type HomeLearnCard = {
  state: HomeLearnState;
  count: number | null;
  lesson: LearnLessonLink | null;
  course: string | null;
  group: string | null;
  at: string | null;
};

/** The signed-in person's two cards; `uses…` says which cards are theirs, so a card with nothing on it is told apart. */
export type HomeProducts = {
  usesContribute: boolean;
  usesLearn: boolean;
  contribute: HomeContributeCard | null;
  learn: HomeLearnCard | null;
};

export type HomeProduct = 'CONTRIBUTE' | 'LEARN';

/** A card's words: `mark` (Learn's "New") only while the person does not use the product. */
export type HomeCardWords = {
  product: HomeProduct;
  name: string;
  mark: string | null;
  title: string;
  line: string;
  action: string;
  href: Route;
  personal: boolean;
};

export const PRODUCTS_HEADING = 'Contribute to open source, and learn from it';
export const PRODUCTS_LINE = 'Both work with your own coding agent, on real issues in real projects.';
/** The heading and line when Learn's card is drawn alone. */
export const LEARN_ONLY_HEADING = 'Learn from real open source';
export const LEARN_ONLY_LINE = 'Short lessons, then real issues in real projects to use them on.';

/**
 * Whether the block draws Contribute's card: while Contribute is launched, and for a person who uses it, whose card
 * leads to their own work.
 */
export const showsContributeOf = (
  contribute: boolean,
  products: Pick<HomeProducts, 'usesContribute'> | null,
): boolean => contribute || products?.usesContribute === true;

/** The block's heading and line: both products', or Learn's alone. */
export const productsWordsOf = (both: boolean): { heading: string; line: string } =>
  both ? { heading: PRODUCTS_HEADING, line: PRODUCTS_LINE } : { heading: LEARN_ONLY_HEADING, line: LEARN_ONLY_LINE };

/**
 * Learn's promotion line, naming the live courses as Learn's landing does: "Short lessons on algorithms, JavaScript and
 * TypeScript, Python, open source and LLM APIs. Then fix a real issue with what you learned."
 */
export const learnPromoLineOf = (courses: readonly CourseInLine[]) =>
  `${landingCoursesLineOf(courses)}. Then fix a real issue with what you learned.`;

/** Each product's promotion, the same for everyone; Learn's line here names no course (see `homePromosOf`). */
export const HOME_PROMOS: Record<HomeProduct, HomeCardWords> = {
  CONTRIBUTE: {
    product: 'CONTRIBUTE',
    name: 'GitRanks Contribute',
    mark: null,
    title: 'Fix issues in the open source you build on',
    line: 'Contribute finds issues that fit you. Your coding agent writes the fix, you review it, and the pull request opens in your name.',
    action: 'Start contributing',
    href: WORKSPACE_PATHS.contribute,
    personal: false,
  },
  LEARN: {
    product: 'LEARN',
    name: 'GitRanks Learn',
    mark: 'New',
    title: 'Learn one idea in two minutes',
    line: learnPromoLineOf([]),
    action: 'Start learning',
    href: LEARN_HOME_PATH,
    personal: false,
  },
};

/** The promotions with Learn's line naming the live courses; none (or a failed read) keeps the plain line. */
export const homePromosOf = (courses: readonly CourseInLine[]): Record<HomeProduct, HomeCardWords> =>
  courses.length ? { ...HOME_PROMOS, LEARN: { ...HOME_PROMOS.LEARN, line: learnPromoLineOf(courses) } } : HOME_PROMOS;

/** A count the card can show: a whole number from 1. */
const countOf = (count: number | null) => (count !== null && Number.isInteger(count) && count > 0 ? count : null);

const NUMBER = new Intl.NumberFormat('en-US');

/** The promotion of a product the person uses with nothing on its card: no mark, and it leads into the product. */
const usedPromoOf = (product: HomeProduct, promos = HOME_PROMOS): HomeCardWords => ({
  ...promos[product],
  mark: null,
  action: product === 'LEARN' ? 'Open Learn' : 'Open Contribute',
});

/**
 * The line of the first pull request that needs the person, as the list of pull requests words it, with its project
 * and how many more: "Round 2: something to answer, in kelp-db/kelp, and 1 more."
 */
export function needsYouLineOf(card: Pick<HomeContributeCard, 'box' | 'repo' | 'round'>, count: number): string {
  const first = card.box ? needsYouRowWordsOf({ box: card.box, round: card.round }) : null;
  const more = count > 1 ? `, and ${NUMBER.format(count - 1)} more` : '';
  if (!first) return `Open the list to see what ${count === 1 ? 'it needs' : 'each one needs'}.`;
  return `${first.line}${card.repo ? `, in ${card.repo}` : ''}${more}.`;
}

/**
 * Contribute's card: what needs the person, then what is open, then new issues. A card that would show a zero says
 * the next thing that is true instead.
 */
export function contributeCardOf(products: HomeProducts | null): HomeCardWords {
  if (!products?.usesContribute) return HOME_PROMOS.CONTRIBUTE;
  const card = products.contribute;
  if (!card) return usedPromoOf('CONTRIBUTE');
  const base = { ...usedPromoOf('CONTRIBUTE'), personal: true };
  const count = countOf(card.count);
  if (card.state === 'NEEDS_YOU' && count) {
    return {
      ...base,
      title: `${NUMBER.format(count)} ${count === 1 ? 'pull request needs you' : 'pull requests need you'}`,
      line: needsYouLineOf(card, count),
      action: 'Open your pull requests',
      href: WORKSPACE_PATHS.pullRequests,
    };
  }
  if (card.state === 'OPEN' && count) {
    return {
      ...base,
      title: `${NUMBER.format(count)} ${count === 1 ? 'pull request is open' : 'pull requests are open'}`,
      line:
        count === 1
          ? 'It waits for its maintainers. Nothing is needed from you.'
          : 'They wait for their maintainers. Nothing is needed from you.',
    };
  }
  return {
    ...base,
    title: 'New issues are ready for you',
    line: 'Picked for your languages and the projects you depend on.',
  };
}

/**
 * Learn's card: the lessons due today, then the next lesson, then the next review. A learner with none of them keeps
 * the promotion, which leads into Learn. `promos`: the promotions as drawn, Learn's line naming the live courses.
 */
export function learnCardOf(products: HomeProducts | null, now: Date, promos = HOME_PROMOS): HomeCardWords {
  if (!products?.usesLearn) return promos.LEARN;
  const card = products.learn;
  if (!card) return usedPromoOf('LEARN', promos);
  const base = { ...usedPromoOf('LEARN', promos), personal: true };
  const count = countOf(card.count);
  if (card.state === 'REVIEW_DUE' && count) {
    return {
      ...base,
      title: `${toRepeatWords(count)} today`,
      line: card.lesson ? `Then your next lesson: ${card.lesson.title}.` : '',
    };
  }
  if (card.lesson && card.state !== 'NEXT_REVIEW') {
    return {
      ...base,
      title: `Next lesson: ${card.lesson.title}`,
      line: [card.course, card.group].filter(Boolean).join(' · '),
    };
  }
  if (card.state === 'NEXT_REVIEW' && card.at && count) {
    const { title, text } = nothingDueOf(card.at, count, now);
    return { ...base, title, line: text };
  }
  return usedPromoOf('LEARN', promos);
}
