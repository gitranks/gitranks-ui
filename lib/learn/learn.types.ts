/** GitRanks Learn, as the API answers it: a lesson on a fix the user's own agent made, and the user's run through it. */

import type { ContributeAttemptEvent, ContributeAttemptState } from '@/lib/workspace/contribute.types';

export type LessonVisibility = 'PRIVATE' | 'PUBLIC' | 'REMOVED' | 'HIDDEN' | 'HELD';
export type LessonStepState = 'OPEN' | 'KNEW' | 'FIRST_TRY' | 'TRY_N' | 'REPORTED';
export type LessonQuestionType = 'SINGLE' | 'MULTI';
export type LessonQuestionRole = 'STEP' | 'WARMUP';
export type LessonSubjectType = 'ISSUE' | 'REPO' | 'RULES' | 'FEATURE' | 'TOPIC';
export type LessonBlockType = 'TEXT' | 'DIAGRAM' | 'DIFF' | 'CODE' | 'COMPARE' | 'TABLE';
export type LessonDiffLineKind = 'HUNK' | 'CTX' | 'ADD' | 'DEL';
export type LessonDiagramTone = 'PLAIN' | 'ACCENT' | 'WARN';
/** How a diagram is drawn: boxes and arrows, or a call sequence (actors left to right, calls top to bottom). */
export type LessonDiagramLayout = 'FLOW' | 'SEQUENCE';
/** What the two sides of a before-and-after are: small diagrams, or code excerpts. */
export type LessonCompareOf = 'DIAGRAM' | 'CODE';
export type LessonReportReason = 'WRONG_KEY' | 'UNCLEAR' | 'OFF_TOPIC' | 'TWO_FIT';
export type ContributeAttemptMode = 'FIX' | 'LEARN';

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

export type LessonDiagramNode = {
  id: string;
  label: string;
  sub: string | null;
  tone: LessonDiagramTone;
  mono: boolean;
};
/**
 * An arrow, or in a sequence a call: `label` is drawn on it (a call's code, or what comes back), `reply` is a dashed
 * arrow back, `tone` ACCENT marks what the fix changed and WARN what is broken.
 */
export type LessonDiagramEdge = {
  from: string;
  to: string;
  label: string | null;
  reply: boolean;
  tone: LessonDiagramTone;
};
/** One side of a before-and-after: a small diagram's nodes and edges, or a code excerpt. */
export type LessonCompareSide = {
  nodes: LessonDiagramNode[] | null;
  edges: LessonDiagramEdge[] | null;
  path: string | null;
  fromLine: number | null;
  toLine: number | null;
  excerpt: string | null;
};
export type LessonDiffLine = { kind: LessonDiffLineKind; text: string };

/** One block of a step; the fields its type uses are set, the rest null. */
export type LessonBlock = {
  type: LessonBlockType;
  text: string | null;
  nodes: LessonDiagramNode[] | null;
  edges: LessonDiagramEdge[] | null;
  caption: string | null;
  /** A diagram's drawing: FLOW when the lesson gives none. */
  layout: LessonDiagramLayout | null;
  file: string | null;
  lines: LessonDiffLine[] | null;
  /** Indexes into `lines`: the lines to ring. */
  mark: number[] | null;
  repo: string | null;
  commit: string | null;
  path: string | null;
  fromLine: number | null;
  toLine: number | null;
  excerpt: string | null;
  /** A before-and-after: what its sides are, and the two sides (code: the file at `commit`, then after the fix). */
  compareOf: LessonCompareOf | null;
  before: LessonCompareSide | null;
  after: LessonCompareSide | null;
  /** A table: its heads, its rows (one cell per column, plain text with `code` spans), the index of the row to ring. */
  columns: string[] | null;
  rows: string[][] | null;
  ring: number | null;
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

/** A public lesson whose page is open, as its page shows it to anyone: the sitemaps' and the pages for agents' list. */
export type PublicLesson = {
  slug: string;
  title: string;
  language: string | null;
  /** `owner/name` of the repository the fix is in. */
  repo: string | null;
  publishedAt: string;
  /** When the page's content last changed. */
  modifiedAt: string;
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

export type LessonCounts = {
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

export type LearnLevelInput = { language: string; level: number };
export type LearnProfileInput = {
  goalKind: LearnGoalKind;
  goalValue: string;
  levels: LearnLevelInput[];
  focus: LearnFocus[];
};

export type MyLessonState = 'IN_PROGRESS' | 'PASSED' | 'PR_OPEN' | 'REMOVED' | 'ENDED';

/** One of the user's lessons: a Learn attempt of theirs (`attemptId`), or a shared lesson they passed (`slug`). */
export type MyLesson = {
  slug: string | null;
  attemptId: string | null;
  title: string;
  repo: string | null;
  state: MyLessonState;
  passedAt: string | null;
};

/** A maintainer's answer to "Did this help you review the pull request?". */
export type LessonReaction = 'YES' | 'NO';

/** An option with its key: shown on a result page, where the kind allows it. */
export type LessonOptionKeyed = { id: string; text: string; correct: boolean; why: string };
export type LessonQuestionKeyed = Omit<LessonQuestion, 'options'> & { options: LessonOptionKeyed[] };

/** A lesson anyone with the link may read: its head and every step, never a question's key. */
export type LessonPage = { __typename: 'LessonPage'; head: LessonHead; steps: LessonStep[] };

/** A lesson that is not public: its visibility alone, no title, author or subject. */
export type LessonStub = { __typename: 'LessonStub'; visibility: LessonVisibility };

/** A signed-in reaction on a result page; `role` is the person's role on the repository (maintainer, collaborator). */
export type LessonResultReaction = { login: string; role: string; reaction: LessonReaction };

/** One login's passed run of a lesson, as anyone may read it: the proof of a pass. */
export type LessonResultPage = {
  __typename: 'LessonResultPage';
  head: LessonHead;
  /** The GitHub account's current login. */
  login: string;
  /** The login when the run passed. */
  loginAtPass: string;
  githubId: number;
  version: number;
  passedAt: string;
  minutes: number;
  steps: LessonStep[];
  results: LessonStepResult[];
  /** The step questions the run was asked, with their key; empty when the kind keeps its key. */
  asked: LessonQuestionKeyed[];
  reactions: LessonResultReaction[];
};

/** Where a Learn suggestion shows: the home page, or the owner's own profile. */
export type LearnPromoPlacement = 'LANDING' | 'PROFILE';

/** An open issue the suggestion offers, with the lesson's topic it would teach. */
export type LearnPromoIssue = {
  title: string;
  repo: string;
  number: number;
  language: string | null;
  topic: string | null;
};

/** Whether to suggest Learn to the viewer, and why: `reason` is one line about them ("You started…"). */
export type LearnPromo = { show: boolean; reason: string | null; language: string | null; issues: LearnPromoIssue[] };

/** A login's Learn record, from their public passes: lessons, topics learned, pull requests opened and merged. */
export type LearnRecord = { lessons: number; topics: string[]; prsOpened: number; prsMerged: number };

/** A saved Learn goal, as the issues for it name it: `kind` is language, project or domain; `level` its level's name. */
export type LearnGoalView = { kind: string; value: string; level: string | null };

/**
 * Why the issues for the goal are empty: none fit it today, Learn can't find issues for it, the day's cap on new issues,
 * or GitHub's titles could not be read.
 */
export type LearnIssuesEmpty = 'NONE_TODAY' | 'GOAL_UNSUPPORTED' | 'CAP' | 'UNREAD';

/** An open issue a lesson can be written for: picked from the ready issues for the viewer's goal. */
export type LearnIssue = {
  issueId: string;
  url: string;
  /** `owner/name`. */
  repo: string;
  number: number;
  title: string;
  /** The repository's GitHub language, as GitHub names it ("TypeScript"). */
  language: string | null;
  /** `S`, `M`, or null. */
  size: string | null;
  /** One line on why it was picked. */
  why: string | null;
};

/** The limit that leaves the viewer no room for a new claim: `attempts_at_a_time` or `open_prs_at_a_time`. */
export type LearnRoom = { limit: string; value: number };

/** The issues for the viewer's goal, with why there are none and whether they have room to start one. */
export type LearnIssues = {
  /** Null when no goal is saved. */
  goal: LearnGoalView | null;
  items: LearnIssue[];
  /** The list's length before `first` and the day's cap. */
  total: number;
  /** Null whenever `total` is above 0, and with no goal. */
  empty: LearnIssuesEmpty | null;
  capReached: boolean;
  /** Null when the viewer has room for a new claim. */
  room: LearnRoom | null;
};

/** Who a lesson was written for: their goal's kind and value, and their level's name. */
export type LessonWrittenFor = { kind: string; value: string; level: string };

/** Another learner's finished lesson for the same goal, offered as practice. */
export type PracticeLesson = {
  slug: string;
  title: string;
  repo: string | null;
  issue: number | null;
  issueTitle: string | null;
  language: string | null;
  author: LessonAuthor;
  writtenFor: LessonWrittenFor;
  publishedAt: string;
  passes: number;
  topics: string[];
  steps: number;
  minutes: number;
};

export type PracticeLessons = { items: PracticeLesson[]; total: number };

export type LearnPrState = 'OPEN' | 'MERGED' | 'CLOSED';

/** One of the viewer's Learn attempts, as Learn home shows it. */
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
};

/** The viewer's newest Learn attempt in progress, and their newest one's pull request opened in the last 14 days. */
export type MyLearnAttempts = { current: MyLearnAttempt | null; lastPullRequest: MyLearnAttempt | null };

/**
 * What a passed practice lesson offers next: the viewer's own lesson in progress, or the first issues for their goal
 * (`issues.goal` null: no goal saved yet). Null parts were not read.
 */
export type PracticeNext = { current: MyLearnAttempt | null; issues: LearnIssues | null };
