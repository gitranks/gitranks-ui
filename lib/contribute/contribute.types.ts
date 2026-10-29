/** GitRanks Contribute as the GitRanks GraphQL API answers it. */

export type ContributeLiveProvider = 'ANTHROPIC';
export type ContributeKeyState = 'VALID' | 'INVALID' | 'EXHAUSTED' | 'LIMIT_REACHED';
export type ContributePace = 'EVEN' | 'FAST' | 'QUEUED';
export type ContributeModel = 'CLAUDE_SONNET_5_5' | 'CLAUDE_OPUS_5_5' | 'CLAUDE_HAIKU_5_5';
export type ContributeEffort = 'LOW' | 'MEDIUM' | 'HIGH' | 'XHIGH' | 'MAX';
export type ContributeDcoMode = 'ASK' | 'STANDING';
export type ContributeLanguage = 'JS_TS' | 'PYTHON' | 'GO' | 'RUST' | 'JAVA' | 'PHP' | 'RUBY';
export type ContributeIssueKind = 'BUG' | 'FEATURE' | 'DOCS' | 'TESTS' | 'REFACTOR' | 'PERFORMANCE';
export type ContributeIssueSize = 'S' | 'M' | 'L';
export type ContributorStatus = 'ONBOARDING' | 'ACTIVE' | 'PAUSED';
export type ContributeClaudePlan = 'MAX_5X' | 'MAX_20X' | 'TEAM_STANDARD' | 'TEAM_PREMIUM' | 'CREDITS';
export type ContributeOnboardingStep = 'KEY' | 'PREFERENCES' | 'DONE';
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
  reposIn: string[];
  reposOut: string[];
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

export type ContributeAutopilot = { unlocked: boolean; mergedCount: number; closedUnmergedStreak: number };

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
};

export type ContributeGrant = { connected: boolean; login: string | null };

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
};

export type ContributeIssuePage = {
  items: ContributeIssue[];
  next: string | null;
  total: number;
  computedAt: string | null;
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
  | 'DISCARDED';
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
  | 'SUBMIT_FAILED';
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

/** A submission, from the approval on. `waitUntil` is set while it waits for the next day's pull requests. */
export type ContributeAttemptSubmit = {
  step: ContributeSubmitStep;
  waitUntil: string | null;
  fork: string | null;
  branch: string | null;
  lastError: ContributeSubmitError | null;
};

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

/** One attempt: an agent session on one issue, and what came of it. */
export type ContributeAttempt = {
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
};

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
};

export type ContributeContributions = {
  items: ContributeContribution[];
  totals: { open: number; merged: number; closed: number; costUsd: number };
};
