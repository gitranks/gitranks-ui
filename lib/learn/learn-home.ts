import type {
  LearnGoalView,
  LearnIssue,
  LearnProfile,
  LearnRoom,
  LearnStage,
  LessonWrittenFor,
  MyLearnAttempt,
  MyLearnAttempts,
} from './learn.types';
import { learnLimitWordsOf } from './learn-start';
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

/** What Learn home shows, decided in this order. */
export type LearnHomeState =
  /** A new account GitRanks is still setting up. */
  | { kind: 'setting-up' }
  /** No Learn goal saved yet: the goal question. */
  | { kind: 'no-goal' }
  /** The viewer's own lesson in progress. */
  | { kind: 'own'; card: OwnCard; attempt: MyLearnAttempt }
  /** The viewer's newest Learn pull request, opened in the last 14 days. */
  | { kind: 'pull-request'; attempt: MyLearnAttempt }
  /** A goal, and nothing of their own going on: the issues. */
  | { kind: 'goal-set' };

/** Which own-lesson card shows: the agent works, the lesson is ready, its questions need fixing, or it can be approved. */
export type OwnCard = 'working' | 'ready' | 'blocked' | 'approve' | 'submitting';

/** The own-lesson card for an attempt in progress. */
export function ownCardOf(attempt: Pick<MyLearnAttempt, 'stage' | 'state'>): OwnCard {
  switch (attempt.stage) {
    case 'AGENT_WORKING':
    case 'AGENT_REWRITING':
      return 'working';
    case 'WARMUP':
    case 'LESSON':
      return 'ready';
    case 'BLOCKED':
      return 'blocked';
    default:
      return attempt.state === 'SUBMITTING' || attempt.state === 'PENDING_AUTOSUBMIT' ? 'submitting' : 'approve';
  }
}

/** Whether a Learn goal is saved. */
export const hasGoal = (profile: LearnProfile | null | undefined): boolean =>
  !!profile?.goalKind && !!profile.goalValue?.trim();

/** Learn home's state, in the order the states are decided. */
export function learnHomeStateOf({
  settingUp,
  profile,
  attempts,
}: {
  settingUp: boolean;
  profile: LearnProfile | null | undefined;
  attempts: MyLearnAttempts | null | undefined;
}): LearnHomeState {
  if (settingUp) return { kind: 'setting-up' };
  if (!hasGoal(profile)) return { kind: 'no-goal' };
  const current = currentOf(attempts);
  if (current) return { kind: 'own', card: ownCardOf(current), attempt: current };
  const pr = attempts?.lastPullRequest ?? null;
  if (pr) return { kind: 'pull-request', attempt: pr };
  return { kind: 'goal-set' };
}

/** The own-lesson cards that change by themselves: the page reads the attempt again every 15 seconds while one shows. */
export const isLiveCard = (state: LearnHomeState): boolean => state.kind === 'own';

/** What a re-read compares: a new value means the page shows something else now. */
export const ownLessonKeyOf = (attempts: MyLearnAttempts | null | undefined): string => {
  const current = currentOf(attempts);
  if (current) return `${current.attemptId}|${current.stage}|${current.state}|${current.latestEvent?.at ?? ''}`;
  const pr = attempts?.lastPullRequest;
  return pr ? `pr|${pr.attemptId}|${pr.prState ?? ''}` : 'none';
};

/** How often Learn home and the lesson page read the attempt again while it moves. */
export const OWN_LESSON_POLL_MS = 15_000;

/** One step of the path to a first pull request. */
export type PathStep = { key: 'goal' | 'agent' | 'pass'; where: string; title: string };

/** Learn home's path, in the attempt page's stage style. */
export const LEARN_PATH_STEPS: readonly PathStep[] = [
  { key: 'goal', where: '1 · Here, one minute', title: 'Tell us what you want to learn' },
  { key: 'agent', where: '2 · Your terminal', title: 'Your agent fixes an issue and writes your lesson' },
  { key: 'pass', where: '3 · Here', title: 'Pass your lesson, open the pull request' },
];

/** Where a step of the path is: done, the one now, the agent working on it, or still to come. */
export type PathMark = 'done' | 'now' | 'working' | 'next';

/** Each step's mark in a state of Learn home. */
export function pathMarksOf(state: LearnHomeState): [PathMark, PathMark, PathMark] {
  switch (state.kind) {
    case 'setting-up':
    case 'no-goal':
      return ['now', 'next', 'next'];
    case 'goal-set':
      return ['done', 'now', 'next'];
    case 'own':
      return state.card === 'working' ? ['done', 'working', 'next'] : ['done', 'done', 'now'];
    default:
      return ['done', 'done', 'done'];
  }
}

/** "owner/repo#12": an issue named before its title is known. */
export const issueRefOf = (attempt: Pick<MyLearnAttempt, 'repo' | 'issueNumber'>): string =>
  attempt.repo ? `${attempt.repo}#${attempt.issueNumber}` : `Issue #${attempt.issueNumber}`;

/** The attempt's issue title, or `owner/repo#n` until the agent's first brief stores it. */
export const attemptTitleOf = (attempt: Pick<MyLearnAttempt, 'title' | 'repo' | 'issueNumber'>): string =>
  attempt.title?.trim() || issueRefOf(attempt);

/** The number of a pull request from its address; null when the address names none. */
export function prNumberOf(url: string | null | undefined): number | null {
  const match = url ? /\/pull\/(\d+)(?:[/?#]|$)/.exec(url) : null;
  return match ? Number(match[1]) : null;
}

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

/** The words for the limit that leaves the viewer no room for a new lesson: the start page's, with its count. */
export const roomWordsOf = (room: LearnRoom) => learnLimitWordsOf(room.limit, room.value);

/** "Size small": an issue's size in the row's words; null when it has none. */
export function issueSizeOf(issue: Pick<LearnIssue, 'size'>): string | null {
  switch (issue.size?.toUpperCase()) {
    case 'S':
      return 'Size small';
    case 'M':
      return 'Size medium';
    case 'L':
      return 'Size large';
    default:
      return null;
  }
}

/** Why a Learn attempt ended without a pull request, in a line: the issue moved, the agent gave it back, or it stopped. */
export function endedReasonOf(reason: string | null | undefined): string {
  switch (reason) {
    case 'CLAIM_LOST':
      return 'The issue changed before your agent could start (someone else took it, or it was closed).';
    case 'RELEASED':
      return 'Your agent gave the issue back.';
    default:
      return 'Your agent stopped working on it.';
  }
}

/** How many practice lessons a lesson's page shows while the agent works. */
export const WAIT_PRACTICE = 2;

/** How many practice lessons Learn home shows, and the most "Show all" reads. */
export const PRACTICE_SHOWN = 3;
export const PRACTICE_ALL = 30;

/** How many issues Learn home asks for. */
export const ISSUES_SHOWN = 10;
