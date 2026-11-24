import type { LearnProfile } from './learn.types';

/** The levels a language can have, from 0. */
export const LEVELS = ['New to it', 'Some', 'Comfortable', 'Expert'] as const;
/** "TypeScript, Some": the saved goal and, for a language, its level. Null without a goal. */
export function learnGoalLabelOf(profile: LearnProfile | null | undefined): string | null {
  const value = profile?.goalValue?.trim();
  if (!profile?.goalKind || !value) return null;
  if (profile.goalKind !== 'LANGUAGE') return value;
  const key = value.toLowerCase();
  const level = profile.levels.find((row) => row.language.trim().toLowerCase() === key)?.level ?? 0;
  return `${value}, ${LEVELS[Math.min(LEVELS.length - 1, Math.max(0, Math.round(level)))]}`;
}
