import type { Route } from 'next';

import type { LearnGoalView, LearnIssues, LearnProfile, LearnPublicIssues } from './learn.types';
import { hasGoal, LEARN_GOAL_LANGUAGES } from './learn-home';
import type { LearnStartTarget } from './learn-tab';
import { LEVEL_MAX, LEVELS } from './profile-form';

/**
 * What a visitor picked on Your goal, carried in the address from step to step and through the GitHub sign-in
 * (getting in, §6.1): `?language=TypeScript&level=1`, one of Learn's eight languages and a level from 0 to 3. Nothing
 * is kept anywhere else.
 */
export type LearnGoalLanguage = (typeof LEARN_GOAL_LANGUAGES)[number];

/** The goal an address carries: the language, and its level (null when the address has none). */
export type LearnGoalPick = { language: LearnGoalLanguage; level: number | null };

/** One of Learn's languages, in its own spelling, whatever the case it was written in; null for anything else. */
export function learnGoalLanguageOf(value: string | null | undefined): LearnGoalLanguage | null {
  const key = value?.trim().toLowerCase();
  return (key && LEARN_GOAL_LANGUAGES.find((language) => language.toLowerCase() === key)) || null;
}

/** A level the address may carry: a whole number from 0 to 3; null for anything else. */
function levelOf(value: string | null): number | null {
  if (value === null || !/^\d$/.test(value.trim())) return null;
  const level = Number(value.trim());
  return level <= LEVEL_MAX ? level : null;
}

/** The goal an address carries; null without one of Learn's languages. An unknown level is dropped. */
export function learnGoalPickOf(query: URLSearchParams): LearnGoalPick | null {
  const language = learnGoalLanguageOf(query.get('language'));
  return language ? { language, level: levelOf(query.get('level')) } : null;
}

/** The query that carries the goal (`language=TypeScript&level=1`, a missing level left out). */
export function learnGoalQuery(goal: LearnGoalPick): string {
  const query = new URLSearchParams({ language: goal.language });
  if (goal.level !== null) query.set('level', String(goal.level));
  return query.toString();
}

/** A step's address with the goal in its query; the path alone without one. */
export function withLearnGoal(path: Route, goal: LearnGoalPick | null): Route {
  // A plain string: on `Route`, the conditional joins every typed route with each one plus a query, and TypeScript
  // gives up as routes grow (TS2590).
  const base: string = path;
  return (goal ? `${base}?${learnGoalQuery(goal)}` : base) as Route;
}

/**
 * The saved goal as Your goal pre-sets it: a language Learn finds issues for, and its saved level (null when none is
 * saved for it). Null for no goal, a project goal, or another language.
 */
export function learnGoalPickOfProfile(profile: LearnProfile | null | undefined): LearnGoalPick | null {
  if (!hasGoal(profile) || profile?.goalKind !== 'LANGUAGE') return null;
  const language = learnGoalLanguageOf(profile.goalValue);
  if (!language) return null;
  const key = language.toLowerCase();
  const level = profile.levels.find((row) => row.language.trim().toLowerCase() === key)?.level;
  return { language, level: typeof level === 'number' ? Math.min(LEVEL_MAX, Math.max(0, Math.round(level))) : null };
}

/** The goal an address carries, as the goal chips show it: the language and its level's name. */
export const goalViewOfPick = (goal: LearnGoalPick): LearnGoalView => ({
  kind: 'language',
  value: goal.language,
  level: goal.level === null ? null : LEVELS[goal.level],
});

/**
 * A language's day list for visitors, as Learn's issue list takes it: each row keyed by its `owner/repo#n` (the list
 * names no issue id), no room or cap to note, and its own rows as the whole list (it grows only after sign-in).
 */
export function learnIssuesOfPublic(list: LearnPublicIssues, goal: LearnGoalView): LearnIssues {
  const items = list.items.map((issue) => ({ ...issue, issueId: `${issue.repo}#${issue.number}` }));
  return { goal, items, total: items.length, empty: null, capReached: false, room: null };
}

/**
 * Where Pick an issue's Start a lesson leads: the issue's own start address, Your agent (`learnStartPath`), with the
 * goal in its query for a visitor (`goal`), without one for a signed-in person, whose goal is saved. Never the Start
 * page under `/my`.
 */
export const issueStepTargetOf = (goal: LearnGoalPick | null): LearnStartTarget => ({
  base: '/learn/start',
  ...(goal ? { query: learnGoalQuery(goal) } : {}),
});

/** The goal an address carries, in the words a lesson's card uses: "TypeScript, Some" (a missing level: New to it). */
export const learnGoalLabelOfPick = (goal: LearnGoalPick): string => `${goal.language}, ${LEVELS[goal.level ?? 0]}`;

/**
 * Whether the goal an address carries differs from the saved one: another language, another level both name, or a
 * saved goal that is not one of Learn's languages. The saved goal stands either way; the page says which it is.
 */
export function goalDiffersFrom(goal: LearnGoalPick, profile: LearnProfile | null | undefined): boolean {
  const saved = learnGoalPickOfProfile(profile);
  if (!saved || saved.language !== goal.language) return true;
  return goal.level !== null && saved.level !== null && goal.level !== saved.level;
}
