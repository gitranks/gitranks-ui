/** GitRanks Contribute as the GitRanks GraphQL API answers it. */

export type ContributeLiveProvider = 'ANTHROPIC';
export type ContributeKeyState = 'VALID' | 'INVALID' | 'EXHAUSTED' | 'LIMIT_REACHED';
export type ContributePace = 'EVEN' | 'FAST' | 'QUEUED';
/** The paces a key connect may set: `QUEUED` is set in Settings alone. */
export type ContributeConnectPace = Exclude<ContributePace, 'QUEUED'>;
export type ContributeModel = 'CLAUDE_SONNET_5_5' | 'CLAUDE_OPUS_5_5' | 'CLAUDE_HAIKU_5_5';
export type ContributeEffort = 'LOW' | 'MEDIUM' | 'HIGH' | 'XHIGH' | 'MAX';
export type ContributeDcoMode = 'ASK' | 'STANDING';
export type ContributeLanguage = 'JS_TS' | 'PYTHON' | 'GO' | 'RUST' | 'JAVA' | 'PHP' | 'RUBY';
export type ContributeIssueKind = 'BUG' | 'FEATURE' | 'DOCS' | 'TESTS' | 'REFACTOR' | 'PERFORMANCE';
export type ContributeIssueSize = 'S' | 'M' | 'L';
export type ContributorStatus = 'ONBOARDING' | 'ACTIVE' | 'PAUSED';
export type ContributeClaudePlan = 'MAX_5X' | 'MAX_20X' | 'TEAM_STANDARD' | 'TEAM_PREMIUM' | 'CREDITS';
export type ContributeOnboardingStep = 'KEY' | 'PREFERENCES' | 'DONE';
/** The way that onboarded the user: a Claude key we run the agent on, or the first call of their own agent. */
export type ContributeOnboardedVia = 'HOSTED' | 'MCP';
export type ContributeConnectResult =
  | 'CONNECTED'
  | 'EXHAUSTED'
  | 'LIMIT_REACHED'
  | 'INVALID'
  | 'MANAGED_AGENTS_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'UNAVAILABLE'
  | 'REFUSED';
export type ContributeComingSoonProvider =
  | 'OPENAI'
  | 'CHATGPT'
  | 'COPILOT'
  | 'COPILOT_AGENT'
  | 'JULES'
  | 'CURSOR'
  | 'XAI'
  | 'OPENROUTER'
  | 'GEMINI'
  | 'MISTRAL'
  | 'DEEPSEEK';

export type ContributeCredential = {
  provider: ContributeLiveProvider;
  last4: string;
  orgId: string | null;
  workspaceId: string | null;
  state: ContributeKeyState;
  blockedUntil: string | null;
  ready: boolean;
  checkedAt: string;
  lastError: string | null;
};

export type ContributeSettings = {
  cycleCapUsd: number;
  weekCapUsd: number | null;
  dayCapUsd: number | null;
  attemptCapUsd: number;
  attemptsAtATime: number;
  pace: ContributePace;
  sweepDays: number;
  renewalDay: number;
  mainModel: ContributeModel;
  helperModel: ContributeModel;
  testModel: ContributeModel | null;
  effort: ContributeEffort;
  maxChangedLines: number;
  maxFiles: number;
  openPrsAtATime: number;
  dco: ContributeDcoMode;
  autopilot: boolean;
};

export type ContributeSettingsInput = Partial<ContributeSettings>;

export type ContributePreferences = {
  languages: ContributeLanguage[];
  topicIds: string[];
  kinds: ContributeIssueKind[];
  maxSize: ContributeIssueSize | null;
};

export type ContributePreferencesInput = Partial<ContributePreferences>;

export type ContributeSpend = {
  todayUsd: number;
  weekUsd: number;
  cycleUsd: number;
  cycleStart: string;
  cycleEnd: string;
  allowanceUsd: number;
  nextAttemptAt: string | null;
};

/**
 * The user's autopilot record. `mergedToUnlock`, `lockedAt` and `available` come from fields the API may not answer
 * yet: `undefined` is "not available yet".
 */
export type ContributeAutopilot = {
  unlocked: boolean;
  mergedCount: number;
  closedUnmergedStreak: number;
  /** Merged pull requests still needed to unlock it; 0 when unlocked. */
  mergedToUnlock?: number;
  /** When two pull requests closed without merging in a row last locked it. */
  lockedAt?: string | null;
  /** Autopilot is open. False: it is coming, and turning the setting on is refused. */
  available?: boolean;
};

export type Contributor = {
  status: ContributorStatus;
  login: string;
  plan: ContributeClaudePlan | null;
  step: ContributeOnboardingStep;
  credentials: ContributeCredential[];
  settings: ContributeSettings | null;
  preferences: ContributePreferences | null;
  spend: ContributeSpend | null;
  autopilot: ContributeAutopilot;
  /**
   * When a way of contributing first worked: a key was stored, or the user's own agent made its first call. Null until
   * then; `undefined` while the API does not answer it.
   */
  onboardedAt?: string | null;
  /** Which way that was; null until onboarded, `undefined` while the API does not answer it. */
  onboardedVia?: ContributeOnboardedVia | null;
};

export type ContributeGrant = { connected: boolean; login: string | null };

/**
 * The limits a key connect sets beside the monthly cap ("I'll set them myself"): a field left out keeps its value,
 * `null` is no week or day cap. The attempt cap may not be above any cap that is set.
 */
export type ContributeConnectLimits = {
  weekCapUsd?: number | null;
  dayCapUsd?: number | null;
  attemptCapUsd?: number;
  pace?: ContributeConnectPace;
};

export type ContributeConnectKeyResult = {
  result: ContributeConnectResult;
  retryAfterSec: number | null;
  credential: ContributeCredential | null;
};

export type ContributeDeleteDataResult = { deleted: boolean; grantRevoked: boolean };

export type ContributeIssuesFilter = {
  languages?: ContributeLanguage[];
  kinds?: ContributeIssueKind[];
  maxSize?: ContributeIssueSize;
};

export type ContributeIssue = {
  issueId: string;
  repositoryId: string;
  nameWithOwner: string;
  number: number;
  url: string;
  title: string | null;
  labels: string[];
  language: ContributeLanguage | null;
  kind: ContributeIssueKind | null;
  size: ContributeIssueSize | null;
  score: number;
  rank: number;
  why: string;
  /**
   * 0: from the user's own list (and every issue in the "All issues" mode), 1: an other issue shown after it, when the
   * list has nothing (more) ready. Read by the feed alone; issues read elsewhere leave it out.
   */
  tier?: number;
};

export type ContributeIssuePage = {
  items: ContributeIssue[];
  next: string | null;
  total: number;
  computedAt: string | null;
};

/** Where a shown issue stands now: still free, taken by the user's own agent, or by another contributor. */
export type ContributeIssueStatusValue = 'AVAILABLE' | 'CLAIMED_BY_YOU' | 'TAKEN';

export type ContributeIssueStatus = {
  issueId: string;
  status: ContributeIssueStatusValue;
  /** The user's attempt on it, with `CLAIMED_BY_YOU`; null otherwise. */
  attemptId: string | null;
};

/**
 * What the Contribute pages render from. `grant` and `paused` come from fields the API may not answer yet: `undefined`
 * is "not available yet", which the pages show as such instead of failing.
 */
export type ContributeView = {
  contributor: Contributor | null;
  grant: ContributeGrant | undefined;
  paused: boolean | undefined;
  /** Pull request access can be granted here (the app and its key ring are configured). */
  grantAvailable: boolean;
  /** The user's own agent: their paths and live tokens; `undefined` while the API does not answer them. */
  ownAgent?: ContributeOwnAgent;
  /** Attempts are open: an agent may start on an issue. `undefined` while the API does not answer it. */
  attemptsOpen?: boolean;
};

/** Which ways of contributing the user has set up: a Claude key, a token for their own agent. */
export type ContributePaths = { hosted: boolean; mcp: boolean };

/** A token for the user's own agent: never the token itself, only its last 4 characters. */
export type ContributeMcpToken = {
  id: string;
  name: string;
  last4: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export type ContributeOwnAgent = { paths: ContributePaths; tokens: ContributeMcpToken[] };

/** A token just created: the token itself is shown this once. */
export type ContributeMcpTokenCreated = { token: string; mcpToken: ContributeMcpToken };

export type ContributeAttemptRunner = 'MANAGED_AGENTS' | 'MCP';
export type ContributeAgentName =
  | 'CLAUDE_CODE'
  | 'CODEX'
  | 'CURSOR'
  | 'GEMINI_CLI'
  | 'COPILOT'
  | 'AIDER'
  | 'CLINE'
  | 'OTHER';
/** The agent as it reported itself; the model is shown as reported. */
export type ContributeAgent = { name: ContributeAgentName; model: string | null };
export type ContributeOpenedBy = 'SUBMIT' | 'HAND';

/** What an attempt made by the user's own agent adds; read on its own, so an API without it leaves the rest. */
export type ContributeOwnAgentFields = {
  runner: ContributeAttemptRunner;
  agent: ContributeAgent | null;
  changesRequested: { note: string; at: string } | null;
  leaseUntil: string | null;
  sendBacksLeft: number;
  openedBy: ContributeOpenedBy | null;
};

export type ContributeAttemptKind = 'FIRST' | 'FOLLOW_UP';
export type ContributeAttemptState =
  | 'QUEUED'
  | 'CLAIMING'
  | 'RUNNING'
  | 'CHECKS'
  | 'REVIEW'
  | 'PENDING_AUTOSUBMIT'
  | 'SUBMITTING'
  | 'PR_OPEN'
  | 'FOLLOW_UP'
  | 'MERGED'
  | 'CLOSED'
  | 'STOPPED'
  | 'DISCARDED'
  | 'DONE';
export type ContributeAttemptEndReason =
  | 'CLAIM_LOST'
  | 'NO_GO'
  | 'BUDGET'
  | 'TIMEOUT'
  | 'FAILED'
  | 'CHECKS_FAILED'
  | 'KEY_INVALID'
  | 'EXHAUSTED'
  | 'LIMIT_REACHED'
  | 'CANCELLED'
  | 'USER'
  | 'REVIEW_EXPIRED'
  | 'SUBMIT_FAILED'
  | 'RELEASED'
  | 'MCP_IDLE'
  | 'MCP_EXPIRED';
export type ContributeSubmitStep = 'QUEUED' | 'WAITING_CAP' | 'FORK' | 'SYNC' | 'PUSH' | 'PULL_REQUEST';
export type ContributePrState = 'OPEN' | 'MERGED' | 'CLOSED';
export type ContributeReviewDecision = 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED';
export type ContributeChecksState = 'SUCCESS' | 'FAILURE' | 'ERROR' | 'PENDING' | 'EXPECTED';
export type ContributeAttemptVerdict = 'DONE' | 'PARTIAL' | 'NO_GO';
export type ContributeRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type ContributeAttemptCheckName =
  | 'PATCH_PARSED'
  | 'NOT_EMPTY'
  | 'MAX_CHANGED_LINES'
  | 'MAX_FILES'
  | 'WORKFLOW_PATHS'
  | 'CI_CONFIG'
  | 'LOCKFILES'
  | 'LICENSE_FILES'
  | 'BINARY_FILES'
  | 'SECRETS'
  | 'TESTS_PASSED'
  | 'TEST_TOUCHED';

/** What last went wrong in a submission: a fixed code, and the API's note for the user. */
export type ContributeSubmitError = { reason: string; note: string; at: string };

/** When a write step (fork, sync, push, pull request) started and finished; `doneAt` null while it runs or failed. */
export type ContributeSubmitStepTime = { step: ContributeSubmitStep; startedAt: string; doneAt: string | null };

/**
 * A submission, from the approval on. `waitUntil` is set while it waits for the next day's pull requests. The steps'
 * clock (`steps`, `stepStartedAt`, `forkPending`, `retryAt`) is read in an operation of its own: absent while the API
 * does not answer it.
 */
export type ContributeAttemptSubmit = {
  step: ContributeSubmitStep;
  waitUntil: string | null;
  fork: string | null;
  branch: string | null;
  lastError: ContributeSubmitError | null;
  steps?: ContributeSubmitStepTime[] | null;
  stepStartedAt?: string | null;
  forkPending?: boolean | null;
  retryAt?: string | null;
};

/** The parts of an attempt the submission's stepper reads again while it submits, and when they were read. */
export type ContributeAttemptLive = Pick<
  ContributeAttempt,
  'attemptId' | 'state' | 'updatedAt' | 'submit' | 'pullRequest'
>;

export type ContributeAttemptPullRequest = {
  prId: string;
  number: number;
  url: string;
  state: ContributePrState;
  openedAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  reviewDecision: ContributeReviewDecision | null;
  checks: ContributeChecksState | null;
  syncedAt: string | null;
};

/** What the last read of an open pull request found: changes requested, a new comment, a check newly failing. */
export type ContributePrSignalKind = 'CHANGES_REQUESTED' | 'COMMENT' | 'CHECK_FAILED';

export type ContributePrSignal = {
  kind: ContributePrSignalKind;
  at: string;
  /** For a failing check: the failing checks' names. */
  detail: string | null;
};

/** The pull request needs the user: what happened on it since they last acted on it, newest last. */
export type ContributeNeedsYou = { since: string; signals: ContributePrSignal[] };

/** A pull request's follow-up rounds; past the last one the pull request is the user's to carry on. */
export type ContributeFollowUps = {
  used: number;
  left: number;
  max: number;
  handedOff: boolean;
  handedOffAt: string | null;
  /** The follow-up under way. */
  currentAttemptId: string | null;
};

/** The pull request a follow-up works on, and the first attempt that opened it. */
export type ContributeFollowUpOf = { attemptId: string; prId: string; number: number; url: string };

/** The fields of an attempt that came with follow-ups; asked on their own, so an API without them leaves the rest. */
export type ContributeAttemptFollowUpFields = {
  /** A first attempt's open pull request needs the user; null when it does not. */
  needsYou: ContributeNeedsYou | null;
  /** A first attempt with a pull request: its rounds. */
  followUps: ContributeFollowUps | null;
  /** A follow-up: the pull request it works on. */
  followUpOf: ContributeFollowUpOf | null;
  /** While waiting for autopilot: when it submits unless the user stops it. */
  autosubmitAt: string | null;
  /** Submitted (or to be) by autopilot, not approved by the user. */
  autopilot: boolean;
};

/** One attempt: an agent session on one issue, and what came of it. */
export type ContributeAttempt = Partial<ContributeAttemptFollowUpFields> &
  Partial<ContributeOwnAgentFields> & {
    attemptId: string;
    issueId: string;
    repositoryId: string;
    nameWithOwner: string | null;
    number: number;
    title: string | null;
    url: string | null;
    kind: ContributeAttemptKind;
    state: ContributeAttemptState;
    model: ContributeModel | null;
    budgetUsd: number;
    costUsd: number;
    endReason: ContributeAttemptEndReason | null;
    endDetail: string | null;
    checksPassed: boolean | null;
    approvedAt: string | null;
    submit: ContributeAttemptSubmit | null;
    pullRequest: ContributeAttemptPullRequest | null;
    createdAt: string;
    updatedAt: string;
    /**
     * When the attempt last became ready for review: its seven days run from it. Asked on its own; `undefined` while
     * the API does not answer it.
     */
    reviewAt?: string | null;
  };

export type ContributeAttemptTest = { command: string; passed: boolean; output: string | null };

export type ContributeAttemptResult = {
  verdict: ContributeAttemptVerdict | null;
  summary: string;
  tests: ContributeAttemptTest[];
  filesChanged: string[];
  risk: ContributeRiskLevel | null;
  riskNotes: string | null;
  prBody: string | null;
  /** The title the user's own agent proposed; `undefined` while the API does not answer it. */
  prTitle?: string | null;
};

export type ContributeRepoReadiness = {
  install: string | null;
  build: string | null;
  test: string | null;
  toolchain: string | null;
  notes: string | null;
};

export type ContributeAttemptCheck = { name: ContributeAttemptCheckName; passed: boolean; detail: string | null };

export type ContributeAttemptCost = { totalUsd: number; goNoGoUsd: number; workUsd: number; runtimeUsd: number };

export type ContributeAttemptApproval = { title: string; body: string; dco: boolean; at: string };

export type ContributeAttemptEvent = { state: ContributeAttemptState; detail: string | null; at: string };

/** One attempt for the review screen. `patch` is `git format-patch` text: untrusted, rendered as text only. */
export type ContributeAttemptDetail = ContributeAttempt & {
  patch: string | null;
  result: ContributeAttemptResult | null;
  readiness: ContributeRepoReadiness | null;
  checks: ContributeAttemptCheck[];
  cost: ContributeAttemptCost;
  approval: ContributeAttemptApproval | null;
  events: ContributeAttemptEvent[];
  /** The pull request's reply drafts (a follow-up: the ones it wrote); `undefined` while the API does not answer them. */
  replyDrafts?: ContributeReplyDraft[];
};

/** The review comment a reply answers: the first comment of its thread. */
export type ContributeReplyTarget = {
  commentId: string;
  author: string | null;
  path: string | null;
  line: number | null;
  /** The comment's first 300 characters. */
  excerpt: string;
};

export type ContributeReplyState = 'DRAFT' | 'POSTING' | 'POSTED' | 'FAILED';

/** A reply a follow-up drafted; posted on GitHub only once the user approves it. Its text is untrusted. */
export type ContributeReplyDraft = {
  draftId: string;
  prId: string;
  /** The follow-up that drafted it. */
  attemptId: string;
  /** Null: a top-level comment on the pull request. */
  comment: ContributeReplyTarget | null;
  text: string;
  state: ContributeReplyState;
  posted: boolean;
  postedAt: string | null;
  /** The posted comment on GitHub. */
  url: string | null;
  /** Why the last post failed. */
  lastError: ContributeSubmitError | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * A reply draft the user can approve now, with its pull request. `inReview`: its follow-up is itself waiting for the
 * user (in review, or about to be submitted by autopilot), so the draft is part of that review.
 */
export type ContributeReplyWaiting = ContributeReplyDraft & {
  nameWithOwner: string | null;
  prNumber: number;
  inReview: boolean;
};

/** What the scheduler counts before it starts an attempt: pull requests open or on their way, and issues queued. */
export type ContributeScheduleCounts = { prBound: number; queued: number };

/** One of the user's pull requests opened through Contribute. */
export type ContributeContribution = {
  attemptId: string;
  issueId: string;
  repositoryId: string;
  nameWithOwner: string | null;
  issueNumber: number;
  title: string | null;
  pullRequest: ContributeAttemptPullRequest;
  costUsd: number;
  /** The open pull request needs the user; `undefined` while the API does not answer it. */
  needsYou?: ContributeNeedsYou | null;
  /** The pull request's follow-up rounds; `undefined` while the API does not answer them. */
  followUps?: ContributeFollowUps;
  /** Who made it: a session on the user's key, or their own agent; `undefined` while the API does not answer it. */
  runner?: ContributeAttemptRunner;
  agent?: ContributeAgent | null;
  openedBy?: ContributeOpenedBy | null;
};

/** The totals Overview's impact shows; `reposHelped` is asked on its own, `undefined` while it is not answered. */
export type ContributeImpactTotals = { open: number; merged: number; closed: number; reposHelped?: number };

export type ContributeContributions = {
  items: ContributeContribution[];
  totals: { open: number; merged: number; closed: number; costUsd: number };
};

/** What a GitHub token may do in a repository; the maintainers page lists only `ADMIN` and `MAINTAIN`. */
export type ContributeRepoPermission = 'ADMIN' | 'MAINTAIN' | 'WRITE' | 'TRIAGE' | 'READ';

/** A public repository the visitor administers or maintains, and whether it is out of Contribute. */
export type ContributeMaintainerRepo = {
  /** The repository's GitHub node id: what an opt-out takes. */
  repoId: string;
  nameWithOwner: string;
  permission: ContributeRepoPermission;
  stars: number;
  isArchived: boolean;
  optedOut: boolean;
  optedOutAt: string | null;
};

export type ContributeMaintainerRepos = {
  /** The GitHub account the sign-in belongs to. */
  login: string;
  /** Most stars first. */
  repos: ContributeMaintainerRepo[];
  /** GitHub held more repositories than were read (the most-starred ones). */
  truncated: boolean;
};

/** Why a repository asked to be opted out or back in was left as it was. */
export type ContributeOptOutRefusal = 'NOT_MAINTAINER' | 'UNKNOWN_REPO';

/** One repository asked to be opted out or back in, in the order asked. */
export type ContributeOptOutResult = {
  repoId: string;
  /** Null when the id names no repository the account can see. */
  nameWithOwner: string | null;
  optedOut: boolean;
  optedOutAt: string | null;
  /** Null when it was changed. */
  reason: ContributeOptOutRefusal | null;
};

/** Where the user's issues come from: every project we pick, the libraries their repos use, or their own list. */
export type ContributeSetMode = 'ALL' | 'STACK' | 'REPOS';
/** The modes with a list of their own. */
export type ContributeSetListMode = Exclude<ContributeSetMode, 'ALL'>;
/** The lists the user edits: the repos whose dependencies make their stack, or the repos they support. */
export type ContributeSetList = 'SOURCES' | 'REPOS';
/** When a list has nothing ready: wait for new issues, or work on all issues meanwhile. */
export type ContributeSetFallback = 'SET_ONLY' | 'THEN_ALL';
export type ContributeSetRepoStatus = 'CHECKING' | 'ACTIVE' | 'FAILED' | 'UNSUPPORTED';
export type ContributeSetRepoViaKind = 'ME' | 'OWNER' | 'REPO';
/** Why a repo did not pass the rules, in the order the page lists them. */
export type ContributeSetReason =
  | 'PRIVATE'
  | 'DELETED'
  | 'FORK'
  | 'ARCHIVED'
  | 'ISSUES_DISABLED'
  | 'PUSHED'
  | 'LICENSE'
  | 'LANGUAGE'
  | 'OUTSIDE_MERGES'
  | 'OPTED_OUT'
  | 'AI_BAN'
  | 'CONTRIBUTE_OFF'
  | 'NO_MANIFEST';
export type ContributeStackResolveState = 'RESOLVING' | 'READY' | 'FAILED';
export type ContributeFeedbackTopic = 'GATES' | 'MODES' | 'OTHER';

/** Work the API is doing for the user that takes a while: worked out libraries, new repos read, a wait. */
export type ContributeActivityKind = 'STACK_RESOLVE' | 'FIRST_READS' | 'FIRST_READS_WAITING' | 'READS_PAUSED';
/** A Contribute tab an activity shows on. */
export type ContributeActivityTab = 'OVERVIEW' | 'ISSUES' | 'SETTINGS';
/** Where one repo is: its rules read first, queued, its issues read, then sorted, or waiting. */
export type ContributeActivityRepoStage = 'CHECKING' | 'QUEUED' | 'READING' | 'SORTING' | 'READ' | 'WAITING' | 'PAUSED';

export type ContributeActivityRepo = {
  repositoryId: string;
  nameWithOwner: string;
  stage: ContributeActivityRepoStage;
};

/** One piece of work in progress. */
export type ContributeActivityItem = {
  kind: ContributeActivityKind;
  tabs: ContributeActivityTab[];
  /** One plain line, e.g. "Reading issues from 14 of 20 repos". */
  label: string;
  /** Null when it cannot be counted. */
  done: number | null;
  total: number | null;
  startedAt: string;
  /** When it should be done (an estimate); null when no time can be promised. */
  expectedAt: string | null;
  repos: ContributeActivityRepo[];
};

/** The user's work in progress; no items when nothing runs. */
export type ContributeActivity = { items: ContributeActivityItem[]; readAt: string };

/** How a repo got on a list: "@me", a user or org (its login), or on its own. */
export type ContributeSetRepoVia = { kind: ContributeSetRepoViaKind; login: string | null };

export type ContributeSetRepo = {
  repositoryId: string;
  nameWithOwner: string;
  stars: number;
  /** Null: a language not supported yet. */
  language: ContributeLanguage | null;
  via: ContributeSetRepoVia;
  addedAt: string;
  status: ContributeSetRepoStatus;
  /** Why it did not pass; empty otherwise. */
  reasons: ContributeSetReason[];
};

/** A library the user's stack uses. */
export type ContributeStackTarget = ContributeSetRepo & {
  /** How many of the user's repos use it. */
  usage: number;
  /** Up to 5 of its package names those repos depend on. */
  packages: string[];
};

/** A library that did not pass the rules. */
export type ContributeStackFailedRepo = {
  repositoryId: string;
  nameWithOwner: string;
  usage: number;
  reasons: ContributeSetReason[];
};

/** The libraries worked out from the user's repos, the last time. */
export type ContributeStackResolve = {
  state: ContributeStackResolveState;
  startedAt: string;
  endedAt: string | null;
  /** The ones that passed, most used first; then the ones in a language not supported yet. */
  targets: ContributeStackTarget[];
  failed: ContributeStackFailedRepo[];
  /** Packages with no GitHub repo. */
  unlinked: number;
  /** Packages read. */
  packages: number;
};

export type ContributeSetStack = {
  sources: ContributeSetRepo[];
  /** The repos that count toward the cap. */
  count: number;
  fallback: ContributeSetFallback;
  /** Null before the libraries were first worked out. */
  resolve: ContributeStackResolve | null;
};

export type ContributeSetRepos = {
  repos: ContributeSetRepo[];
  /** The repos that count toward the cap. */
  count: number;
  fallback: ContributeSetFallback;
};

export type ContributeIgnoredRepo = { repositoryId: string; nameWithOwner: string; at: string };

export type ContributeSetLimits = {
  sources: number;
  repos: number;
  targets: number;
  ignore: number;
  addsPerDay: number;
  resolvesPerDay: number;
  feedbackPerDay: number;
  feedbackMaxChars: number;
};

/** What the user works on: the mode, each mode's list and fallback, and the ignored repos. */
export type ContributeSet = {
  mode: ContributeSetMode;
  stack: ContributeSetStack;
  repos: ContributeSetRepos;
  ignore: ContributeIgnoredRepo[];
  /** Grows with every change. */
  version: number;
  limits: ContributeSetLimits;
};

/** What one add did, and the set after it. */
export type ContributeSetAddResult = {
  added: ContributeSetRepo[];
  /** Passed the rules: the ones added and the ones that did not fit. */
  passed: number;
  /** Repos read: a user's or org's most-starred ones, or 1 for a repo. */
  considered: number;
  /** The list filled up before every passing repo fit. */
  full: boolean;
  skipped: {
    ignored: number;
    duplicate: number;
    unsupported: ContributeSetRepo[];
    failed: { reason: ContributeSetReason; count: number }[];
  };
  set: ContributeSet;
};

/** Where the feedback dialog was opened, sent with the message. */
export type ContributeFeedbackContext = {
  mode?: ContributeSetMode;
  repo?: string;
  reasons?: ContributeSetReason[];
};
