/**
 * A pull request's page, Approve and the list of pull requests, as the GitRanks GraphQL API answers them: one page for
 * Learn and Contribute. The parts in `components/workspace/pr-parts/` draw them from this data alone.
 */

/** Which product a fix was made in. */
export type LearnFixMade = 'LEARN' | 'CONTRIBUTE';

/** A lesson an issue or a fix is linked to. */
export type LearnIssueLesson = {
  slug: string;
  title: string;
  /** The course's slug. */
  course: string;
  courseName: string;
};

/** The strip's stages: Learn has all five, Contribute has no Walkthrough. */
export type PullRequestStage = 'FIX' | 'WALKTHROUGH' | 'APPROVE' | 'REVIEW' | 'MERGED';

/** Where a pull request stands, one state at a time, each with its words and its one action. */
export type PullRequestBox =
  | 'FIXING'
  | 'WRITING_WALKTHROUGH'
  | 'REWRITING_WALKTHROUGH'
  | 'WALKTHROUGH'
  | 'APPROVE'
  | 'OPENING'
  | 'OPEN'
  | 'ONLY_YOU'
  | 'ROUND_WAITING'
  | 'ROUND_WORKING'
  | 'ROUND_READY'
  | 'WITH_MAINTAINERS'
  | 'MERGED'
  | 'CLOSED'
  | 'STOPPED'
  | 'DISCARDED';

/** A round: what one answer to the maintainers takes. */
export type PullRequestRoundState = 'WAITING' | 'WORKING' | 'READY' | 'SENT' | 'NOT_NEEDED';

/** Why the person marked a round as not needed. */
export type PullRequestRoundNotNeeded =
  | 'FAILS_ON_BASE'
  | 'ASKS_NOTHING'
  | 'ALREADY_ANSWERED'
  | 'BOT_IS_WRONG'
  | 'OTHER';

/** Who closed a round that is not needed: the person ("You marked it"), or GitRanks ("Not needed any more"). */
export type PullRequestRoundCloser = 'PERSON' | 'GITRANKS';

/** Who can act on a check that does not pass. */
export type PullRequestCheckClass = 'AGENT_CAN_FIX' | 'NEEDS_YOU' | 'NOT_YOURS';

/** What became of a pull request, as one line under the box. */
export type PullRequestOutcome = 'SILENT' | 'REPO_OUT';

/**
 * What asked for an answer, or what came after a round was sent. `kind` is the signal's: `changes_requested`,
 * `comment`, `conversation`, `check_failed`, or one this UI does not know yet.
 */
export type PullRequestRoundAsk = {
  /** The comment's id, where GitHub gives one. */
  id: string | null;
  kind: string;
  author: string;
  bot: boolean;
  /** Three lines at most of what they wrote. */
  excerpt: string | null;
  /** A review's comments, or a bot's. */
  comments: number | null;
  url: string;
};

/** A reply the agent drafted. */
export type PullRequestReply = {
  id: string;
  /** Whom it answers: a login, or a review ("mara-k’s review"). */
  to: string;
  text: string;
  /** The person left it out: it is not sent with the round. */
  leftOut: boolean;
};

export type PullRequestRound = {
  n: number;
  state: PullRequestRoundState;
  openedAt: string;
  asked: PullRequestRoundAsk[];
  /** What the agent did, in its own short words. */
  did: string | null;
  commits: number | null;
  replies: PullRequestReply[];
  sentAt: string | null;
  /** What came after it was sent and asks for nothing. */
  since: PullRequestRoundAsk[];
  notNeeded: PullRequestRoundNotNeeded | null;
  /** Who closed it, while it is not needed; null in any other state, and absent from an older API. */
  closedBy?: PullRequestRoundCloser | null;
  /** The prompt for the person's own agent, while the round waits. */
  prompt: string | null;
};

export type PullRequestCheck = {
  name: string;
  class: PullRequestCheckClass;
  reason: string;
  url: string;
};

/** Four counts, and a row for each check that does not pass. A count the API does not know is null. */
export type PullRequestChecks = {
  pass: number | null;
  agentCanFix: number | null;
  needsYou: number | null;
  notYours: number | null;
  rows: PullRequestCheck[];
};

export type PullRequestWalkthroughCard = {
  questions: number;
  answered: number;
  passedAt: string | null;
  /** People who read it; null before it is public. */
  readers: number | null;
  /** The person's answers are shared. */
  shared: boolean;
};

export type PullRequestChange = {
  /** The agent's short words about it. */
  summary: string | null;
  files: number;
  added: number;
  removed: number;
};

/**
 * Something only the person can do. `kind`: `cla`, `dco`, `conversation`, `title`, `check_yours`, `bot_blocked`,
 * `github`, `replies_failed`, or one this UI does not know yet.
 */
export type PullRequestOnlyYou = {
  kind: string;
  text: string;
  url: string | null;
};

/**
 * A Learn fix's three ways on once its pull request is with the maintainers or merged, as addresses: "Learn the lesson
 * it used", "Another issue on this lesson", "Back to your course". Each is null when what it leads to does not exist.
 */
export type PullRequestWaysOn = {
  lessonQuestions: string | null;
  lessonIssues: string | null;
  course: string | null;
};

/** One file of the change, for Approve's list. */
export type PullRequestFile = { path: string; added: number; removed: number };

export type PullRequestPage = {
  attemptId: string;
  made: LearnFixMade;
  /** A hosted agent started it. */
  hosted: boolean;
  /** The person's own agent's name; null for a hosted one. Absent from fixtures that leave it to a prop. */
  agent?: string | null;
  /** `owner/name`. */
  repo: string;
  issueNumber: number;
  issueTitle: string;
  issueUrl: string;
  /** The pull request's number, once it is open. */
  number: number | null;
  url: string | null;
  lesson: LearnIssueLesson | null;
  /** The fix confirmed the lesson; before that it is a prediction. */
  lessonConfirmed: boolean;
  stages: PullRequestStage[];
  /** The current stage, or the one an ended pull request stopped at. */
  stage: PullRequestStage;
  /** The agent or GitRanks works in the current stage now. */
  working: boolean;
  box: PullRequestBox;
  /** The round the box is about. */
  round: number | null;
  /** While `OPENING`: the part it is in, 1 to 5. */
  openingStep: number | null;
  /** Autopilot will send it unless the person says "Don't send it". */
  autoSend?: boolean;
  /** A hosted round stopped at the person's limit. */
  stoppedAtLimit?: boolean;
  onlyYou: PullRequestOnlyYou[];
  change: PullRequestChange | null;
  walkthrough: PullRequestWalkthroughCard | null;
  /** Newest first. */
  rounds: PullRequestRound[];
  /** Words that ask for nothing from before any round was sent, oldest first. */
  since?: PullRequestRoundAsk[];
  checks: PullRequestChecks | null;
  /** The repository's rules for pull requests, as text. */
  rules: string | null;
  /** The lesson's own questions can be offered. */
  lessonToAsk: boolean;
  outcome: PullRequestOutcome | null;
  /** A Learn fix's ways on; null for Contribute and before the pull request is sent. */
  waysOn?: PullRequestWaysOn | null;
};

/** What Approve needs before the press. */
export type PullRequestApproval = {
  title: string;
  description: string;
  /** What GitRanks adds under the description. */
  footer: string;
  /** A prefix the project wants the title to start with. */
  titlePrefix: string | null;
  signOffNeeded: boolean;
  /** The person's settings give the sign-off. */
  signOffOn: boolean;
  /** GitHub's permission to open pull requests is there. */
  githubAllowed: boolean;
  /** Learn: the walkthrough is passed; null for Contribute. */
  walkthroughPassed: boolean | null;
  /** The lesson whose questions are offered after sending. */
  lessonLater: LearnIssueLesson | null;
  change: PullRequestChange;
  /** The change file by file, the first 300 at most; absent from fixtures. */
  files?: PullRequestFile[];
  /** How many files the change has, listed or not. */
  filesTotal?: number;
};

export type PullRequestListGroup = 'NEEDS_YOU' | 'IN_PROGRESS' | 'ENDED';

export type PullRequestListMark = 'NEEDS_YOU' | 'AGENT_WORKING' | 'MAINTAINERS' | 'MERGED';

export type PullRequestListRow = {
  attemptId: string;
  made: LearnFixMade;
  repo: string;
  issueNumber: number;
  issueUrl: string;
  number: number | null;
  url: string | null;
  title: string;
  group: PullRequestListGroup;
  box: PullRequestBox;
  round: number | null;
  mark: PullRequestListMark | null;
  /** The agent's name. */
  agent: string | null;
  /** What a hosted run cost so far. */
  costUsd: number | null;
  lesson: LearnIssueLesson | null;
  /** The fix's public page was removed. */
  pageRemoved: boolean;
  /** When it came to where it stands. */
  since: string;
  /** A stopped row ended at the person's limit, not by a maintainer's stop. */
  stoppedAtLimit?: boolean;
  /**
   * The row's page: the issue's, or an earlier attempt's when a later fix of the same issue exists; null when the
   * repository's name is not known (no page then). Absent from fixtures: the issue's page.
   */
  path?: string | null;
  /** Not the API's row: its walkthrough waits for another pass by the person's agent, read apart. */
  walkthroughBlocked?: { reason: string | null };
};

export type PullRequestList = {
  rows: PullRequestListRow[];
  /** Open now. */
  open: number;
  /** Open at a time. */
  limit: number;
  atLimit: boolean;
  /** The cursor of 20 more of "Ended". */
  more: string | null;
};
