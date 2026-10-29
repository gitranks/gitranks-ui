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
