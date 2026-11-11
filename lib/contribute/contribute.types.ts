import type {
  ContributeConventionsFields,
  ContributePrConventionIssue,
  ContributePrFix,
  ContributeRepoConventions,
} from './pr-conventions';

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
  /**
   * Where the email before each autopilot submission goes, masked (`m•••@gmail.com`); null when no address is known,
   * and then turning the setting on is refused.
   */
  noticeTo?: string | null;
};

/**
 * Why autopilot left a change for the user's review: no email to tell them first (`no_email`), the email not sent in
 * time (`notice_late`), autopilot turned off or locked meanwhile (`autopilot_off`), the user's Stop (`vetoed`), a
 * run the user forced past a no-go, theirs to approve (`override`), or a hold: a beginner issue (`beginner_issue`), one
 * it could not read to check (`issue_unread`), a repo that asks for a person's review (`repo_manual_only`).
 */
export type ContributeAutopilotReviewReason =
  | 'no_email'
  | 'notice_late'
  | 'autopilot_off'
  | 'vetoed'
  | 'override'
  | 'beginner_issue'
  | 'issue_unread'
  | 'repo_manual_only';

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
  /** The access level and the limits it sets now; `undefined` while the API does not answer it. */
  limits?: ContributeLimits;
};

/**
 * The account's access level: the settings as chosen (`STANDARD`), smaller limits for now (`REDUCED`), or nothing new
 * starts (`SUSPENDED`).
 */
export type ContributeAccessLevel = 'STANDARD' | 'REDUCED' | 'SUSPENDED';

/** Why the limits are reduced: every new account starts so, or the recent claims ran out. */
export type ContributeAccessReason = 'NEW_ACCOUNT' | 'FOLLOW_THROUGH';

/** The limits that hold for the account now: the settings' maxima and the day's counts. */
export type ContributeLimits = {
  level: ContributeAccessLevel;
  /** Why `REDUCED`; null at any other level. */
  reason: ContributeAccessReason | null;
  /** The most attempts at a time that hold now: the settings field's maximum. */
  attemptsAtATime: number;
  /** The most open pull requests at a time that hold now: the settings field's maximum. */
  openPrsAtATime: number;
  /** New claims a day, every runner together. */
  claimsPerDay: number;
  /** Newly shown issues a day. */
  revealsPerDay: number;
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
  /** A label keeps it for first-time contributors (first-timers-only, newcomers). The feed asks it: needs the API that sends it. */
  forNewcomers?: boolean;
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
  /** Its repo's rules for AI contributions, in our words; null when not known, absent from an older API (read on its own). */
  repoRules?: ContributeIssueRepoRules | null;
};

/** The day's cap on newly shown issues: `reached` once no new issue can be shown until 00:00 UTC. */
export type ContributeDailyCap = { limit: number; reached: boolean };

export type ContributeIssuePage = {
  /** Can hold fewer than asked for: new issues past the day's cap are left off. */
  items: ContributeIssue[];
  /** The next page's cursor; null on the last page, and once only issues past the day's cap remain. */
  next: string | null;
  total: number;
  computedAt: string | null;
  /** The day's cap on new issues; null while well under it, and left out where the page is not read with it. */
  dailyCap?: ContributeDailyCap | null;
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
};

/** Which ways of contributing the user has set up: a Claude key, a token for their own agent. */
export type ContributePaths = { hosted: boolean; mcp: boolean };

/** Where a signed-in agent sends the browser back, and how the pages name it. */
export type ContributeOAuthClientWhere = { kind: 'LOOPBACK' | 'KNOWN' | 'SCHEME' | 'WEB'; label: string };

/**
 * A connection of the user's own agent: a personal token (never the token itself, only its last 4 characters), or an
 * agent that signed in with GitHub (`OAUTH`). `kind` is left out by an API that does not answer it yet: a token.
 */
export type ContributeMcpToken = {
  id: string;
  kind?: 'PERSONAL' | 'OAUTH';
  name: string;
  /** A personal token's last 4 characters; null for an agent that signed in. */
  last4: string | null;
  clientWhere?: ContributeOAuthClientWhere | null;
  createdAt: string;
  lastUsedAt: string | null;
};

export type ContributeOwnAgent = {
  paths: ContributePaths;
  tokens: ContributeMcpToken[];
  /** Agents sign in with GitHub: the setup leads with the sign-in, a token is the fallback. */
  signIn?: boolean;
};

/** One sign-in of an agent to the MCP server, as the consent page shows it. */
export type ContributeOAuthWaiting = { count: number; repos: string[] };
export type ContributeOAuthRequest = {
  status: 'PENDING' | 'EXPIRED' | 'APPROVED';
  clientName: string | null;
  clientWhere: ContributeOAuthClientWhere | null;
  previewAllowed: boolean;
  reusesConnection: boolean;
  replaces: { name: string } | null;
  waiting: ContributeOAuthWaiting;
};

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
  | 'ANTIGRAVITY'
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
  /** The fork's branch the sync brings up to date (read with the clock): where the user syncs by hand. */
  syncBranch?: string | null;
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

/**
 * What the last read of an open pull request found: changes requested, a new comment, a check newly failing, a CLA
 * to sign, a review bot's comment blocking the merge, a DCO sign-off missing on our commits. And a follow-up run that
 * ended with nothing pushed (`RUN_ENDED`). Each leaves once its cause is gone, or once the user marks it handled
 * (`RUN_ENDED`: by those alone, or by the next run's start). GitRanks' own: no word from anyone for 30 days, so it
 * closes the pull request on the day `detail` names unless the user marks it handled (`SILENT`); the repo left
 * Contribute, why in `detail` (`REPO_OUT`). The API may answer a kind this UI does not know yet.
 */
export type ContributePrSignalKind =
  | 'CHANGES_REQUESTED'
  | 'COMMENT'
  | 'CHECK_FAILED'
  | 'CLA'
  | 'TITLE'
  | 'BOT_BLOCKED'
  | 'RUN_ENDED'
  | 'DCO'
  | 'SILENT'
  | 'REPO_OUT';

/**
 * How a run that pushed nothing ended: the agent's no-go (or the user's own agent giving it back with what is theirs to
 * do), a stop (a failure, a limit, a check that blocked it), or its approved commits failing to push.
 */
export type ContributeRunOutcome = 'NO_GO' | 'STOPPED' | 'PUSH_FAILED';

export type ContributePrSignal = {
  kind: ContributePrSignalKind;
  at: string;
  /**
   * For a failing check: the failing checks' names; for a CLA or a DCO: its check's; for a bot's block: the bot and
   * its verdict; for a run that ended: what it left for the user, or why it stopped; for `SILENT`: the ISO day GitRanks
   * closes the pull request; for `REPO_OUT`: why the repo left (`closed_no_ai`, `hostile_close`, `pr_misses`).
   * Untrusted plain text.
   */
  detail: string | null;
  /** A run that ended (`RUN_ENDED`): the run, its number and how it ended; `undefined` while the API does not answer. */
  attemptId?: string | null;
  round?: number | null;
  outcome?: ContributeRunOutcome | null;
};

/** The pull request needs the user: what happened on it since they last acted on it, newest last. */
export type ContributeNeedsYou = { since: string; signals: ContributePrSignal[] };

/**
 * A pull request's follow-up runs: no cap on the user's own. Autopilot starts at most `autopilotMax` of them, and none
 * once the user started one. `recommended`: open, none under way, and something a run can act on waits.
 */
export type ContributeFollowUps = {
  used: number;
  autopilotRuns: number;
  autopilotMax: number;
  manualRuns: number;
  recommended: boolean;
  /** The follow-up under way. */
  currentAttemptId: string | null;
  /** Each run so far, oldest first; `undefined` while the API does not answer it. */
  history?: ContributeFollowUpRound[] | null;
  /**
   * When the last run ended: until the pull request is read again after it (`pullRequest.syncedAt`), what waits on it
   * is from before the run. `undefined` while the API does not answer it.
   */
  lastEndedAt?: string | null;
};

/** Who started a follow-up run: the user, or autopilot on a maintainer's cue. */
export type ContributeFollowUpBy = 'user' | 'autopilot';
/** How it started: by autopilot, by the user while something waited (`recommended`), or by the user alone (`own`). */
export type ContributeFollowUpTrigger = 'autopilot' | 'recommended' | 'own';

/** One follow-up run as the pull request lines it up: "Run 1 pushed 46de700 · 5 fixed · 2 replied". */
export type ContributeFollowUpRound = {
  round: number;
  attemptId: string;
  by: ContributeFollowUpBy;
  trigger: ContributeFollowUpTrigger | null;
  /** The user's note to its agent. */
  reason: string | null;
  costUsd: number;
  state: ContributeAttemptState;
  endReason: ContributeAttemptEndReason | null;
  /** The pull request's head after the round's push. */
  pushedSha: string | null;
  fixed: number;
  skipped: number;
  needsYou: number;
  replied: number;
  resolved: number;
  /** The replies it drafted, posted or not; asked in the lists' own read, `undefined` while not answered. */
  drafted?: number | null;
  at: string;
};

/** Our checks in one word: a failing test, tests that could not run, or a rail that blocks the push. */
export type ContributeCheckStatus = 'PASSED' | 'FAILED' | 'NOT_RUN' | 'BLOCKED';
export type ContributeCheckStatusView = { status: ContributeCheckStatus; note: string };

/** A review thread waiting for an answer on the pull request. Its author and text are untrusted. */
export type ContributeFeedbackThread = {
  threadId: string;
  /** Its first comment's node id: what a follow-up is told to address. */
  commentId: string;
  author: string | null;
  bot: boolean;
  path: string | null;
  line: number | null;
  /** The comment as one plain line. */
  excerpt: string;
  url: string | null;
  createdAt: string | null;
  /** Ignored in an earlier round. */
  ignored: boolean;
};
export type ContributeReviewFeedback = { threads: ContributeFeedbackThread[]; readAt: string | null };

/** What a follow-up did about a review thread. */
export type ContributeThreadOutcome = 'FIXED' | 'SKIPPED' | 'NEEDS_YOU';
export type ContributeResolveState = 'NONE' | 'RESOLVING' | 'RESOLVED' | 'FAILED';

/** The fields of the follow-up flow (2026-10-31), asked on their own: an API without them leaves the rest. */
export type ContributeFollowUpFlowFields = {
  checkStatus: ContributeCheckStatusView | null;
  /** A first attempt's open pull request: the threads waiting for an answer, between rounds. */
  reviewFeedback: ContributeReviewFeedback | null;
  /** A follow-up: its round. */
  round: ContributeFollowUpRound | null;
};

/** A reply draft's follow-up flow fields; `undefined` while the API does not answer them. */
export type ContributeReplyDraftFlow = {
  outcome: ContributeThreadOutcome | null;
  /** The agent's reason: a skip's, or the question for the user. Untrusted. */
  reason: string | null;
  bot: boolean;
  /** Posted before the text: "Fixed in <sha>: ", "Not changed: " (with "<commit>" before the push). */
  prefix: string | null;
  /** Approved to post with the push. */
  send: boolean;
  /** Its thread is resolved after the reply posts. */
  resolve: boolean;
  resolveState: ContributeResolveState;
};

/** The pull request a follow-up works on, and the first attempt that opened it. */
export type ContributeFollowUpOf = {
  attemptId: string;
  prId: string;
  number: number;
  url: string;
  trigger: ContributeFollowUpTrigger | null;
  /** The user's note to its agent. */
  reason: string | null;
};

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
export type ContributeAttempt = Partial<ContributeAttemptFollowUpFields> & {
  /** In the review: why autopilot left it there; null for any other review. Read on its own (`undefined`: not known). */
  reviewReason?: ContributeAutopilotReviewReason | null;
  /** A hold's source beside the reason: the beginner label as the repo names it, a rule's file. Read on its own. */
  reviewReasonSource?: string | null;
} & Partial<ContributeOwnAgentFields> & {
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
    /**
     * A no-go at the check's budget or time limit (`decided`: written when the agent was told to wrap up; else no
     * verdict by the limit). `undefined` while not read (`checkLimitOf` then reads the detail).
     */
    checkLimit?: ContributeCheckLimitView | null;
    checksPassed: boolean | null;
    approvedAt: string | null;
    submit: ContributeAttemptSubmit | null;
    pullRequest: ContributeAttemptPullRequest | null;
    createdAt: string;
    updatedAt: string;
    /**
     * When the attempt last became ready for review: its wait runs from it. Asked on its own; `undefined` while
     * the API does not answer it.
     */
    reviewAt?: string | null;
    /**
     * A follow-up in a list: its round (what it fixed and drafted), our checks in a word, and the step it is on
     * (`reading`, `fixing`, `checks`). Asked on their own; `undefined` while the API does not answer them.
     */
    round?: ContributeFollowUpRound | null;
    checkStatus?: ContributeCheckStatusView | null;
    followUpStep?: string | null;
  };

export type ContributeAttemptTest = {
  command: string;
  passed: boolean;
  output: string | null;
  /** It could not run at all (dependencies, a toolchain); `undefined` while the API does not answer it. */
  notRun?: boolean | null;
};

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

/** The go/no-go check's limit a no-go was decided at (`decided`), or reached with no verdict. */
export type ContributeCheckLimitView = { limit: 'budget' | 'time'; decided: boolean };

/** A hosted session's latest go/no-go: its verdict, its whole reason, and the check's cap it was written at. */
export type ContributeGoNoGo = {
  verdict: 'go' | 'no_go';
  reason: string;
  /** budget or time when the agent wrote it on being told to wrap up at the check's cap; null otherwise. */
  decidedAtLimit: 'budget' | 'time' | null;
  at: string;
  /**
   * A no-go's release (`taken`, `closed`, `already_fixed`, …): `taken` warns by the retry. Null for a go, an older
   * run, or when the agent gave none; `undefined` while the API does not answer it.
   */
  release?: string | null;
};

/**
 * What `retryAttempt` does with a stop, once: `BOOST`, a check that ran out, again on twice its budget; `OVERRIDE`, a
 * no-go that is a judgement, worked on anyway by a new run told the user overrode it.
 */
export type ContributeRetryKind = 'BOOST' | 'OVERRIDE';

export type ContributeRetry = {
  kind: ContributeRetryKind;
  /** An override of a taken no-go: who may be working on it, at most 3 logins; [] when not known. */
  takenBy: string[];
};

export type ContributeAttemptEvent = { state: ContributeAttemptState; detail: string | null; at: string };

/** One attempt for the review screen. `patch` is `git format-patch` text: untrusted, rendered as text only. */
export type ContributeAttemptDetail = ContributeAttempt & {
  /** The issue's first-timers-only or newcomers label, as the repo names it; null or absent: none (read on its own). */
  newcomersLabel?: string | null;
  patch: string | null;
  result: ContributeAttemptResult | null;
  readiness: ContributeRepoReadiness | null;
  /**
   * The repo requires a DCO sign-off on every commit: the review asks for it (or the standing consent gives it).
   * False: nothing is asked and nothing is signed off. `undefined` while the API does not answer it.
   */
  dcoRequired?: boolean;
  /**
   * What the PR's body gets after the approved text, as Markdown, as the API writes it: the repo's disclosure sentence
   * (once approved) and the footer line. `undefined` while the API does not answer it.
   */
  prFooter?: string;
  /** The commits carry the gitranks bot's co-author: false on a repo that bans AI trailers; null before the approval. */
  prCoAuthored?: boolean | null;
  /** What `retryAttempt` would do with this stop: null when it can't be tried again, `undefined` while not answered. */
  retry?: ContributeRetry | null;
  /** The session's latest go/no-go: null when it gave none (an older run); `undefined` while the API does not answer it. */
  goNoGo?: ContributeGoNoGo | null;
  /**
   * The run's brief: what it checked, found and changed, or why nothing (a no-go's reason). Null when the run gave
   * none; `undefined` while the API does not answer it.
   */
  brief?: string | null;
  checks: ContributeAttemptCheck[];
  cost: ContributeAttemptCost;
  approval: ContributeAttemptApproval | null;
  events: ContributeAttemptEvent[];
  /** The pull request's reply drafts (a follow-up: the ones it wrote); `undefined` while the API does not answer them. */
  replyDrafts?: ContributeReplyDraft[];
  /** A review bot's ask for proof, and the user's own agent's proof for it; `undefined` while not answered. */
  proof?: ContributeProof | null;
  /**
   * Its repo's rules for AI contributions, with the repo's own words, and the size limits the attempt runs under there.
   * Null when not known; `undefined` while the API does not answer it (read on its own).
   */
  repoRules?: ContributeRepoRules | null;
  /** The claim's check, step by step while it starts (oldest first); `undefined` while the API does not answer it. */
  claimSteps?: ContributeClaimStep[];
} & Partial<ContributeFollowUpFlowFields> &
  ContributeConventionsFields;

/** One step of the claim's check: what it is doing, in words, and whether it is running, done or failed. */
export type ContributeClaimStep = { key: string; words: string; at: string; state: 'running' | 'done' | 'failed' };

/** The review comment a reply answers: the first comment of its thread. */
export type ContributeReplyTarget = {
  commentId: string;
  author: string | null;
  path: string | null;
  line: number | null;
  /** The comment's first 300 characters. */
  excerpt: string;
};

export type ContributeReplyState = 'DRAFT' | 'POSTING' | 'POSTED' | 'FAILED' | 'DISMISSED';

/** Why a reply was dismissed: by the user (posted by hand, not needed), or its thread was resolved on GitHub. */
export type ContributeReplyDismissReason = 'POSTED_BY_HAND' | 'NOT_NEEDED' | 'THREAD_RESOLVED';
/** The reasons the user gives when dismissing a reply. */
export type ContributeReplyUserDismissReason = Exclude<ContributeReplyDismissReason, 'THREAD_RESOLVED'>;

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
  /** What it answers on GitHub: the review comment, or the pull request's conversation. Absent from an older API. */
  commentUrl?: string | null;
  /**
   * What an approval would post now (the repo's mark, the prefix with its commit), or once sent what was sent; null
   * while that cannot be known (its commits are not on the pull request yet). Absent from an older API.
   */
  body?: string | null;
  /** Why the last post failed. */
  lastError: ContributeSubmitError | null;
  /** GitHub refused it in its review thread: it may be posted as a comment on the pull request instead. */
  canPostAsComment?: boolean;
  /** Posted (or posting) as a comment on the pull request in place of its review thread. */
  asComment?: boolean;
  /** Why it was dismissed, and when. */
  dismissedReason?: ContributeReplyDismissReason | null;
  dismissedAt?: string | null;
  createdAt: string;
  updatedAt: string;
} & Partial<ContributeReplyDraftFlow>;

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
  /**
   * The open pull request's last fix, what it fails of the repo's rules, and the agreement to sign; `undefined` while
   * the API does not answer them.
   */
  prFix?: ContributePrFix | null;
  prIssues?: ContributePrConventionIssue[];
  conventions?: { cla: ContributeRepoConventions['cla'] } | null;
  /** A review bot's ask for proof and the proof under way, as the lists read them; `undefined` while not answered. */
  proof?: ContributeProofBrief | null;
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
  /** Contributors a report took no more GitRanks PRs from in it, each undoable; absent from an older API. */
  blockedContributors?: ContributeBlockedContributor[];
  /** Its PRs a report stopped GitRanks work on, each undoable; absent from an older API. */
  stoppedPrs?: ContributeStoppedPr[];
  /** Every `.github/gitranks.yml` key and its value here; absent from an older API. */
  config?: ContributeMaintainerConfigValue[];
  /** Its rules as GitRanks follows them, with who set each on the page; null when not known, absent from an older API. */
  rules?: ContributeMaintainerRepoRules | null;
};

/** A contributor a maintainer's report took no more GitRanks PRs from in a repo. */
export type ContributeBlockedContributor = {
  /** Null once they deleted their Contribute data. */
  login: string | null;
  since: string;
  /** The maintainer who did it. */
  by: string;
  /** The report: what Undo takes. */
  feedbackId: string;
};

/** A PR a maintainer's report stopped GitRanks work on. */
export type ContributeStoppedPr = { number: number; since: string; by: string; feedbackId: string };

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
  | 'NO_PERSON_ACTIVITY'
  | 'LICENSE'
  | 'LANGUAGE'
  | 'OUTSIDE_MERGES'
  | 'OPTED_OUT'
  | 'CLOSED_NO_AI'
  | 'HOSTILE_CLOSE'
  | 'AI_BAN'
  | 'CONTRIBUTE_OFF'
  | 'OUTSIDE_PRS_CLOSED'
  | 'GATED_CONTRIBUTORS'
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
/** Where an agent run is; READY, DONE and STOPPED are settled (shown for 10 minutes, then gone). */
export type ContributeAgentRunPhase =
  | 'QUEUED'
  | 'CHECKING_ISSUE'
  | 'WORKING'
  | 'ADDRESSING_REVIEW'
  | 'RUNNING_CHECKS'
  | 'WAITING_FOR_YOU'
  | 'SUBMITTING'
  | 'READY'
  | 'DONE'
  | 'STOPPED';

/** One of the user's agent runs: live, or settled in the last 10 minutes. */
export type ContributeAgentRun = {
  attemptId: string;
  nameWithOwner: string | null;
  /** The issue. */
  number: number;
  title: string | null;
  kind: ContributeAttemptKind;
  runner: ContributeAttemptRunner;
  state: ContributeAttemptState;
  phase: ContributeAgentRunPhase;
  /** One plain line, e.g. "Running checks", "Queued, 2nd in line". */
  label: string;
  /** An agent works on it now; false while it waits (queued, the autopilot's hour) or settled. */
  active: boolean;
  queuedAt: string;
  /** Null while queued. */
  startedAt: string | null;
  /** Null while live. */
  settledAt: string | null;
  /** From the start (the queueing while queued) to the settle, or to the read. */
  elapsedSeconds: number;
  /** A hosted run's spend so far and its cap; null for the user's own agent. */
  spendUsd: number | null;
  budgetUsd: number | null;
  latestEvent: ContributeAttemptEvent | null;
  /** 1 for the next queued attempt to start. */
  queuePosition: number | null;
  /** The user's own agent: its last call. */
  lastCallAt: string | null;
  /** WAITING_FOR_YOU: when autopilot submits. */
  autosubmitAt: string | null;
  endReason: ContributeAttemptEndReason | null;
  prUrl: string | null;
};

export type ContributeActivity = { items: ContributeActivityItem[]; runs: ContributeAgentRun[]; readAt: string };

/** What a change touched: an attempt, the issues computed for the user, an issue's availability, the list, settings. */
export type ContributeChangeArea = 'ATTEMPTS' | 'FEED' | 'ISSUES' | 'SET' | 'SETTINGS' | 'ACTIVITY';

/** What moved for the user since a version (`contributeChanges`). */
export type ContributeChanges = {
  /** Opaque: sent back as `since`. */
  version: string;
  /** A long read may be running: the poll goes faster and reads the bar too. */
  activity: boolean;
  changed: ContributeChangeArea[];
};

/** A poll's answer: what moved, and the work in progress when it was read too (left out when it was not). */
export type ContributeChangesRead = { changes: ContributeChanges; activity?: ContributeActivity | null };

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

// ─── Proof from the user's own agent ─────────────────────────────────────────────────────────────────────────────────

/**
 * A proof's states: waiting for an agent, held by one (`RUNNING`, `UPLOADING` its screenshots, `CHECKING` them), back
 * for the user (`REVIEW`), being posted, posted, or ended (`FAILED` waits for a retry; `DISCARDED` is over).
 */
export type ContributeProofState =
  | 'WAITING'
  | 'RUNNING'
  | 'UPLOADING'
  | 'CHECKING'
  | 'REVIEW'
  | 'POSTING'
  | 'FAILED'
  | 'POSTED'
  | 'DISCARDED';
/** What the agent came back with: the proof, why it could not capture it, or that the fix itself does not work. */
export type ContributeProofOutcome = 'PROVED' | 'CANNOT_PROVE' | 'FIX_BROKEN';
export type ContributeProofEndedReason = 'DISCARDED' | 'ASK_CLEARED' | 'PR_CLOSED' | 'SUPERSEDED' | 'FIX_BROKEN';
export type ContributeProofPostStep = 'FILES' | 'BODY' | 'COMMENT';

/**
 * What a review bot asks for: its open checklist item (`title`, `detail`), when this ask was first seen, the head it
 * read, and the command that has it read the pull request again (null when it names none). Its text is untrusted.
 */
export type ContributeProofAsk = {
  bot: string;
  title: string;
  detail: string;
  at: string;
  headSha?: string | null;
  reReview?: string | null;
};

/** A screenshot the agent sent, checked and stripped of its metadata. */
export type ContributeProofFile = {
  slot: number;
  name: string;
  caption: string;
  bytes: number;
  width: number | null;
  height: number | null;
};

/** What the agent sent back. Every text in it is untrusted. */
export type ContributeProofResult = {
  outcome: ContributeProofOutcome;
  summary: string;
  /** `PROVED`: the section added to the pull request's description, its images as `proof:<slot>`. */
  section: { heading: string; markdown: string } | null;
  /** `CANNOT_PROVE`: the reply drafted for the pull request. */
  reply: string | null;
  /** `FIX_BROKEN`: what failed. */
  note: string | null;
  /** What the agent says it removed: "2 IP addresses". */
  redactions: string[];
  /** The pull request's head the proof ran on. */
  headSha: string | null;
  files: ContributeProofFile[];
};

/** The newest proof for the ask, as the user follows it. */
export type ContributeProofSession = {
  id: string;
  state: ContributeProofState;
  agent: ContributeAgent | null;
  leaseUntil: string | null;
  round: number;
  startedAt: string | null;
  /** When it last changed state: back for review, posted. */
  stateAt: string | null;
  /** Why the last screenshots were refused: the agent is told too. */
  checkError: string | null;
  result: ContributeProofResult | null;
  post: {
    step: ContributeProofPostStep | null;
    commitSha: string | null;
    bodyAt: string | null;
    commentUrl: string | null;
    error: string | null;
  } | null;
  sendBack: { note: string } | null;
  endedReason: ContributeProofEndedReason | null;
};

/**
 * A review bot's ask for proof (null when none), the newest proof (null before any), and the pull request's head as
 * the last read saw it (null when unknown): a proof captured on another head says so.
 */
export type ContributeProof = {
  ask: ContributeProofAsk | null;
  session: ContributeProofSession | null;
  prHeadSha?: string | null;
};

/** The ask and the proof's state alone, as a list reads them. */
export type ContributeProofBrief = {
  ask: Pick<ContributeProofAsk, 'bot' | 'title' | 'at'> | null;
  session:
    | (Pick<ContributeProofSession, 'id' | 'state' | 'stateAt' | 'endedReason'> & {
        result: { outcome: ContributeProofOutcome } | null;
      })
    | null;
};

// ─── A repository's rules for AI contributions (the attempt, the issue cards, "Your repos") ─────────────────────────

/** What a repository's rule is about. */
export type ContributeRepoRuleKind =
  | 'BAN'
  | 'APPROVED_CONTRIBUTORS_ONLY'
  | 'AUTOPILOT'
  | 'NO_AUTONOMOUS'
  | 'NO_BULK'
  | 'NO_GFI'
  | 'FIRST_TIMERS'
  | 'COORDINATE_FIRST'
  | 'ISSUE_GATE'
  | 'HUMAN_WORDS'
  | 'DISCLOSURE'
  | 'CAPS'
  | 'CONTRIBUTOR_BAR';

/** Where a rule comes from: the repository's file on GitHub, or the GitRanks maintainers page. */
export type ContributeRuleSource = { label: string; url: string };

/** One of a repository's rules, in our words, as an issue card shows it: never its quote or who set it. */
export type ContributeIssueRepoRule = {
  kind: ContributeRepoRuleKind;
  text: string;
  source: ContributeRuleSource | null;
};

export type ContributeIssueRepoRules = {
  /** Empty when the repository sets none. */
  lines: ContributeIssueRepoRule[];
  /** A person reviews and submits every pull request there: autopilot never does. */
  manualOnly: boolean;
};

/** One of a repository's rules, with its own words for it (null when it wrote none). */
export type ContributeRepoRule = ContributeIssueRepoRule & { quote: string | null };

/** The size limits an attempt runs under in a repository: the smaller of the user's and the repo's. */
export type ContributeRepoRuleCaps = {
  lines: number;
  files: number;
  /** Null when the line limit is the user's own; else where the repo's comes from, in words. */
  linesSource: string | null;
  /** Null when the file limit is the user's own; else where the repo's comes from, in words. */
  filesSource: string | null;
};

export type ContributeRepoRules = {
  lines: ContributeRepoRule[];
  /** Null when not known. */
  caps: ContributeRepoRuleCaps | null;
  manualOnly: boolean;
};

/** One of the repository's rules for its maintainers: who set it on the page (null when it was not set there). */
export type ContributeMaintainerRepoRule = ContributeRepoRule & { setBy: string | null };

export type ContributeMaintainerRepoRules = { lines: ContributeMaintainerRepoRule[]; manualOnly: boolean };

/** Who set a key's value: the repo's `.github/gitranks.yml` (which wins), or a maintainer on the page. */
export type ContributeMaintainerConfigSource = 'FILE' | 'PAGE';

/** One `.github/gitranks.yml` key as it stands for a repository the visitor maintains. */
export type ContributeMaintainerConfigValue = {
  key: string;
  /** In the file's words (allowed, 3, pro…); null when neither the file nor the page sets it. */
  value: string | null;
  source: ContributeMaintainerConfigSource | null;
  /** The maintainer who set it on the page; shown on "Your repos" alone. */
  setBy: string | null;
  /** The file's value for the key that was not read (outside its values); null when there is none. */
  ignoredRaw: string | null;
  /** When the file was last read (ISO); null before the first read. */
  fileReadAt: string | null;
};

/** A repository's keys and rules after a change on the page. */
export type ContributeMaintainerRepoConfig = {
  repoId: string;
  config: ContributeMaintainerConfigValue[];
  rules: ContributeMaintainerRepoRules | null;
};

// ─── The maintainers page: its facts, and the notes on a PR ("Report this PR", "This PR helped") ─────────────────────

/** A `.github/gitranks.yml` key; the page shows the `live` ones alone, and never how many there are. */
export type ContributeConfigKey = {
  key: string;
  /** onOff, yesNo, allowedOff, int, tier or contact. */
  kind: string;
  /** Its values in words. */
  values: string;
  meaning: string;
  live: boolean;
  /** Settable on the page too, not only in the file. */
  page: boolean;
  min: number | null;
  max: number | null;
};

/** The maintainers page's numbers, as Contribute enforces them. */
export type ContributeMaintainerFacts = {
  prsPerMonth: number;
  monthDays: number;
  /** Misses that take Contribute out of a repo: a pull request with no answer for `silentDays`, or closed as wrong. */
  missesMax: number;
  silentDays: number;
  /** The days misses count over, and how long the repo stays out after `missesMax` of them. */
  outDays: number;
  attemptsPerRepo: number;
  /** The badge's priority; null until it applies. */
  badgeBoost: number | null;
  configKeys: ContributeConfigKey[];
};

export type ContributePrFeedbackKind = 'REPORT' | 'HELPED';
export type ContributeReportReason =
  | 'IGNORES_CONTRIBUTING'
  | 'LOW_QUALITY'
  | 'UNRESPONSIVE'
  | 'SPAM_OR_DUPLICATE'
  | 'OTHER';
export type ContributeHelpedLike =
  | 'SOLVED_WELL'
  | 'FOLLOWED_RULES'
  | 'SMALL_AND_CLEAR'
  | 'GOOD_TESTS'
  | 'ANSWERED_REVIEW';
/** What a maintainer's report may do at once, each undoable. */
export type ContributePrAction = 'STOP_PR' | 'BLOCK_CONTRIBUTOR' | 'REPO_OFF';
/** The writer's role in the PR's repo, as GitHub answered for their account. */
export type ContributePrRole = 'MAINTAINER' | 'COLLABORATOR' | 'USER';

/** One of our PRs, as the PR on GitHub shows it. */
export type ContributePrCard = {
  /** Its first attempt: what a note takes. */
  attemptId: string;
  repositoryId: string;
  nameWithOwner: string;
  number: number;
  title: string | null;
  openedAt: string;
  contributorLogin: string | null;
  /** False: opened by the contributor's autopilot, unreviewed. */
  reviewed: boolean;
  /** Who made the change, as the PR's footer says it. */
  agentPhrase: string;
  /** The signed-in visitor is its contributor. */
  isAuthor: boolean;
};

/** The signed-in visitor in the PR's repo. */
export type ContributePrViewer = {
  /** Null when GitHub could not be asked (`roleConfirmed` false). */
  login: string | null;
  role: ContributePrRole;
  /** False: GitHub could not be asked, so the role is USER and nothing applies by itself. */
  roleConfirmed: boolean;
  /** The repo's organization, when it may hide a maintainer's role (third-party app restrictions). */
  restrictedOrg: string | null;
  replyTo: string | null;
};

export type ContributePrCardView = { card: ContributePrCard; viewer: ContributePrViewer | null };

export type ContributePrActionState = { kind: ContributePrAction; appliedAt: string; undoneAt: string | null };

/** A note sent: its number and what it applied. */
export type ContributePrFeedbackResult = {
  feedbackId: string;
  kind: ContributePrFeedbackKind;
  number: number;
  /** R-0042, H-0007. */
  label: string;
  /** Appended to the visitor's earlier note on the PR. */
  added: boolean;
  role: ContributePrRole;
  actions: ContributePrActionState[];
};

export type ContributePrUndoResult = { feedbackId: string; actions: ContributePrActionState[] };

/** A "this PR helped" note, as the PR's contributor sees it. */
export type ContributePrNote = {
  feedbackId: string;
  login: string;
  role: ContributePrRole;
  likes: ContributeHelpedLike[];
  /** A maintainer's or collaborator's word; never a user's. */
  word: string | null;
  at: string;
  hidden: boolean;
};

/** The maintainers' say on the viewer's PR. */
export type ContributePrNotes = {
  stopped: { login: string; at: string } | null;
  /** Newest first, hidden ones too. */
  notes: ContributePrNote[];
};
