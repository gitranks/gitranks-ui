import type { LearnPicked } from './learn-question';

/*
 * A visitor's right answer on a lesson, kept in this browser while they sign in and go through Learn's onboarding, so
 * the answer is saved once they are back with the Learn sign. One record at most, under one key, for an hour. It holds
 * what the answer's save takes; the API grades a replayed answer itself, so a record changed by hand saves nothing it
 * would not take from the page.
 */

/** Where the record is kept, in the browser's local storage. */
export const KEPT_ANSWER_KEY = 'gr_learn_kept_answer';

/**
 * Said under a lesson's card when the API saves no answer for a person with a session: Learn is not open to their
 * account yet (GitRanks has no profile of it, its setup on its way). The answer is kept, as a visitor's is.
 */
export const ANSWER_KEPT_NOTE = 'Your answer is kept in this browser while your account is set up.';

/** How long a kept answer waits for its person: an hour. */
export const KEPT_ANSWER_MS = 60 * 60 * 1000;

/** The kept answer: what the answer's save takes, and when it was given (ms since 1970). */
export type KeptAnswer = {
  slug: string;
  question: string;
  picked: LearnPicked;
  tries: number;
  language: string | null;
  at: number;
};

const isPicked = (value: unknown): value is LearnPicked =>
  (typeof value === 'number' && Number.isInteger(value)) ||
  value === 'myth' ||
  value === 'fact' ||
  (Array.isArray(value) &&
    (value.every((item) => typeof item === 'number' && Number.isInteger(item)) ||
      value.every((item) => typeof item === 'string')));

/** A record as read back from the browser, when it has the shape it was written in; null for anything else. */
export function keptAnswerOf(value: unknown): KeptAnswer | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const { slug, question, picked, tries, language, at } = raw;
  if (typeof slug !== 'string' || !slug || typeof question !== 'string' || !question) return null;
  if (!isPicked(picked) || typeof tries !== 'number' || !Number.isInteger(tries) || tries < 1) return null;
  if (language !== null && typeof language !== 'string') return null;
  if (typeof at !== 'number' || !Number.isFinite(at)) return null;
  return { slug, question, picked, tries, language, at };
}

/** Whether a kept answer is still waiting: given less than an hour ago, and not in the future. */
export const isKeptAnswerFresh = (kept: Pick<KeptAnswer, 'at'>, now: number): boolean =>
  kept.at <= now && now - kept.at < KEPT_ANSWER_MS;

/** A fresh kept answer for this lesson, or null: none, another lesson's, or older than an hour. */
export const keptAnswerFor = (kept: KeptAnswer | null, slug: string, now: number): KeptAnswer | null =>
  kept && kept.slug === slug && isKeptAnswerFresh(kept, now) ? kept : null;

/**
 * What a lesson's page does with the kept answer once the person's own side is read:
 * - `replay`: save it, once, then remove it: they have the Learn sign, the record is this lesson's and fresh, its
 *   question is still the lesson's, and their own data shows the lesson unanswered;
 * - `drop`: remove it unsaved: it is this lesson's but out of date (older than an hour, another question, or the
 *   lesson already answered), or it is older than an hour whatever its lesson;
 * - `keep`: leave it: there is none, it is another lesson's, or the person has no Learn sign yet (or it cannot be read).
 */
export function keptAnswerStepOf({
  kept,
  slug,
  question,
  answered,
  sign,
  now,
}: {
  kept: KeptAnswer | null;
  slug: string;
  question: string;
  answered: boolean;
  sign: boolean | null;
  now: number;
}): 'replay' | 'drop' | 'keep' {
  if (!kept) return 'keep';
  if (!isKeptAnswerFresh(kept, now)) return 'drop';
  if (kept.slug !== slug || sign !== true) return 'keep';
  return kept.question === question && !answered ? 'replay' : 'drop';
}

/** The browser's local storage, or null where there is none or it refuses (a private window, storage turned off). */
function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** The kept answer in this browser; null when there is none, or it cannot be read. */
export function readKeptAnswer(): KeptAnswer | null {
  try {
    const text = storage()?.getItem(KEPT_ANSWER_KEY);
    return text ? keptAnswerOf(JSON.parse(text)) : null;
  } catch {
    return null;
  }
}

/** Keeps a visitor's right answer in this browser, in place of any kept before. Nothing happens where it cannot. */
export function writeKeptAnswer(kept: KeptAnswer): void {
  try {
    storage()?.setItem(KEPT_ANSWER_KEY, JSON.stringify(kept));
  } catch {
    // A browser that keeps nothing: the answer is simply not kept.
  }
}

/** Removes the kept answer. */
export function dropKeptAnswer(): void {
  try {
    storage()?.removeItem(KEPT_ANSWER_KEY);
  } catch {
    // Nothing to remove where nothing could be kept.
  }
}
