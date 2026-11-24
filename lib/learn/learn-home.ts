import type {
  LearnGoalView,
  LearnProfile,
  LearnStage,
  LessonWrittenFor,
  MyLearnAttempt,
  MyLearnAttempts,
} from './learn.types';
import { LEVELS, levelRowsOf } from './profile-form';

/**
 * The stages of a Learn attempt that count as in progress: the agent works or rewrites, the lesson waits for the user
 * or is being taken, its questions need fixing, or the pull request waits for the user's approval.
 */
export const IN_PROGRESS_STAGES: readonly LearnStage[] = [
  'AGENT_WORKING',
  'AGENT_REWRITING',
  'WARMUP',
  'LESSON',
  'BLOCKED',
  'READY_TO_APPROVE',
];

/** Whether a Learn attempt at this stage is in progress: Learn offers no new issue while one is. */
export const isInProgress = (stage: LearnStage | null | undefined): boolean =>
  !!stage && IN_PROGRESS_STAGES.includes(stage);

/** The viewer's own lesson in progress, when the API names one that is. */
export const currentOf = (attempts: MyLearnAttempts | null | undefined): MyLearnAttempt | null => {
  const current = attempts?.current ?? null;
  return current && isInProgress(current.stage) ? current : null;
};

/** Whether a Learn goal is saved. */
export const hasGoal = (profile: LearnProfile | null | undefined): boolean =>
  !!profile?.goalKind && !!profile.goalValue?.trim();

/** "owner/repo#12": an issue named before its title is known. */
export const issueRefOf = (attempt: Pick<MyLearnAttempt, 'repo' | 'issueNumber'>): string =>
  attempt.repo ? `${attempt.repo}#${attempt.issueNumber}` : `Issue #${attempt.issueNumber}`;

/** The attempt's issue title, or `owner/repo#n` until the agent's first brief stores it. */
export const attemptTitleOf = (attempt: Pick<MyLearnAttempt, 'title' | 'repo' | 'issueNumber'>): string =>
  attempt.title?.trim() || issueRefOf(attempt);

/** The languages Learn finds issues for, as GitHub names them: the goal question offers these alone. */
export const LEARN_GOAL_LANGUAGES = [
  'TypeScript',
  'JavaScript',
  'Python',
  'Go',
  'Rust',
  'Java',
  'PHP',
  'Ruby',
] as const;

/** The level Goal and level would pre-fill for a language: the user's own (or guessed) one, else New to it. */
export function levelFor(profile: LearnProfile | null | undefined, language: string): number {
  const [row] = levelRowsOf({ goalKind: 'LANGUAGE', language, levels: profile?.levels ?? [] });
  return row?.level ?? 0;
}

/** The goal's own words: a language or a domain as it is, a project as `owner/repo`. */
export const goalValueOf = (goal: Pick<LearnGoalView, 'value'> | null | undefined): string => goal?.value?.trim() ?? '';

/** A saved profile's goal, as the issues name a goal: its level, for a language, from the user's levels. */
export function goalViewOf(profile: LearnProfile | null | undefined): LearnGoalView | null {
  if (!hasGoal(profile) || !profile?.goalKind) return null;
  const value = (profile.goalValue ?? '').trim();
  const kind = profile.goalKind.toLowerCase();
  const level = kind === 'language' ? (LEVELS[levelFor(profile, value)] ?? null) : null;
  return { kind, value, level };
}

/** A level's name as a phrase in running text: "some experience", "new to it". */
export function levelPhraseOf(level: string | null | undefined): string {
  const name = level?.trim().toLowerCase() ?? '';
  return name === 'some' ? 'some experience' : name;
}

/** "who wanted to learn TypeScript" / "who wanted to work on vercel/next.js", for a lesson's `writtenFor`. */
export const wantedOf = (written: Pick<LessonWrittenFor, 'kind' | 'value'>, also = false): string =>
  `who ${also ? 'also ' : ''}wanted to ${written.kind.toLowerCase() === 'project' ? 'work on' : 'learn'}`;

/** Whether a lesson was written for the same goal as the viewer's: the same kind and value, any case. */
export const sameGoal = (
  written: Pick<LessonWrittenFor, 'kind' | 'value'> | null | undefined,
  goal: LearnGoalView | null,
) =>
  !!written &&
  !!goal &&
  written.kind.toLowerCase() === goal.kind.toLowerCase() &&
  written.value.trim().toLowerCase() === goal.value.trim().toLowerCase();
