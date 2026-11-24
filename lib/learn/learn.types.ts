/** GitRanks Learn, as the API answers it: a lesson on a fix the user's own agent made, and the user's run through it. */

import type { LessonBlock } from '@/lib/workspace/blocks/block.types';
import type { ContributeAttemptEvent, ContributeAttemptState } from '@/lib/workspace/contribute.types';

export type {
  LessonBlock,
  LessonBlockType,
  LessonCompareOf,
  LessonCompareSide,
  LessonDiagramEdge,
  LessonDiagramLayout,
  LessonDiagramNode,
  LessonDiagramTone,
  LessonDiffLine,
  LessonDiffLineKind,
} from '@/lib/workspace/blocks/block.types';

export type LessonVisibility = 'PRIVATE' | 'PUBLIC' | 'REMOVED' | 'HIDDEN' | 'HELD';
export type LessonStepState = 'OPEN' | 'KNEW' | 'FIRST_TRY' | 'TRY_N' | 'REPORTED';
export type LessonQuestionType = 'SINGLE' | 'MULTI';
export type LessonQuestionRole = 'STEP' | 'WARMUP';
export type LessonSubjectType = 'ISSUE' | 'REPO' | 'RULES' | 'FEATURE' | 'TOPIC';
export type LessonReportReason = 'WRONG_KEY' | 'UNCLEAR' | 'OFF_TOPIC' | 'TWO_FIT';

/** Where a Learn attempt is, from the claim to the pull request. */
export type LearnStage =
  /** Claimed; no passing fix and lesson yet. */
  | 'AGENT_WORKING'
  /** Sent back; the agent writes a new fix or lesson. */
  | 'AGENT_REWRITING'
  /** The lesson is ready; its warm-up is not answered. */
  | 'WARMUP'
  /** The warm-up is done; the steps are open. */
  | 'LESSON'
  /** A second step had every question reported: the questions need fixing. */
  | 'BLOCKED'
  /** The run passed; the pull request can be approved. */
  | 'READY_TO_APPROVE'
  /** The pull request is open, and the lesson is public. */
  | 'PR_OPEN'
  /** The user opened a pull request by hand. */
  | 'HAND_PR'
  /** Checks failed, discarded, expired or released. */
  | 'ENDED';

export type LessonAuthor = { login: string | null; agentName: string; agentFamily: string | null };

export type LessonSubject = {
  type: LessonSubjectType;
  repo: string | null;
  issue: number | null;
  issueTitle: string | null;
  pr: number | null;
  prUrl: string | null;
};

export type LessonStep = { id: string; parts: string[]; title: string; blocks: LessonBlock[] };

export type LessonOption = { id: string; text: string };
export type LessonQuestion = {
  id: string;
  stepId: string;
  role: LessonQuestionRole;
  type: LessonQuestionType;
  prompt: string;
  options: LessonOption[];
};

export type LessonHead = {
  slug: string;
  title: string;
  kind: string;
  version: number;
  author: LessonAuthor;
  subject: LessonSubject;
  language: string | null;
  publishedAt: string | null;
  passes: number;
  /** "learn TypeScript, level Some". */
  writtenFor: string | null;
  /** The same, as its parts; null for a lesson written for no saved goal. Left out by reads that don't ask for it. */
  writtenForGoal?: LessonWrittenFor | null;
  topics: string[];
};

export type LessonStepResult = { stepId: string; state: LessonStepState; tries: number };
export type LessonWhy = { optionId: string; correct: boolean; why: string };
export type LessonRunQuestion = {
  question: LessonQuestion;
  /** "Question", or "Try this one" after a wrong answer. */
  label: string;
  /** The last wrong pick's why lines, kept across reloads. */
  hint: LessonWhy[];
};
export type LessonRunSummary = { knewBefore: number; learned: number; minutes: number };
export type LessonQuestionLike = { questionId: string; liked: boolean };

export type LessonRun = {
  id: string;
  version: number;
  steps: LessonStepResult[];
  /** Empty once answered, or on a carried-over run. */
  warmup: LessonQuestion[];
  /** The next step question; null when passed or blocked. */
  current: LessonRunQuestion | null;
  blocked: boolean;
  liked: LessonQuestionLike[];
  worthIt: boolean | null;
  resultPublic: boolean;
  startedAt: string;
  passedAt: string | null;
  summary: LessonRunSummary | null;
};

/** Right: every option's why; wrong: the picked ones'. */
export type LessonAnswerResult = { correct: boolean; why: LessonWhy[]; run: LessonRun };
export type LessonWarmupAnswer = { questionId: string; picked: string[]; dontKnow: boolean };

type LessonCounts = {
  opens: number;
  passes: number;
  reactionsYes: number;
  reactionsNo: number;
  reported: number;
};

/** The learner's own lesson inside an attempt. */
export type LearnAttemptLesson = {
  attemptId: string;
  stage: LearnStage;
  /** Null while the agent works. */
  head: LessonHead | null;
  steps: LessonStep[] | null;
  run: LessonRun | null;
  /** Set from PR_OPEN. */
  shareUrl: string | null;
  resultUrl: string | null;
  counts: LessonCounts | null;
  visibility: LessonVisibility | null;
};

/** What the user wants to learn: a language, a domain, or how one project works. */
export type LearnGoalKind = 'LANGUAGE' | 'DOMAIN' | 'PROJECT';
/** What lessons spend more of their steps on. */
export type LearnFocus = 'LANGUAGE' | 'STRUCTURE' | 'PATTERNS' | 'TESTS';

/** The user's level in a language: 0 New to it, 1 Some, 2 Comfortable, 3 Expert. */
export type LearnLevel = {
  language: string;
  level: number;
  /** Read from the user's public work, not set by them yet. */
  guessed: boolean;
  /** What the guess is based on: "2 repos, since Oct 2026". */
  hint: string | null;
};

/** The user's goal, levels and focus; every lesson is written for them. */
export type LearnProfile = {
  goalKind: LearnGoalKind | null;
  goalValue: string | null;
  levels: LearnLevel[];
  focus: LearnFocus[];
  updatedAt: string | null;
};

/** A lesson anyone with the link may read: its head and every step, never a question's key. */
export type LessonPage = { __typename: 'LessonPage'; head: LessonHead; steps: LessonStep[] };

/** A login's Learn record, from their public passes: lessons, topics learned, pull requests opened and merged. */
/**
 * A person's public Learn record: only what is already public. `login` is the spelling GitRanks stores (the one
 * address their public page and card answer under); null from an API that does not send it yet. `newThings`: the new
 * things of their public passes; `reposHelped`: the repositories that merged their Learn pull requests.
 */
export type LearnRecord = {
  login: string | null;
  lessons: number;
  newThings: number;
  topics: string[];
  prsOpened: number;
  prsMerged: number;
  reposHelped: number;
};

/** Who a lesson was written for: their goal's kind and value, and their level's name. */
export type LessonWrittenFor = { kind: string; value: string; level: string };

export type LearnPrState = 'OPEN' | 'MERGED' | 'CLOSED';

/** One of the viewer's Learn attempts, as the Learn tab shows it. */
export type MyLearnAttempt = {
  attemptId: string;
  stage: LearnStage;
  /** Tells `SUBMITTING` apart from `REVIEW` while the pull request can be approved. */
  state: ContributeAttemptState;
  /** `owner/name`; null only when neither the attempt nor the pool has one. */
  repo: string | null;
  issueNumber: number;
  issueUrl: string | null;
  /** Null until the agent's first brief stores it. */
  title: string | null;
  latestEvent: ContributeAttemptEvent | null;
  prUrl: string | null;
  prOpenedAt: string | null;
  prState: LearnPrState | null;
  /** The lesson result's page, once the lesson is public. */
  resultUrl: string | null;
  /** The bound lesson's length in minutes; null before a lesson is bound. */
  lessonMinutes: number | null;
};
