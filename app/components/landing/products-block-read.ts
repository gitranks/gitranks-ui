import type {
  HomeContributeCard,
  HomeContributeState,
  HomeLearnCard,
  HomeLearnState,
  HomeProducts,
} from './products-block-words';
import type { PullRequestBox } from '@/lib/workspace/pull-request-page.types';

/*
 * The home block's personal layer as it travels: the route the browser asks once the page is up, its answer, and the
 * API's answer checked field by field, so a card is drawn only from a state the words know.
 */

/** The route that answers the signed-in person's two cards; asked only for a signed-in person. */
export const HOME_PRODUCTS_URL = '/api/me/home-products';

/** The route's answer: null signed out, and on any failure (the block keeps its promotions). */
export type HomeProductsAnswer = { products: HomeProducts | null };

/** Every state of each card; a state the API adds later is not drawn until its words are written. */
const CONTRIBUTE_STATES: Record<HomeContributeState, true> = { NEEDS_YOU: true, OPEN: true, NEW_ISSUES: true };
const LEARN_STATES: Record<HomeLearnState, true> = { REVIEW_DUE: true, NEXT_LESSON: true, NEXT_REVIEW: true };

export const HOME_CONTRIBUTE_STATES = Object.keys(CONTRIBUTE_STATES) as HomeContributeState[];
export const HOME_LEARN_STATES = Object.keys(LEARN_STATES) as HomeLearnState[];

type Raw = Record<string, unknown>;

const isRaw = (value: unknown): value is Raw => typeof value === 'object' && value !== null && !Array.isArray(value);
const textOf = (value: unknown) => (typeof value === 'string' && value.trim() ? value : null);
const numberOf = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

function contributeOf(raw: unknown): HomeContributeCard | null {
  if (!isRaw(raw) || typeof raw.state !== 'string' || !Object.hasOwn(CONTRIBUTE_STATES, raw.state)) return null;
  return {
    state: raw.state as HomeContributeState,
    count: numberOf(raw.count),
    repo: textOf(raw.repo),
    box: textOf(raw.box) as PullRequestBox | null,
    round: numberOf(raw.round),
  };
}

function learnOf(raw: unknown): HomeLearnCard | null {
  if (!isRaw(raw) || typeof raw.state !== 'string' || !Object.hasOwn(LEARN_STATES, raw.state)) return null;
  const lesson = isRaw(raw.lesson) ? raw.lesson : null;
  const slug = textOf(lesson?.slug);
  const title = textOf(lesson?.title);
  return {
    state: raw.state as HomeLearnState,
    count: numberOf(raw.count),
    lesson: slug && title ? { slug, title } : null,
    course: textOf(raw.course),
    group: textOf(raw.group),
    at: textOf(raw.at),
  };
}

/**
 * The person's two cards from the API's answer: null for none (signed out). A card whose state is unknown, or whose
 * product the person does not use, is left null, so it keeps its promotion.
 */
export function homeProductsOf(raw: unknown): HomeProducts | null {
  if (!isRaw(raw)) return null;
  const usesContribute = raw.usesContribute === true;
  const usesLearn = raw.usesLearn === true;
  return {
    usesContribute,
    usesLearn,
    contribute: usesContribute ? contributeOf(raw.contribute) : null,
    learn: usesLearn ? learnOf(raw.learn) : null,
  };
}
