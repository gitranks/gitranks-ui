import DocumentNode from '../typed-document-node';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format. */
  DateTime: { input: any; output: any; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: { input: any; output: any; }
};

/** GitRanks Contribute for the signed-in viewer (the Contribute's overview) */
export type Contribute = {
  __typename?: 'Contribute';
  /** Hosted attempts start; false: none starts until Contribute opens */
  attemptsOpen: Scalars['Boolean']['output'];
  /** Null until the viewer did something that keeps a row */
  contributor?: Maybe<Contributor>;
  /** The GitHub access Contribute opens PRs with; known with or without a contributor. Null with an error when it cannot be read now */
  grant?: Maybe<ContributeGrant>;
  /** The viewer's live tokens for the MCP server (their own agent), oldest first; never a token itself. Null with an error when they cannot be read now */
  mcpTokens?: Maybe<Array<ContributeMcpToken>>;
  /** The viewer may connect a key (the preview list holds them, or there is none) */
  previewAllowed: Scalars['Boolean']['output'];
  /** The coming-soon providers the viewer asked to hear about, in CONTRIB_COMING_SOON_PROVIDERS order; empty with no contributor */
  providerInterests: Array<ContributeComingSoonProvider>;
};

/** The viewer's work in progress; empty items when nothing runs */
export type ContributeActivity = {
  __typename?: 'ContributeActivity';
  items: Array<ContributeActivityItem>;
  /** When contrib read it */
  readAt: Scalars['String']['output'];
};

/** One piece of work in progress */
export type ContributeActivityItem = {
  __typename?: 'ContributeActivityItem';
  /** Counted progress; null when it cannot be counted */
  done?: Maybe<Scalars['Int']['output']>;
  /** When it should be done: an estimate (the resolve's: its deadline); null when no time can be promised */
  expectedAt?: Maybe<Scalars['String']['output']>;
  kind: ContributeActivityKind;
  /** One plain line, e.g. "Reading issues from 14 of 20 repos" */
  label: Scalars['String']['output'];
  repos: Array<ContributeActivityRepo>;
  startedAt: Scalars['String']['output'];
  /** The tabs it shows on */
  tabs: Array<ContributeActivityTab>;
  total?: Maybe<Scalars['Int']['output']>;
};

/** STACK_RESOLVE (the stack's libraries worked out), FIRST_READS (new repos' issues read for the first time), FIRST_READS_WAITING (new repos waiting their turn in the shared queue), READS_PAUSED (nothing is read while contributing is paused) */
export enum ContributeActivityKind {
  FirstReads = 'FIRST_READS',
  FirstReadsWaiting = 'FIRST_READS_WAITING',
  ReadsPaused = 'READS_PAUSED',
  StackResolve = 'STACK_RESOLVE'
}

/** One repo of an activity */
export type ContributeActivityRepo = {
  __typename?: 'ContributeActivityRepo';
  nameWithOwner: Scalars['String']['output'];
  repositoryId: Scalars['ID']['output'];
  stage: ContributeActivityRepoStage;
};

/** Where one repo is: CHECKING (its contribution rules are read first), QUEUED (in the next hourly listing), READING (its issues are being listed), SORTING (its issues are being triaged), READ, WAITING (in the shared queue), PAUSED */
export enum ContributeActivityRepoStage {
  Checking = 'CHECKING',
  Paused = 'PAUSED',
  Queued = 'QUEUED',
  Read = 'READ',
  Reading = 'READING',
  Sorting = 'SORTING',
  Waiting = 'WAITING'
}

/** A Contribute tab an activity shows on */
export enum ContributeActivityTab {
  Issues = 'ISSUES',
  Overview = 'OVERVIEW',
  Settings = 'SETTINGS'
}

/** The agent of an MCP attempt, as it reported itself (unverified) */
export type ContributeAgent = {
  __typename?: 'ContributeAgent';
  /** The model, as reported */
  model?: Maybe<Scalars['String']['output']>;
  name: ContributeAgentName;
};

/** The agent an MCP attempt reported: claude-code, codex, cursor, gemini-cli, copilot, aider, cline or other */
export enum ContributeAgentName {
  Aider = 'AIDER',
  ClaudeCode = 'CLAUDE_CODE',
  Cline = 'CLINE',
  Codex = 'CODEX',
  Copilot = 'COPILOT',
  Cursor = 'CURSOR',
  GeminiCli = 'GEMINI_CLI',
  Other = 'OTHER'
}

/** One attempt: an agent session on one issue, and what came of it */
export type ContributeAttempt = {
  __typename?: 'ContributeAttempt';
  /** An MCP attempt: its agent, once it submitted */
  agent?: Maybe<ContributeAgent>;
  approvedAt?: Maybe<Scalars['String']['output']>;
  attemptId: Scalars['ID']['output'];
  /** Submitted (or to be) by autopilot, not approved by the viewer */
  autopilot: Scalars['Boolean']['output'];
  /** pending_autosubmit: when autopilot submits it unless the viewer stops it */
  autosubmitAt?: Maybe<Scalars['String']['output']>;
  budgetUsd: Scalars['Float']['output'];
  /** An MCP attempt sent back to the agent: the viewer’s note */
  changesRequested?: Maybe<ContributeChangesRequested>;
  /** A no-go decided at the check's budget or time limit (decided), or reached by it with no verdict; null otherwise */
  checkLimit?: Maybe<ContributeCheckLimit>;
  /** Null until the checks ran */
  checksPassed?: Maybe<Scalars['Boolean']['output']>;
  costUsd: Scalars['Float']['output'];
  createdAt: Scalars['String']['output'];
  /** A fixed code, or the agent's no-go reason */
  endDetail?: Maybe<Scalars['String']['output']>;
  endReason?: Maybe<ContributeAttemptEndReason>;
  /** A follow-up: the PR it works on */
  followUpOf?: Maybe<ContributeFollowUpOf>;
  /** A first attempt with a PR: the PR's rounds */
  followUps?: Maybe<ContributeFollowUps>;
  /** The issue's GitHub node id */
  issueId: Scalars['String']['output'];
  kind: ContributeAttemptKind;
  /** An MCP attempt at work: until when the agent holds the issue without another call */
  leaseUntil?: Maybe<Scalars['String']['output']>;
  model?: Maybe<ContributeModel>;
  nameWithOwner?: Maybe<Scalars['String']['output']>;
  /** The open PR needs the viewer (a first attempt): changes requested, a comment, a failing check */
  needsYou?: Maybe<ContributeNeedsYou>;
  /** The issue's number */
  number: Scalars['Int']['output'];
  /** An MCP attempt's PR: through the review, or by hand */
  openedBy?: Maybe<ContributeOpenedBy>;
  /** Null until the PR opened */
  pullRequest?: Maybe<ContributeAttemptPullRequest>;
  repositoryId: Scalars['String']['output'];
  /** When it last reached the review: its 7 days run from it. Set again by a bounce back to the review and by autopilot's veto; null before the first review */
  reviewAt?: Maybe<Scalars['String']['output']>;
  /** review: why autopilot left it for the viewer (no_email, notice_late, autopilot_off, vetoed); null for any other review */
  reviewReason?: Maybe<Scalars['String']['output']>;
  runner: ContributeAttemptRunner;
  /** An MCP attempt in review: how many more times it may be sent back (0 otherwise) */
  sendBacksLeft: Scalars['Int']['output'];
  state: ContributeAttemptState;
  /** Null before the approval */
  submit?: Maybe<ContributeAttemptSubmit>;
  /** The issue's title; null before the session started */
  title?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
  /** The issue's page on GitHub */
  url?: Maybe<Scalars['String']['output']>;
};

/** The PR's title and body as the viewer approved them */
export type ContributeAttemptApproval = {
  __typename?: 'ContributeAttemptApproval';
  at: Scalars['String']['output'];
  body: Scalars['String']['output'];
  dco: Scalars['Boolean']['output'];
  title: Scalars['String']['output'];
};

export type ContributeAttemptCheck = {
  __typename?: 'ContributeAttemptCheck';
  /** The paths or the count that failed it */
  detail?: Maybe<Scalars['String']['output']>;
  name: ContributeAttemptCheckName;
  passed: Scalars['Boolean']['output'];
};

/** One of our checks */
export enum ContributeAttemptCheckName {
  BinaryFiles = 'BINARY_FILES',
  CiConfig = 'CI_CONFIG',
  LicenseFiles = 'LICENSE_FILES',
  Lockfiles = 'LOCKFILES',
  MaxChangedLines = 'MAX_CHANGED_LINES',
  MaxFiles = 'MAX_FILES',
  NotEmpty = 'NOT_EMPTY',
  PatchParsed = 'PATCH_PARSED',
  Secrets = 'SECRETS',
  TestsPassed = 'TESTS_PASSED',
  TestTouched = 'TEST_TOUCHED',
  WorkflowPaths = 'WORKFLOW_PATHS'
}

/** The session's cost at list price on the viewer's key, split (USD) */
export type ContributeAttemptCost = {
  __typename?: 'ContributeAttemptCost';
  /** The go/no-go phase */
  goNoGoUsd: Scalars['Float']['output'];
  /** Session running time (part of the total) */
  runtimeUsd: Scalars['Float']['output'];
  totalUsd: Scalars['Float']['output'];
  workUsd: Scalars['Float']['output'];
};

/** One attempt for the review screen: the diff, the result, the checks, the cost, the timeline */
export type ContributeAttemptDetail = {
  __typename?: 'ContributeAttemptDetail';
  /** An MCP attempt: its agent, once it submitted */
  agent?: Maybe<ContributeAgent>;
  approval?: Maybe<ContributeAttemptApproval>;
  approvedAt?: Maybe<Scalars['String']['output']>;
  attemptId: Scalars['ID']['output'];
  /** Submitted (or to be) by autopilot, not approved by the viewer */
  autopilot: Scalars['Boolean']['output'];
  /** pending_autosubmit: when autopilot submits it unless the viewer stops it */
  autosubmitAt?: Maybe<Scalars['String']['output']>;
  budgetUsd: Scalars['Float']['output'];
  /** An MCP attempt sent back to the agent: the viewer’s note */
  changesRequested?: Maybe<ContributeChangesRequested>;
  /** A no-go decided at the check's budget or time limit (decided), or reached by it with no verdict; null otherwise */
  checkLimit?: Maybe<ContributeCheckLimit>;
  /** Our checks in one word; null before */
  checkStatus?: Maybe<ContributeCheckStatusView>;
  checks: Array<ContributeAttemptCheck>;
  /** Null until the checks ran */
  checksPassed?: Maybe<Scalars['Boolean']['output']>;
  /** A first attempt's repo conventions (what the PR form checks); null for a follow-up or when unread */
  conventions?: Maybe<ContributeRepoConventions>;
  cost: ContributeAttemptCost;
  costUsd: Scalars['Float']['output'];
  createdAt: Scalars['String']['output'];
  /** The repo requires a DCO sign-off on every commit: the review asks for it (or the standing consent gives it). False: nothing is asked and the commits are not signed off */
  dcoRequired: Scalars['Boolean']['output'];
  /** A fixed code, or the agent's no-go reason */
  endDetail?: Maybe<Scalars['String']['output']>;
  endReason?: Maybe<ContributeAttemptEndReason>;
  events: Array<ContributeAttemptEvent>;
  /** A follow-up: the PR it works on */
  followUpOf?: Maybe<ContributeFollowUpOf>;
  /** A first attempt with a PR: the PR's rounds */
  followUps?: Maybe<ContributeFollowUps>;
  /** The issue's GitHub node id */
  issueId: Scalars['String']['output'];
  kind: ContributeAttemptKind;
  /** An MCP attempt at work: until when the agent holds the issue without another call */
  leaseUntil?: Maybe<Scalars['String']['output']>;
  model?: Maybe<ContributeModel>;
  nameWithOwner?: Maybe<Scalars['String']['output']>;
  /** The open PR needs the viewer (a first attempt): changes requested, a comment, a failing check */
  needsYou?: Maybe<ContributeNeedsYou>;
  /** The issue's number */
  number: Scalars['Int']['output'];
  /** An MCP attempt's PR: through the review, or by hand */
  openedBy?: Maybe<ContributeOpenedBy>;
  /** The patch (git format-patch text) */
  patch?: Maybe<Scalars['String']['output']>;
  /** The PR's description as a fix last set it; null while none did */
  prBody?: Maybe<Scalars['String']['output']>;
  prFix?: Maybe<ContributePrFix>;
  /** What its open PR fails of them, with the fixes */
  prIssues: Array<ContributePrConventionIssue>;
  /** The PR's title as last set (the approval's, then a retitle's) */
  prTitle?: Maybe<Scalars['String']['output']>;
  /** Null until the PR opened */
  pullRequest?: Maybe<ContributeAttemptPullRequest>;
  readiness?: Maybe<ContributeRepoReadiness>;
  /** The PR's reply drafts (a follow-up: the ones it wrote), oldest first */
  replyDrafts: Array<ContributeReplyDraft>;
  repositoryId: Scalars['String']['output'];
  result?: Maybe<ContributeAttemptResult>;
  /** The check of the issue reached its budget or time limit with no verdict (endDetail says what it was on): retryAttempt tries it again once, on twice the budget */
  retryable: Scalars['Boolean']['output'];
  /** When it last reached the review: its 7 days run from it. Set again by a bounce back to the review and by autopilot's veto; null before the first review */
  reviewAt?: Maybe<Scalars['String']['output']>;
  /** A first attempt's open PR: its review threads waiting for an answer, between rounds */
  reviewFeedback?: Maybe<ContributeReviewFeedback>;
  /** review: why autopilot left it for the viewer (no_email, notice_late, autopilot_off, vetoed); null for any other review */
  reviewReason?: Maybe<Scalars['String']['output']>;
  /** A follow-up's own round */
  round?: Maybe<ContributeFollowUpRound>;
  runner: ContributeAttemptRunner;
  /** An MCP attempt in review: how many more times it may be sent back (0 otherwise) */
  sendBacksLeft: Scalars['Int']['output'];
  state: ContributeAttemptState;
  /** Null before the approval */
  submit?: Maybe<ContributeAttemptSubmit>;
  /** The issue's title; null before the session started */
  title?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
  /** The issue's page on GitHub */
  url?: Maybe<Scalars['String']['output']>;
};

/** Why an attempt stopped or was discarded */
export enum ContributeAttemptEndReason {
  Budget = 'BUDGET',
  Cancelled = 'CANCELLED',
  ChecksFailed = 'CHECKS_FAILED',
  ClaimLost = 'CLAIM_LOST',
  Exhausted = 'EXHAUSTED',
  Failed = 'FAILED',
  KeyInvalid = 'KEY_INVALID',
  LimitReached = 'LIMIT_REACHED',
  McpExpired = 'MCP_EXPIRED',
  McpIdle = 'MCP_IDLE',
  NoGo = 'NO_GO',
  Released = 'RELEASED',
  ReviewExpired = 'REVIEW_EXPIRED',
  SubmitFailed = 'SUBMIT_FAILED',
  Timeout = 'TIMEOUT',
  User = 'USER'
}

/** One change on the attempt's timeline */
export type ContributeAttemptEvent = {
  __typename?: 'ContributeAttemptEvent';
  at: Scalars['String']['output'];
  /** A fixed code or a short note of ours */
  detail?: Maybe<Scalars['String']['output']>;
  state: ContributeAttemptState;
};

/** A first attempt, or a follow-up */
export enum ContributeAttemptKind {
  First = 'FIRST',
  FollowUp = 'FOLLOW_UP'
}

/** An attempt's pull request, as the last sync read it */
export type ContributeAttemptPullRequest = {
  __typename?: 'ContributeAttemptPullRequest';
  checks?: Maybe<ContributeChecksState>;
  closedAt?: Maybe<Scalars['String']['output']>;
  mergedAt?: Maybe<Scalars['String']['output']>;
  number: Scalars['Int']['output'];
  openedAt: Scalars['String']['output'];
  /** The PR's GitHub node id */
  prId: Scalars['ID']['output'];
  reviewDecision?: Maybe<ContributeReviewDecision>;
  state: ContributePrState;
  /** When the PR sync last read it */
  syncedAt?: Maybe<Scalars['String']['output']>;
  url: Scalars['String']['output'];
};

/** The agent's result.json, checked and cut to size */
export type ContributeAttemptResult = {
  __typename?: 'ContributeAttemptResult';
  filesChanged: Array<Scalars['String']['output']>;
  /** The agent's PR body, following the repo's template */
  prBody?: Maybe<Scalars['String']['output']>;
  /** The PR title the agent proposed, following the repo's title rule (the form's default) */
  prTitle?: Maybe<Scalars['String']['output']>;
  risk?: Maybe<ContributeRiskLevel>;
  riskNotes?: Maybe<Scalars['String']['output']>;
  summary: Scalars['String']['output'];
  tests: Array<ContributeAttemptTest>;
  verdict?: Maybe<ContributeAttemptVerdict>;
};

/** Who does an attempt's work: a hosted session on the viewer's key, or their own agent through the MCP server */
export enum ContributeAttemptRunner {
  ManagedAgents = 'MANAGED_AGENTS',
  Mcp = 'MCP'
}

/** An attempt's state: queued, claiming, running, checks, review, submitting, pr_open and on; or how it ended */
export enum ContributeAttemptState {
  Checks = 'CHECKS',
  Claiming = 'CLAIMING',
  Closed = 'CLOSED',
  Discarded = 'DISCARDED',
  Done = 'DONE',
  FollowUp = 'FOLLOW_UP',
  Merged = 'MERGED',
  PendingAutosubmit = 'PENDING_AUTOSUBMIT',
  PrOpen = 'PR_OPEN',
  Queued = 'QUEUED',
  Review = 'REVIEW',
  Running = 'RUNNING',
  Stopped = 'STOPPED',
  Submitting = 'SUBMITTING'
}

/** A submission (fork, sync, push, PR), from the approval on */
export type ContributeAttemptSubmit = {
  __typename?: 'ContributeAttemptSubmit';
  branch?: Maybe<Scalars['String']['output']>;
  /** The fork's owner/name once made */
  fork?: Maybe<Scalars['String']['output']>;
  /** fork: GitHub is still making the fork (it can take minutes) */
  forkPending?: Maybe<Scalars['Boolean']['output']>;
  /** Set after a bounce back to review (approve again), or while a step is tried again */
  lastError?: Maybe<ContributeSubmitError>;
  /** A step that failed for a passing reason is sent again at this time */
  retryAt?: Maybe<Scalars['String']['output']>;
  step: ContributeSubmitStep;
  /** When the current step started (the approval while queued); null when not known */
  stepStartedAt?: Maybe<Scalars['String']['output']>;
  /** The write steps run so far, in their order; a skipped one (the sync of an own repo) is absent */
  steps?: Maybe<Array<ContributeSubmitStepTime>>;
  /** waiting_cap: when the next UTC day starts and the submission goes on (the day's cap of PRs) */
  waitUntil?: Maybe<Scalars['String']['output']>;
};

export type ContributeAttemptTest = {
  __typename?: 'ContributeAttemptTest';
  command: Scalars['String']['output'];
  /** 'fail': a red-before-fix proof (the new test without the fix), which must fail */
  expect?: Maybe<Scalars['String']['output']>;
  /** The command could not run at all (dependencies, a toolchain) */
  notRun?: Maybe<Scalars['Boolean']['output']>;
  output?: Maybe<Scalars['String']['output']>;
  passed: Scalars['Boolean']['output'];
};

/** The agent's verdict on its work */
export enum ContributeAttemptVerdict {
  Done = 'DONE',
  NoGo = 'NO_GO',
  Partial = 'PARTIAL'
}

export type ContributeAutopilot = {
  __typename?: 'ContributeAutopilot';
  /** Autopilot is open on our side. False: it is coming, and turning the setting on answers CONFLICT */
  available: Scalars['Boolean']['output'];
  closedUnmergedStreak: Scalars['Int']['output'];
  /** When 2 closed-unmerged PRs in a row last locked it */
  lockedAt?: Maybe<Scalars['String']['output']>;
  mergedCount: Scalars['Int']['output'];
  /** Merged PRs still needed to unlock it; 0 when unlocked */
  mergedToUnlock: Scalars['Int']['output'];
  /** Where the email before each autopilot submission goes, masked; null when none is known, and then turning the setting on answers CONFLICT */
  noticeTo?: Maybe<Scalars['String']['output']>;
  unlocked: Scalars['Boolean']['output'];
};

/** ATTEMPTS (an attempt's state, timeline or PR), FEED (the issues for the viewer computed again), ISSUES (an issue's availability may have moved: a claim, a release, an attempt, a drop), SET (the list or a repo of it), SETTINGS (settings, plan, key, status), ACTIVITY (work in progress started or ended) */
export enum ContributeChangeArea {
  Activity = 'ACTIVITY',
  Attempts = 'ATTEMPTS',
  Feed = 'FEED',
  Issues = 'ISSUES',
  Set = 'SET',
  Settings = 'SETTINGS'
}

/** A changelog file, changesets (`.changeset/*.md`) or news fragments */
export enum ContributeChangelogKind {
  Changesets = 'CHANGESETS',
  File = 'FILE',
  Fragments = 'FRAGMENTS'
}

/** The changelog PRs to the repo edit */
export type ContributeChangelogRule = {
  __typename?: 'ContributeChangelogRule';
  kind: ContributeChangelogKind;
  /** `CHANGELOG.md`, `.changeset/`, `changelog.d/` */
  path: Scalars['String']['output'];
  /** Most PRs edit it, a check checks it, or the docs ask for it */
  required: Scalars['Boolean']['output'];
  source: Scalars['String']['output'];
};

/** What moved for the viewer since a version: one cheap read, no GitHub call */
export type ContributeChanges = {
  __typename?: 'ContributeChanges';
  /** A long read may be running: poll faster, and read contributeActivity */
  activity: Scalars['Boolean']['output'];
  /** The areas changed since `since`; none without one, every area when `since` is ahead */
  changed: Array<ContributeChangeArea>;
  /** The version now, opaque: send it back as `since` */
  version: Scalars['String']['output'];
};

/** The viewer's note when they sent an MCP attempt back to their agent */
export type ContributeChangesRequested = {
  __typename?: 'ContributeChangesRequested';
  at: Scalars['String']['output'];
  note: Scalars['String']['output'];
};

/** The go/no-go check's limit a no-go was decided at, or reached with no verdict */
export type ContributeCheckLimit = {
  __typename?: 'ContributeCheckLimit';
  /** The agent wrote its verdict when told to wrap up; false: no verdict by the limit */
  decided: Scalars['Boolean']['output'];
  /** budget or time */
  limit: Scalars['String']['output'];
};

/** Our checks in one word: passed, failed (a test failed), not_run (the tests could not run), blocked (a rail failed) */
export enum ContributeCheckStatus {
  Blocked = 'BLOCKED',
  Failed = 'FAILED',
  NotRun = 'NOT_RUN',
  Passed = 'PASSED'
}

/** Our checks in one word, and what to tell the viewer */
export type ContributeCheckStatusView = {
  __typename?: 'ContributeCheckStatusView';
  note: Scalars['String']['output'];
  status: ContributeCheckStatus;
};

/** The PR head's check rollup */
export enum ContributeChecksState {
  Error = 'ERROR',
  Expected = 'EXPECTED',
  Failure = 'FAILURE',
  Pending = 'PENDING',
  Success = 'SUCCESS'
}

/** A CLA the repo's PRs sign */
export type ContributeClaRule = {
  __typename?: 'ContributeClaRule';
  /** The check's name on the PR */
  check: Scalars['String']['output'];
  /** Where to sign, when the check links it */
  signUrl?: Maybe<Scalars['String']['output']>;
};

/** The Claude plan the credits come from */
export enum ContributeClaudePlan {
  Credits = 'CREDITS',
  Max_5X = 'MAX_5X',
  Max_20X = 'MAX_20X',
  TeamPremium = 'TEAM_PREMIUM',
  TeamStandard = 'TEAM_STANDARD'
}

/** A provider shown as coming soon, whose "Notify me" is noteProviderInterest */
export enum ContributeComingSoonProvider {
  Chatgpt = 'CHATGPT',
  Copilot = 'COPILOT',
  CopilotAgent = 'COPILOT_AGENT',
  Cursor = 'CURSOR',
  Deepseek = 'DEEPSEEK',
  Gemini = 'GEMINI',
  Jules = 'JULES',
  Mistral = 'MISTRAL',
  Openai = 'OPENAI',
  Openrouter = 'OPENROUTER',
  Xai = 'XAI'
}

export type ContributeConnectKeyResult = {
  __typename?: 'ContributeConnectKeyResult';
  /** The stored key, when it was stored */
  credential?: Maybe<ContributeCredential>;
  result: ContributeConnectResult;
  /** rate_limited: try again after this many seconds */
  retryAfterSec?: Maybe<Scalars['Int']['output']>;
};

export type ContributeConnectLimitsInput = {
  attemptCapUsd?: InputMaybe<Scalars['Float']['input']>;
  dayCapUsd?: InputMaybe<Scalars['Float']['input']>;
  pace?: InputMaybe<ContributeConnectPace>;
  weekCapUsd?: InputMaybe<Scalars['Float']['input']>;
};

/** The pace a key connect sets: spread across the month, or as fast as the caps allow */
export enum ContributeConnectPace {
  Even = 'EVEN',
  Fast = 'FAST'
}

/** A key connect's outcome */
export enum ContributeConnectResult {
  Connected = 'CONNECTED',
  Exhausted = 'EXHAUSTED',
  Invalid = 'INVALID',
  LimitReached = 'LIMIT_REACHED',
  ManagedAgentsUnavailable = 'MANAGED_AGENTS_UNAVAILABLE',
  RateLimited = 'RATE_LIMITED',
  Refused = 'REFUSED',
  Unavailable = 'UNAVAILABLE'
}

/** One of the viewer's PRs opened through Contribute */
export type ContributeContribution = {
  __typename?: 'ContributeContribution';
  agent?: Maybe<ContributeAgent>;
  attemptId: Scalars['ID']['output'];
  /** The attempt's session cost at list price on the viewer's key */
  costUsd: Scalars['Float']['output'];
  followUps: ContributeFollowUps;
  issueId: Scalars['String']['output'];
  issueNumber: Scalars['Int']['output'];
  nameWithOwner?: Maybe<Scalars['String']['output']>;
  /** The open PR needs the viewer */
  needsYou?: Maybe<ContributeNeedsYou>;
  /** An MCP attempt: through the review, or by hand */
  openedBy?: Maybe<ContributeOpenedBy>;
  pullRequest: ContributeAttemptPullRequest;
  repositoryId: Scalars['String']['output'];
  runner: ContributeAttemptRunner;
  /** The PR's title as approved */
  title?: Maybe<Scalars['String']['output']>;
};

export type ContributeContributionTotals = {
  __typename?: 'ContributeContributionTotals';
  closed: Scalars['Int']['output'];
  /** What the sessions behind every PR cost */
  costUsd: Scalars['Float']['output'];
  merged: Scalars['Int']['output'];
  open: Scalars['Int']['output'];
  /** The distinct repos of the merged PRs */
  reposHelped: Scalars['Int']['output'];
};

/** My contributions: the viewer's PRs, newest first, and the totals of all of them */
export type ContributeContributions = {
  __typename?: 'ContributeContributions';
  items: Array<ContributeContribution>;
  totals: ContributeContributionTotals;
};

/** A connected key: never the key, only its last 4 */
export type ContributeCredential = {
  __typename?: 'ContributeCredential';
  /** Until when an exhausted or limit_reached key waits */
  blockedUntil?: Maybe<Scalars['String']['output']>;
  checkedAt: Scalars['String']['output'];
  last4: Scalars['String']['output'];
  /** A fixed code of the last refusal, never the provider's message */
  lastError?: Maybe<Scalars['String']['output']>;
  orgId?: Maybe<Scalars['String']['output']>;
  provider: ContributeLiveProvider;
  /** Our environment and agents exist on the key; else the next attempt makes them */
  ready: Scalars['Boolean']['output'];
  state: ContributeKeyState;
  workspaceId?: Maybe<Scalars['String']['output']>;
};

/** DCO sign-off, only on a repo that requires it: asked on each such PR, or a standing consent */
export enum ContributeDcoMode {
  Ask = 'ASK',
  Standing = 'STANDING'
}

export type ContributeDeleteDataResult = {
  __typename?: 'ContributeDeleteDataResult';
  /** GitRanks Contribute held rows on the viewer, now deleted */
  deleted: Scalars['Boolean']['output'];
  /** The GitHub grant was deleted and revoked, or there was none; else revoke the app on GitHub */
  grantRevoked: Scalars['Boolean']['output'];
};

/** The main model's effort */
export enum ContributeEffort {
  High = 'HIGH',
  Low = 'LOW',
  Max = 'MAX',
  Medium = 'MEDIUM',
  Xhigh = 'XHIGH'
}

export type ContributeFeedbackContextInput = {
  /** Left out: the viewer's own mode */
  mode?: InputMaybe<ContributeSetMode>;
  /** A failed repo's reasons */
  reasons?: InputMaybe<Array<ContributeSetReason>>;
  /** A repo, as owner/name */
  repo?: InputMaybe<Scalars['String']['input']>;
};

/** A review thread waiting for an answer on the PR */
export type ContributeFeedbackThread = {
  __typename?: 'ContributeFeedbackThread';
  author?: Maybe<Scalars['String']['output']>;
  bot: Scalars['Boolean']['output'];
  /** Its first comment's node id: what startFollowUp's commentIds name */
  commentId: Scalars['ID']['output'];
  createdAt?: Maybe<Scalars['String']['output']>;
  /** The comment as one plain line */
  excerpt: Scalars['String']['output'];
  /** The viewer ignored it in an earlier round */
  ignored: Scalars['Boolean']['output'];
  line?: Maybe<Scalars['Int']['output']>;
  path?: Maybe<Scalars['String']['output']>;
  /** The thread's node id */
  threadId: Scalars['ID']['output'];
  url?: Maybe<Scalars['String']['output']>;
};

/** What the feedback is about: GATES, MODES or OTHER */
export enum ContributeFeedbackTopic {
  Gates = 'GATES',
  Modes = 'MODES',
  Other = 'OTHER'
}

/** The PR a follow-up works on, and the first attempt that opened it */
export type ContributeFollowUpOf = {
  __typename?: 'ContributeFollowUpOf';
  attemptId: Scalars['ID']['output'];
  number: Scalars['Int']['output'];
  prId: Scalars['ID']['output'];
  url: Scalars['String']['output'];
};

/** One follow-up round: what it pushed, its threads’ outcomes, the replies posted */
export type ContributeFollowUpRound = {
  __typename?: 'ContributeFollowUpRound';
  at: Scalars['String']['output'];
  attemptId: Scalars['ID']['output'];
  endReason?: Maybe<ContributeAttemptEndReason>;
  fixed: Scalars['Int']['output'];
  needsYou: Scalars['Int']['output'];
  /** The PR head after its push */
  pushedSha?: Maybe<Scalars['String']['output']>;
  /** Replies posted */
  replied: Scalars['Int']['output'];
  /** Threads resolved */
  resolved: Scalars['Int']['output'];
  round: Scalars['Int']['output'];
  skipped: Scalars['Int']['output'];
  state: ContributeAttemptState;
};

/** A PR's follow-up rounds; past the last the PR is the viewer's to carry on */
export type ContributeFollowUps = {
  __typename?: 'ContributeFollowUps';
  /** The follow-up under way */
  currentAttemptId?: Maybe<Scalars['ID']['output']>;
  handedOff: Scalars['Boolean']['output'];
  handedOffAt?: Maybe<Scalars['String']['output']>;
  /** Each round so far, oldest first */
  history?: Maybe<Array<ContributeFollowUpRound>>;
  left: Scalars['Int']['output'];
  max: Scalars['Int']['output'];
  used: Scalars['Int']['output'];
};

/** The GitHub access Contribute opens PRs with */
export type ContributeGrant = {
  __typename?: 'ContributeGrant';
  /** The viewer granted it, and has not revoked it */
  connected: Scalars['Boolean']['output'];
  /** The GitHub login it was granted as; null when not connected */
  login?: Maybe<Scalars['String']['output']>;
};

/** A repo on the ignore list: no add, preset or resolve brings it back */
export type ContributeIgnoredRepo = {
  __typename?: 'ContributeIgnoredRepo';
  /** When it was ignored */
  at: Scalars['String']['output'];
  nameWithOwner: Scalars['String']['output'];
  repositoryId: Scalars['ID']['output'];
};

/** One recommended issue: what an "Issues for you" card shows */
export type ContributeIssue = {
  __typename?: 'ContributeIssue';
  /** The issue's GitHub node id */
  issueId: Scalars['ID']['output'];
  kind?: Maybe<ContributeIssueKind>;
  labels: Array<Scalars['String']['output']>;
  language?: Maybe<ContributeLanguage>;
  nameWithOwner: Scalars['String']['output'];
  number: Scalars['Int']['output'];
  /** Its place in the stored list, 1 the best */
  rank: Scalars['Int']['output'];
  /** The repository's GitHub node id */
  repositoryId: Scalars['String']['output'];
  /** The match, 0 to 1 */
  score: Scalars['Float']['output'];
  /** Null when the issue was never sized */
  size?: Maybe<ContributeIssueSize>;
  /** 0: an issue of the active set (every issue in the all mode); 1: a fallback issue outside the list, shown after every tier 0 one (rank already orders them) */
  tier: Scalars['Int']['output'];
  /** The issue's title; null when GitHub could not be asked */
  title?: Maybe<Scalars['String']['output']>;
  /** The issue's page on GitHub */
  url: Scalars['String']['output'];
  /** Why this issue, as one line */
  why: Scalars['String']['output'];
};

/** An issue kind to ask for */
export enum ContributeIssueKind {
  Bug = 'BUG',
  Docs = 'DOCS',
  Feature = 'FEATURE',
  Performance = 'PERFORMANCE',
  Refactor = 'REFACTOR',
  Tests = 'TESTS'
}

/** A page of the recommended issues, best first */
export type ContributeIssuePage = {
  __typename?: 'ContributeIssuePage';
  /** When the list was last computed; null before the first time */
  computedAt?: Maybe<Scalars['String']['output']>;
  items: Array<ContributeIssue>;
  /** The next page's after; null on the last page */
  next?: Maybe<Scalars['String']['output']>;
  /** The issues the filter lets through, as of the last compute: it can count a few cards a page leaves off (their repo left the pool since), so treat it as approximate */
  total: Scalars['Int']['output'];
};

/** An issue size */
export enum ContributeIssueSize {
  L = 'L',
  M = 'M',
  S = 'S'
}

/** One shown issue as it is now, for the Issues list and Up next to drop taken cards live */
export type ContributeIssueStatus = {
  __typename?: 'ContributeIssueStatus';
  /** With CLAIMED_BY_YOU: your newest attempt on it */
  attemptId?: Maybe<Scalars['ID']['output']>;
  issueId: Scalars['ID']['output'];
  status: ContributeIssueStatusValue;
};

/** An issue as it is now: AVAILABLE, CLAIMED_BY_YOU (an attempt of yours on it, any but a lost claim: it belongs in My contributions) or TAKEN (someone else's at work or with a PR, a live claim, or closed) */
export enum ContributeIssueStatusValue {
  Available = 'AVAILABLE',
  ClaimedByYou = 'CLAIMED_BY_YOU',
  Taken = 'TAKEN'
}

export type ContributeIssuesFilter = {
  kinds?: InputMaybe<Array<ContributeIssueKind>>;
  languages?: InputMaybe<Array<ContributeLanguage>>;
  maxSize?: InputMaybe<ContributeIssueSize>;
};

/** A key: valid, invalid (deleted or wrong), exhausted (until the renewal day), limit_reached (until the 1st) */
export enum ContributeKeyState {
  Exhausted = 'EXHAUSTED',
  Invalid = 'INVALID',
  LimitReached = 'LIMIT_REACHED',
  Valid = 'VALID'
}

/** A language the pool holds issues in */
export enum ContributeLanguage {
  Go = 'GO',
  Java = 'JAVA',
  JsTs = 'JS_TS',
  Php = 'PHP',
  Python = 'PYTHON',
  Ruby = 'RUBY',
  Rust = 'RUST'
}

/** A provider whose keys connect today */
export enum ContributeLiveProvider {
  Anthropic = 'ANTHROPIC'
}

/** A repository the visitor administers or maintains, and whether it is opted out */
export type ContributeMaintainerRepo = {
  __typename?: 'ContributeMaintainerRepo';
  isArchived: Scalars['Boolean']['output'];
  nameWithOwner: Scalars['String']['output'];
  /** Out of GitRanks Contribute: no issue of it is picked and no pull request opened there */
  optedOut: Scalars['Boolean']['output'];
  /** When it was opted out (ISO); null when it is not */
  optedOutAt?: Maybe<Scalars['String']['output']>;
  /** ADMIN or MAINTAIN */
  permission: ContributeRepoPermission;
  /** The repository's GitHub node id: what optOutRepos takes */
  repoId: Scalars['ID']['output'];
  stars: Scalars['Int']['output'];
};

/** The visitor's GitHub account and the public repositories it administers or maintains */
export type ContributeMaintainerRepos = {
  __typename?: 'ContributeMaintainerRepos';
  /** The GitHub login the token belongs to */
  login: Scalars['String']['output'];
  /** Most stars first */
  repos: Array<ContributeMaintainerRepo>;
  /** GitHub held more repositories than were read (the first 300, by stars) */
  truncated: Scalars['Boolean']['output'];
};

/** A personal token for the MCP server: never the token, only its last 4 */
export type ContributeMcpToken = {
  __typename?: 'ContributeMcpToken';
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  last4: Scalars['String']['output'];
  /** Written at most once every 5 minutes */
  lastUsedAt?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
};

/** A new MCP token: the token itself is answered here once, and never again */
export type ContributeMcpTokenCreated = {
  __typename?: 'ContributeMcpTokenCreated';
  mcpToken: ContributeMcpToken;
  /** gr_…: shown once; only its hash is kept */
  token: Scalars['String']['output'];
};

/** A model an attempt runs on */
export enum ContributeModel {
  ClaudeHaiku_5_5 = 'CLAUDE_HAIKU_5_5',
  ClaudeOpus_5_5 = 'CLAUDE_OPUS_5_5',
  ClaudeSonnet_5_5 = 'CLAUDE_SONNET_5_5'
}

/** The PR needs the viewer: the signals since they (or autopilot) last acted on it */
export type ContributeNeedsYou = {
  __typename?: 'ContributeNeedsYou';
  /** Newest last, at most 10 */
  signals: Array<ContributePrSignal>;
  since: Scalars['String']['output'];
};

/** Why an agent said no-go: needs_design, cannot_reproduce, already_fixed, bot_handled, too_big or other; out_of_budget when the check ran out with no verdict */
export enum ContributeNoGoCategory {
  AlreadyFixed = 'ALREADY_FIXED',
  BotHandled = 'BOT_HANDLED',
  CannotReproduce = 'CANNOT_REPRODUCE',
  NeedsDesign = 'NEEDS_DESIGN',
  Other = 'OTHER',
  OutOfBudget = 'OUT_OF_BUDGET',
  TooBig = 'TOO_BIG'
}

export type ContributeNoGoCount = {
  __typename?: 'ContributeNoGoCount';
  category: ContributeNoGoCategory;
  count: Scalars['Int']['output'];
};

/** The first path that worked: a stored Claude key (hosted), or the first call of the contributor's own agent (mcp) */
export enum ContributeOnboardedVia {
  Hosted = 'HOSTED',
  Mcp = 'MCP'
}

/** The onboarding's next step */
export enum ContributeOnboardingStep {
  Done = 'DONE',
  Key = 'KEY',
  Preferences = 'PREFERENCES'
}

/** How an MCP attempt's PR opened: through the review and our submission, or by the viewer by hand */
export enum ContributeOpenedBy {
  Hand = 'HAND',
  Submit = 'SUBMIT'
}

/** NOT_MAINTAINER: the token is not ADMIN or MAINTAIN on the repo; UNKNOWN_REPO: the id names no repository the token can see */
export enum ContributeOptOutRefusal {
  NotMaintainer = 'NOT_MAINTAINER',
  UnknownRepo = 'UNKNOWN_REPO'
}

/** One repository asked of optOutRepos or optInRepos, in the order asked */
export type ContributeOptOutResult = {
  __typename?: 'ContributeOptOutResult';
  /** Null when the id names no repository the token can see */
  nameWithOwner?: Maybe<Scalars['String']['output']>;
  /** Whether the repository is out of GitRanks Contribute now */
  optedOut: Scalars['Boolean']['output'];
  optedOutAt?: Maybe<Scalars['String']['output']>;
  /** Why it was not changed; null when it was */
  reason?: Maybe<ContributeOptOutRefusal>;
  repoId: Scalars['ID']['output'];
};

/** Even (with an end-of-cycle sweep), fast, or queued issues only */
export enum ContributePace {
  Even = 'EVEN',
  Fast = 'FAST',
  Queued = 'QUEUED'
}

/** The paths a contributor has: a Claude key (hosted attempts), a live MCP token (their own agent) */
export type ContributePaths = {
  __typename?: 'ContributePaths';
  hosted: Scalars['Boolean']['output'];
  mcp: Scalars['Boolean']['output'];
};

/** A convention an open PR fails, and its one-click fix when there is one */
export type ContributePrConventionIssue = {
  __typename?: 'ContributePrConventionIssue';
  /** The failing check that says so */
  check?: Maybe<Scalars['String']['output']>;
  kind: ContributePrIssueKind;
  message: Scalars['String']['output'];
  /** title: the title the fix sets; changelog: the line it writes; cla: where to sign; null: no fix */
  suggestion?: Maybe<Scalars['String']['output']>;
};

/** The last fix sent to an open PR */
export type ContributePrFix = {
  __typename?: 'ContributePrFix';
  at: Scalars['String']['output'];
  kind: ContributePrFixStep;
  /** Why it failed, in words */
  note?: Maybe<Scalars['String']['output']>;
  state: ContributePrFixState;
};

/** A one-click fix to an open PR: title (retitle it), body (set its description), changelog (fix the changelog line in a commit) */
export enum ContributePrFixKind {
  Body = 'BODY',
  Changelog = 'CHANGELOG',
  Title = 'TITLE'
}

/** Where a fix to an open PR stands */
export enum ContributePrFixState {
  Done = 'DONE',
  Failed = 'FAILED',
  Sending = 'SENDING'
}

/** A fix sent to an open PR: link (the changelog line's PR number, once it opened), changelog, title, body */
export enum ContributePrFixStep {
  Body = 'BODY',
  Changelog = 'CHANGELOG',
  Link = 'LINK',
  Title = 'TITLE'
}

/** What an open PR fails of its repo's conventions: the title, the changelog line, the template, the CLA */
export enum ContributePrIssueKind {
  Changelog = 'CHANGELOG',
  Cla = 'CLA',
  Template = 'TEMPLATE',
  Title = 'TITLE'
}

/** One thing the PR sync found on an open PR */
export type ContributePrSignal = {
  __typename?: 'ContributePrSignal';
  at: Scalars['String']['output'];
  /** check_failed: the failing checks’ names; cla: the CLA check’s */
  detail?: Maybe<Scalars['String']['output']>;
  kind: ContributePrSignalKind;
};

/** What the PR sync found: changes requested, a new comment by another person, a check newly failing, a CLA to sign, a title that fails the repo's rules */
export enum ContributePrSignalKind {
  ChangesRequested = 'CHANGES_REQUESTED',
  CheckFailed = 'CHECK_FAILED',
  Cla = 'CLA',
  Comment = 'COMMENT',
  Title = 'TITLE'
}

/** A PR: open, merged or closed */
export enum ContributePrState {
  Closed = 'CLOSED',
  Merged = 'MERGED',
  Open = 'OPEN'
}

/** Matching filters: an empty list filters nothing; ids are GitHub node ids */
export type ContributePreferences = {
  __typename?: 'ContributePreferences';
  kinds: Array<ContributeIssueKind>;
  languages: Array<ContributeLanguage>;
  /** Null: any size */
  maxSize?: Maybe<ContributeIssueSize>;
  /** @deprecated The repos list replaced it (contributeSet); always empty */
  reposIn: Array<Scalars['String']['output']>;
  /** @deprecated The ignore list replaced it (contributeSet); always empty */
  reposOut: Array<Scalars['String']['output']>;
  topicIds: Array<Scalars['String']['output']>;
};

export type ContributePreferencesInput = {
  kinds?: InputMaybe<Array<ContributeIssueKind>>;
  languages?: InputMaybe<Array<ContributeLanguage>>;
  maxSize?: InputMaybe<ContributeIssueSize>;
  topicIds?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** A reply a follow-up drafted; posted only once the viewer approves it */
export type ContributeReplyDraft = {
  __typename?: 'ContributeReplyDraft';
  /** The follow-up that drafted it */
  attemptId: Scalars['ID']['output'];
  /** The thread was opened by a bot: it is resolved once answered */
  bot: Scalars['Boolean']['output'];
  /** Null: a top-level comment on the PR */
  comment?: Maybe<ContributeReplyTarget>;
  createdAt: Scalars['String']['output'];
  draftId: Scalars['ID']['output'];
  /** Why the last post failed */
  lastError?: Maybe<ContributeSubmitError>;
  /** What the follow-up did about the thread */
  outcome?: Maybe<ContributeThreadOutcome>;
  posted: Scalars['Boolean']['output'];
  postedAt?: Maybe<Scalars['String']['output']>;
  prId: Scalars['ID']['output'];
  /** Posted before the text: "Fixed in <sha>: " or "Not changed: " (<commit> before the push) */
  prefix?: Maybe<Scalars['String']['output']>;
  /** The agent's reason: a skip's, or the question for the viewer */
  reason?: Maybe<Scalars['String']['output']>;
  /** Its thread is resolved after the reply posts */
  resolve: Scalars['Boolean']['output'];
  resolveState: ContributeResolveState;
  /** Approved to post with the push */
  send: Scalars['Boolean']['output'];
  state: ContributeReplyState;
  text: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  /** The posted comment on GitHub */
  url?: Maybe<Scalars['String']['output']>;
};

/** A follow-up's reply as the viewer edited it at the approval */
export type ContributeReplyInput = {
  draftId: Scalars['ID']['input'];
  /** Post it with the push */
  send: Scalars['Boolean']['input'];
  text: Scalars['String']['input'];
};

/** A drafted reply: draft, posting (approved), posted, or failed (approve again) */
export enum ContributeReplyState {
  Draft = 'DRAFT',
  Failed = 'FAILED',
  Posted = 'POSTED',
  Posting = 'POSTING'
}

/** The review thread a reply answers (its first comment) */
export type ContributeReplyTarget = {
  __typename?: 'ContributeReplyTarget';
  author?: Maybe<Scalars['String']['output']>;
  /** The review comment's GitHub node id */
  commentId: Scalars['ID']['output'];
  /** The comment's first 300 characters */
  excerpt: Scalars['String']['output'];
  line?: Maybe<Scalars['Int']['output']>;
  path?: Maybe<Scalars['String']['output']>;
};

/** A reply draft the viewer can approve now, with its PR. inReview: its follow-up waits in the review (or autopilot's hour) with it, so it folds into that review */
export type ContributeReplyWaiting = {
  __typename?: 'ContributeReplyWaiting';
  /** The follow-up that drafted it */
  attemptId: Scalars['ID']['output'];
  /** The thread was opened by a bot: it is resolved once answered */
  bot: Scalars['Boolean']['output'];
  /** Null: a top-level comment on the PR */
  comment?: Maybe<ContributeReplyTarget>;
  createdAt: Scalars['String']['output'];
  draftId: Scalars['ID']['output'];
  /** The follow-up that drafted it waits for the viewer (review, or autopilot’s hour) */
  inReview: Scalars['Boolean']['output'];
  /** Why the last post failed */
  lastError?: Maybe<ContributeSubmitError>;
  nameWithOwner?: Maybe<Scalars['String']['output']>;
  /** What the follow-up did about the thread */
  outcome?: Maybe<ContributeThreadOutcome>;
  posted: Scalars['Boolean']['output'];
  postedAt?: Maybe<Scalars['String']['output']>;
  prId: Scalars['ID']['output'];
  /** The PR's number */
  prNumber: Scalars['Int']['output'];
  /** Posted before the text: "Fixed in <sha>: " or "Not changed: " (<commit> before the push) */
  prefix?: Maybe<Scalars['String']['output']>;
  /** The agent's reason: a skip's, or the question for the viewer */
  reason?: Maybe<Scalars['String']['output']>;
  /** Its thread is resolved after the reply posts */
  resolve: Scalars['Boolean']['output'];
  resolveState: ContributeResolveState;
  /** Approved to post with the push */
  send: Scalars['Boolean']['output'];
  state: ContributeReplyState;
  text: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  /** The posted comment on GitHub */
  url?: Maybe<Scalars['String']['output']>;
};

/** What the repo asks of a PR, read from its config, its checks and its merged PRs */
export type ContributeRepoConventions = {
  __typename?: 'ContributeRepoConventions';
  /** A mark every comment an agent posts starts with (🤖) */
  agentMarker?: Maybe<Scalars['String']['output']>;
  changelog?: Maybe<ContributeChangelogRule>;
  cla?: Maybe<ContributeClaRule>;
  /** A DCO check runs on its PRs */
  dco: Scalars['Boolean']['output'];
  /** Folders of generated files its merged PRs commit (snapshots, baselines) */
  generated: Array<Scalars['String']['output']>;
  /** Its docs' lines about titles and changelogs, as found */
  notes: Array<Scalars['String']['output']>;
  template?: Maybe<ContributeTemplateAsks>;
  /** Its agent rules leave the PR template for the human to fill */
  templateByHuman?: Maybe<Scalars['Boolean']['output']>;
  title?: Maybe<ContributeTitleRule>;
  /** Recently merged PR titles */
  titleExamples: Array<Scalars['String']['output']>;
  /** A prefix every PR title must carry (`[AI]`), from its agent rules */
  titlePrefix?: Maybe<Scalars['String']['output']>;
};

/** The signed-in visitor's permission on a GitHub repository, as GitHub answered for their token */
export enum ContributeRepoPermission {
  Admin = 'ADMIN',
  Maintain = 'MAINTAIN',
  Read = 'READ',
  Triage = 'TRIAGE',
  Write = 'WRITE'
}

/** How the repo installs, builds and tests, as the agent found it */
export type ContributeRepoReadiness = {
  __typename?: 'ContributeRepoReadiness';
  build?: Maybe<Scalars['String']['output']>;
  install?: Maybe<Scalars['String']['output']>;
  notes?: Maybe<Scalars['String']['output']>;
  test?: Maybe<Scalars['String']['output']>;
  toolchain?: Maybe<Scalars['String']['output']>;
};

/** A thread's resolve after its reply posted: none, resolving, resolved, failed */
export enum ContributeResolveState {
  Failed = 'FAILED',
  None = 'NONE',
  Resolved = 'RESOLVED',
  Resolving = 'RESOLVING'
}

/** The PR's review decision */
export enum ContributeReviewDecision {
  Approved = 'APPROVED',
  ChangesRequested = 'CHANGES_REQUESTED',
  ReviewRequired = 'REVIEW_REQUIRED'
}

/** The PR's review threads waiting for an answer */
export type ContributeReviewFeedback = {
  __typename?: 'ContributeReviewFeedback';
  /** When GitHub was last read for them */
  readAt?: Maybe<Scalars['String']['output']>;
  threads: Array<ContributeFeedbackThread>;
};

/** The agent's own rating of its change */
export enum ContributeRiskLevel {
  High = 'HIGH',
  Low = 'LOW',
  Medium = 'MEDIUM'
}

/** One run: an agent's attempt on one issue, and what came of it */
export type ContributeRun = {
  __typename?: 'ContributeRun';
  /** The viewer's own agent, as it named itself */
  agent?: Maybe<ContributeAgent>;
  attemptId: Scalars['ID']['output'];
  costUsd: Scalars['Float']['output'];
  createdAt: Scalars['String']['output'];
  effort?: Maybe<ContributeEffort>;
  /** A fixed code, or the agent's no-go reason */
  endDetail?: Maybe<Scalars['String']['output']>;
  endReason?: Maybe<ContributeAttemptEndReason>;
  /** When the agent stopped working; null while it works */
  finishedAt?: Maybe<Scalars['String']['output']>;
  followUpOf?: Maybe<ContributeRunFollowUpOf>;
  /** A first attempt's follow-up rounds so far */
  followUps: Scalars['Int']['output'];
  goNoGoUsd: Scalars['Float']['output'];
  kind: ContributeAttemptKind;
  model?: Maybe<ContributeModel>;
  /** `owner/name`, the pool's for a run that never read it */
  nameWithOwner?: Maybe<Scalars['String']['output']>;
  noGoCategory?: Maybe<ContributeNoGoCategory>;
  number: Scalars['Int']['output'];
  outcome: ContributeRunOutcome;
  pullRequest?: Maybe<ContributeRunPullRequest>;
  /** `user` when the viewer put it in line, else `scheduler` */
  queuedBy: Scalars['String']['output'];
  runner: ContributeAttemptRunner;
  startedAt?: Maybe<Scalars['String']['output']>;
  state: ContributeAttemptState;
  /** Null when the session never read the issue */
  title?: Maybe<Scalars['String']['output']>;
  workUsd: Scalars['Float']['output'];
};

export type ContributeRunFollowUpOf = {
  __typename?: 'ContributeRunFollowUpOf';
  attemptId: Scalars['ID']['output'];
  /** The PR's number */
  number: Scalars['Int']['output'];
};

/** A run's outcome: running, review, pr_open, merged, closed, pushed, no_go, checks_failed, not_started, stopped, discarded */
export enum ContributeRunOutcome {
  ChecksFailed = 'CHECKS_FAILED',
  Closed = 'CLOSED',
  Discarded = 'DISCARDED',
  Merged = 'MERGED',
  NotStarted = 'NOT_STARTED',
  NoGo = 'NO_GO',
  PrOpen = 'PR_OPEN',
  Pushed = 'PUSHED',
  Review = 'REVIEW',
  Running = 'RUNNING',
  Stopped = 'STOPPED'
}

export type ContributeRunOutcomeCount = {
  __typename?: 'ContributeRunOutcomeCount';
  count: Scalars['Int']['output'];
  outcome: ContributeRunOutcomeCountKey;
};

/** An outcome chip's key: all, or an outcome filter */
export enum ContributeRunOutcomeCountKey {
  All = 'ALL',
  ChecksFailed = 'CHECKS_FAILED',
  NotStarted = 'NOT_STARTED',
  NoGo = 'NO_GO',
  Pr = 'PR',
  Stopped = 'STOPPED'
}

/** The outcome filter: pr (open, merged, closed, pushed), no_go, checks_failed, stopped (with discarded), not_started */
export enum ContributeRunOutcomeFilter {
  ChecksFailed = 'CHECKS_FAILED',
  NotStarted = 'NOT_STARTED',
  NoGo = 'NO_GO',
  Pr = 'PR',
  Stopped = 'STOPPED'
}

export type ContributeRunPullRequest = {
  __typename?: 'ContributeRunPullRequest';
  number: Scalars['Int']['output'];
  url?: Maybe<Scalars['String']['output']>;
};

/** A page of the viewer's runs, newest first */
export type ContributeRuns = {
  __typename?: 'ContributeRuns';
  /** The UTC days this page's runs fall on, the latest first */
  days: Array<ContributeRunsDay>;
  items: Array<ContributeRun>;
  /** The next page's `after`; null on the last page */
  nextCursor?: Maybe<Scalars['String']['output']>;
  /** Runs per outcome chip, under the rest of the filter */
  outcomeCounts: Array<ContributeRunOutcomeCount>;
  /** Every repo the viewer has runs in, the latest first */
  repos: Array<Scalars['String']['output']>;
  totals: ContributeRunsTotals;
};

/** One UTC day of the page: every run of it the filter matches, on this page or not */
export type ContributeRunsDay = {
  __typename?: 'ContributeRunsDay';
  costUsd: Scalars['Float']['output'];
  /** YYYY-MM-DD, UTC */
  day: Scalars['String']['output'];
  /** PRs its first attempts opened */
  prs: Scalars['Int']['output'];
  runs: Scalars['Int']['output'];
};

/** Which runs: every one when empty */
export type ContributeRunsFilter = {
  /** The no-gos of that category alone */
  category?: InputMaybe<ContributeNoGoCategory>;
  /** ISO: runs started at or after it */
  from?: InputMaybe<Scalars['String']['input']>;
  outcome?: InputMaybe<ContributeRunOutcomeFilter>;
  /** `owner/name` */
  repo?: InputMaybe<Scalars['String']['input']>;
  runner?: InputMaybe<ContributeAttemptRunner>;
  /** ISO: runs started before it */
  to?: InputMaybe<Scalars['String']['input']>;
};

/** Over every run the filter matches, not only the page */
export type ContributeRunsTotals = {
  __typename?: 'ContributeRunsTotals';
  closed: Scalars['Int']['output'];
  costUsd: Scalars['Float']['output'];
  merged: Scalars['Int']['output'];
  noGo: Scalars['Int']['output'];
  /** The largest first; a no-go without a category is left out */
  noGoByCategory: Array<ContributeNoGoCount>;
  noGoCostUsd: Scalars['Float']['output'];
  /** First attempts that opened a PR */
  prs: Scalars['Int']['output'];
  runs: Scalars['Int']['output'];
  /** The runs that reached the agent */
  started: Scalars['Int']['output'];
};

/** What the scheduler counts now, as it decides whether an attempt starts */
export type ContributeScheduleCounts = {
  __typename?: 'ContributeScheduleCounts';
  /** Attempts against open PRs at a time: reviews, autopilot’s hour, submissions and open PRs */
  prBound: Scalars['Int']['output'];
  /** Issues in line (first attempts queued), every one: above 0 an attempt may still wait, when none of them is free now */
  queued: Scalars['Int']['output'];
};

/** The viewer's set: the active mode, each mode's list and fallback, the ignore list */
export type ContributeSet = {
  __typename?: 'ContributeSet';
  ignore: Array<ContributeIgnoredRepo>;
  limits: ContributeSetLimits;
  mode: ContributeSetMode;
  repos: ContributeSetRepos;
  stack: ContributeSetStack;
  /** Bumps on every write that changed something */
  version: Scalars['Int']['output'];
};

/** What one add did ("Added 2 of 31 repos from vercel: your list is full"), and the set now */
export type ContributeSetAddResult = {
  __typename?: 'ContributeSetAddResult';
  /** Appended, in order */
  added: Array<ContributeSetRepo>;
  /** Repos read: an owner's first 100 by stars, or 1 for a repo */
  considered: Scalars['Int']['output'];
  /** The list hit its cap before every passing repo fit */
  full: Scalars['Boolean']['output'];
  /** Passed the gate: the added ones and those that did not fit */
  passed: Scalars['Int']['output'];
  set: ContributeSet;
  skipped: ContributeSetAddSkipped;
};

/** What an add left out */
export type ContributeSetAddSkipped = {
  __typename?: 'ContributeSetAddSkipped';
  /** Already on the list */
  duplicate: Scalars['Int']['output'];
  /** Failed the list's gate, by reason */
  failed: Array<ContributeSetReasonCount>;
  /** On the ignore list */
  ignored: Scalars['Int']['output'];
  /** In a language not supported yet (stored greyed when they fit) */
  unsupported: Array<ContributeSetRepo>;
};

/** When the set has nothing ready: SET_ONLY waits, THEN_ALL (the default) goes on with all issues */
export enum ContributeSetFallback {
  SetOnly = 'SET_ONLY',
  ThenAll = 'THEN_ALL'
}

/** The set's caps: each list's size, and the day limits per viewer (UTC days) */
export type ContributeSetLimits = {
  __typename?: 'ContributeSetLimits';
  /** Adds a day (RATE_LIMITED past it) */
  addsPerDay: Scalars['Int']['output'];
  /** A feedback message's most characters */
  feedbackMaxChars: Scalars['Int']['output'];
  /** Feedback messages a day (RATE_LIMITED past it) */
  feedbackPerDay: Scalars['Int']['output'];
  ignore: Scalars['Int']['output'];
  repos: Scalars['Int']['output'];
  /** Manual stack resolves a day (RATE_LIMITED past it) */
  resolvesPerDay: Scalars['Int']['output'];
  sources: Scalars['Int']['output'];
  targets: Scalars['Int']['output'];
};

/** A list the viewer edits: SOURCES (the stack's own repos) or REPOS (the repos list) */
export enum ContributeSetList {
  Repos = 'REPOS',
  Sources = 'SOURCES'
}

/** A mode with a list, and so a fallback: STACK or REPOS */
export enum ContributeSetListMode {
  Repos = 'REPOS',
  Stack = 'STACK'
}

/** Where issues come from: ALL (the global pool), STACK (the libraries your repos use), REPOS (your list) */
export enum ContributeSetMode {
  All = 'ALL',
  Repos = 'REPOS',
  Stack = 'STACK'
}

/** Why a repo did not pass a list's gate, in the order the UI lists them */
export enum ContributeSetReason {
  AiBan = 'AI_BAN',
  Archived = 'ARCHIVED',
  ContributeOff = 'CONTRIBUTE_OFF',
  Deleted = 'DELETED',
  Fork = 'FORK',
  IssuesDisabled = 'ISSUES_DISABLED',
  Language = 'LANGUAGE',
  License = 'LICENSE',
  NoManifest = 'NO_MANIFEST',
  OptedOut = 'OPTED_OUT',
  OutsideMerges = 'OUTSIDE_MERGES',
  Private = 'PRIVATE',
  Pushed = 'PUSHED'
}

/** Repos an add left out for one gate reason */
export type ContributeSetReasonCount = {
  __typename?: 'ContributeSetReasonCount';
  count: Scalars['Int']['output'];
  reason: ContributeSetReason;
};

/** One repo on a list (SetRepo) */
export type ContributeSetRepo = {
  __typename?: 'ContributeSetRepo';
  addedAt: Scalars['String']['output'];
  /** Null: not a language the sandbox runs */
  language?: Maybe<ContributeLanguage>;
  nameWithOwner: Scalars['String']['output'];
  /** Why it failed (or is unsupported); empty otherwise */
  reasons: Array<ContributeSetReason>;
  /** The repository's GitHub node id */
  repositoryId: Scalars['ID']['output'];
  stars: Scalars['Int']['output'];
  /** The live status */
  status: ContributeSetRepoStatus;
  via: ContributeSetRepoVia;
};

/** CHECKING until its first read, ACTIVE, FAILED (a gate reason found later; reasons say which), UNSUPPORTED (a language the sandbox does not run: shown greyed, never counted) */
export enum ContributeSetRepoStatus {
  Active = 'ACTIVE',
  Checking = 'CHECKING',
  Failed = 'FAILED',
  Unsupported = 'UNSUPPORTED'
}

/** How a repo got on the list */
export type ContributeSetRepoVia = {
  __typename?: 'ContributeSetRepoVia';
  kind: ContributeSetRepoViaKind;
  /** OWNER: the login as GitHub spells it; else null */
  login?: Maybe<Scalars['String']['output']>;
};

/** How a repo got on the list: ME (the @me preset), OWNER (a user or org expanded), REPO (one repo) */
export enum ContributeSetRepoViaKind {
  Me = 'ME',
  Owner = 'OWNER',
  Repo = 'REPO'
}

/** Support these repos: the list and its fallback */
export type ContributeSetRepos = {
  __typename?: 'ContributeSetRepos';
  /** The repos counted toward the cap: every one but UNSUPPORTED */
  count: Scalars['Int']['output'];
  fallback: ContributeSetFallback;
  repos: Array<ContributeSetRepo>;
};

/** Support my stack: the sources, their fallback and resolve */
export type ContributeSetStack = {
  __typename?: 'ContributeSetStack';
  /** The sources counted toward the cap: every one but UNSUPPORTED */
  count: Scalars['Int']['output'];
  fallback: ContributeSetFallback;
  /** Null before the first resolve */
  resolve?: Maybe<ContributeStackResolve>;
  sources: Array<ContributeSetRepo>;
};

/** Every setting is the user's; weekCapUsd and dayCapUsd null for none */
export type ContributeSettings = {
  __typename?: 'ContributeSettings';
  attemptCapUsd: Scalars['Float']['output'];
  attemptsAtATime: Scalars['Int']['output'];
  autopilot: Scalars['Boolean']['output'];
  cycleCapUsd: Scalars['Float']['output'];
  dayCapUsd?: Maybe<Scalars['Float']['output']>;
  dco: ContributeDcoMode;
  effort: ContributeEffort;
  helperModel: ContributeModel;
  mainModel: ContributeModel;
  maxChangedLines: Scalars['Int']['output'];
  maxFiles: Scalars['Int']['output'];
  openPrsAtATime: Scalars['Int']['output'];
  pace: ContributePace;
  /** The day of the month (UTC) the credits renew */
  renewalDay: Scalars['Int']['output'];
  /** A follow-up's pushed replies resolve people's review threads too; off: only bots' (reviewers resolve their own) */
  resolveHumanThreads: Scalars['Boolean']['output'];
  sweepDays: Scalars['Int']['output'];
  /** Null: the same as the main model */
  testModel?: Maybe<ContributeModel>;
  weekCapUsd?: Maybe<Scalars['Float']['output']>;
};

export type ContributeSettingsInput = {
  attemptCapUsd?: InputMaybe<Scalars['Float']['input']>;
  attemptsAtATime?: InputMaybe<Scalars['Int']['input']>;
  autopilot?: InputMaybe<Scalars['Boolean']['input']>;
  cycleCapUsd?: InputMaybe<Scalars['Float']['input']>;
  dayCapUsd?: InputMaybe<Scalars['Float']['input']>;
  dco?: InputMaybe<ContributeDcoMode>;
  effort?: InputMaybe<ContributeEffort>;
  helperModel?: InputMaybe<ContributeModel>;
  mainModel?: InputMaybe<ContributeModel>;
  maxChangedLines?: InputMaybe<Scalars['Int']['input']>;
  maxFiles?: InputMaybe<Scalars['Int']['input']>;
  openPrsAtATime?: InputMaybe<Scalars['Int']['input']>;
  pace?: InputMaybe<ContributePace>;
  renewalDay?: InputMaybe<Scalars['Int']['input']>;
  resolveHumanThreads?: InputMaybe<Scalars['Boolean']['input']>;
  sweepDays?: InputMaybe<Scalars['Int']['input']>;
  testModel?: InputMaybe<ContributeModel>;
  weekCapUsd?: InputMaybe<Scalars['Float']['input']>;
};

/** Spend in UTC days; the week starts on Monday, the cycle on the renewal day */
export type ContributeSpend = {
  __typename?: 'ContributeSpend';
  /** What an attempt may start against now */
  allowanceUsd: Scalars['Float']['output'];
  cycleEnd: Scalars['String']['output'];
  cycleStart: Scalars['String']['output'];
  cycleUsd: Scalars['Float']['output'];
  /** When an attempt could next start; null when none ever can */
  nextAttemptAt?: Maybe<Scalars['String']['output']>;
  todayUsd: Scalars['Float']['output'];
  weekUsd: Scalars['Float']['output'];
};

/** A stack candidate that did not pass the gate ("Why isn't X here?") */
export type ContributeStackFailedRepo = {
  __typename?: 'ContributeStackFailedRepo';
  nameWithOwner: Scalars['String']['output'];
  reasons: Array<ContributeSetReason>;
  repositoryId: Scalars['ID']['output'];
  usage: Scalars['Int']['output'];
};

/** The stack's last resolve: its sources' dependencies turned into target repos */
export type ContributeStackResolve = {
  __typename?: 'ContributeStackResolve';
  endedAt?: Maybe<Scalars['String']['output']>;
  /** The first 20 candidates that did not pass */
  failed: Array<ContributeStackFailedRepo>;
  /** Distinct direct packages read */
  packages: Scalars['Int']['output'];
  startedAt: Scalars['String']['output'];
  state: ContributeStackResolveState;
  /** The ≤ 50 that passed the gate, by usage then stars; then the UNSUPPORTED ones (not counted) */
  targets: Array<ContributeStackTarget>;
  /** Packages with no GitHub repo */
  unlinked: Scalars['Int']['output'];
};

/** The stack resolve: RESOLVING, READY, or FAILED (the last targets kept; resolveContributeStack tries again) */
export enum ContributeStackResolveState {
  Failed = 'FAILED',
  Ready = 'READY',
  Resolving = 'RESOLVING'
}

/** A stack target: a library the viewer's sources use */
export type ContributeStackTarget = {
  __typename?: 'ContributeStackTarget';
  addedAt: Scalars['String']['output'];
  /** Null: not a language the sandbox runs */
  language?: Maybe<ContributeLanguage>;
  nameWithOwner: Scalars['String']['output'];
  /** Up to 5 of its package names the sources depend on */
  packages: Array<Scalars['String']['output']>;
  /** Why it failed (or is unsupported); empty otherwise */
  reasons: Array<ContributeSetReason>;
  /** The repository's GitHub node id */
  repositoryId: Scalars['ID']['output'];
  stars: Scalars['Int']['output'];
  /** The live status */
  status: ContributeSetRepoStatus;
  /** How many sources use it */
  usage: Scalars['Int']['output'];
  via: ContributeSetRepoVia;
};

/** What last went wrong in a submission, in our words */
export type ContributeSubmitError = {
  __typename?: 'ContributeSubmitError';
  at: Scalars['String']['output'];
  /** What happened and what to do, for the user */
  note: Scalars['String']['output'];
  /** A fixed code: the write that failed (grant_revoked, submit_off, …) or ours (no_answer, …) */
  reason: Scalars['String']['output'];
};

/** A submission's step: queued, waiting_cap (the day's PRs are open), fork, sync, push, pull_request */
export enum ContributeSubmitStep {
  Fork = 'FORK',
  PullRequest = 'PULL_REQUEST',
  Push = 'PUSH',
  Queued = 'QUEUED',
  Sync = 'SYNC',
  WaitingCap = 'WAITING_CAP'
}

/** A submission's write step: when it started and finished */
export type ContributeSubmitStepTime = {
  __typename?: 'ContributeSubmitStepTime';
  /** Null while it runs, or after it failed */
  doneAt?: Maybe<Scalars['String']['output']>;
  startedAt: Scalars['String']['output'];
  /** fork, sync, push or pull_request */
  step: ContributeSubmitStep;
};

/** The repo's PR template and what it asks of AI-written PRs */
export type ContributeTemplateAsks = {
  __typename?: 'ContributeTemplateAsks';
  /** Its lines about AI use (name the model, tick a box) */
  aiAsks: Array<Scalars['String']['output']>;
  path: Scalars['String']['output'];
};

/** What a follow-up did about a review thread: fixed, skipped (with a reason), needs_you (a decision for the viewer) */
export enum ContributeThreadOutcome {
  Fixed = 'FIXED',
  NeedsYou = 'NEEDS_YOU',
  Skipped = 'SKIPPED'
}

/** The repo's PR title rule: `type(scope)!: summary`, or its own pattern */
export type ContributeTitleRule = {
  __typename?: 'ContributeTitleRule';
  /** A bot or a workflow checks it: a title that fails it fails a check */
  hard: Scalars['Boolean']['output'];
  /** The repo's own title pattern (a JS regex source: group 1 the type, 2 the scope); null: conventional */
  pattern?: Maybe<Scalars['String']['output']>;
  requireScope: Scalars['Boolean']['output'];
  /** The scopes allowed; null: any */
  scopes?: Maybe<Array<Scalars['String']['output']>>;
  /** Where it was read, in words ("`.github/semantic.yml`") */
  source: Scalars['String']['output'];
  /** The types allowed; null: any */
  types?: Maybe<Array<Scalars['String']['output']>>;
};

export type Contribution = {
  __typename?: 'Contribution';
  linesAdded?: Maybe<Scalars['Int']['output']>;
  linesRemoved?: Maybe<Scalars['Int']['output']>;
  mergedPrsCount?: Maybe<Scalars['Int']['output']>;
  prsCount?: Maybe<Scalars['Int']['output']>;
  repoId?: Maybe<Scalars['String']['output']>;
  repository?: Maybe<Repository>;
  year: Scalars['Int']['output'];
};

/** The signed-in viewer as GitRanks Contribute knows them */
export type Contributor = {
  __typename?: 'Contributor';
  autopilot: ContributeAutopilot;
  createdAt: Scalars['String']['output'];
  credentials: Array<ContributeCredential>;
  login: Scalars['String']['output'];
  /** When a path first worked (a stored key, or their agent’s first call); null until then. Never cleared */
  onboardedAt?: Maybe<Scalars['String']['output']>;
  /** Which path onboarded them; null until then */
  onboardedVia?: Maybe<ContributeOnboardedVia>;
  paths: ContributePaths;
  /** Contributing is paused: by the viewer, or because the key was refused */
  paused: Scalars['Boolean']['output'];
  plan?: Maybe<ContributeClaudePlan>;
  preferences?: Maybe<ContributePreferences>;
  scheduleCounts: ContributeScheduleCounts;
  /** Null until a key was connected */
  settings?: Maybe<ContributeSettings>;
  /** Null until there are settings */
  spend?: Maybe<ContributeSpend>;
  status: ContributorStatus;
  step: ContributeOnboardingStep;
};

/** Onboarding, active or paused */
export enum ContributorStatus {
  Active = 'ACTIVE',
  Onboarding = 'ONBOARDING',
  Paused = 'PAUSED'
}

export type ContributorsWall = {
  __typename?: 'ContributorsWall';
  /** At most 70, in the asked order. */
  entries: Array<ContributorsWallEntry>;
  /** A developer’s repositories with analytics; null otherwise. */
  repos?: Maybe<Scalars['Int']['output']>;
  /** Everyone the wall draws from (people with a login): a repository’s top contributors, a developer’s union over their repositories, every contributor of an organization in 60 months. */
  total: Scalars['Int']['output'];
};

export type ContributorsWallEntry = {
  __typename?: 'ContributorsWallEntry';
  avatarUrl: Scalars['String']['output'];
  level?: Maybe<Scalars['Int']['output']>;
  login: Scalars['String']['output'];
  /** The best developer tier (Built by’s rule); null without one. */
  tier?: Maybe<Scalars['Int']['output']>;
};

export enum ContributorsWallOrder {
  Contributions = 'CONTRIBUTIONS',
  Newest = 'NEWEST',
  Popular = 'POPULAR'
}

export type Country = {
  __typename?: 'Country';
  /** Alternative country spellings */
  altSpellings: Array<Scalars['String']['output']>;
  /** Area in square kilometers */
  area: Scalars['Float']['output'];
  code: Scalars['String']['output'];
  flag: Scalars['String']['output'];
  name: Scalars['String']['output'];
  population: Scalars['Int']['output'];
  states: Array<Scalars['String']['output']>;
  summary?: Maybe<CountrySummaryBasic>;
  /** Top 5 biggest cities by population */
  topCities: Array<Scalars['String']['output']>;
};

export type CountryBasic = {
  __typename?: 'CountryBasic';
  code: Scalars['String']['output'];
  flag: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type CountryLanguageSummary = {
  __typename?: 'CountryLanguageSummary';
  country: Scalars['String']['output'];
  date: Scalars['String']['output'];
  language: Scalars['String']['output'];
  languageData?: Maybe<Language>;
  score: Scalars['Float']['output'];
  size: Scalars['Float']['output'];
  topUser?: Maybe<UserBasic>;
  usersCount: Scalars['Int']['output'];
};

export type CountrySummary = {
  __typename?: 'CountrySummary';
  c: Scalars['Float']['output'];
  country: Scalars['String']['output'];
  countryData: CountryBasic;
  date: Scalars['String']['output'];
  f: Scalars['Float']['output'];
  s: Scalars['Float']['output'];
  topUsers?: Maybe<CountryTopUsers>;
  usersCount: Scalars['Int']['output'];
};

export type CountrySummaryBasic = {
  __typename?: 'CountrySummaryBasic';
  c: Scalars['Float']['output'];
  country: Scalars['String']['output'];
  date: Scalars['String']['output'];
  f: Scalars['Float']['output'];
  s: Scalars['Float']['output'];
  topUsers?: Maybe<CountryTopUsers>;
  usersCount: Scalars['Int']['output'];
};

export enum CountrySummaryOrder {
  Contributions = 'CONTRIBUTIONS',
  Followers = 'FOLLOWERS',
  Stars = 'STARS',
  Users = 'USERS'
}

export type CountryTopUsers = {
  __typename?: 'CountryTopUsers';
  c?: Maybe<UserBasic>;
  f?: Maybe<UserBasic>;
  s?: Maybe<UserBasic>;
};

export type Entities = {
  __typename?: 'Entities';
  links?: Maybe<Scalars['JSON']['output']>;
  mentions?: Maybe<Scalars['JSON']['output']>;
};

export enum InsightCategory {
  CountryAnalysis = 'COUNTRY_ANALYSIS',
  CountryTrends = 'COUNTRY_TRENDS',
  LanguageAnalysis = 'LANGUAGE_ANALYSIS',
  LanguageTrends = 'LANGUAGE_TRENDS',
  MonthInNumbers = 'MONTH_IN_NUMBERS',
  OrgScoreChange = 'ORG_SCORE_CHANGE',
  ProfileScoreChange = 'PROFILE_SCORE_CHANGE',
  RepoAnniversary = 'REPO_ANNIVERSARY',
  RisingRepos = 'RISING_REPOS',
  ScoreMilestone = 'SCORE_MILESTONE',
  StarBurst = 'STAR_BURST',
  Top_100Climber = 'TOP_100_CLIMBER',
  TopStarGainers = 'TOP_STAR_GAINERS'
}

export type InsightPost = {
  __typename?: 'InsightPost';
  category: InsightCategory;
  createdAt: Scalars['DateTime']['output'];
  entities?: Maybe<Entities>;
  id: Scalars['ID']['output'];
  replies: Array<InsightReply>;
  segments: Array<Segment>;
  socialPosts?: Maybe<Scalars['JSON']['output']>;
};

export type InsightReply = {
  __typename?: 'InsightReply';
  createdAt: Scalars['DateTime']['output'];
  entities?: Maybe<Entities>;
  segments: Array<Segment>;
  socialPosts?: Maybe<Scalars['JSON']['output']>;
};

export type Language = {
  __typename?: 'Language';
  color?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
};

export type LanguageEntity = {
  __typename?: 'LanguageEntity';
  color?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  size: Scalars['Float']['output'];
};

export type LanguageSummary = {
  __typename?: 'LanguageSummary';
  date: Scalars['String']['output'];
  language: Scalars['String']['output'];
  languageData?: Maybe<Language>;
  score: Scalars['Float']['output'];
  size: Scalars['Float']['output'];
  topUser?: Maybe<UserBasic>;
  usersCount: Scalars['Int']['output'];
};

export enum LanguageSummaryOrder {
  Score = 'SCORE',
  Size = 'SIZE',
  Users = 'USERS'
}

export type Mutation = {
  __typename?: 'Mutation';
  /** Adds to a list: "@me", a user or org (its passing repos, most stars first, until the list is full), owner/name or a GitHub URL (one repo; one that fails the gate is not added, skipped.failed says why). BAD_USER_INPUT for an input that is none of them, NOT_FOUND when GitHub has no such owner or repo, RATE_LIMITED past 60 adds a day or while GitHub rate limits the read, GITHUB_UNAVAILABLE when GitHub cannot be read */
  addToContributeSet: ContributeSetAddResult;
  /** Approves an attempt in review with the PR’s title and body as edited, and the DCO sign-off (used only on a repo that requires it, `dcoRequired`): the submission starts (fork, push, PR in the viewer’s name). CONFLICT when the attempt is not in review */
  approveAttempt: ContributeAttempt;
  /** Approves a drafted reply: it is posted on the PR in the viewer’s name (a reply in its review thread, or a comment). Never posted otherwise. CONFLICT when the PR is no longer open */
  approveReply: ContributeReplyDraft;
  /** Checks a Claude API key (one 1-token request on it), seals and stores it; never answered back. confirmedLimit: the key is in a separate workspace with a monthly spend limit. cycleCapUsd is required for purchased credits and overrides the plan’s credit otherwise; limits sets the week, day and attempt caps and the pace (BAD_USER_INPUT, nothing stored, when the attempt cap is above a cap that is set). A stored key onboards the viewer */
  connectClaudeKey: ContributeConnectKeyResult;
  /** A personal token for the MCP server (name at most 40 characters). The token is answered here once and never again. The first one makes the viewer a contributor without a Claude key. CONFLICT at 5 live tokens */
  createMcpToken: ContributeMcpTokenCreated;
  /** Deletes and revokes the GitHub grant, then every row GitRanks Contribute keeps on the viewer */
  deleteContributeData: ContributeDeleteDataResult;
  /** Discards a queued attempt or one in review; its issue goes back to the pool. CONFLICT from any other state */
  discardAttempt: ContributeAttempt;
  /** A one-click fix to the viewer's open PR, on their GitHub grant: TITLE retitles it (CONFLICT when the title fails the repo's checked title rule), BODY sets its description (our footer kept), CHANGELOG fixes its changelog line in a commit on its branch. CONFLICT when another fix is on its way or the PR is not open */
  fixContributePullRequest: ContributeAttemptDetail;
  /** Takes a repo off every list and the targets and onto the ignore list. LIST_FULL when it holds 50, NOT_FOUND for a repo in no list */
  ignoreContributeRepo: ContributeSet;
  /** Ignores review threads of the viewer’s open PR (first comments’ node ids), or brings them back with ignore: false. An ignored thread is never addressed or followed up again, unless a comment arrives on it after; a follow-up under way drops its unsent reply. The PR’s ignored threads back. NOT_FOUND when not the viewer’s, CONFLICT when the PR is not open */
  ignoreReviewThreads: Array<Scalars['ID']['output']>;
  /** Mark as handled: clears the open PR’s needs-you signals (kept on its timeline); a signal found later raises it again. The PR’s first attempt back. NOT_FOUND when not the viewer’s, CONFLICT when the PR is not open */
  markNeedsYouHandled: ContributeAttempt;
  /** A "Notify me" on a coming-soon provider */
  noteProviderInterest: Scalars['Boolean']['output'];
  /** Lifts the opt-out of repositories the token administers or maintains: they may come back with the next weekly pool run, if they still pass its rules */
  optInRepos: Array<ContributeOptOutResult>;
  /** Takes repositories out of GitRanks Contribute at once and for good: no issue of theirs is picked, nothing is submitted there. Only those the token administers or maintains (each other one says why); idempotent. UNAUTHENTICATED when GitHub refuses the token */
  optOutRepos: Array<ContributeOptOutResult>;
  /** No new attempt starts until resumeContributing; a key must be connected first */
  pauseContributing: Scalars['Boolean']['output'];
  /** Takes repos off a list, freeing their slots; an id not on it is ignored */
  removeFromContributeSet: ContributeSet;
  /** Deletes the sealed key at once (the user deletes it in the Console too); false when there was none */
  removeLlmKey: Scalars['Boolean']['output'];
  /** Runs the stack resolve again ("Try again"); answers the set RESOLVING. RATE_LIMITED past 10 a day */
  resolveContributeStack: ContributeSet;
  /** Contributing again; refused (CONFLICT) without a key, or when the key was refused */
  resumeContributing: Scalars['Boolean']['output'];
  /** Tries again, once, an attempt whose check of the issue ran out of budget or time before deciding (retryable): a new attempt on the issue, queued, its check on twice the budget. CONFLICT when it is not one */
  retryAttempt: ContributeAttempt;
  /** Deletes the GitHub grant and revokes it at GitHub; false when GitHub could not be told (revoke the app on GitHub). True when there was none */
  revokeGithubGrant: Scalars['Boolean']['output'];
  /** Revokes a token: its next call answers 401. Revoking the last one ends the claims its agent is working on. False when it was not a live token of the viewer’s */
  revokeMcpToken: Scalars['Boolean']['output'];
  /** Sends an MCP attempt in review back to the viewer’s own agent with a note (at most 2,000 characters): it reads the note and submits again, within 7 days of its claim. At most 3 times an attempt. CONFLICT when it is not an MCP attempt in review, or was sent back 3 times */
  sendBackToAgent: ContributeAttempt;
  /** Feedback to the GitRanks team (at most 2,000 characters), with where the dialog was opened. RATE_LIMITED past 10 a day */
  sendContributeFeedback: Scalars['Boolean']['output'];
  /** A list mode's fallback: when its set has nothing ready, wait (SET_ONLY) or work on all issues */
  setContributeFallback: ContributeSet;
  /** Switches the active mode; the other modes keep their lists and fallbacks */
  setContributeMode: ContributeSet;
  /** A field left out keeps its value; a key must be connected first */
  setContributeSettings: ContributeSettings;
  /** Contribute's matching preferences; a list left out keeps its value */
  setPreferences: ContributePreferences;
  /** Takes a recommended issue off the list for good; NOT_FOUND for an issue never recommended, ISSUE_TAKEN for one someone (you or another contributor) is working on */
  skipIssue: Scalars['Boolean']['output'];
  /** Starts a follow-up on the viewer’s open PR (its node id): an agent session on their key reads the reviews and failing checks, adds commits to the PR’s branch and drafts replies. At most 2 rounds a PR. CONFLICT when it cannot start now (the PR not open, one under way, no rounds left, limits reached) */
  startFollowUp: ContributeAttempt;
  /** Takes a repo off the ignore list */
  unignoreContributeRepo: ContributeSet;
  /** Stops an autopilot submission in its hour (pending_autosubmit): the attempt goes to the review instead. CONFLICT from any other state */
  vetoAutopilot: ContributeAttempt;
  /** Takes back a "Notify me" on a coming-soon provider; false when there was none */
  withdrawProviderInterest: Scalars['Boolean']['output'];
};


export type MutationAddToContributeSetArgs = {
  input: Scalars['String']['input'];
  list: ContributeSetList;
};


export type MutationApproveAttemptArgs = {
  body: Scalars['String']['input'];
  dco: Scalars['Boolean']['input'];
  id: Scalars['ID']['input'];
  replies?: InputMaybe<Array<ContributeReplyInput>>;
  title: Scalars['String']['input'];
};


export type MutationApproveReplyArgs = {
  draftId: Scalars['ID']['input'];
};


export type MutationConnectClaudeKeyArgs = {
  confirmedLimit: Scalars['Boolean']['input'];
  cycleCapUsd?: InputMaybe<Scalars['Float']['input']>;
  key: Scalars['String']['input'];
  limits?: InputMaybe<ContributeConnectLimitsInput>;
  plan: ContributeClaudePlan;
  renewalDay: Scalars['Int']['input'];
};


export type MutationCreateMcpTokenArgs = {
  name: Scalars['String']['input'];
};


export type MutationDiscardAttemptArgs = {
  id: Scalars['ID']['input'];
};


export type MutationFixContributePullRequestArgs = {
  attemptId: Scalars['ID']['input'];
  body?: InputMaybe<Scalars['String']['input']>;
  kind: ContributePrFixKind;
  title?: InputMaybe<Scalars['String']['input']>;
};


export type MutationIgnoreContributeRepoArgs = {
  repositoryId: Scalars['ID']['input'];
};


export type MutationIgnoreReviewThreadsArgs = {
  commentIds: Array<Scalars['ID']['input']>;
  ignore?: Scalars['Boolean']['input'];
  prId: Scalars['ID']['input'];
};


export type MutationMarkNeedsYouHandledArgs = {
  prId: Scalars['ID']['input'];
};


export type MutationNoteProviderInterestArgs = {
  provider: ContributeComingSoonProvider;
};


export type MutationOptInReposArgs = {
  repoIds: Array<Scalars['ID']['input']>;
  token: Scalars['String']['input'];
};


export type MutationOptOutReposArgs = {
  repoIds: Array<Scalars['ID']['input']>;
  token: Scalars['String']['input'];
};


export type MutationRemoveFromContributeSetArgs = {
  list: ContributeSetList;
  repositoryIds: Array<Scalars['ID']['input']>;
};


export type MutationRemoveLlmKeyArgs = {
  provider: ContributeLiveProvider;
};


export type MutationRetryAttemptArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRevokeMcpTokenArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSendBackToAgentArgs = {
  attemptId: Scalars['ID']['input'];
  note: Scalars['String']['input'];
};


export type MutationSendContributeFeedbackArgs = {
  context?: InputMaybe<ContributeFeedbackContextInput>;
  text: Scalars['String']['input'];
  topic: ContributeFeedbackTopic;
};


export type MutationSetContributeFallbackArgs = {
  fallback: ContributeSetFallback;
  mode: ContributeSetListMode;
};


export type MutationSetContributeModeArgs = {
  mode: ContributeSetMode;
};


export type MutationSetContributeSettingsArgs = {
  settings: ContributeSettingsInput;
};


export type MutationSetPreferencesArgs = {
  preferences: ContributePreferencesInput;
};


export type MutationSkipIssueArgs = {
  issueId: Scalars['ID']['input'];
};


export type MutationStartFollowUpArgs = {
  commentIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  prId: Scalars['ID']['input'];
};


export type MutationUnignoreContributeRepoArgs = {
  repositoryId: Scalars['ID']['input'];
};


export type MutationVetoAutopilotArgs = {
  attemptId: Scalars['ID']['input'];
};


export type MutationWithdrawProviderInterestArgs = {
  provider: ContributeComingSoonProvider;
};

export enum OrgActivityGroupBy {
  Kind = 'KIND',
  Language = 'LANGUAGE',
  Type = 'TYPE'
}

export type OrgPulseContributor = {
  __typename?: 'OrgPulseContributor';
  activeMonths: Scalars['Int']['output'];
  avatarUrl: Scalars['String']['output'];
  commits: Scalars['Int']['output'];
  githubId?: Maybe<Scalars['ID']['output']>;
  hasProfile: Scalars['Boolean']['output'];
  linesAdded: Scalars['Float']['output'];
  linesDeleted: Scalars['Float']['output'];
  login: Scalars['String']['output'];
  pullRequests: Scalars['Int']['output'];
  topLabels: Array<Scalars['String']['output']>;
};

export type OrgPulseContributorPage = {
  __typename?: 'OrgPulseContributorPage';
  items: Array<OrgPulseContributor>;
  labels: Array<Scalars['String']['output']>;
  total: Scalars['Int']['output'];
  unlinkedAuthors: Scalars['Int']['output'];
};

export enum OrgPulseContributorSort {
  Commits = 'COMMITS',
  Lines = 'LINES',
  PullRequests = 'PULL_REQUESTS'
}

export type OrgPulseCountry = {
  __typename?: 'OrgPulseCountry';
  contributors: Scalars['Int']['output'];
  country?: Maybe<Scalars['String']['output']>;
  flag?: Maybe<Scalars['String']['output']>;
  group: OrgPulseCountryGroup;
};

export enum OrgPulseCountryGroup {
  Country = 'COUNTRY',
  NotOnGitranks = 'NOT_ON_GITRANKS',
  NoLocation = 'NO_LOCATION'
}

export type OrgPulseFacts = {
  __typename?: 'OrgPulseFacts';
  computedAt: Scalars['DateTime']['output'];
  /** Linked accounts (people with a GitHub account) with a landed change in the 60-month window; unresolved authors are not counted. The window is the whole history: there is no all-time count. */
  contributors60: Scalars['Int']['output'];
  countries: Array<OrgPulseCountry>;
  /** Distinct countries of the contributors `countries` counts (active in the last 12 months), before it keeps the top 10. */
  countryCount: Scalars['Int']['output'];
  last12: OrgPulseTotals;
  lastMonth: Scalars['String']['output'];
  scopeNote: Scalars['String']['output'];
  sharedContributorOrgs: Array<OrgPulseSharedOrg>;
  snapshot: Array<OrgPulseLabelLines>;
  topContributors: Array<OrgPulseContributor>;
  unlinkedAuthors12: Scalars['Int']['output'];
};

export type OrgPulseLabelLines = {
  __typename?: 'OrgPulseLabelLines';
  label: Scalars['String']['output'];
  lines: Scalars['Float']['output'];
  share: Scalars['Float']['output'];
};

export enum OrgPulsePeriod {
  Last_3Months = 'LAST_3_MONTHS',
  Last_12Months = 'LAST_12_MONTHS',
  Last_60Months = 'LAST_60_MONTHS'
}

export type OrgPulseSeries = {
  __typename?: 'OrgPulseSeries';
  activeAnonymous: Array<Scalars['Int']['output']>;
  activeLinked: Array<Scalars['Int']['output']>;
  added: Array<Array<Scalars['Float']['output']>>;
  commits: Array<Scalars['Int']['output']>;
  crossLines: Array<Scalars['Float']['output']>;
  deleted: Array<Array<Scalars['Float']['output']>>;
  labels: Array<Scalars['String']['output']>;
  largestChange: Array<Scalars['Float']['output']>;
  largestChangeShare: Array<Scalars['Float']['output']>;
  months: Array<Scalars['String']['output']>;
  newContributors: Array<Maybe<Scalars['Int']['output']>>;
  pullRequests: Array<Scalars['Int']['output']>;
  snapshot: Array<Array<Scalars['Float']['output']>>;
};

export type OrgPulseSharedOrg = {
  __typename?: 'OrgPulseSharedOrg';
  login: Scalars['String']['output'];
  organization?: Maybe<Organization>;
  share: Scalars['Float']['output'];
  sharedContributors: Scalars['Int']['output'];
};

export type OrgPulseTotals = {
  __typename?: 'OrgPulseTotals';
  activeContributors: Scalars['Int']['output'];
  added: Scalars['Float']['output'];
  commits: Scalars['Int']['output'];
  deleted: Scalars['Float']['output'];
  net: Scalars['Float']['output'];
  newContributors: Scalars['Int']['output'];
  pullRequests: Scalars['Int']['output'];
};

export type Organization = {
  __typename?: 'Organization';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  contributorsWall?: Maybe<ContributorsWall>;
  country?: Maybe<Scalars['String']['output']>;
  countryFlag?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  email?: Maybe<Scalars['String']['output']>;
  githubCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  githubId: Scalars['ID']['output'];
  githubUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  hasActivity: Scalars['Boolean']['output'];
  isVerified?: Maybe<Scalars['Boolean']['output']>;
  location?: Maybe<Scalars['String']['output']>;
  login?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  pulse?: Maybe<OrgPulseFacts>;
  pulseContributors?: Maybe<OrgPulseContributorPage>;
  pulseSeries?: Maybe<OrgPulseSeries>;
  rankOrg?: Maybe<RankOrgWithoutOrganization>;
  reposCount?: Maybe<Scalars['Int']['output']>;
  /** The organization's repositories with 1,000+ stars (not gone). */
  reposOver1k: Scalars['Int']['output'];
  s?: Maybe<Scalars['Int']['output']>;
  snapshots?: Maybe<Scalars['JSON']['output']>;
  starsNotCounted?: Maybe<StarsNotCounted>;
  topRepos: Array<Repo>;
  twitterUsername?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  usersCount?: Maybe<Scalars['Int']['output']>;
  websiteUrl?: Maybe<Scalars['String']['output']>;
};


export type OrganizationContributorsWallArgs = {
  order?: ContributorsWallOrder;
};


export type OrganizationPulseContributorsArgs = {
  first?: Scalars['Int']['input'];
  label?: InputMaybe<Scalars['String']['input']>;
  offset?: Scalars['Int']['input'];
  period?: OrgPulsePeriod;
  sortBy?: OrgPulseContributorSort;
};


export type OrganizationPulseSeriesArgs = {
  groupBy?: OrgActivityGroupBy;
};


export type OrganizationTopReposArgs = {
  first?: Scalars['Int']['input'];
};

export type OrganizationBasic = {
  __typename?: 'OrganizationBasic';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  isVerified?: Maybe<Scalars['Boolean']['output']>;
  location?: Maybe<Scalars['String']['output']>;
  login?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  s?: Maybe<Scalars['Int']['output']>;
};

export type ProfileForSitemap = {
  __typename?: 'ProfileForSitemap';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  c?: Maybe<Scalars['Int']['output']>;
  f?: Maybe<Scalars['Int']['output']>;
  login: Scalars['String']['output'];
  s?: Maybe<Scalars['Int']['output']>;
};

export type Query = {
  __typename?: 'Query';
  /** The signed-in viewer's Contribute: keys (masked), settings, spend, preferences. Null when hidden */
  contribute?: Maybe<Contribute>;
  /** The viewer's work in progress (the stack resolve, new repos' first reads), each with its tabs, a line, counts, an estimate and its repos: the UI polls it while something runs. Null when hidden */
  contributeActivity?: Maybe<ContributeActivity>;
  /** One attempt for the review: the diff, the result, the checks, the cost split, the timeline, the submission and the PR. NOT_FOUND when it is not the viewer’s; null when hidden */
  contributeAttempt?: Maybe<ContributeAttemptDetail>;
  /** The viewer's attempts, newest first, optionally in one state or in any of several (not both: BAD_USER_INPUT). Null when hidden */
  contributeAttempts?: Maybe<Array<ContributeAttempt>>;
  /** What moved for the viewer since `since` (the version a previous read answered): the UI polls it, faster while `activity`, and refetches only the areas named. Null when hidden */
  contributeChanges?: Maybe<ContributeChanges>;
  /** My contributions: the viewer's PRs opened through Contribute, newest first, and their totals */
  contributeContributions?: Maybe<ContributeContributions>;
  /** The shown issues as they are now, for the Issues list and Up next to drop a taken card while open (polled): up to 50 ids, in the order asked. Null when hidden */
  contributeIssueStatus?: Maybe<Array<ContributeIssueStatus>>;
  /** Issues for you: the recommended issues, best first, a page at a time. Null when hidden */
  contributeIssues?: Maybe<ContributeIssuePage>;
  /** Contribute is launched: open to everyone, so the landing is shown to signed-out visitors too. False during the preview */
  contributeOpen: Scalars['Boolean']['output'];
  /** The matching preferences; null before any were set, or when hidden */
  contributePreferences?: Maybe<ContributePreferences>;
  /** The reply drafts the viewer can approve now, across their open PRs, oldest first. inReview: its follow-up waits in the review with it. Null when hidden */
  contributeRepliesWaiting?: Maybe<Array<ContributeReplyWaiting>>;
  /** The reply drafts of the viewer's PR (its node id), oldest first. NOT_FOUND when it is not theirs */
  contributeReplyDrafts?: Maybe<Array<ContributeReplyDraft>>;
  /** The viewer's runs, newest first, a page at a time (`after`: the previous page's `nextCursor`; `first` at most 50, more is BAD_USER_INPUT), with the totals and the outcome counts of every run the filter matches. Null when hidden */
  contributeRuns?: Maybe<ContributeRuns>;
  /** The viewer's set: the active mode, the stack's sources and targets, the repos list, each fallback, the ignore list, with each repo’s live status. The defaults (ALL, empty lists) before any write. Null when hidden */
  contributeSet?: Maybe<ContributeSet>;
  /** The settings; null before a key was connected, or when hidden */
  contributeSettings?: Maybe<ContributeSettings>;
  /** List of countries */
  country?: Maybe<Array<Country>>;
  countryLanguageRankings: Array<RankCountryLanguageWithUser>;
  countryLanguageSummary: Array<CountryLanguageSummary>;
  countryRankByLogin?: Maybe<RankCountry>;
  countryRankings: Array<RankCountry>;
  countrySummary: Array<CountrySummary>;
  globalRankByLogin?: Maybe<RankGlobal>;
  globalRankings: Array<RankGlobal>;
  /** Single top-level scheduled insight post with replies by id */
  insight?: Maybe<InsightPost>;
  /** List of top-level scheduled insights (posts) with their replies, where scheduleFor <= now */
  insights: Array<InsightPost>;
  /** The profile block "Issues for you": the best few recommended issues, for the signed-in viewer on their own profile alone; an empty list for anyone else, and whenever there is nothing to show */
  issuesForProfile: Array<ContributeIssue>;
  languageRankings: Array<RankLanguageWithUser>;
  languageSummary: Array<LanguageSummary>;
  /** The public repositories the token's GitHub account administers or maintains, and whether each is opted out of GitRanks Contribute. token: the GitHub sign-in of the maintainers page, read once and kept nowhere. UNAUTHENTICATED when GitHub refuses it */
  maintainerRepos: ContributeMaintainerRepos;
  /** The number of ranked organizations (badges: the top share). */
  orgRankTotal: Scalars['Int']['output'];
  orgRankings: Array<RankOrg>;
  orgSitemapParts: Scalars['Int']['output'];
  organization?: Maybe<Organization>;
  orgsForSitemap: Array<Scalars['String']['output']>;
  profilesForSitemap: Array<ProfileForSitemap>;
  rankTiersByName?: Maybe<RankTier>;
  repo?: Maybe<Repo>;
  repoLanguages: Array<RepoLanguageSummary>;
  repoRankTiers?: Maybe<RepoRankTiers>;
  repoRankings: Array<RankRepo>;
  repoSitemapParts: Scalars['Int']['output'];
  reposForSitemap: Array<Scalars['String']['output']>;
  /** The weekly social posting reports, newest first (the weekly review routine); owner scripts only */
  socialWeekReports: Array<SocialWeekReport>;
  user?: Maybe<User>;
  users?: Maybe<Array<User>>;
};


export type QueryContributeAttemptArgs = {
  id: Scalars['ID']['input'];
};


export type QueryContributeAttemptsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
  state?: InputMaybe<ContributeAttemptState>;
  states?: InputMaybe<Array<ContributeAttemptState>>;
};


export type QueryContributeChangesArgs = {
  since?: InputMaybe<Scalars['String']['input']>;
};


export type QueryContributeContributionsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryContributeIssueStatusArgs = {
  issueIds: Array<Scalars['ID']['input']>;
};


export type QueryContributeIssuesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<ContributeIssuesFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryContributeReplyDraftsArgs = {
  prId: Scalars['ID']['input'];
};


export type QueryContributeRunsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<ContributeRunsFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCountryLanguageRankingsArgs = {
  country: Scalars['String']['input'];
  language: Scalars['String']['input'];
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
};


export type QueryCountryLanguageSummaryArgs = {
  country: Scalars['String']['input'];
  date?: InputMaybe<Scalars['String']['input']>;
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
  order?: LanguageSummaryOrder;
};


export type QueryCountryRankByLoginArgs = {
  login: Scalars['String']['input'];
};


export type QueryCountryRankingsArgs = {
  country: Scalars['String']['input'];
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
  order?: RankOrder;
};


export type QueryCountrySummaryArgs = {
  date?: InputMaybe<Scalars['String']['input']>;
  order?: CountrySummaryOrder;
};


export type QueryGlobalRankByLoginArgs = {
  login: Scalars['String']['input'];
};


export type QueryGlobalRankingsArgs = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
  order?: RankOrder;
};


export type QueryInsightArgs = {
  id: Scalars['ID']['input'];
};


export type QueryInsightsArgs = {
  limit?: Scalars['Int']['input'];
  skip?: Scalars['Int']['input'];
};


export type QueryIssuesForProfileArgs = {
  login: Scalars['String']['input'];
};


export type QueryLanguageRankingsArgs = {
  language: Scalars['String']['input'];
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
};


export type QueryLanguageSummaryArgs = {
  date?: InputMaybe<Scalars['String']['input']>;
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
  order?: LanguageSummaryOrder;
};


export type QueryMaintainerReposArgs = {
  token: Scalars['String']['input'];
};


export type QueryOrgRankingsArgs = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
};


export type QueryOrganizationArgs = {
  login: Scalars['String']['input'];
};


export type QueryOrgsForSitemapArgs = {
  part: Scalars['Int']['input'];
};


export type QueryRankTiersByNameArgs = {
  name: Scalars['String']['input'];
};


export type QueryRepoArgs = {
  name: Scalars['String']['input'];
  owner: Scalars['String']['input'];
};


export type QueryRepoRankTiersArgs = {
  language?: InputMaybe<Scalars['String']['input']>;
  noLanguage?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryRepoRankingsArgs = {
  language?: InputMaybe<Scalars['String']['input']>;
  limit?: Scalars['Int']['input'];
  noLanguage?: InputMaybe<Scalars['Boolean']['input']>;
  offset?: Scalars['Int']['input'];
};


export type QueryReposForSitemapArgs = {
  part: Scalars['Int']['input'];
};


export type QuerySocialWeekReportsArgs = {
  limit?: Scalars['Int']['input'];
};


export type QueryUserArgs = {
  login: Scalars['String']['input'];
};


export type QueryUsersArgs = {
  logins: Array<Scalars['String']['input']>;
};

export type RankCountry = {
  __typename?: 'RankCountry';
  c?: Maybe<Scalars['Int']['output']>;
  cD?: Maybe<Scalars['Int']['output']>;
  cM?: Maybe<Scalars['Int']['output']>;
  cProvisional?: Maybe<Scalars['Int']['output']>;
  country: Scalars['ID']['output'];
  f?: Maybe<Scalars['Int']['output']>;
  fD?: Maybe<Scalars['Int']['output']>;
  fM?: Maybe<Scalars['Int']['output']>;
  fProvisional?: Maybe<Scalars['Int']['output']>;
  githubId: Scalars['ID']['output'];
  s?: Maybe<Scalars['Int']['output']>;
  sD?: Maybe<Scalars['Int']['output']>;
  sM?: Maybe<Scalars['Int']['output']>;
  sProvisional?: Maybe<Scalars['Int']['output']>;
  snapshots?: Maybe<Scalars['JSON']['output']>;
  user?: Maybe<UserBasic>;
};

export type RankCountryLanguage = {
  __typename?: 'RankCountryLanguage';
  country: Scalars['String']['output'];
  githubId: Scalars['String']['output'];
  language: Scalars['String']['output'];
  s?: Maybe<Scalars['Int']['output']>;
  sD?: Maybe<Scalars['Int']['output']>;
  sM?: Maybe<Scalars['Int']['output']>;
  snapshots?: Maybe<Scalars['JSON']['output']>;
};

export type RankCountryLanguageWithUser = {
  __typename?: 'RankCountryLanguageWithUser';
  country: Scalars['String']['output'];
  githubId: Scalars['String']['output'];
  language: Scalars['String']['output'];
  s?: Maybe<Scalars['Int']['output']>;
  sD?: Maybe<Scalars['Int']['output']>;
  sM?: Maybe<Scalars['Int']['output']>;
  snapshots?: Maybe<Scalars['JSON']['output']>;
  user?: Maybe<UserWithLanguageScore>;
};

export type RankCountryWithoutUser = {
  __typename?: 'RankCountryWithoutUser';
  c?: Maybe<Scalars['Int']['output']>;
  cD?: Maybe<Scalars['Int']['output']>;
  cM?: Maybe<Scalars['Int']['output']>;
  cProvisional?: Maybe<Scalars['Int']['output']>;
  country: Scalars['ID']['output'];
  f?: Maybe<Scalars['Int']['output']>;
  fD?: Maybe<Scalars['Int']['output']>;
  fM?: Maybe<Scalars['Int']['output']>;
  fProvisional?: Maybe<Scalars['Int']['output']>;
  githubId: Scalars['ID']['output'];
  s?: Maybe<Scalars['Int']['output']>;
  sD?: Maybe<Scalars['Int']['output']>;
  sM?: Maybe<Scalars['Int']['output']>;
  sProvisional?: Maybe<Scalars['Int']['output']>;
  snapshots?: Maybe<Scalars['JSON']['output']>;
};

export type RankGlobal = {
  __typename?: 'RankGlobal';
  c?: Maybe<Scalars['Int']['output']>;
  cD?: Maybe<Scalars['Int']['output']>;
  cM?: Maybe<Scalars['Int']['output']>;
  cProvisional?: Maybe<Scalars['Int']['output']>;
  f?: Maybe<Scalars['Int']['output']>;
  fD?: Maybe<Scalars['Int']['output']>;
  fM?: Maybe<Scalars['Int']['output']>;
  fProvisional?: Maybe<Scalars['Int']['output']>;
  githubId: Scalars['ID']['output'];
  s?: Maybe<Scalars['Int']['output']>;
  sD?: Maybe<Scalars['Int']['output']>;
  sM?: Maybe<Scalars['Int']['output']>;
  sProvisional?: Maybe<Scalars['Int']['output']>;
  snapshots?: Maybe<Scalars['JSON']['output']>;
  user?: Maybe<UserBasic>;
};

export type RankGlobalWithoutUser = {
  __typename?: 'RankGlobalWithoutUser';
  c?: Maybe<Scalars['Int']['output']>;
  cD?: Maybe<Scalars['Int']['output']>;
  cM?: Maybe<Scalars['Int']['output']>;
  cProvisional?: Maybe<Scalars['Int']['output']>;
  f?: Maybe<Scalars['Int']['output']>;
  fD?: Maybe<Scalars['Int']['output']>;
  fM?: Maybe<Scalars['Int']['output']>;
  fProvisional?: Maybe<Scalars['Int']['output']>;
  githubId: Scalars['ID']['output'];
  s?: Maybe<Scalars['Int']['output']>;
  sD?: Maybe<Scalars['Int']['output']>;
  sM?: Maybe<Scalars['Int']['output']>;
  sProvisional?: Maybe<Scalars['Int']['output']>;
  snapshots?: Maybe<Scalars['JSON']['output']>;
};

export type RankGoal = {
  __typename?: 'RankGoal';
  /** Set for a country goal. */
  country?: Maybe<Scalars['String']['output']>;
  /** Set for a language goal. */
  language?: Maybe<Scalars['String']['output']>;
  /** How many more of `unit` the entity needs to pass the holder of `targetRank`. */
  needed: Scalars['Int']['output'];
  scope: RankGoalScope;
  /** The round rank to reach: 10, 25, 50, 100, 250, … 1,000,000. */
  targetRank: Scalars['Int']['output'];
  unit: RankGoalUnit;
};

export enum RankGoalScope {
  Country = 'COUNTRY',
  Global = 'GLOBAL',
  Language = 'LANGUAGE'
}

export enum RankGoalUnit {
  ContributionStars = 'CONTRIBUTION_STARS',
  Followers = 'FOLLOWERS',
  Stars = 'STARS'
}

export type RankLanguage = {
  __typename?: 'RankLanguage';
  githubId: Scalars['String']['output'];
  language: Scalars['String']['output'];
  s?: Maybe<Scalars['Int']['output']>;
  sD?: Maybe<Scalars['Int']['output']>;
  sM?: Maybe<Scalars['Int']['output']>;
  snapshots?: Maybe<Scalars['JSON']['output']>;
};

export type RankLanguageWithUser = {
  __typename?: 'RankLanguageWithUser';
  githubId: Scalars['String']['output'];
  language: Scalars['String']['output'];
  s?: Maybe<Scalars['Int']['output']>;
  sD?: Maybe<Scalars['Int']['output']>;
  sM?: Maybe<Scalars['Int']['output']>;
  snapshots?: Maybe<Scalars['JSON']['output']>;
  user?: Maybe<UserWithLanguageScore>;
};

export enum RankOrder {
  Contributions = 'CONTRIBUTIONS',
  Followers = 'FOLLOWERS',
  Stars = 'STARS'
}

export type RankOrg = {
  __typename?: 'RankOrg';
  githubId: Scalars['String']['output'];
  organization?: Maybe<OrganizationBasic>;
  s?: Maybe<Scalars['Int']['output']>;
  sD?: Maybe<Scalars['Int']['output']>;
  sM?: Maybe<Scalars['Int']['output']>;
  snapshots?: Maybe<Scalars['JSON']['output']>;
};

export type RankOrgWithoutOrganization = {
  __typename?: 'RankOrgWithoutOrganization';
  githubId: Scalars['String']['output'];
  s?: Maybe<Scalars['Int']['output']>;
  sD?: Maybe<Scalars['Int']['output']>;
  sM?: Maybe<Scalars['Int']['output']>;
  snapshots?: Maybe<Scalars['JSON']['output']>;
};

export type RankRepo = {
  __typename?: 'RankRepo';
  githubId: Scalars['String']['output'];
  l?: Maybe<Scalars['Int']['output']>;
  lD?: Maybe<Scalars['Int']['output']>;
  lM?: Maybe<Scalars['Int']['output']>;
  language?: Maybe<Scalars['String']['output']>;
  languageTier?: Maybe<Tier>;
  repo?: Maybe<Repo>;
  s?: Maybe<Scalars['Int']['output']>;
  sD?: Maybe<Scalars['Int']['output']>;
  sM?: Maybe<Scalars['Int']['output']>;
  tier?: Maybe<Tier>;
};

export type RankTier = {
  __typename?: 'RankTier';
  cTiers: Array<Tier>;
  cUsers: Scalars['Int']['output'];
  entityName: Scalars['String']['output'];
  entityType: Scalars['String']['output'];
  fTiers: Array<Tier>;
  fUsers: Scalars['Int']['output'];
  sTiers: Array<Tier>;
  sUsers: Scalars['Int']['output'];
};

export type Repo = {
  __typename?: 'Repo';
  builtBy?: Maybe<RepoBuiltBy>;
  burstMonths?: Maybe<Array<Scalars['String']['output']>>;
  /** Avatars of the repository's top contributors (the union of the top 100 of each period by lines, commits and pull requests), at most 70, built with its analytics. `NEWEST` ranks only those rows. */
  contributorsWall?: Maybe<ContributorsWall>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  gainedThisMonth?: Maybe<Scalars['Int']['output']>;
  githubId: Scalars['String']['output'];
  history?: Maybe<RepoHistory>;
  isArchived?: Maybe<Scalars['Boolean']['output']>;
  isInOrganization?: Maybe<Scalars['Boolean']['output']>;
  language?: Maybe<Scalars['String']['output']>;
  monthStarts?: Maybe<Scalars['JSON']['output']>;
  name: Scalars['String']['output'];
  nameWithOwner: Scalars['String']['output'];
  owner: Scalars['String']['output'];
  ownerAvatarUrl?: Maybe<Scalars['String']['output']>;
  ownerId?: Maybe<Scalars['String']['output']>;
  pull?: Maybe<RepoPull>;
  pulse?: Maybe<RepoPulseFacts>;
  /** The repository's top contributors: the union of the top 100 of each period by lines, commits and pull requests. A label table, and which labels are listed, rank only that union, so a contributor outside it is missing even when among the top of a label. */
  pulseContributors?: Maybe<OrgPulseContributorPage>;
  pulseSeries?: Maybe<OrgPulseSeries>;
  pushedAt?: Maybe<Scalars['DateTime']['output']>;
  rank?: Maybe<RankRepo>;
  rankGoal?: Maybe<RankGoal>;
  renamedTo?: Maybe<Scalars['String']['output']>;
  siblings?: Maybe<Array<RepoSibling>>;
  stars: Scalars['Int']['output'];
  starsAt?: Maybe<Scalars['DateTime']['output']>;
  starsBest?: Maybe<RepoStarsBest>;
  starsCheck?: Maybe<RepoStarsCheck>;
};


export type RepoContributorsWallArgs = {
  order?: ContributorsWallOrder;
};


export type RepoPulseContributorsArgs = {
  first?: Scalars['Int']['input'];
  label?: InputMaybe<Scalars['String']['input']>;
  offset?: Scalars['Int']['input'];
  period?: OrgPulsePeriod;
  sortBy?: OrgPulseContributorSort;
};


export type RepoPulseSeriesArgs = {
  groupBy?: OrgActivityGroupBy;
};

export type RepoBuilder = {
  __typename?: 'RepoBuilder';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  level: Scalars['Int']['output'];
  login?: Maybe<Scalars['String']['output']>;
  tier: Scalars['Int']['output'];
};

export type RepoBuiltBy = {
  __typename?: 'RepoBuiltBy';
  /** Active accounts with a developer tier. */
  accounts: Scalars['Int']['output'];
  /** Accounts per developer tier, the highest tier first. */
  counts: Array<TierCount>;
  /** The highest-tier accounts, at most 8. */
  top: Array<RepoBuilder>;
};

export type RepoHistory = {
  __typename?: 'RepoHistory';
  complete: Scalars['Boolean']['output'];
  current: RepoStarPoint;
  points: Array<RepoStarPoint>;
  readAt: Scalars['DateTime']['output'];
};

export type RepoLanguageSummary = {
  __typename?: 'RepoLanguageSummary';
  language?: Maybe<Scalars['String']['output']>;
  repos: Scalars['Int']['output'];
  stars: Scalars['Float']['output'];
  topRepo?: Maybe<Repo>;
  topRepoId: Scalars['String']['output'];
};

export type RepoPull = {
  __typename?: 'RepoPull';
  failure?: Maybe<Scalars['String']['output']>;
  finishedAt?: Maybe<Scalars['DateTime']['output']>;
  requestedAt: Scalars['DateTime']['output'];
  status: Scalars['String']['output'];
  via: Scalars['String']['output'];
};

export type RepoPulseFacts = {
  __typename?: 'RepoPulseFacts';
  computedAt: Scalars['DateTime']['output'];
  /** Linked accounts (people with a GitHub account) with a landed change in the 60-month window; unresolved authors are not counted. The window is the whole history: there is no all-time count. */
  contributors60: Scalars['Int']['output'];
  /** Countries of the repository's top contributors active in the last 12 months (the union of the top 100 of each period by lines, commits and pull requests), not of every contributor: the top 10 countries, then "no location" and "not on gitranks". */
  countries: Array<OrgPulseCountry>;
  /** Distinct countries of the contributors `countries` counts (active in the last 12 months), before it keeps the top 10. */
  countryCount: Scalars['Int']['output'];
  last12: OrgPulseTotals;
  lastMonth: Scalars['String']['output'];
  scopeNote: Scalars['String']['output'];
  snapshot: Array<OrgPulseLabelLines>;
  topContributors: Array<OrgPulseContributor>;
  unlinkedAuthors12: Scalars['Int']['output'];
};

export type RepoRankTiers = {
  __typename?: 'RepoRankTiers';
  repos: Scalars['Int']['output'];
  tiers: Array<Tier>;
};

export type RepoSibling = {
  __typename?: 'RepoSibling';
  repo: Repo;
  /** The shared accounts' share of this repo's active accounts, 0–1. */
  share: Scalars['Float']['output'];
  /** Active accounts (2+ landed changes in 12 months) the two repos share. */
  shared: Scalars['Int']['output'];
};

export type RepoStarPoint = {
  __typename?: 'RepoStarPoint';
  date: Scalars['DateTime']['output'];
  stars: Scalars['Int']['output'];
};

export type RepoStargazer = {
  __typename?: 'RepoStargazer';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  level: Scalars['Int']['output'];
  login?: Maybe<Scalars['String']['output']>;
  tier: Scalars['Int']['output'];
};

export type RepoStarsBest = {
  __typename?: 'RepoStarsBest';
  /** Those developers per developer tier, the highest tier first. */
  counts: Array<TierCount>;
  /** How many times more often Legends star it than other repositories of its tier they star. */
  legendRatio?: Maybe<Scalars['Float']['output']>;
  /** The highest-tier of them, at most 8. */
  top: Array<RepoStargazer>;
  /** Developers with 1,000+ stars of their own who starred it. */
  total: Scalars['Int']['output'];
};

export type RepoStarsCheck = {
  __typename?: 'RepoStarsCheck';
  githubStars: Scalars['Int']['output'];
  notCounted: Scalars['Int']['output'];
};

export type Repository = {
  __typename?: 'Repository';
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  forkCount?: Maybe<Scalars['Int']['output']>;
  githubId: Scalars['String']['output'];
  githubStars?: Maybe<Scalars['Int']['output']>;
  isArchived?: Maybe<Scalars['Boolean']['output']>;
  languages?: Maybe<Array<LanguageEntity>>;
  name?: Maybe<Scalars['String']['output']>;
  pushedAt?: Maybe<Scalars['DateTime']['output']>;
  rank?: Maybe<RankRepo>;
  releasesCount?: Maybe<Scalars['Int']['output']>;
  stargazerCount: Scalars['Int']['output'];
  starsNotCounted?: Maybe<Scalars['Int']['output']>;
  url: Scalars['String']['output'];
};

export type Segment = {
  __typename?: 'Segment';
  display?: Maybe<Scalars['String']['output']>;
  entityKey?: Maybe<Scalars['String']['output']>;
  text?: Maybe<Scalars['String']['output']>;
  type: SegmentType;
};

export enum SegmentType {
  Link = 'LINK',
  Mention = 'MENTION',
  Text = 'TEXT'
}

export type SocialAccount = {
  __typename?: 'SocialAccount';
  nodes?: Maybe<Array<SocialAccountNodeEntity>>;
  totalCount: Scalars['Int']['output'];
};

export type SocialAccountNodeEntity = {
  __typename?: 'SocialAccountNodeEntity';
  displayName?: Maybe<Scalars['String']['output']>;
  provider: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type SocialWeekReport = {
  __typename?: 'SocialWeekReport';
  /** The whole report as stored (socialWeekReport) */
  report: Scalars['JSON']['output'];
  /** ISO week, e.g. 2026-W44 */
  week: Scalars['String']['output'];
  weekEnd: Scalars['String']['output'];
  weekStart: Scalars['String']['output'];
};

export type StarsNotCounted = {
  __typename?: 'StarsNotCounted';
  repositories: Scalars['Int']['output'];
  stars: Scalars['Int']['output'];
};

export type StarsReview = {
  __typename?: 'StarsReview';
  reportable: Scalars['Boolean']['output'];
  repositories: Scalars['Int']['output'];
  stars: Scalars['Int']['output'];
  status: StarsReviewStatus;
};

export enum StarsReviewStatus {
  NotCounted = 'NOT_COUNTED',
  Reviewing = 'REVIEWING'
}

export type Tier = {
  __typename?: 'Tier';
  level: Scalars['Int']['output'];
  maxRank: Scalars['Int']['output'];
  minRank: Scalars['Int']['output'];
  minValue: Scalars['Int']['output'];
  tier: Scalars['Int']['output'];
};

export type TierCount = {
  __typename?: 'TierCount';
  count: Scalars['Int']['output'];
  tier: Scalars['Int']['output'];
};

export type Timeline = {
  __typename?: 'Timeline';
  changes: Scalars['JSON']['output'];
  createdAt: Scalars['DateTime']['output'];
};

export type User = {
  __typename?: 'User';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  c?: Maybe<Scalars['Int']['output']>;
  cD?: Maybe<Scalars['Int']['output']>;
  cLangs?: Maybe<Array<UserLanguage>>;
  company?: Maybe<Scalars['String']['output']>;
  contributedRepoCount?: Maybe<Scalars['Int']['output']>;
  contributions?: Maybe<Array<Contribution>>;
  /** The contributors of the repositories the developer owns that have analytics (1k+ stars), one avatar per account, at most 70. Null without such a repository. `NEWEST` is not offered (null). */
  contributorsWall?: Maybe<ContributorsWall>;
  country?: Maybe<Scalars['String']['output']>;
  countryFlag?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  email?: Maybe<Scalars['String']['output']>;
  f?: Maybe<Scalars['Int']['output']>;
  fD?: Maybe<Scalars['Int']['output']>;
  fetchingStatus?: Maybe<UserFetchingStatus>;
  fetchingUpdatedAt?: Maybe<Scalars['Float']['output']>;
  firstSeenAt?: Maybe<Scalars['DateTime']['output']>;
  followersCount?: Maybe<Scalars['Int']['output']>;
  followingCount?: Maybe<Scalars['Int']['output']>;
  githubCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  githubFetchedAt?: Maybe<Scalars['DateTime']['output']>;
  githubId: Scalars['ID']['output'];
  githubServiceFetchedAt?: Maybe<Scalars['DateTime']['output']>;
  githubUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  isHireable?: Maybe<Scalars['Boolean']['output']>;
  location?: Maybe<Scalars['String']['output']>;
  login: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
  organizations?: Maybe<Array<Organization>>;
  primaryLanguages?: Maybe<Array<Scalars['String']['output']>>;
  rankCountry?: Maybe<RankCountryWithoutUser>;
  rankGlobal?: Maybe<RankGlobalWithoutUser>;
  /** The next round rank in the global or country list of `by`; by stars also a language list (`language`, else the one the developer ranks best in). Null at #1, or when the goal is over 25% of the score away. */
  rankGoal?: Maybe<RankGoal>;
  repositories?: Maybe<Array<Repository>>;
  repositoriesCount?: Maybe<Scalars['Int']['output']>;
  s?: Maybe<Scalars['Int']['output']>;
  sD?: Maybe<Scalars['Int']['output']>;
  sLangs?: Maybe<Array<UserLanguage>>;
  snapshots?: Maybe<Scalars['JSON']['output']>;
  socialAccounts?: Maybe<SocialAccount>;
  starsNotCounted?: Maybe<StarsNotCounted>;
  starsReview?: Maybe<StarsReview>;
  tiersCountry?: Maybe<RankTier>;
  tiersGlobal?: Maybe<RankTier>;
  timeline?: Maybe<Array<Timeline>>;
  updatedAt: Scalars['DateTime']['output'];
  websiteUrl?: Maybe<Scalars['String']['output']>;
};


export type UserCLangsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: Scalars['Int']['input'];
};


export type UserContributionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: Scalars['Int']['input'];
};


export type UserContributorsWallArgs = {
  order?: ContributorsWallOrder;
};


export type UserRankGoalArgs = {
  by?: RankOrder;
  language?: InputMaybe<Scalars['String']['input']>;
};


export type UserRepositoriesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: Scalars['Int']['input'];
};


export type UserSLangsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: Scalars['Int']['input'];
};


export type UserSnapshotsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: Scalars['Int']['input'];
};


export type UserTimelineArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: Scalars['Int']['input'];
};

export type UserBasic = {
  __typename?: 'UserBasic';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  c?: Maybe<Scalars['Int']['output']>;
  cLangs?: Maybe<Array<UserLanguageBasic>>;
  country?: Maybe<Scalars['String']['output']>;
  f?: Maybe<Scalars['Int']['output']>;
  followersCount?: Maybe<Scalars['Int']['output']>;
  githubId: Scalars['ID']['output'];
  location?: Maybe<Scalars['String']['output']>;
  login: Scalars['String']['output'];
  s?: Maybe<Scalars['Int']['output']>;
  sLangs?: Maybe<Array<UserLanguageBasic>>;
};

export enum UserFetchingStatus {
  Completed = 'COMPLETED',
  Fetching = 'FETCHING'
}

export type UserLanguage = {
  __typename?: 'UserLanguage';
  color?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  rankCountry?: Maybe<RankCountryLanguage>;
  rankGlobal?: Maybe<RankLanguage>;
  score: Scalars['Int']['output'];
  size: Scalars['Float']['output'];
  sources?: Maybe<Array<UserLanguageSource>>;
  tiersCountry?: Maybe<RankTier>;
  tiersGlobal?: Maybe<RankTier>;
};

export type UserLanguageBasic = {
  __typename?: 'UserLanguageBasic';
  color?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  score: Scalars['Int']['output'];
  size: Scalars['Float']['output'];
  sources?: Maybe<Array<UserLanguageSource>>;
};

export type UserLanguageSource = {
  __typename?: 'UserLanguageSource';
  githubId: Scalars['String']['output'];
  linesAdded?: Maybe<Scalars['Int']['output']>;
  linesRemoved?: Maybe<Scalars['Int']['output']>;
  name: Scalars['String']['output'];
  percentage: Scalars['Float']['output'];
  prsCount?: Maybe<Scalars['Int']['output']>;
  stargazerCount: Scalars['Int']['output'];
  url?: Maybe<Scalars['String']['output']>;
  year?: Maybe<Scalars['Int']['output']>;
};

export type UserWithLanguageScore = {
  __typename?: 'UserWithLanguageScore';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  languageScore?: Maybe<Scalars['Int']['output']>;
  location?: Maybe<Scalars['String']['output']>;
  login: Scalars['String']['output'];
};

export type AvatarByLoginQueryVariables = Exact<{
  login: Scalars['String']['input'];
}>;


export type AvatarByLoginQuery = { __typename?: 'Query', user?: { __typename?: 'User', avatarUrl?: string | null } | null, organization?: { __typename?: 'Organization', avatarUrl?: string | null } | null };

export type BadgeUserCardQueryVariables = Exact<{
  login: Scalars['String']['input'];
}>;


export type BadgeUserCardQuery = { __typename?: 'Query', user?: { __typename?: 'User', login: string, avatarUrl?: string | null, country?: string | null, s?: number | null, c?: number | null, f?: number | null, snapshots?: any | null, rankGlobal?: { __typename?: 'RankGlobalWithoutUser', s?: number | null, c?: number | null, f?: number | null, sM?: number | null, cM?: number | null, fM?: number | null, sProvisional?: number | null, cProvisional?: number | null, fProvisional?: number | null } | null, rankCountry?: { __typename?: 'RankCountryWithoutUser', s?: number | null, c?: number | null, f?: number | null, sM?: number | null, cM?: number | null, fM?: number | null, sProvisional?: number | null, cProvisional?: number | null, fProvisional?: number | null } | null, tiersGlobal?: { __typename?: 'RankTier', sUsers: number, cUsers: number, fUsers: number } | null, tiersCountry?: { __typename?: 'RankTier', sUsers: number, cUsers: number, fUsers: number } | null } | null };

export type BadgeRepoCardQueryVariables = Exact<{
  owner: Scalars['String']['input'];
  name: Scalars['String']['input'];
}>;


export type BadgeRepoCardQuery = { __typename?: 'Query', repo?: { __typename?: 'Repo', nameWithOwner: string, language?: string | null, stars: number, gainedThisMonth?: number | null, monthStarts?: any | null, history?: { __typename?: 'RepoHistory', complete: boolean, current: { __typename?: 'RepoStarPoint', date: any, stars: number } } | null, rank?: { __typename?: 'RankRepo', s?: number | null, sM?: number | null, l?: number | null, lM?: number | null, language?: string | null } | null, starsBest?: { __typename?: 'RepoStarsBest', total: number } | null, pulse?: { __typename?: 'RepoPulseFacts', lastMonth: string, countryCount: number, last12: { __typename?: 'OrgPulseTotals', activeContributors: number, newContributors: number } } | null } | null, repoRankTiers?: { __typename?: 'RepoRankTiers', repos: number } | null, repoLanguages: Array<{ __typename?: 'RepoLanguageSummary', language?: string | null, repos: number }> };

export type BadgeOrgCardQueryVariables = Exact<{
  login: Scalars['String']['input'];
}>;


export type BadgeOrgCardQuery = { __typename?: 'Query', orgRankTotal: number, organization?: { __typename?: 'Organization', login?: string | null, avatarUrl?: string | null, s?: number | null, reposCount?: number | null, rankOrg?: { __typename?: 'RankOrgWithoutOrganization', s?: number | null, sM?: number | null } | null, topRepos: Array<{ __typename?: 'Repo', nameWithOwner: string, stars: number, rank?: { __typename?: 'RankRepo', s?: number | null } | null }>, pulse?: { __typename?: 'OrgPulseFacts', lastMonth: string, countryCount: number, last12: { __typename?: 'OrgPulseTotals', activeContributors: number, newContributors: number } } | null, pulseSeries?: { __typename?: 'OrgPulseSeries', months: Array<string> } | null } | null };

export type BadgeOrgQueryVariables = Exact<{
  login: Scalars['String']['input'];
}>;


export type BadgeOrgQuery = { __typename?: 'Query', orgRankTotal: number, organization?: { __typename?: 'Organization', login?: string | null, avatarUrl?: string | null, s?: number | null, reposCount?: number | null, reposOver1k: number, rankOrg?: { __typename?: 'RankOrgWithoutOrganization', s?: number | null, sM?: number | null } | null, topRepos: Array<{ __typename?: 'Repo', nameWithOwner: string, stars: number, rank?: { __typename?: 'RankRepo', s?: number | null } | null }>, pulse?: { __typename?: 'OrgPulseFacts', lastMonth: string, countryCount: number, contributors60: number, last12: { __typename?: 'OrgPulseTotals', activeContributors: number, newContributors: number } } | null, wallPopular?: { __typename?: 'ContributorsWall', total: number, entries: Array<{ __typename?: 'ContributorsWallEntry', login: string, avatarUrl: string, tier?: number | null, level?: number | null }> } | null, wallContributions?: { __typename?: 'ContributorsWall', total: number, entries: Array<{ __typename?: 'ContributorsWallEntry', login: string, avatarUrl: string, tier?: number | null, level?: number | null }> } | null, wallNewest?: { __typename?: 'ContributorsWall', total: number, entries: Array<{ __typename?: 'ContributorsWallEntry', login: string, avatarUrl: string, tier?: number | null, level?: number | null }> } | null, pulseSeries?: { __typename?: 'OrgPulseSeries', months: Array<string>, activeLinked: Array<number>, activeAnonymous: Array<number>, newContributors: Array<number | null> } | null } | null };

export type BadgeProfileWithRanksQueryVariables = Exact<{
  login: Scalars['String']['input'];
  includeRankGlobal?: Scalars['Boolean']['input'];
  includeRankCountry?: Scalars['Boolean']['input'];
}>;


export type BadgeProfileWithRanksQuery = { __typename?: 'Query', user?: { __typename?: 'User', githubId: string, avatarUrl?: string | null, country?: string | null, f?: number | null, s?: number | null, c?: number | null, snapshots?: any | null, rankGlobal?: { __typename?: 'RankGlobalWithoutUser', s?: number | null, sProvisional?: number | null, sM?: number | null, c?: number | null, cProvisional?: number | null, cM?: number | null, f?: number | null, fProvisional?: number | null, fM?: number | null } | null, rankCountry?: { __typename?: 'RankCountryWithoutUser', s?: number | null, sProvisional?: number | null, sM?: number | null, c?: number | null, cProvisional?: number | null, cM?: number | null, f?: number | null, fProvisional?: number | null, fM?: number | null } | null } | null };

export type BadgeRepoQueryVariables = Exact<{
  owner: Scalars['String']['input'];
  name: Scalars['String']['input'];
}>;


export type BadgeRepoQuery = { __typename?: 'Query', repo?: { __typename?: 'Repo', nameWithOwner: string, language?: string | null, stars: number, gainedThisMonth?: number | null, monthStarts?: any | null, history?: { __typename?: 'RepoHistory', complete: boolean, points: Array<{ __typename?: 'RepoStarPoint', date: any, stars: number }>, current: { __typename?: 'RepoStarPoint', date: any, stars: number } } | null, rank?: { __typename?: 'RankRepo', s?: number | null, sM?: number | null, l?: number | null, lM?: number | null, language?: string | null, tier?: { __typename?: 'Tier', tier: number, level: number } | null } | null, rankGoal?: { __typename?: 'RankGoal', targetRank: number, scope: RankGoalScope, language?: string | null, country?: string | null, needed: number, unit: RankGoalUnit } | null, wallPopular?: { __typename?: 'ContributorsWall', total: number, entries: Array<{ __typename?: 'ContributorsWallEntry', login: string, avatarUrl: string, tier?: number | null, level?: number | null }> } | null, wallContributions?: { __typename?: 'ContributorsWall', total: number, entries: Array<{ __typename?: 'ContributorsWallEntry', login: string, avatarUrl: string, tier?: number | null, level?: number | null }> } | null, wallNewest?: { __typename?: 'ContributorsWall', total: number, entries: Array<{ __typename?: 'ContributorsWallEntry', login: string, avatarUrl: string, tier?: number | null, level?: number | null }> } | null, starsBest?: { __typename?: 'RepoStarsBest', total: number, counts: Array<{ __typename?: 'TierCount', tier: number, count: number }>, top: Array<{ __typename?: 'RepoStargazer', login?: string | null, avatarUrl?: string | null, tier: number, level: number }> } | null, siblings?: Array<{ __typename?: 'RepoSibling', share: number, repo: { __typename?: 'Repo', nameWithOwner: string } }> | null, builtBy?: { __typename?: 'RepoBuiltBy', counts: Array<{ __typename?: 'TierCount', tier: number, count: number }> } | null, pulse?: { __typename?: 'RepoPulseFacts', lastMonth: string, countryCount: number, contributors60: number, last12: { __typename?: 'OrgPulseTotals', activeContributors: number, newContributors: number } } | null, pulseSeries?: { __typename?: 'OrgPulseSeries', months: Array<string>, activeLinked: Array<number>, activeAnonymous: Array<number>, newContributors: Array<number | null> } | null } | null, repoRankTiers?: { __typename?: 'RepoRankTiers', repos: number, tiers: Array<{ __typename?: 'Tier', tier: number, level: number }> } | null, repoLanguages: Array<{ __typename?: 'RepoLanguageSummary', language?: string | null, repos: number }> };

export type BadgeTiersQueryVariables = Exact<{
  tiersName: Scalars['String']['input'];
  includeSTiers?: Scalars['Boolean']['input'];
  includeCTiers?: Scalars['Boolean']['input'];
  includeFTiers?: Scalars['Boolean']['input'];
}>;


export type BadgeTiersQuery = { __typename?: 'Query', rankTiersByName?: { __typename?: 'RankTier', sUsers: number, cUsers: number, fUsers: number, sTiers?: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, fTiers?: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, cTiers?: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }> } | null };

export type BadgeUserQueryVariables = Exact<{
  login: Scalars['String']['input'];
}>;


export type BadgeUserQuery = { __typename?: 'Query', user?: { __typename?: 'User', login: string, avatarUrl?: string | null, country?: string | null, s?: number | null, c?: number | null, f?: number | null, snapshots?: any | null, rankGlobal?: { __typename?: 'RankGlobalWithoutUser', s?: number | null, c?: number | null, f?: number | null, sM?: number | null, cM?: number | null, fM?: number | null, sProvisional?: number | null, cProvisional?: number | null, fProvisional?: number | null, snapshots?: any | null } | null, rankCountry?: { __typename?: 'RankCountryWithoutUser', s?: number | null, c?: number | null, f?: number | null, sM?: number | null, cM?: number | null, fM?: number | null, sProvisional?: number | null, cProvisional?: number | null, fProvisional?: number | null } | null, tiersGlobal?: { __typename?: 'RankTier', sUsers: number, cUsers: number, fUsers: number, sTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, cTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, fTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }> } | null, tiersCountry?: { __typename?: 'RankTier', sUsers: number, cUsers: number, fUsers: number, sTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, cTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, fTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }> } | null, goalStars?: { __typename?: 'RankGoal', targetRank: number, scope: RankGoalScope, language?: string | null, country?: string | null, needed: number, unit: RankGoalUnit } | null, goalContributions?: { __typename?: 'RankGoal', targetRank: number, scope: RankGoalScope, language?: string | null, country?: string | null, needed: number, unit: RankGoalUnit } | null, goalFollowers?: { __typename?: 'RankGoal', targetRank: number, scope: RankGoalScope, language?: string | null, country?: string | null, needed: number, unit: RankGoalUnit } | null, wallPopular?: { __typename?: 'ContributorsWall', repos?: number | null, total: number, entries: Array<{ __typename?: 'ContributorsWallEntry', login: string, avatarUrl: string, tier?: number | null, level?: number | null }> } | null, wallContributions?: { __typename?: 'ContributorsWall', total: number, entries: Array<{ __typename?: 'ContributorsWallEntry', login: string, avatarUrl: string, tier?: number | null, level?: number | null }> } | null, sLangs?: Array<{ __typename?: 'UserLanguage', name: string, rankGlobal?: { __typename?: 'RankLanguage', s?: number | null, sM?: number | null } | null, tiersGlobal?: { __typename?: 'RankTier', sUsers: number } | null }> | null } | null };

export type BadgeTierListsFragment = { __typename?: 'RankTier', sUsers: number, cUsers: number, fUsers: number, sTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, cTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, fTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }> };

export type CountryLanguageFactsQueryVariables = Exact<{
  country: Scalars['String']['input'];
  order?: InputMaybe<LanguageSummaryOrder>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type CountryLanguageFactsQuery = { __typename?: 'Query', countryLanguageSummary: Array<{ __typename?: 'CountryLanguageSummary', language: string, date: string, usersCount: number }> };

export type CountryLanguageRankingQueryVariables = Exact<{
  offset?: InputMaybe<Scalars['Int']['input']>;
  language: Scalars['String']['input'];
  country: Scalars['String']['input'];
}>;


export type CountryLanguageRankingQuery = { __typename?: 'Query', countryLanguageRankings: Array<{ __typename?: 'RankCountryLanguageWithUser', githubId: string, s?: number | null, sM?: number | null, user?: { __typename?: 'UserWithLanguageScore', login: string, avatarUrl?: string | null, location?: string | null, country?: string | null, s?: number | null } | null }> };

export type CountryLanguageSummaryQueryVariables = Exact<{
  country: Scalars['String']['input'];
  order?: InputMaybe<LanguageSummaryOrder>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type CountryLanguageSummaryQuery = { __typename?: 'Query', countryLanguageSummary: Array<{ __typename?: 'CountryLanguageSummary', language: string, country: string, date: string, usersCount: number, score: number, size: number, topUser?: { __typename?: 'UserBasic', login: string, avatarUrl?: string | null, country?: string | null } | null, languageData?: { __typename?: 'Language', color?: string | null } | null }> };

export type CountryQueryVariables = Exact<{ [key: string]: never; }>;


export type CountryQuery = { __typename?: 'Query', country?: Array<{ __typename?: 'Country', name: string, flag: string }> | null };

export type CountryRankingsQueryVariables = Exact<{
  order?: InputMaybe<RankOrder>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  country: Scalars['String']['input'];
}>;


export type CountryRankingsQuery = { __typename?: 'Query', countryRankings: Array<{ __typename?: 'RankCountry', githubId: string, c?: number | null, cM?: number | null, f?: number | null, fM?: number | null, s?: number | null, sM?: number | null, user?: { __typename?: 'UserBasic', login: string, avatarUrl?: string | null, location?: string | null, country?: string | null, s?: number | null, c?: number | null, f?: number | null } | null }> };

export type CountrySummaryQueryVariables = Exact<{
  order?: InputMaybe<CountrySummaryOrder>;
}>;


export type CountrySummaryQuery = { __typename?: 'Query', countrySummary: Array<{ __typename?: 'CountrySummary', country: string, usersCount: number, date: string, s: number, c: number, f: number, topUsers?: { __typename?: 'CountryTopUsers', s?: { __typename?: 'UserBasic', login: string, avatarUrl?: string | null } | null, c?: { __typename?: 'UserBasic', login: string, avatarUrl?: string | null } | null, f?: { __typename?: 'UserBasic', login: string, avatarUrl?: string | null } | null } | null, countryData: { __typename?: 'CountryBasic', code: string, name: string, flag: string } }> };

export type BadgeRankGoalFragment = { __typename?: 'RankGoal', targetRank: number, scope: RankGoalScope, language?: string | null, country?: string | null, needed: number, unit: RankGoalUnit };

export type BadgeWallFragment = { __typename?: 'ContributorsWall', total: number, entries: Array<{ __typename?: 'ContributorsWallEntry', login: string, avatarUrl: string, tier?: number | null, level?: number | null }> };

export type ContributionFieldsFragment = { __typename?: 'Contribution', year: number, prsCount?: number | null, mergedPrsCount?: number | null, linesAdded?: number | null, linesRemoved?: number | null, repository?: { __typename?: 'Repository', name?: string | null, url: string, createdAt?: any | null, pushedAt?: any | null, releasesCount?: number | null, stargazerCount: number, githubStars?: number | null, starsNotCounted?: number | null, isArchived?: boolean | null, forkCount?: number | null, languages?: Array<{ __typename?: 'LanguageEntity', name: string, color?: string | null, size: number }> | null, rank?: { __typename?: 'RankRepo', s?: number | null, tier?: { __typename?: 'Tier', tier: number, level: number } | null } | null } | null };

export type UserBaseFieldsFragment = { __typename?: 'User', githubId: string, login: string, name?: string | null, avatarUrl?: string | null, location?: string | null, country?: string | null, countryFlag?: string | null, company?: string | null, email?: string | null, f?: number | null, followingCount?: number | null, githubCreatedAt?: any | null, githubFetchedAt?: any | null, websiteUrl?: string | null, socialAccounts?: { __typename?: 'SocialAccount', totalCount: number, nodes?: Array<{ __typename?: 'SocialAccountNodeEntity', displayName?: string | null, provider: string, url: string }> | null } | null, organizations?: Array<{ __typename?: 'Organization', login?: string | null, avatarUrl?: string | null, name?: string | null }> | null };

export type UserTiersCountryFragment = { __typename?: 'User', tiersCountry?: { __typename?: 'RankTier', sUsers: number, cUsers: number, fUsers: number, sTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, fTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, cTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }> } | null };

export type UserFetchingStatusFragment = { __typename?: 'User', fetchingStatus?: UserFetchingStatus | null, fetchingUpdatedAt?: number | null };

export type UserTiersGlobalFragment = { __typename?: 'User', tiersGlobal?: { __typename?: 'RankTier', sUsers: number, cUsers: number, fUsers: number, sTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, fTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, cTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }> } | null };

export type UserSeoFragment = { __typename?: 'User', s?: number | null, c?: number | null, f?: number | null, repositoriesCount?: number | null, contributedRepoCount?: number | null, rankGlobal?: { __typename?: 'RankGlobalWithoutUser', s?: number | null, sProvisional?: number | null, c?: number | null, cProvisional?: number | null } | null };

export type PulseSeriesFieldsFragment = { __typename?: 'OrgPulseSeries', months: Array<string>, labels: Array<string>, snapshot: Array<Array<number>>, added: Array<Array<number>>, deleted: Array<Array<number>>, largestChange: Array<number>, largestChangeShare: Array<number>, crossLines: Array<number>, commits: Array<number>, pullRequests: Array<number>, activeLinked: Array<number>, activeAnonymous: Array<number>, newContributors: Array<number | null> };

export type PulseContributorFieldsFragment = { __typename?: 'OrgPulseContributor', githubId?: string | null, login: string, hasProfile: boolean, avatarUrl: string, linesAdded: number, linesDeleted: number, commits: number, pullRequests: number, activeMonths: number, topLabels: Array<string> };

export type PulseContributorPageFieldsFragment = { __typename?: 'OrgPulseContributorPage', total: number, unlinkedAuthors: number, labels: Array<string>, items: Array<{ __typename?: 'OrgPulseContributor', githubId?: string | null, login: string, hasProfile: boolean, avatarUrl: string, linesAdded: number, linesDeleted: number, commits: number, pullRequests: number, activeMonths: number, topLabels: Array<string> }> };

export type PulseLabelLinesFieldsFragment = { __typename?: 'OrgPulseLabelLines', label: string, lines: number, share: number };

export type PulseTotalsFieldsFragment = { __typename?: 'OrgPulseTotals', added: number, deleted: number, net: number, commits: number, pullRequests: number, activeContributors: number, newContributors: number };

export type PulseCountryFieldsFragment = { __typename?: 'OrgPulseCountry', group: OrgPulseCountryGroup, country?: string | null, flag?: string | null, contributors: number };

export type RepoRowFieldsFragment = { __typename?: 'Repo', githubId: string, owner: string, name: string, nameWithOwner: string, ownerAvatarUrl?: string | null, description?: string | null, language?: string | null, stars: number, gainedThisMonth?: number | null, starsCheck?: { __typename?: 'RepoStarsCheck', notCounted: number, githubStars: number } | null };

export type RepositoryLanguageFieldsFragment = { __typename?: 'LanguageEntity', name: string, color?: string | null, size: number };

export type RepositoryFieldsFragment = { __typename?: 'Repository', name?: string | null, url: string, createdAt?: any | null, pushedAt?: any | null, releasesCount?: number | null, stargazerCount: number, githubStars?: number | null, starsNotCounted?: number | null, isArchived?: boolean | null, forkCount?: number | null, languages?: Array<{ __typename?: 'LanguageEntity', name: string, color?: string | null, size: number }> | null, rank?: { __typename?: 'RankRepo', s?: number | null, tier?: { __typename?: 'Tier', tier: number, level: number } | null } | null };

export type TierFieldsFragment = { __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number };

export type GlobalRankByLoginQueryVariables = Exact<{
  login: Scalars['String']['input'];
}>;


export type GlobalRankByLoginQuery = { __typename?: 'Query', globalRankByLogin?: { __typename?: 'RankGlobal', githubId: string, c?: number | null, cM?: number | null, f?: number | null, fM?: number | null, s?: number | null, sM?: number | null, user?: { __typename?: 'UserBasic', login: string, avatarUrl?: string | null, s?: number | null, c?: number | null, f?: number | null, location?: string | null } | null } | null };

export type GlobalRankingsQueryVariables = Exact<{
  order?: InputMaybe<RankOrder>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GlobalRankingsQuery = { __typename?: 'Query', globalRankings: Array<{ __typename?: 'RankGlobal', githubId: string, c?: number | null, cM?: number | null, f?: number | null, fM?: number | null, s?: number | null, sM?: number | null, user?: { __typename?: 'UserBasic', login: string, avatarUrl?: string | null, location?: string | null, country?: string | null, s?: number | null, c?: number | null, f?: number | null } | null }> };

export type InsightsQueryVariables = Exact<{
  skip: Scalars['Int']['input'];
  limit: Scalars['Int']['input'];
}>;


export type InsightsQuery = { __typename?: 'Query', insights: Array<{ __typename?: 'InsightPost', id: string, category: InsightCategory, createdAt: any, socialPosts?: any | null, segments: Array<{ __typename?: 'Segment', type: SegmentType, text?: string | null, entityKey?: string | null, display?: string | null }>, entities?: { __typename?: 'Entities', mentions?: any | null, links?: any | null } | null, replies: Array<{ __typename?: 'InsightReply', createdAt: any, socialPosts?: any | null, segments: Array<{ __typename?: 'Segment', type: SegmentType, text?: string | null, entityKey?: string | null, display?: string | null }>, entities?: { __typename?: 'Entities', mentions?: any | null, links?: any | null } | null }> }> };

export type InsightQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type InsightQuery = { __typename?: 'Query', insight?: { __typename?: 'InsightPost', id: string, category: InsightCategory, createdAt: any, socialPosts?: any | null, segments: Array<{ __typename?: 'Segment', type: SegmentType, text?: string | null, entityKey?: string | null, display?: string | null }>, entities?: { __typename?: 'Entities', mentions?: any | null, links?: any | null } | null, replies: Array<{ __typename?: 'InsightReply', createdAt: any, socialPosts?: any | null, segments: Array<{ __typename?: 'Segment', type: SegmentType, text?: string | null, entityKey?: string | null, display?: string | null }>, entities?: { __typename?: 'Entities', mentions?: any | null, links?: any | null } | null }> } | null };

export type LanguageFactsQueryVariables = Exact<{
  order?: InputMaybe<LanguageSummaryOrder>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type LanguageFactsQuery = { __typename?: 'Query', languageSummary: Array<{ __typename?: 'LanguageSummary', language: string, date: string, usersCount: number }> };

export type LanguageRankingQueryVariables = Exact<{
  offset?: InputMaybe<Scalars['Int']['input']>;
  language: Scalars['String']['input'];
}>;


export type LanguageRankingQuery = { __typename?: 'Query', languageRankings: Array<{ __typename?: 'RankLanguageWithUser', githubId: string, s?: number | null, sM?: number | null, user?: { __typename?: 'UserWithLanguageScore', login: string, avatarUrl?: string | null, location?: string | null, country?: string | null, s?: number | null } | null }> };

export type LanguageSummaryQueryVariables = Exact<{
  order?: InputMaybe<LanguageSummaryOrder>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type LanguageSummaryQuery = { __typename?: 'Query', languageSummary: Array<{ __typename?: 'LanguageSummary', language: string, date: string, usersCount: number, score: number, size: number, topUser?: { __typename?: 'UserBasic', login: string, avatarUrl?: string | null, country?: string | null } | null, languageData?: { __typename?: 'Language', color?: string | null } | null }> };

export type OrgIdByLoginQueryVariables = Exact<{
  login: Scalars['String']['input'];
}>;


export type OrgIdByLoginQuery = { __typename?: 'Query', organization?: { __typename?: 'Organization', githubId: string } | null };

export type OrgPulseContributorsQueryVariables = Exact<{
  login: Scalars['String']['input'];
  period: OrgPulsePeriod;
  sortBy: OrgPulseContributorSort;
  label?: InputMaybe<Scalars['String']['input']>;
  first: Scalars['Int']['input'];
  offset: Scalars['Int']['input'];
}>;


export type OrgPulseContributorsQuery = { __typename?: 'Query', organization?: { __typename?: 'Organization', pulseContributors?: { __typename?: 'OrgPulseContributorPage', total: number, unlinkedAuthors: number, labels: Array<string>, items: Array<{ __typename?: 'OrgPulseContributor', githubId?: string | null, login: string, hasProfile: boolean, avatarUrl: string, linesAdded: number, linesDeleted: number, commits: number, pullRequests: number, activeMonths: number, topLabels: Array<string> }> } | null } | null };

export type OrgPulseSeriesQueryVariables = Exact<{
  login: Scalars['String']['input'];
  groupBy: OrgActivityGroupBy;
}>;


export type OrgPulseSeriesQuery = { __typename?: 'Query', organization?: { __typename?: 'Organization', pulseSeries?: { __typename?: 'OrgPulseSeries', months: Array<string>, labels: Array<string>, snapshot: Array<Array<number>>, added: Array<Array<number>>, deleted: Array<Array<number>>, largestChange: Array<number>, largestChangeShare: Array<number>, crossLines: Array<number>, commits: Array<number>, pullRequests: Array<number>, activeLinked: Array<number>, activeAnonymous: Array<number>, newContributors: Array<number | null> } | null } | null };

export type OrgRankingsQueryVariables = Exact<{
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type OrgRankingsQuery = { __typename?: 'Query', orgRankings: Array<{ __typename?: 'RankOrg', githubId: string, s?: number | null, sM?: number | null, organization?: { __typename?: 'OrganizationBasic', login?: string | null, name?: string | null, avatarUrl?: string | null, location?: string | null, country?: string | null, isVerified?: boolean | null, s?: number | null } | null }> };

export type OrgSitemapPartsQueryVariables = Exact<{ [key: string]: never; }>;


export type OrgSitemapPartsQuery = { __typename?: 'Query', orgSitemapParts: number };

export type OrgsForSitemapQueryVariables = Exact<{
  part: Scalars['Int']['input'];
}>;


export type OrgsForSitemapQuery = { __typename?: 'Query', orgsForSitemap: Array<string> };

export type PageOrgQueryVariables = Exact<{
  login: Scalars['String']['input'];
}>;


export type PageOrgQuery = { __typename?: 'Query', organization?: { __typename?: 'Organization', login?: string | null, name?: string | null, githubId: string, avatarUrl?: string | null, email?: string | null, location?: string | null, countryFlag?: string | null, twitterUsername?: string | null, websiteUrl?: string | null, isVerified?: boolean | null, githubCreatedAt?: any | null, githubUpdatedAt?: any | null, s?: number | null, reposCount?: number | null, usersCount?: number | null, updatedAt: any, hasActivity: boolean, rankOrg?: { __typename?: 'RankOrgWithoutOrganization', s?: number | null, sM?: number | null } | null, starsNotCounted?: { __typename?: 'StarsNotCounted', stars: number, repositories: number } | null, topRepos: Array<{ __typename?: 'Repo', githubId: string, owner: string, name: string, nameWithOwner: string, ownerAvatarUrl?: string | null, description?: string | null, language?: string | null, stars: number, gainedThisMonth?: number | null, rank?: { __typename?: 'RankRepo', s?: number | null, tier?: { __typename?: 'Tier', tier: number, level: number } | null } | null, starsCheck?: { __typename?: 'RepoStarsCheck', notCounted: number, githubStars: number } | null }>, pulse?: { __typename?: 'OrgPulseFacts', lastMonth: string, unlinkedAuthors12: number, scopeNote: string, computedAt: any, snapshot: Array<{ __typename?: 'OrgPulseLabelLines', label: string, lines: number, share: number }>, last12: { __typename?: 'OrgPulseTotals', added: number, deleted: number, net: number, commits: number, pullRequests: number, activeContributors: number, newContributors: number }, topContributors: Array<{ __typename?: 'OrgPulseContributor', githubId?: string | null, login: string, hasProfile: boolean, avatarUrl: string, linesAdded: number, linesDeleted: number, commits: number, pullRequests: number, activeMonths: number, topLabels: Array<string> }>, countries: Array<{ __typename?: 'OrgPulseCountry', group: OrgPulseCountryGroup, country?: string | null, flag?: string | null, contributors: number }>, sharedContributorOrgs: Array<{ __typename?: 'OrgPulseSharedOrg', login: string, sharedContributors: number, share: number, organization?: { __typename?: 'Organization', login?: string | null, name?: string | null, avatarUrl?: string | null } | null }> } | null } | null };

export type PageProfileLanguagesQueryVariables = Exact<{
  login: Scalars['String']['input'];
  isGlobalContext?: Scalars['Boolean']['input'];
}>;


export type PageProfileLanguagesQuery = { __typename?: 'Query', user?: { __typename?: 'User', firstSeenAt?: any | null, githubId: string, login: string, name?: string | null, avatarUrl?: string | null, location?: string | null, country?: string | null, countryFlag?: string | null, company?: string | null, email?: string | null, f?: number | null, followingCount?: number | null, githubCreatedAt?: any | null, githubFetchedAt?: any | null, websiteUrl?: string | null, fetchingStatus?: UserFetchingStatus | null, fetchingUpdatedAt?: number | null, s?: number | null, c?: number | null, repositoriesCount?: number | null, contributedRepoCount?: number | null, sLangs?: Array<{ __typename?: 'UserLanguage', name: string, color?: string | null, size: number, score: number, rankGlobal?: { __typename?: 'RankLanguage', s?: number | null, sM?: number | null } | null, tiersGlobal?: { __typename?: 'RankTier', sUsers: number, sTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }> } | null, rankCountry?: { __typename?: 'RankCountryLanguage', s?: number | null, sM?: number | null } | null, tiersCountry?: { __typename?: 'RankTier', sUsers: number, sTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }> } | null }> | null, socialAccounts?: { __typename?: 'SocialAccount', totalCount: number, nodes?: Array<{ __typename?: 'SocialAccountNodeEntity', displayName?: string | null, provider: string, url: string }> | null } | null, organizations?: Array<{ __typename?: 'Organization', login?: string | null, avatarUrl?: string | null, name?: string | null }> | null, rankGlobal?: { __typename?: 'RankGlobalWithoutUser', s?: number | null, sProvisional?: number | null, c?: number | null, cProvisional?: number | null } | null } | null };

export type PageProfileOverviewQueryVariables = Exact<{
  login: Scalars['String']['input'];
  isGlobalContext?: Scalars['Boolean']['input'];
}>;


export type PageProfileOverviewQuery = { __typename?: 'Query', user?: { __typename?: 'User', firstSeenAt?: any | null, snapshots?: any | null, githubId: string, login: string, name?: string | null, avatarUrl?: string | null, location?: string | null, country?: string | null, countryFlag?: string | null, company?: string | null, email?: string | null, f?: number | null, followingCount?: number | null, githubCreatedAt?: any | null, githubFetchedAt?: any | null, websiteUrl?: string | null, fetchingStatus?: UserFetchingStatus | null, fetchingUpdatedAt?: number | null, s?: number | null, c?: number | null, repositoriesCount?: number | null, contributedRepoCount?: number | null, starsNotCounted?: { __typename?: 'StarsNotCounted', stars: number, repositories: number } | null, rankGlobal?: { __typename?: 'RankGlobalWithoutUser', s?: number | null, sProvisional?: number | null, sM?: number | null, c?: number | null, cProvisional?: number | null, cM?: number | null, f?: number | null, fProvisional?: number | null, fM?: number | null, snapshots?: any | null } | null, rankCountry?: { __typename?: 'RankCountryWithoutUser', s?: number | null, sProvisional?: number | null, sM?: number | null, c?: number | null, cProvisional?: number | null, cM?: number | null, f?: number | null, fProvisional?: number | null, fM?: number | null, snapshots?: any | null } | null, sLangs?: Array<{ __typename?: 'UserLanguage', name: string, color?: string | null, size: number, score: number, sources?: Array<{ __typename?: 'UserLanguageSource', name: string, stargazerCount: number, percentage: number, year?: number | null }> | null }> | null, cLangs?: Array<{ __typename?: 'UserLanguage', name: string, color?: string | null, size: number, sources?: Array<{ __typename?: 'UserLanguageSource', name: string, stargazerCount: number, percentage: number, year?: number | null, linesAdded?: number | null, linesRemoved?: number | null, prsCount?: number | null, url?: string | null }> | null }> | null, starsReview?: { __typename?: 'StarsReview', status: StarsReviewStatus, stars: number, repositories: number, reportable: boolean } | null, repositories?: Array<{ __typename?: 'Repository', name?: string | null, url: string, createdAt?: any | null, pushedAt?: any | null, releasesCount?: number | null, stargazerCount: number, githubStars?: number | null, starsNotCounted?: number | null, isArchived?: boolean | null, forkCount?: number | null, languages?: Array<{ __typename?: 'LanguageEntity', name: string, color?: string | null, size: number }> | null, rank?: { __typename?: 'RankRepo', s?: number | null, tier?: { __typename?: 'Tier', tier: number, level: number } | null } | null }> | null, contributions?: Array<{ __typename?: 'Contribution', year: number, prsCount?: number | null, mergedPrsCount?: number | null, linesAdded?: number | null, linesRemoved?: number | null, repository?: { __typename?: 'Repository', name?: string | null, url: string, createdAt?: any | null, pushedAt?: any | null, releasesCount?: number | null, stargazerCount: number, githubStars?: number | null, starsNotCounted?: number | null, isArchived?: boolean | null, forkCount?: number | null, languages?: Array<{ __typename?: 'LanguageEntity', name: string, color?: string | null, size: number }> | null, rank?: { __typename?: 'RankRepo', s?: number | null, tier?: { __typename?: 'Tier', tier: number, level: number } | null } | null } | null }> | null, timeline?: Array<{ __typename?: 'Timeline', changes: any, createdAt: any }> | null, socialAccounts?: { __typename?: 'SocialAccount', totalCount: number, nodes?: Array<{ __typename?: 'SocialAccountNodeEntity', displayName?: string | null, provider: string, url: string }> | null } | null, organizations?: Array<{ __typename?: 'Organization', login?: string | null, avatarUrl?: string | null, name?: string | null }> | null, tiersGlobal?: { __typename?: 'RankTier', sUsers: number, cUsers: number, fUsers: number, sTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, fTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, cTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }> } | null, tiersCountry?: { __typename?: 'RankTier', sUsers: number, cUsers: number, fUsers: number, sTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, fTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, cTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }> } | null } | null };

export type PageProfileRanksQueryVariables = Exact<{
  login: Scalars['String']['input'];
  isGlobalContext?: Scalars['Boolean']['input'];
}>;


export type PageProfileRanksQuery = { __typename?: 'Query', user?: { __typename?: 'User', githubId: string, login: string, name?: string | null, avatarUrl?: string | null, location?: string | null, country?: string | null, countryFlag?: string | null, company?: string | null, email?: string | null, f?: number | null, followingCount?: number | null, githubCreatedAt?: any | null, githubFetchedAt?: any | null, websiteUrl?: string | null, fetchingStatus?: UserFetchingStatus | null, fetchingUpdatedAt?: number | null, s?: number | null, c?: number | null, repositoriesCount?: number | null, contributedRepoCount?: number | null, starsNotCounted?: { __typename?: 'StarsNotCounted', stars: number, repositories: number } | null, rankGlobal?: { __typename?: 'RankGlobalWithoutUser', s?: number | null, sProvisional?: number | null, sM?: number | null, c?: number | null, cProvisional?: number | null, cM?: number | null, f?: number | null, fProvisional?: number | null, fM?: number | null } | null, rankCountry?: { __typename?: 'RankCountryWithoutUser', s?: number | null, sProvisional?: number | null, sM?: number | null, c?: number | null, cProvisional?: number | null, cM?: number | null, f?: number | null, fProvisional?: number | null, fM?: number | null } | null, socialAccounts?: { __typename?: 'SocialAccount', totalCount: number, nodes?: Array<{ __typename?: 'SocialAccountNodeEntity', displayName?: string | null, provider: string, url: string }> | null } | null, organizations?: Array<{ __typename?: 'Organization', login?: string | null, avatarUrl?: string | null, name?: string | null }> | null, tiersGlobal?: { __typename?: 'RankTier', sUsers: number, cUsers: number, fUsers: number, sTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, fTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, cTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }> } | null, tiersCountry?: { __typename?: 'RankTier', sUsers: number, cUsers: number, fUsers: number, sTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, fTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, cTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }> } | null } | null };

export type PageProfileRepositoriesQueryVariables = Exact<{
  login: Scalars['String']['input'];
}>;


export type PageProfileRepositoriesQuery = { __typename?: 'Query', user?: { __typename?: 'User', repositoriesCount?: number | null, githubId: string, login: string, name?: string | null, avatarUrl?: string | null, location?: string | null, country?: string | null, countryFlag?: string | null, company?: string | null, email?: string | null, f?: number | null, followingCount?: number | null, githubCreatedAt?: any | null, githubFetchedAt?: any | null, websiteUrl?: string | null, fetchingStatus?: UserFetchingStatus | null, fetchingUpdatedAt?: number | null, s?: number | null, c?: number | null, contributedRepoCount?: number | null, repositories?: Array<{ __typename?: 'Repository', name?: string | null, url: string, createdAt?: any | null, pushedAt?: any | null, releasesCount?: number | null, stargazerCount: number, githubStars?: number | null, starsNotCounted?: number | null, isArchived?: boolean | null, forkCount?: number | null, languages?: Array<{ __typename?: 'LanguageEntity', name: string, color?: string | null, size: number }> | null, rank?: { __typename?: 'RankRepo', s?: number | null, tier?: { __typename?: 'Tier', tier: number, level: number } | null } | null }> | null, contributions?: Array<{ __typename?: 'Contribution', year: number, prsCount?: number | null, mergedPrsCount?: number | null, linesAdded?: number | null, linesRemoved?: number | null, repository?: { __typename?: 'Repository', name?: string | null, url: string, createdAt?: any | null, pushedAt?: any | null, releasesCount?: number | null, stargazerCount: number, githubStars?: number | null, starsNotCounted?: number | null, isArchived?: boolean | null, forkCount?: number | null, languages?: Array<{ __typename?: 'LanguageEntity', name: string, color?: string | null, size: number }> | null, rank?: { __typename?: 'RankRepo', s?: number | null, tier?: { __typename?: 'Tier', tier: number, level: number } | null } | null } | null }> | null, socialAccounts?: { __typename?: 'SocialAccount', totalCount: number, nodes?: Array<{ __typename?: 'SocialAccountNodeEntity', displayName?: string | null, provider: string, url: string }> | null } | null, organizations?: Array<{ __typename?: 'Organization', login?: string | null, avatarUrl?: string | null, name?: string | null }> | null, rankGlobal?: { __typename?: 'RankGlobalWithoutUser', s?: number | null, sProvisional?: number | null, c?: number | null, cProvisional?: number | null } | null } | null };

export type PageRepoQueryVariables = Exact<{
  owner: Scalars['String']['input'];
  name: Scalars['String']['input'];
}>;


export type PageRepoQuery = { __typename?: 'Query', repo?: { __typename?: 'Repo', isArchived?: boolean | null, isInOrganization?: boolean | null, createdAt?: any | null, renamedTo?: string | null, burstMonths?: Array<string> | null, githubId: string, owner: string, name: string, nameWithOwner: string, ownerAvatarUrl?: string | null, description?: string | null, language?: string | null, stars: number, gainedThisMonth?: number | null, rank?: { __typename?: 'RankRepo', language?: string | null, s?: number | null, sM?: number | null, l?: number | null, lM?: number | null, tier?: { __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number } | null, languageTier?: { __typename?: 'Tier', tier: number, level: number } | null } | null, history?: { __typename?: 'RepoHistory', complete: boolean, readAt: any, points: Array<{ __typename?: 'RepoStarPoint', date: any, stars: number }>, current: { __typename?: 'RepoStarPoint', date: any, stars: number } } | null, pull?: { __typename?: 'RepoPull', status: string, requestedAt: any, finishedAt?: any | null } | null, siblings?: Array<{ __typename?: 'RepoSibling', shared: number, share: number, repo: { __typename?: 'Repo', githubId: string, owner: string, name: string, nameWithOwner: string, ownerAvatarUrl?: string | null, description?: string | null, language?: string | null, stars: number, gainedThisMonth?: number | null, starsCheck?: { __typename?: 'RepoStarsCheck', notCounted: number, githubStars: number } | null } }> | null, builtBy?: { __typename?: 'RepoBuiltBy', accounts: number, counts: Array<{ __typename?: 'TierCount', tier: number, count: number }>, top: Array<{ __typename?: 'RepoBuilder', login?: string | null, avatarUrl?: string | null, tier: number, level: number }> } | null, starsBest?: { __typename?: 'RepoStarsBest', total: number, legendRatio?: number | null, counts: Array<{ __typename?: 'TierCount', tier: number, count: number }>, top: Array<{ __typename?: 'RepoStargazer', login?: string | null, avatarUrl?: string | null, tier: number, level: number }> } | null, starsCheck?: { __typename?: 'RepoStarsCheck', notCounted: number, githubStars: number } | null } | null };

export type ProfileContributionsQueryVariables = Exact<{
  login: Scalars['String']['input'];
  offset?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ProfileContributionsQuery = { __typename?: 'Query', user?: { __typename?: 'User', contributions?: Array<{ __typename?: 'Contribution', year: number, prsCount?: number | null, mergedPrsCount?: number | null, linesAdded?: number | null, linesRemoved?: number | null, repository?: { __typename?: 'Repository', name?: string | null, url: string, createdAt?: any | null, pushedAt?: any | null, releasesCount?: number | null, stargazerCount: number, githubStars?: number | null, starsNotCounted?: number | null, isArchived?: boolean | null, forkCount?: number | null, languages?: Array<{ __typename?: 'LanguageEntity', name: string, color?: string | null, size: number }> | null, rank?: { __typename?: 'RankRepo', s?: number | null, tier?: { __typename?: 'Tier', tier: number, level: number } | null } | null } | null }> | null } | null };

export type ProfileFetchingStatusQueryVariables = Exact<{
  login: Scalars['String']['input'];
}>;


export type ProfileFetchingStatusQuery = { __typename?: 'Query', user?: { __typename?: 'User', login: string, fetchingStatus?: UserFetchingStatus | null, fetchingUpdatedAt?: number | null } | null };

export type ProfileIdByLoginQueryVariables = Exact<{
  login: Scalars['String']['input'];
}>;


export type ProfileIdByLoginQuery = { __typename?: 'Query', globalRankByLogin?: { __typename?: 'RankGlobal', githubId: string, s?: number | null, sProvisional?: number | null, c?: number | null, cProvisional?: number | null, f?: number | null, fProvisional?: number | null, user?: { __typename?: 'UserBasic', login: string, s?: number | null, c?: number | null, f?: number | null, country?: string | null } | null } | null, countryRankByLogin?: { __typename?: 'RankCountry', s?: number | null, sProvisional?: number | null, c?: number | null, cProvisional?: number | null, f?: number | null, fProvisional?: number | null } | null };

export type ProfileRepositoriesQueryVariables = Exact<{
  login: Scalars['String']['input'];
  offset?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ProfileRepositoriesQuery = { __typename?: 'Query', user?: { __typename?: 'User', repositoriesCount?: number | null, repositories?: Array<{ __typename?: 'Repository', name?: string | null, url: string, createdAt?: any | null, pushedAt?: any | null, releasesCount?: number | null, stargazerCount: number, githubStars?: number | null, starsNotCounted?: number | null, isArchived?: boolean | null, forkCount?: number | null, languages?: Array<{ __typename?: 'LanguageEntity', name: string, color?: string | null, size: number }> | null, rank?: { __typename?: 'RankRepo', s?: number | null, tier?: { __typename?: 'Tier', tier: number, level: number } | null } | null }> | null } | null };

export type ProfilesForSitemapQueryVariables = Exact<{ [key: string]: never; }>;


export type ProfilesForSitemapQuery = { __typename?: 'Query', profilesForSitemap: Array<{ __typename?: 'ProfileForSitemap', login: string, s?: number | null, c?: number | null, f?: number | null }> };

export type RepoLanguagesQueryVariables = Exact<{ [key: string]: never; }>;


export type RepoLanguagesQuery = { __typename?: 'Query', repoLanguages: Array<{ __typename?: 'RepoLanguageSummary', language?: string | null, repos: number, stars: number, topRepo?: { __typename?: 'Repo', githubId: string, owner: string, name: string, nameWithOwner: string, ownerAvatarUrl?: string | null, description?: string | null, language?: string | null, stars: number, gainedThisMonth?: number | null, starsCheck?: { __typename?: 'RepoStarsCheck', notCounted: number, githubStars: number } | null } | null }> };

export type RepoPulseContributorsQueryVariables = Exact<{
  owner: Scalars['String']['input'];
  name: Scalars['String']['input'];
  period: OrgPulsePeriod;
  sortBy: OrgPulseContributorSort;
  label?: InputMaybe<Scalars['String']['input']>;
  first: Scalars['Int']['input'];
  offset: Scalars['Int']['input'];
}>;


export type RepoPulseContributorsQuery = { __typename?: 'Query', repo?: { __typename?: 'Repo', pulseContributors?: { __typename?: 'OrgPulseContributorPage', total: number, unlinkedAuthors: number, labels: Array<string>, items: Array<{ __typename?: 'OrgPulseContributor', githubId?: string | null, login: string, hasProfile: boolean, avatarUrl: string, linesAdded: number, linesDeleted: number, commits: number, pullRequests: number, activeMonths: number, topLabels: Array<string> }> } | null } | null };

export type RepoPulseFactsQueryVariables = Exact<{
  owner: Scalars['String']['input'];
  name: Scalars['String']['input'];
}>;


export type RepoPulseFactsQuery = { __typename?: 'Query', repo?: { __typename?: 'Repo', pulse?: { __typename?: 'RepoPulseFacts', lastMonth: string, unlinkedAuthors12: number, scopeNote: string, computedAt: any, snapshot: Array<{ __typename?: 'OrgPulseLabelLines', label: string, lines: number, share: number }>, last12: { __typename?: 'OrgPulseTotals', added: number, deleted: number, net: number, commits: number, pullRequests: number, activeContributors: number, newContributors: number }, topContributors: Array<{ __typename?: 'OrgPulseContributor', githubId?: string | null, login: string, hasProfile: boolean, avatarUrl: string, linesAdded: number, linesDeleted: number, commits: number, pullRequests: number, activeMonths: number, topLabels: Array<string> }>, countries: Array<{ __typename?: 'OrgPulseCountry', group: OrgPulseCountryGroup, country?: string | null, flag?: string | null, contributors: number }> } | null } | null };

export type RepoPulseSeriesQueryVariables = Exact<{
  owner: Scalars['String']['input'];
  name: Scalars['String']['input'];
  groupBy: OrgActivityGroupBy;
}>;


export type RepoPulseSeriesQuery = { __typename?: 'Query', repo?: { __typename?: 'Repo', pulseSeries?: { __typename?: 'OrgPulseSeries', months: Array<string>, labels: Array<string>, snapshot: Array<Array<number>>, added: Array<Array<number>>, deleted: Array<Array<number>>, largestChange: Array<number>, largestChangeShare: Array<number>, crossLines: Array<number>, commits: Array<number>, pullRequests: Array<number>, activeLinked: Array<number>, activeAnonymous: Array<number>, newContributors: Array<number | null> } | null } | null };

export type RepoRankTiersQueryVariables = Exact<{
  language?: InputMaybe<Scalars['String']['input']>;
  noLanguage?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type RepoRankTiersQuery = { __typename?: 'Query', repoRankTiers?: { __typename?: 'RepoRankTiers', repos: number, tiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }> } | null };

export type RepoRankingsQueryVariables = Exact<{
  offset?: InputMaybe<Scalars['Int']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  noLanguage?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type RepoRankingsQuery = { __typename?: 'Query', repoRankings: Array<{ __typename?: 'RankRepo', githubId: string, s?: number | null, sM?: number | null, l?: number | null, lM?: number | null, tier?: { __typename?: 'Tier', tier: number, level: number } | null, languageTier?: { __typename?: 'Tier', tier: number, level: number } | null, repo?: { __typename?: 'Repo', githubId: string, owner: string, name: string, nameWithOwner: string, ownerAvatarUrl?: string | null, description?: string | null, language?: string | null, stars: number, gainedThisMonth?: number | null, starsCheck?: { __typename?: 'RepoStarsCheck', notCounted: number, githubStars: number } | null } | null }> };

export type RepoSitemapPartsQueryVariables = Exact<{ [key: string]: never; }>;


export type RepoSitemapPartsQuery = { __typename?: 'Query', repoSitemapParts: number };

export type ReposForSitemapQueryVariables = Exact<{
  part: Scalars['Int']['input'];
}>;


export type ReposForSitemapQuery = { __typename?: 'Query', reposForSitemap: Array<string> };

export type StarHistoryRepoQueryVariables = Exact<{
  owner: Scalars['String']['input'];
  name: Scalars['String']['input'];
}>;


export type StarHistoryRepoQuery = { __typename?: 'Query', repo?: { __typename?: 'Repo', nameWithOwner: string, stars: number, gainedThisMonth?: number | null, history?: { __typename?: 'RepoHistory', points: Array<{ __typename?: 'RepoStarPoint', date: any, stars: number }>, current: { __typename?: 'RepoStarPoint', date: any, stars: number } } | null } | null };

export type TopLanguagesQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type TopLanguagesQuery = { __typename?: 'Query', languageSummary: Array<{ __typename?: 'LanguageSummary', language: string }> };

export const BadgeTierListsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BadgeTierLists"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RankTier"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sUsers"}},{"kind":"Field","name":{"kind":"Name","value":"cUsers"}},{"kind":"Field","name":{"kind":"Name","value":"fUsers"}},{"kind":"Field","name":{"kind":"Name","value":"sTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"minRank"}},{"kind":"Field","name":{"kind":"Name","value":"maxRank"}},{"kind":"Field","name":{"kind":"Name","value":"minValue"}}]}},{"kind":"Field","name":{"kind":"Name","value":"cTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"minRank"}},{"kind":"Field","name":{"kind":"Name","value":"maxRank"}},{"kind":"Field","name":{"kind":"Name","value":"minValue"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"minRank"}},{"kind":"Field","name":{"kind":"Name","value":"maxRank"}},{"kind":"Field","name":{"kind":"Name","value":"minValue"}}]}}]}}]} as unknown as DocumentNode<BadgeTierListsFragment, unknown>;
export const BadgeRankGoalFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BadgeRankGoal"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RankGoal"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"targetRank"}},{"kind":"Field","name":{"kind":"Name","value":"scope"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"needed"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}}]}}]} as unknown as DocumentNode<BadgeRankGoalFragment, unknown>;
export const BadgeWallFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BadgeWall"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContributorsWall"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}}]}}]}}]} as unknown as DocumentNode<BadgeWallFragment, unknown>;
export const RepositoryLanguageFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryLanguageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"LanguageEntity"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"size"}}]}}]} as unknown as DocumentNode<RepositoryLanguageFieldsFragment, unknown>;
export const RepositoryFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repository"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"pushedAt"}},{"kind":"Field","name":{"kind":"Name","value":"releasesCount"}},{"kind":"Field","name":{"kind":"Name","value":"stargazerCount"}},{"kind":"Field","name":{"kind":"Name","value":"githubStars"}},{"kind":"Field","name":{"kind":"Name","value":"starsNotCounted"}},{"kind":"Field","name":{"kind":"Name","value":"isArchived"}},{"kind":"Field","name":{"kind":"Name","value":"forkCount"}},{"kind":"Field","name":{"kind":"Name","value":"languages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryLanguageFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rank"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"tier"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryLanguageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"LanguageEntity"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"size"}}]}}]} as unknown as DocumentNode<RepositoryFieldsFragment, unknown>;
export const ContributionFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContributionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Contribution"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"prsCount"}},{"kind":"Field","name":{"kind":"Name","value":"mergedPrsCount"}},{"kind":"Field","name":{"kind":"Name","value":"linesAdded"}},{"kind":"Field","name":{"kind":"Name","value":"linesRemoved"}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryLanguageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"LanguageEntity"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"size"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repository"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"pushedAt"}},{"kind":"Field","name":{"kind":"Name","value":"releasesCount"}},{"kind":"Field","name":{"kind":"Name","value":"stargazerCount"}},{"kind":"Field","name":{"kind":"Name","value":"githubStars"}},{"kind":"Field","name":{"kind":"Name","value":"starsNotCounted"}},{"kind":"Field","name":{"kind":"Name","value":"isArchived"}},{"kind":"Field","name":{"kind":"Name","value":"forkCount"}},{"kind":"Field","name":{"kind":"Name","value":"languages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryLanguageFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rank"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"tier"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}}]}}]}}]}}]} as unknown as DocumentNode<ContributionFieldsFragment, unknown>;
export const UserBaseFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBaseFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"countryFlag"}},{"kind":"Field","name":{"kind":"Name","value":"company"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"followingCount"}},{"kind":"Field","name":{"kind":"Name","value":"githubCreatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"githubFetchedAt"}},{"kind":"Field","name":{"kind":"Name","value":"websiteUrl"}},{"kind":"Field","name":{"kind":"Name","value":"socialAccounts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"organizations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<UserBaseFieldsFragment, unknown>;
export const TierFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TierFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tier"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"minRank"}},{"kind":"Field","name":{"kind":"Name","value":"maxRank"}},{"kind":"Field","name":{"kind":"Name","value":"minValue"}}]}}]} as unknown as DocumentNode<TierFieldsFragment, unknown>;
export const UserTiersCountryFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserTiersCountry"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tiersCountry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sUsers"}},{"kind":"Field","name":{"kind":"Name","value":"cUsers"}},{"kind":"Field","name":{"kind":"Name","value":"fUsers"}},{"kind":"Field","name":{"kind":"Name","value":"sTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"cTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TierFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tier"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"minRank"}},{"kind":"Field","name":{"kind":"Name","value":"maxRank"}},{"kind":"Field","name":{"kind":"Name","value":"minValue"}}]}}]} as unknown as DocumentNode<UserTiersCountryFragment, unknown>;
export const UserFetchingStatusFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFetchingStatus"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fetchingStatus"}},{"kind":"Field","name":{"kind":"Name","value":"fetchingUpdatedAt"}}]}}]} as unknown as DocumentNode<UserFetchingStatusFragment, unknown>;
export const UserTiersGlobalFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserTiersGlobal"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tiersGlobal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sUsers"}},{"kind":"Field","name":{"kind":"Name","value":"cUsers"}},{"kind":"Field","name":{"kind":"Name","value":"fUsers"}},{"kind":"Field","name":{"kind":"Name","value":"sTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"cTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TierFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tier"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"minRank"}},{"kind":"Field","name":{"kind":"Name","value":"maxRank"}},{"kind":"Field","name":{"kind":"Name","value":"minValue"}}]}}]} as unknown as DocumentNode<UserTiersGlobalFragment, unknown>;
export const UserSeoFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSeo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"repositoriesCount"}},{"kind":"Field","name":{"kind":"Name","value":"contributedRepoCount"}},{"kind":"Field","name":{"kind":"Name","value":"rankGlobal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cProvisional"}}]}}]}}]} as unknown as DocumentNode<UserSeoFragment, unknown>;
export const PulseSeriesFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseSeriesFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseSeries"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"months"}},{"kind":"Field","name":{"kind":"Name","value":"labels"}},{"kind":"Field","name":{"kind":"Name","value":"snapshot"}},{"kind":"Field","name":{"kind":"Name","value":"added"}},{"kind":"Field","name":{"kind":"Name","value":"deleted"}},{"kind":"Field","name":{"kind":"Name","value":"largestChange"}},{"kind":"Field","name":{"kind":"Name","value":"largestChangeShare"}},{"kind":"Field","name":{"kind":"Name","value":"crossLines"}},{"kind":"Field","name":{"kind":"Name","value":"commits"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequests"}},{"kind":"Field","name":{"kind":"Name","value":"activeLinked"}},{"kind":"Field","name":{"kind":"Name","value":"activeAnonymous"}},{"kind":"Field","name":{"kind":"Name","value":"newContributors"}}]}}]} as unknown as DocumentNode<PulseSeriesFieldsFragment, unknown>;
export const PulseContributorFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseContributorFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseContributor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"hasProfile"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"linesAdded"}},{"kind":"Field","name":{"kind":"Name","value":"linesDeleted"}},{"kind":"Field","name":{"kind":"Name","value":"commits"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequests"}},{"kind":"Field","name":{"kind":"Name","value":"activeMonths"}},{"kind":"Field","name":{"kind":"Name","value":"topLabels"}}]}}]} as unknown as DocumentNode<PulseContributorFieldsFragment, unknown>;
export const PulseContributorPageFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseContributorPageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseContributorPage"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"unlinkedAuthors"}},{"kind":"Field","name":{"kind":"Name","value":"labels"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseContributorFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseContributorFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseContributor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"hasProfile"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"linesAdded"}},{"kind":"Field","name":{"kind":"Name","value":"linesDeleted"}},{"kind":"Field","name":{"kind":"Name","value":"commits"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequests"}},{"kind":"Field","name":{"kind":"Name","value":"activeMonths"}},{"kind":"Field","name":{"kind":"Name","value":"topLabels"}}]}}]} as unknown as DocumentNode<PulseContributorPageFieldsFragment, unknown>;
export const PulseLabelLinesFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseLabelLinesFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseLabelLines"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"lines"}},{"kind":"Field","name":{"kind":"Name","value":"share"}}]}}]} as unknown as DocumentNode<PulseLabelLinesFieldsFragment, unknown>;
export const PulseTotalsFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseTotalsFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseTotals"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"added"}},{"kind":"Field","name":{"kind":"Name","value":"deleted"}},{"kind":"Field","name":{"kind":"Name","value":"net"}},{"kind":"Field","name":{"kind":"Name","value":"commits"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequests"}},{"kind":"Field","name":{"kind":"Name","value":"activeContributors"}},{"kind":"Field","name":{"kind":"Name","value":"newContributors"}}]}}]} as unknown as DocumentNode<PulseTotalsFieldsFragment, unknown>;
export const PulseCountryFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseCountryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseCountry"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"group"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"flag"}},{"kind":"Field","name":{"kind":"Name","value":"contributors"}}]}}]} as unknown as DocumentNode<PulseCountryFieldsFragment, unknown>;
export const RepoRowFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepoRowFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repo"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"nameWithOwner"}},{"kind":"Field","name":{"kind":"Name","value":"ownerAvatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}},{"kind":"Field","name":{"kind":"Name","value":"starsCheck"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notCounted"}},{"kind":"Field","name":{"kind":"Name","value":"githubStars"}}]}},{"kind":"Field","name":{"kind":"Name","value":"gainedThisMonth"}}]}}]} as unknown as DocumentNode<RepoRowFieldsFragment, unknown>;
export const AvatarByLoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AvatarByLogin"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}}]}}]}}]} as unknown as DocumentNode<AvatarByLoginQuery, AvatarByLoginQueryVariables>;
export const BadgeUserCardDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BadgeUserCard"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"snapshots"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"25"}}]},{"kind":"Field","name":{"kind":"Name","value":"rankGlobal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"cM"}},{"kind":"Field","name":{"kind":"Name","value":"fM"}},{"kind":"Field","name":{"kind":"Name","value":"sProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"cProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"fProvisional"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rankCountry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"cM"}},{"kind":"Field","name":{"kind":"Name","value":"fM"}},{"kind":"Field","name":{"kind":"Name","value":"sProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"cProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"fProvisional"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tiersGlobal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sUsers"}},{"kind":"Field","name":{"kind":"Name","value":"cUsers"}},{"kind":"Field","name":{"kind":"Name","value":"fUsers"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tiersCountry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sUsers"}},{"kind":"Field","name":{"kind":"Name","value":"cUsers"}},{"kind":"Field","name":{"kind":"Name","value":"fUsers"}}]}}]}}]}}]} as unknown as DocumentNode<BadgeUserCardQuery, BadgeUserCardQueryVariables>;
export const BadgeRepoCardDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BadgeRepoCard"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"owner"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"owner"},"value":{"kind":"Variable","name":{"kind":"Name","value":"owner"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nameWithOwner"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}},{"kind":"Field","name":{"kind":"Name","value":"gainedThisMonth"}},{"kind":"Field","name":{"kind":"Name","value":"monthStarts"}},{"kind":"Field","name":{"kind":"Name","value":"history"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"current"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}}]}},{"kind":"Field","name":{"kind":"Name","value":"complete"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rank"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"l"}},{"kind":"Field","name":{"kind":"Name","value":"lM"}},{"kind":"Field","name":{"kind":"Name","value":"language"}}]}},{"kind":"Field","name":{"kind":"Name","value":"starsBest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pulse"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lastMonth"}},{"kind":"Field","name":{"kind":"Name","value":"last12"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"activeContributors"}},{"kind":"Field","name":{"kind":"Name","value":"newContributors"}}]}},{"kind":"Field","name":{"kind":"Name","value":"countryCount"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"repoRankTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repos"}}]}},{"kind":"Field","name":{"kind":"Name","value":"repoLanguages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"repos"}}]}}]}}]} as unknown as DocumentNode<BadgeRepoCardQuery, BadgeRepoCardQueryVariables>;
export const BadgeOrgCardDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BadgeOrgCard"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"organization"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"reposCount"}},{"kind":"Field","name":{"kind":"Name","value":"rankOrg"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}}]}},{"kind":"Field","name":{"kind":"Name","value":"topRepos"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"1"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nameWithOwner"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}},{"kind":"Field","name":{"kind":"Name","value":"rank"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pulse"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lastMonth"}},{"kind":"Field","name":{"kind":"Name","value":"last12"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"activeContributors"}},{"kind":"Field","name":{"kind":"Name","value":"newContributors"}}]}},{"kind":"Field","name":{"kind":"Name","value":"countryCount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pulseSeries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"months"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"orgRankTotal"}}]}}]} as unknown as DocumentNode<BadgeOrgCardQuery, BadgeOrgCardQueryVariables>;
export const BadgeOrgDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BadgeOrg"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"organization"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"reposCount"}},{"kind":"Field","name":{"kind":"Name","value":"reposOver1k"}},{"kind":"Field","name":{"kind":"Name","value":"rankOrg"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}}]}},{"kind":"Field","name":{"kind":"Name","value":"topRepos"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"3"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nameWithOwner"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}},{"kind":"Field","name":{"kind":"Name","value":"rank"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pulse"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lastMonth"}},{"kind":"Field","name":{"kind":"Name","value":"last12"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"activeContributors"}},{"kind":"Field","name":{"kind":"Name","value":"newContributors"}}]}},{"kind":"Field","name":{"kind":"Name","value":"countryCount"}},{"kind":"Field","name":{"kind":"Name","value":"contributors60"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"wallPopular"},"name":{"kind":"Name","value":"contributorsWall"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"EnumValue","value":"POPULAR"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BadgeWall"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"wallContributions"},"name":{"kind":"Name","value":"contributorsWall"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"EnumValue","value":"CONTRIBUTIONS"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BadgeWall"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"wallNewest"},"name":{"kind":"Name","value":"contributorsWall"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"EnumValue","value":"NEWEST"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BadgeWall"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pulseSeries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"months"}},{"kind":"Field","name":{"kind":"Name","value":"activeLinked"}},{"kind":"Field","name":{"kind":"Name","value":"activeAnonymous"}},{"kind":"Field","name":{"kind":"Name","value":"newContributors"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"orgRankTotal"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BadgeWall"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContributorsWall"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}}]}}]}}]} as unknown as DocumentNode<BadgeOrgQuery, BadgeOrgQueryVariables>;
export const BadgeProfileWithRanksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BadgeProfileWithRanks"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"includeRankGlobal"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},"defaultValue":{"kind":"BooleanValue","value":true}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"includeRankCountry"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},"defaultValue":{"kind":"BooleanValue","value":true}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"snapshots"}},{"kind":"Field","name":{"kind":"Name","value":"rankGlobal"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"include"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"includeRankGlobal"}}}]}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"cM"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"fProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"fM"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rankCountry"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"include"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"includeRankCountry"}}}]}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"cM"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"fProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"fM"}}]}}]}}]}}]} as unknown as DocumentNode<BadgeProfileWithRanksQuery, BadgeProfileWithRanksQueryVariables>;
export const BadgeRepoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BadgeRepo"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"owner"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"owner"},"value":{"kind":"Variable","name":{"kind":"Name","value":"owner"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nameWithOwner"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}},{"kind":"Field","name":{"kind":"Name","value":"gainedThisMonth"}},{"kind":"Field","name":{"kind":"Name","value":"monthStarts"}},{"kind":"Field","name":{"kind":"Name","value":"history"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"points"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}}]}},{"kind":"Field","name":{"kind":"Name","value":"current"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}}]}},{"kind":"Field","name":{"kind":"Name","value":"complete"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rank"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"l"}},{"kind":"Field","name":{"kind":"Name","value":"lM"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"tier"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"rankGoal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BadgeRankGoal"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"wallPopular"},"name":{"kind":"Name","value":"contributorsWall"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"EnumValue","value":"POPULAR"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BadgeWall"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"wallContributions"},"name":{"kind":"Name","value":"contributorsWall"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"EnumValue","value":"CONTRIBUTIONS"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BadgeWall"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"wallNewest"},"name":{"kind":"Name","value":"contributorsWall"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"EnumValue","value":"NEWEST"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BadgeWall"}}]}},{"kind":"Field","name":{"kind":"Name","value":"starsBest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"counts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"top"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"siblings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"share"}},{"kind":"Field","name":{"kind":"Name","value":"repo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nameWithOwner"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"builtBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"counts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pulse"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lastMonth"}},{"kind":"Field","name":{"kind":"Name","value":"last12"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"activeContributors"}},{"kind":"Field","name":{"kind":"Name","value":"newContributors"}}]}},{"kind":"Field","name":{"kind":"Name","value":"countryCount"}},{"kind":"Field","name":{"kind":"Name","value":"contributors60"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pulseSeries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"months"}},{"kind":"Field","name":{"kind":"Name","value":"activeLinked"}},{"kind":"Field","name":{"kind":"Name","value":"activeAnonymous"}},{"kind":"Field","name":{"kind":"Name","value":"newContributors"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"repoRankTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repos"}},{"kind":"Field","name":{"kind":"Name","value":"tiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"repoLanguages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"repos"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BadgeRankGoal"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RankGoal"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"targetRank"}},{"kind":"Field","name":{"kind":"Name","value":"scope"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"needed"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BadgeWall"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContributorsWall"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}}]}}]}}]} as unknown as DocumentNode<BadgeRepoQuery, BadgeRepoQueryVariables>;
export const BadgeTiersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BadgeTiers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tiersName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"includeSTiers"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},"defaultValue":{"kind":"BooleanValue","value":true}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"includeCTiers"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},"defaultValue":{"kind":"BooleanValue","value":true}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"includeFTiers"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},"defaultValue":{"kind":"BooleanValue","value":true}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rankTiersByName"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tiersName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sUsers"}},{"kind":"Field","name":{"kind":"Name","value":"cUsers"}},{"kind":"Field","name":{"kind":"Name","value":"fUsers"}},{"kind":"Field","name":{"kind":"Name","value":"sTiers"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"include"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"includeSTiers"}}}]}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"minRank"}},{"kind":"Field","name":{"kind":"Name","value":"maxRank"}},{"kind":"Field","name":{"kind":"Name","value":"minValue"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fTiers"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"include"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"includeFTiers"}}}]}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"minRank"}},{"kind":"Field","name":{"kind":"Name","value":"maxRank"}},{"kind":"Field","name":{"kind":"Name","value":"minValue"}}]}},{"kind":"Field","name":{"kind":"Name","value":"cTiers"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"include"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"includeCTiers"}}}]}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"minRank"}},{"kind":"Field","name":{"kind":"Name","value":"maxRank"}},{"kind":"Field","name":{"kind":"Name","value":"minValue"}}]}}]}}]}}]} as unknown as DocumentNode<BadgeTiersQuery, BadgeTiersQueryVariables>;
export const BadgeUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BadgeUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"snapshots"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"25"}}]},{"kind":"Field","name":{"kind":"Name","value":"rankGlobal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"cM"}},{"kind":"Field","name":{"kind":"Name","value":"fM"}},{"kind":"Field","name":{"kind":"Name","value":"sProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"cProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"fProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"snapshots"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rankCountry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"cM"}},{"kind":"Field","name":{"kind":"Name","value":"fM"}},{"kind":"Field","name":{"kind":"Name","value":"sProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"cProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"fProvisional"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tiersGlobal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BadgeTierLists"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tiersCountry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BadgeTierLists"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"goalStars"},"name":{"kind":"Name","value":"rankGoal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"by"},"value":{"kind":"EnumValue","value":"STARS"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BadgeRankGoal"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"goalContributions"},"name":{"kind":"Name","value":"rankGoal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"by"},"value":{"kind":"EnumValue","value":"CONTRIBUTIONS"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BadgeRankGoal"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"goalFollowers"},"name":{"kind":"Name","value":"rankGoal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"by"},"value":{"kind":"EnumValue","value":"FOLLOWERS"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BadgeRankGoal"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"wallPopular"},"name":{"kind":"Name","value":"contributorsWall"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"EnumValue","value":"POPULAR"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BadgeWall"}},{"kind":"Field","name":{"kind":"Name","value":"repos"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"wallContributions"},"name":{"kind":"Name","value":"contributorsWall"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"EnumValue","value":"CONTRIBUTIONS"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BadgeWall"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sLangs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"10"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"rankGlobal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tiersGlobal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sUsers"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BadgeTierLists"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RankTier"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sUsers"}},{"kind":"Field","name":{"kind":"Name","value":"cUsers"}},{"kind":"Field","name":{"kind":"Name","value":"fUsers"}},{"kind":"Field","name":{"kind":"Name","value":"sTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"minRank"}},{"kind":"Field","name":{"kind":"Name","value":"maxRank"}},{"kind":"Field","name":{"kind":"Name","value":"minValue"}}]}},{"kind":"Field","name":{"kind":"Name","value":"cTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"minRank"}},{"kind":"Field","name":{"kind":"Name","value":"maxRank"}},{"kind":"Field","name":{"kind":"Name","value":"minValue"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"minRank"}},{"kind":"Field","name":{"kind":"Name","value":"maxRank"}},{"kind":"Field","name":{"kind":"Name","value":"minValue"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BadgeRankGoal"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"RankGoal"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"targetRank"}},{"kind":"Field","name":{"kind":"Name","value":"scope"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"needed"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BadgeWall"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContributorsWall"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}}]}}]}}]} as unknown as DocumentNode<BadgeUserQuery, BadgeUserQueryVariables>;
export const CountryLanguageFactsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CountryLanguageFacts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"country"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"order"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"LanguageSummaryOrder"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}},"defaultValue":{"kind":"IntValue","value":"24"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"countryLanguageSummary"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"Variable","name":{"kind":"Name","value":"order"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"country"},"value":{"kind":"Variable","name":{"kind":"Name","value":"country"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"usersCount"}}]}}]}}]} as unknown as DocumentNode<CountryLanguageFactsQuery, CountryLanguageFactsQueryVariables>;
export const CountryLanguageRankingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CountryLanguageRanking"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"language"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"country"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"countryLanguageRankings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"language"},"value":{"kind":"Variable","name":{"kind":"Name","value":"language"}}},{"kind":"Argument","name":{"kind":"Name","value":"country"},"value":{"kind":"Variable","name":{"kind":"Name","value":"country"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"s"},"name":{"kind":"Name","value":"languageScore"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"country"}}]}}]}}]}}]} as unknown as DocumentNode<CountryLanguageRankingQuery, CountryLanguageRankingQueryVariables>;
export const CountryLanguageSummaryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CountryLanguageSummary"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"country"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"order"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"LanguageSummaryOrder"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}},"defaultValue":{"kind":"IntValue","value":"0"}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}},"defaultValue":{"kind":"IntValue","value":"24"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"countryLanguageSummary"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"Variable","name":{"kind":"Name","value":"order"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"country"},"value":{"kind":"Variable","name":{"kind":"Name","value":"country"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"usersCount"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"topUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"country"}}]}},{"kind":"Field","name":{"kind":"Name","value":"languageData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"color"}}]}}]}}]}}]} as unknown as DocumentNode<CountryLanguageSummaryQuery, CountryLanguageSummaryQueryVariables>;
export const CountryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Country"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"country"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"flag"}}]}}]}}]} as unknown as DocumentNode<CountryQuery, CountryQueryVariables>;
export const CountryRankingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CountryRankings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"order"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"RankOrder"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"country"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"countryRankings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"Variable","name":{"kind":"Name","value":"order"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"country"},"value":{"kind":"Variable","name":{"kind":"Name","value":"country"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cM"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"fM"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}}]}}]}}]}}]} as unknown as DocumentNode<CountryRankingsQuery, CountryRankingsQueryVariables>;
export const CountrySummaryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CountrySummary"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"order"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CountrySummaryOrder"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"countrySummary"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"Variable","name":{"kind":"Name","value":"order"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"usersCount"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"topUsers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"c"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"f"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"countryData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"flag"}}]}}]}}]}}]} as unknown as DocumentNode<CountrySummaryQuery, CountrySummaryQueryVariables>;
export const GlobalRankByLoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GlobalRankByLogin"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"globalRankByLogin"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cM"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"fM"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"location"}}]}}]}}]}}]} as unknown as DocumentNode<GlobalRankByLoginQuery, GlobalRankByLoginQueryVariables>;
export const GlobalRankingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GlobalRankings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"order"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"RankOrder"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"globalRankings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"Variable","name":{"kind":"Name","value":"order"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cM"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"fM"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}}]}}]}}]}}]} as unknown as DocumentNode<GlobalRankingsQuery, GlobalRankingsQueryVariables>;
export const InsightsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Insights"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"skip"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"insights"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"skip"},"value":{"kind":"Variable","name":{"kind":"Name","value":"skip"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"segments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"entityKey"}},{"kind":"Field","name":{"kind":"Name","value":"display"}}]}},{"kind":"Field","name":{"kind":"Name","value":"entities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mentions"}},{"kind":"Field","name":{"kind":"Name","value":"links"}}]}},{"kind":"Field","name":{"kind":"Name","value":"replies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"segments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"entityKey"}},{"kind":"Field","name":{"kind":"Name","value":"display"}}]}},{"kind":"Field","name":{"kind":"Name","value":"entities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mentions"}},{"kind":"Field","name":{"kind":"Name","value":"links"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"socialPosts"}}]}},{"kind":"Field","name":{"kind":"Name","value":"socialPosts"}}]}}]}}]} as unknown as DocumentNode<InsightsQuery, InsightsQueryVariables>;
export const InsightDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Insight"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"insight"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"segments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"entityKey"}},{"kind":"Field","name":{"kind":"Name","value":"display"}}]}},{"kind":"Field","name":{"kind":"Name","value":"entities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mentions"}},{"kind":"Field","name":{"kind":"Name","value":"links"}}]}},{"kind":"Field","name":{"kind":"Name","value":"replies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"segments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"entityKey"}},{"kind":"Field","name":{"kind":"Name","value":"display"}}]}},{"kind":"Field","name":{"kind":"Name","value":"entities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mentions"}},{"kind":"Field","name":{"kind":"Name","value":"links"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"socialPosts"}}]}},{"kind":"Field","name":{"kind":"Name","value":"socialPosts"}}]}}]}}]} as unknown as DocumentNode<InsightQuery, InsightQueryVariables>;
export const LanguageFactsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"LanguageFacts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"order"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"LanguageSummaryOrder"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}},"defaultValue":{"kind":"IntValue","value":"24"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"languageSummary"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"Variable","name":{"kind":"Name","value":"order"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"usersCount"}}]}}]}}]} as unknown as DocumentNode<LanguageFactsQuery, LanguageFactsQueryVariables>;
export const LanguageRankingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"LanguageRanking"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"language"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"languageRankings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"language"},"value":{"kind":"Variable","name":{"kind":"Name","value":"language"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"s"},"name":{"kind":"Name","value":"languageScore"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"country"}}]}}]}}]}}]} as unknown as DocumentNode<LanguageRankingQuery, LanguageRankingQueryVariables>;
export const LanguageSummaryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"LanguageSummary"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"order"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"LanguageSummaryOrder"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}},"defaultValue":{"kind":"IntValue","value":"0"}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}},"defaultValue":{"kind":"IntValue","value":"24"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"languageSummary"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"Variable","name":{"kind":"Name","value":"order"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"usersCount"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"topUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"country"}}]}},{"kind":"Field","name":{"kind":"Name","value":"languageData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"color"}}]}}]}}]}}]} as unknown as DocumentNode<LanguageSummaryQuery, LanguageSummaryQueryVariables>;
export const OrgIdByLoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OrgIdByLogin"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"organization"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}}]}}]}}]} as unknown as DocumentNode<OrgIdByLoginQuery, OrgIdByLoginQueryVariables>;
export const OrgPulseContributorsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OrgPulseContributors"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"period"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulsePeriod"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sortBy"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseContributorSort"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"label"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"organization"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pulseContributors"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"period"},"value":{"kind":"Variable","name":{"kind":"Name","value":"period"}}},{"kind":"Argument","name":{"kind":"Name","value":"sortBy"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sortBy"}}},{"kind":"Argument","name":{"kind":"Name","value":"label"},"value":{"kind":"Variable","name":{"kind":"Name","value":"label"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseContributorPageFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseContributorFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseContributor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"hasProfile"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"linesAdded"}},{"kind":"Field","name":{"kind":"Name","value":"linesDeleted"}},{"kind":"Field","name":{"kind":"Name","value":"commits"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequests"}},{"kind":"Field","name":{"kind":"Name","value":"activeMonths"}},{"kind":"Field","name":{"kind":"Name","value":"topLabels"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseContributorPageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseContributorPage"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"unlinkedAuthors"}},{"kind":"Field","name":{"kind":"Name","value":"labels"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseContributorFields"}}]}}]}}]} as unknown as DocumentNode<OrgPulseContributorsQuery, OrgPulseContributorsQueryVariables>;
export const OrgPulseSeriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OrgPulseSeries"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"groupBy"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OrgActivityGroupBy"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"organization"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pulseSeries"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"groupBy"},"value":{"kind":"Variable","name":{"kind":"Name","value":"groupBy"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseSeriesFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseSeriesFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseSeries"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"months"}},{"kind":"Field","name":{"kind":"Name","value":"labels"}},{"kind":"Field","name":{"kind":"Name","value":"snapshot"}},{"kind":"Field","name":{"kind":"Name","value":"added"}},{"kind":"Field","name":{"kind":"Name","value":"deleted"}},{"kind":"Field","name":{"kind":"Name","value":"largestChange"}},{"kind":"Field","name":{"kind":"Name","value":"largestChangeShare"}},{"kind":"Field","name":{"kind":"Name","value":"crossLines"}},{"kind":"Field","name":{"kind":"Name","value":"commits"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequests"}},{"kind":"Field","name":{"kind":"Name","value":"activeLinked"}},{"kind":"Field","name":{"kind":"Name","value":"activeAnonymous"}},{"kind":"Field","name":{"kind":"Name","value":"newContributors"}}]}}]} as unknown as DocumentNode<OrgPulseSeriesQuery, OrgPulseSeriesQueryVariables>;
export const OrgRankingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OrgRankings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orgRankings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"isVerified"}},{"kind":"Field","name":{"kind":"Name","value":"s"}}]}}]}}]}}]} as unknown as DocumentNode<OrgRankingsQuery, OrgRankingsQueryVariables>;
export const OrgSitemapPartsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OrgSitemapParts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orgSitemapParts"}}]}}]} as unknown as DocumentNode<OrgSitemapPartsQuery, OrgSitemapPartsQueryVariables>;
export const OrgsForSitemapDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OrgsForSitemap"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"part"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orgsForSitemap"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"part"},"value":{"kind":"Variable","name":{"kind":"Name","value":"part"}}}]}]}}]} as unknown as DocumentNode<OrgsForSitemapQuery, OrgsForSitemapQueryVariables>;
export const PageOrgDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PageOrg"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"organization"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"rankOrg"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}}]}},{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"countryFlag"}},{"kind":"Field","name":{"kind":"Name","value":"twitterUsername"}},{"kind":"Field","name":{"kind":"Name","value":"websiteUrl"}},{"kind":"Field","name":{"kind":"Name","value":"isVerified"}},{"kind":"Field","name":{"kind":"Name","value":"githubCreatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"githubUpdatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"starsNotCounted"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"stars"}},{"kind":"Field","name":{"kind":"Name","value":"repositories"}}]}},{"kind":"Field","name":{"kind":"Name","value":"reposCount"}},{"kind":"Field","name":{"kind":"Name","value":"usersCount"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"hasActivity"}},{"kind":"Field","name":{"kind":"Name","value":"topRepos"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepoRowFields"}},{"kind":"Field","name":{"kind":"Name","value":"rank"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"tier"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pulse"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lastMonth"}},{"kind":"Field","name":{"kind":"Name","value":"snapshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseLabelLinesFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"last12"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseTotalsFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"topContributors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseContributorFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"unlinkedAuthors12"}},{"kind":"Field","name":{"kind":"Name","value":"countries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseCountryFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sharedContributorOrgs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"sharedContributors"}},{"kind":"Field","name":{"kind":"Name","value":"share"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"scopeNote"}},{"kind":"Field","name":{"kind":"Name","value":"computedAt"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepoRowFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repo"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"nameWithOwner"}},{"kind":"Field","name":{"kind":"Name","value":"ownerAvatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}},{"kind":"Field","name":{"kind":"Name","value":"starsCheck"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notCounted"}},{"kind":"Field","name":{"kind":"Name","value":"githubStars"}}]}},{"kind":"Field","name":{"kind":"Name","value":"gainedThisMonth"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseLabelLinesFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseLabelLines"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"lines"}},{"kind":"Field","name":{"kind":"Name","value":"share"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseTotalsFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseTotals"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"added"}},{"kind":"Field","name":{"kind":"Name","value":"deleted"}},{"kind":"Field","name":{"kind":"Name","value":"net"}},{"kind":"Field","name":{"kind":"Name","value":"commits"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequests"}},{"kind":"Field","name":{"kind":"Name","value":"activeContributors"}},{"kind":"Field","name":{"kind":"Name","value":"newContributors"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseContributorFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseContributor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"hasProfile"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"linesAdded"}},{"kind":"Field","name":{"kind":"Name","value":"linesDeleted"}},{"kind":"Field","name":{"kind":"Name","value":"commits"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequests"}},{"kind":"Field","name":{"kind":"Name","value":"activeMonths"}},{"kind":"Field","name":{"kind":"Name","value":"topLabels"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseCountryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseCountry"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"group"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"flag"}},{"kind":"Field","name":{"kind":"Name","value":"contributors"}}]}}]} as unknown as DocumentNode<PageOrgQuery, PageOrgQueryVariables>;
export const PageProfileLanguagesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PageProfileLanguages"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"isGlobalContext"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},"defaultValue":{"kind":"BooleanValue","value":true}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"firstSeenAt"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserBaseFields"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFetchingStatus"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSeo"}},{"kind":"Field","name":{"kind":"Name","value":"sLangs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"10"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"rankGlobal"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"include"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isGlobalContext"}}}]}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tiersGlobal"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"include"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isGlobalContext"}}}]}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sUsers"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rankCountry"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"skip"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isGlobalContext"}}}]}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tiersCountry"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"skip"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isGlobalContext"}}}]}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sUsers"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBaseFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"countryFlag"}},{"kind":"Field","name":{"kind":"Name","value":"company"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"followingCount"}},{"kind":"Field","name":{"kind":"Name","value":"githubCreatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"githubFetchedAt"}},{"kind":"Field","name":{"kind":"Name","value":"websiteUrl"}},{"kind":"Field","name":{"kind":"Name","value":"socialAccounts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"organizations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFetchingStatus"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fetchingStatus"}},{"kind":"Field","name":{"kind":"Name","value":"fetchingUpdatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSeo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"repositoriesCount"}},{"kind":"Field","name":{"kind":"Name","value":"contributedRepoCount"}},{"kind":"Field","name":{"kind":"Name","value":"rankGlobal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cProvisional"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TierFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tier"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"minRank"}},{"kind":"Field","name":{"kind":"Name","value":"maxRank"}},{"kind":"Field","name":{"kind":"Name","value":"minValue"}}]}}]} as unknown as DocumentNode<PageProfileLanguagesQuery, PageProfileLanguagesQueryVariables>;
export const PageProfileOverviewDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PageProfileOverview"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"isGlobalContext"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},"defaultValue":{"kind":"BooleanValue","value":true}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"firstSeenAt"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserBaseFields"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFetchingStatus"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSeo"}},{"kind":"Field","name":{"kind":"Name","value":"starsNotCounted"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"stars"}},{"kind":"Field","name":{"kind":"Name","value":"repositories"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserTiersGlobal"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"include"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isGlobalContext"}}}]}]},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserTiersCountry"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"skip"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isGlobalContext"}}}]}]},{"kind":"Field","name":{"kind":"Name","value":"rankGlobal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"cM"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"fProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"fM"}},{"kind":"Field","name":{"kind":"Name","value":"snapshots"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rankCountry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"cM"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"fProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"fM"}},{"kind":"Field","name":{"kind":"Name","value":"snapshots"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sLangs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"4"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"sources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"stargazerCount"}},{"kind":"Field","name":{"kind":"Name","value":"percentage"}},{"kind":"Field","name":{"kind":"Name","value":"year"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"cLangs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"4"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"sources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"stargazerCount"}},{"kind":"Field","name":{"kind":"Name","value":"percentage"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"linesAdded"}},{"kind":"Field","name":{"kind":"Name","value":"linesRemoved"}},{"kind":"Field","name":{"kind":"Name","value":"prsCount"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"snapshots"}},{"kind":"Field","name":{"kind":"Name","value":"starsReview"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}},{"kind":"Field","name":{"kind":"Name","value":"repositories"}},{"kind":"Field","name":{"kind":"Name","value":"reportable"}}]}},{"kind":"Field","name":{"kind":"Name","value":"repositories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"5"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"contributions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"5"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContributionFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"timeline"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"5"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TierFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tier"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"minRank"}},{"kind":"Field","name":{"kind":"Name","value":"maxRank"}},{"kind":"Field","name":{"kind":"Name","value":"minValue"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryLanguageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"LanguageEntity"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"size"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repository"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"pushedAt"}},{"kind":"Field","name":{"kind":"Name","value":"releasesCount"}},{"kind":"Field","name":{"kind":"Name","value":"stargazerCount"}},{"kind":"Field","name":{"kind":"Name","value":"githubStars"}},{"kind":"Field","name":{"kind":"Name","value":"starsNotCounted"}},{"kind":"Field","name":{"kind":"Name","value":"isArchived"}},{"kind":"Field","name":{"kind":"Name","value":"forkCount"}},{"kind":"Field","name":{"kind":"Name","value":"languages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryLanguageFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rank"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"tier"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBaseFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"countryFlag"}},{"kind":"Field","name":{"kind":"Name","value":"company"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"followingCount"}},{"kind":"Field","name":{"kind":"Name","value":"githubCreatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"githubFetchedAt"}},{"kind":"Field","name":{"kind":"Name","value":"websiteUrl"}},{"kind":"Field","name":{"kind":"Name","value":"socialAccounts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"organizations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFetchingStatus"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fetchingStatus"}},{"kind":"Field","name":{"kind":"Name","value":"fetchingUpdatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSeo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"repositoriesCount"}},{"kind":"Field","name":{"kind":"Name","value":"contributedRepoCount"}},{"kind":"Field","name":{"kind":"Name","value":"rankGlobal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cProvisional"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserTiersGlobal"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tiersGlobal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sUsers"}},{"kind":"Field","name":{"kind":"Name","value":"cUsers"}},{"kind":"Field","name":{"kind":"Name","value":"fUsers"}},{"kind":"Field","name":{"kind":"Name","value":"sTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"cTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserTiersCountry"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tiersCountry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sUsers"}},{"kind":"Field","name":{"kind":"Name","value":"cUsers"}},{"kind":"Field","name":{"kind":"Name","value":"fUsers"}},{"kind":"Field","name":{"kind":"Name","value":"sTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"cTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContributionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Contribution"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"prsCount"}},{"kind":"Field","name":{"kind":"Name","value":"mergedPrsCount"}},{"kind":"Field","name":{"kind":"Name","value":"linesAdded"}},{"kind":"Field","name":{"kind":"Name","value":"linesRemoved"}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryFields"}}]}}]}}]} as unknown as DocumentNode<PageProfileOverviewQuery, PageProfileOverviewQueryVariables>;
export const PageProfileRanksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PageProfileRanks"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"isGlobalContext"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},"defaultValue":{"kind":"BooleanValue","value":true}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserBaseFields"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFetchingStatus"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSeo"}},{"kind":"Field","name":{"kind":"Name","value":"starsNotCounted"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"stars"}},{"kind":"Field","name":{"kind":"Name","value":"repositories"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserTiersGlobal"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"include"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isGlobalContext"}}}]}]},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserTiersCountry"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"skip"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isGlobalContext"}}}]}]},{"kind":"Field","name":{"kind":"Name","value":"rankGlobal"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"include"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isGlobalContext"}}}]}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"cM"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"fProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"fM"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rankCountry"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"skip"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isGlobalContext"}}}]}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"cM"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"fProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"fM"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TierFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tier"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"minRank"}},{"kind":"Field","name":{"kind":"Name","value":"maxRank"}},{"kind":"Field","name":{"kind":"Name","value":"minValue"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBaseFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"countryFlag"}},{"kind":"Field","name":{"kind":"Name","value":"company"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"followingCount"}},{"kind":"Field","name":{"kind":"Name","value":"githubCreatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"githubFetchedAt"}},{"kind":"Field","name":{"kind":"Name","value":"websiteUrl"}},{"kind":"Field","name":{"kind":"Name","value":"socialAccounts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"organizations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFetchingStatus"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fetchingStatus"}},{"kind":"Field","name":{"kind":"Name","value":"fetchingUpdatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSeo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"repositoriesCount"}},{"kind":"Field","name":{"kind":"Name","value":"contributedRepoCount"}},{"kind":"Field","name":{"kind":"Name","value":"rankGlobal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cProvisional"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserTiersGlobal"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tiersGlobal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sUsers"}},{"kind":"Field","name":{"kind":"Name","value":"cUsers"}},{"kind":"Field","name":{"kind":"Name","value":"fUsers"}},{"kind":"Field","name":{"kind":"Name","value":"sTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"cTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserTiersCountry"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tiersCountry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sUsers"}},{"kind":"Field","name":{"kind":"Name","value":"cUsers"}},{"kind":"Field","name":{"kind":"Name","value":"fUsers"}},{"kind":"Field","name":{"kind":"Name","value":"sTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"cTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}}]}}]}}]} as unknown as DocumentNode<PageProfileRanksQuery, PageProfileRanksQueryVariables>;
export const PageProfileRepositoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PageProfileRepositories"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserBaseFields"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFetchingStatus"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSeo"}},{"kind":"Field","name":{"kind":"Name","value":"repositoriesCount"}},{"kind":"Field","name":{"kind":"Name","value":"repositories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"10"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"contributions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"10"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContributionFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryLanguageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"LanguageEntity"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"size"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repository"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"pushedAt"}},{"kind":"Field","name":{"kind":"Name","value":"releasesCount"}},{"kind":"Field","name":{"kind":"Name","value":"stargazerCount"}},{"kind":"Field","name":{"kind":"Name","value":"githubStars"}},{"kind":"Field","name":{"kind":"Name","value":"starsNotCounted"}},{"kind":"Field","name":{"kind":"Name","value":"isArchived"}},{"kind":"Field","name":{"kind":"Name","value":"forkCount"}},{"kind":"Field","name":{"kind":"Name","value":"languages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryLanguageFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rank"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"tier"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBaseFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"countryFlag"}},{"kind":"Field","name":{"kind":"Name","value":"company"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"followingCount"}},{"kind":"Field","name":{"kind":"Name","value":"githubCreatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"githubFetchedAt"}},{"kind":"Field","name":{"kind":"Name","value":"websiteUrl"}},{"kind":"Field","name":{"kind":"Name","value":"socialAccounts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"organizations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFetchingStatus"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fetchingStatus"}},{"kind":"Field","name":{"kind":"Name","value":"fetchingUpdatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSeo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"repositoriesCount"}},{"kind":"Field","name":{"kind":"Name","value":"contributedRepoCount"}},{"kind":"Field","name":{"kind":"Name","value":"rankGlobal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cProvisional"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContributionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Contribution"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"prsCount"}},{"kind":"Field","name":{"kind":"Name","value":"mergedPrsCount"}},{"kind":"Field","name":{"kind":"Name","value":"linesAdded"}},{"kind":"Field","name":{"kind":"Name","value":"linesRemoved"}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryFields"}}]}}]}}]} as unknown as DocumentNode<PageProfileRepositoriesQuery, PageProfileRepositoriesQueryVariables>;
export const PageRepoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PageRepo"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"owner"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"owner"},"value":{"kind":"Variable","name":{"kind":"Name","value":"owner"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepoRowFields"}},{"kind":"Field","name":{"kind":"Name","value":"isArchived"}},{"kind":"Field","name":{"kind":"Name","value":"isInOrganization"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"renamedTo"}},{"kind":"Field","name":{"kind":"Name","value":"rank"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"l"}},{"kind":"Field","name":{"kind":"Name","value":"lM"}},{"kind":"Field","name":{"kind":"Name","value":"tier"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"minRank"}},{"kind":"Field","name":{"kind":"Name","value":"maxRank"}},{"kind":"Field","name":{"kind":"Name","value":"minValue"}}]}},{"kind":"Field","name":{"kind":"Name","value":"languageTier"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"burstMonths"}},{"kind":"Field","name":{"kind":"Name","value":"history"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"points"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}}]}},{"kind":"Field","name":{"kind":"Name","value":"current"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}}]}},{"kind":"Field","name":{"kind":"Name","value":"complete"}},{"kind":"Field","name":{"kind":"Name","value":"readAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pull"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"requestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"finishedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"siblings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"shared"}},{"kind":"Field","name":{"kind":"Name","value":"share"}},{"kind":"Field","name":{"kind":"Name","value":"repo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepoRowFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"builtBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"accounts"}},{"kind":"Field","name":{"kind":"Name","value":"counts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"top"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"starsBest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"counts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"top"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}}]}},{"kind":"Field","name":{"kind":"Name","value":"legendRatio"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepoRowFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repo"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"nameWithOwner"}},{"kind":"Field","name":{"kind":"Name","value":"ownerAvatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}},{"kind":"Field","name":{"kind":"Name","value":"starsCheck"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notCounted"}},{"kind":"Field","name":{"kind":"Name","value":"githubStars"}}]}},{"kind":"Field","name":{"kind":"Name","value":"gainedThisMonth"}}]}}]} as unknown as DocumentNode<PageRepoQuery, PageRepoQueryVariables>;
export const ProfileContributionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProfileContributions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contributions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContributionFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryLanguageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"LanguageEntity"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"size"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repository"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"pushedAt"}},{"kind":"Field","name":{"kind":"Name","value":"releasesCount"}},{"kind":"Field","name":{"kind":"Name","value":"stargazerCount"}},{"kind":"Field","name":{"kind":"Name","value":"githubStars"}},{"kind":"Field","name":{"kind":"Name","value":"starsNotCounted"}},{"kind":"Field","name":{"kind":"Name","value":"isArchived"}},{"kind":"Field","name":{"kind":"Name","value":"forkCount"}},{"kind":"Field","name":{"kind":"Name","value":"languages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryLanguageFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rank"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"tier"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContributionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Contribution"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"prsCount"}},{"kind":"Field","name":{"kind":"Name","value":"mergedPrsCount"}},{"kind":"Field","name":{"kind":"Name","value":"linesAdded"}},{"kind":"Field","name":{"kind":"Name","value":"linesRemoved"}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryFields"}}]}}]}}]} as unknown as DocumentNode<ProfileContributionsQuery, ProfileContributionsQueryVariables>;
export const ProfileFetchingStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProfileFetchingStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"fetchingStatus"}},{"kind":"Field","name":{"kind":"Name","value":"fetchingUpdatedAt"}}]}}]}}]} as unknown as DocumentNode<ProfileFetchingStatusQuery, ProfileFetchingStatusQueryVariables>;
export const ProfileIdByLoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProfileIdByLogin"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"globalRankByLogin"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"fProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"country"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"countryRankByLogin"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"fProvisional"}}]}}]}}]} as unknown as DocumentNode<ProfileIdByLoginQuery, ProfileIdByLoginQueryVariables>;
export const ProfileRepositoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProfileRepositories"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repositoriesCount"}},{"kind":"Field","name":{"kind":"Name","value":"repositories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryLanguageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"LanguageEntity"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"size"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repository"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"pushedAt"}},{"kind":"Field","name":{"kind":"Name","value":"releasesCount"}},{"kind":"Field","name":{"kind":"Name","value":"stargazerCount"}},{"kind":"Field","name":{"kind":"Name","value":"githubStars"}},{"kind":"Field","name":{"kind":"Name","value":"starsNotCounted"}},{"kind":"Field","name":{"kind":"Name","value":"isArchived"}},{"kind":"Field","name":{"kind":"Name","value":"forkCount"}},{"kind":"Field","name":{"kind":"Name","value":"languages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryLanguageFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rank"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"tier"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}}]}}]}}]}}]} as unknown as DocumentNode<ProfileRepositoriesQuery, ProfileRepositoriesQueryVariables>;
export const ProfilesForSitemapDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProfilesForSitemap"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"profilesForSitemap"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}}]}}]}}]} as unknown as DocumentNode<ProfilesForSitemapQuery, ProfilesForSitemapQueryVariables>;
export const RepoLanguagesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RepoLanguages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repoLanguages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"repos"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}},{"kind":"Field","name":{"kind":"Name","value":"topRepo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepoRowFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepoRowFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repo"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"nameWithOwner"}},{"kind":"Field","name":{"kind":"Name","value":"ownerAvatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}},{"kind":"Field","name":{"kind":"Name","value":"starsCheck"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notCounted"}},{"kind":"Field","name":{"kind":"Name","value":"githubStars"}}]}},{"kind":"Field","name":{"kind":"Name","value":"gainedThisMonth"}}]}}]} as unknown as DocumentNode<RepoLanguagesQuery, RepoLanguagesQueryVariables>;
export const RepoPulseContributorsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RepoPulseContributors"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"owner"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"period"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulsePeriod"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sortBy"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseContributorSort"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"label"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"owner"},"value":{"kind":"Variable","name":{"kind":"Name","value":"owner"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pulseContributors"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"period"},"value":{"kind":"Variable","name":{"kind":"Name","value":"period"}}},{"kind":"Argument","name":{"kind":"Name","value":"sortBy"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sortBy"}}},{"kind":"Argument","name":{"kind":"Name","value":"label"},"value":{"kind":"Variable","name":{"kind":"Name","value":"label"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseContributorPageFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseContributorFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseContributor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"hasProfile"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"linesAdded"}},{"kind":"Field","name":{"kind":"Name","value":"linesDeleted"}},{"kind":"Field","name":{"kind":"Name","value":"commits"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequests"}},{"kind":"Field","name":{"kind":"Name","value":"activeMonths"}},{"kind":"Field","name":{"kind":"Name","value":"topLabels"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseContributorPageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseContributorPage"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"unlinkedAuthors"}},{"kind":"Field","name":{"kind":"Name","value":"labels"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseContributorFields"}}]}}]}}]} as unknown as DocumentNode<RepoPulseContributorsQuery, RepoPulseContributorsQueryVariables>;
export const RepoPulseFactsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RepoPulseFacts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"owner"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"owner"},"value":{"kind":"Variable","name":{"kind":"Name","value":"owner"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pulse"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lastMonth"}},{"kind":"Field","name":{"kind":"Name","value":"snapshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseLabelLinesFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"last12"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseTotalsFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"topContributors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseContributorFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"unlinkedAuthors12"}},{"kind":"Field","name":{"kind":"Name","value":"countries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseCountryFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"scopeNote"}},{"kind":"Field","name":{"kind":"Name","value":"computedAt"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseLabelLinesFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseLabelLines"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"lines"}},{"kind":"Field","name":{"kind":"Name","value":"share"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseTotalsFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseTotals"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"added"}},{"kind":"Field","name":{"kind":"Name","value":"deleted"}},{"kind":"Field","name":{"kind":"Name","value":"net"}},{"kind":"Field","name":{"kind":"Name","value":"commits"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequests"}},{"kind":"Field","name":{"kind":"Name","value":"activeContributors"}},{"kind":"Field","name":{"kind":"Name","value":"newContributors"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseContributorFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseContributor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"hasProfile"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"linesAdded"}},{"kind":"Field","name":{"kind":"Name","value":"linesDeleted"}},{"kind":"Field","name":{"kind":"Name","value":"commits"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequests"}},{"kind":"Field","name":{"kind":"Name","value":"activeMonths"}},{"kind":"Field","name":{"kind":"Name","value":"topLabels"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseCountryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseCountry"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"group"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"flag"}},{"kind":"Field","name":{"kind":"Name","value":"contributors"}}]}}]} as unknown as DocumentNode<RepoPulseFactsQuery, RepoPulseFactsQueryVariables>;
export const RepoPulseSeriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RepoPulseSeries"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"owner"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"groupBy"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OrgActivityGroupBy"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"owner"},"value":{"kind":"Variable","name":{"kind":"Name","value":"owner"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pulseSeries"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"groupBy"},"value":{"kind":"Variable","name":{"kind":"Name","value":"groupBy"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseSeriesFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseSeriesFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseSeries"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"months"}},{"kind":"Field","name":{"kind":"Name","value":"labels"}},{"kind":"Field","name":{"kind":"Name","value":"snapshot"}},{"kind":"Field","name":{"kind":"Name","value":"added"}},{"kind":"Field","name":{"kind":"Name","value":"deleted"}},{"kind":"Field","name":{"kind":"Name","value":"largestChange"}},{"kind":"Field","name":{"kind":"Name","value":"largestChangeShare"}},{"kind":"Field","name":{"kind":"Name","value":"crossLines"}},{"kind":"Field","name":{"kind":"Name","value":"commits"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequests"}},{"kind":"Field","name":{"kind":"Name","value":"activeLinked"}},{"kind":"Field","name":{"kind":"Name","value":"activeAnonymous"}},{"kind":"Field","name":{"kind":"Name","value":"newContributors"}}]}}]} as unknown as DocumentNode<RepoPulseSeriesQuery, RepoPulseSeriesQueryVariables>;
export const RepoRankTiersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RepoRankTiers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"language"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"noLanguage"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repoRankTiers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"language"},"value":{"kind":"Variable","name":{"kind":"Name","value":"language"}}},{"kind":"Argument","name":{"kind":"Name","value":"noLanguage"},"value":{"kind":"Variable","name":{"kind":"Name","value":"noLanguage"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repos"}},{"kind":"Field","name":{"kind":"Name","value":"tiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"minRank"}},{"kind":"Field","name":{"kind":"Name","value":"maxRank"}},{"kind":"Field","name":{"kind":"Name","value":"minValue"}}]}}]}}]}}]} as unknown as DocumentNode<RepoRankTiersQuery, RepoRankTiersQueryVariables>;
export const RepoRankingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RepoRankings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"language"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"noLanguage"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repoRankings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"language"},"value":{"kind":"Variable","name":{"kind":"Name","value":"language"}}},{"kind":"Argument","name":{"kind":"Name","value":"noLanguage"},"value":{"kind":"Variable","name":{"kind":"Name","value":"noLanguage"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"l"}},{"kind":"Field","name":{"kind":"Name","value":"lM"}},{"kind":"Field","name":{"kind":"Name","value":"tier"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}}]}},{"kind":"Field","name":{"kind":"Name","value":"languageTier"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}}]}},{"kind":"Field","name":{"kind":"Name","value":"repo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepoRowFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepoRowFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repo"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"nameWithOwner"}},{"kind":"Field","name":{"kind":"Name","value":"ownerAvatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}},{"kind":"Field","name":{"kind":"Name","value":"starsCheck"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notCounted"}},{"kind":"Field","name":{"kind":"Name","value":"githubStars"}}]}},{"kind":"Field","name":{"kind":"Name","value":"gainedThisMonth"}}]}}]} as unknown as DocumentNode<RepoRankingsQuery, RepoRankingsQueryVariables>;
export const RepoSitemapPartsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RepoSitemapParts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repoSitemapParts"}}]}}]} as unknown as DocumentNode<RepoSitemapPartsQuery, RepoSitemapPartsQueryVariables>;
export const ReposForSitemapDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ReposForSitemap"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"part"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reposForSitemap"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"part"},"value":{"kind":"Variable","name":{"kind":"Name","value":"part"}}}]}]}}]} as unknown as DocumentNode<ReposForSitemapQuery, ReposForSitemapQueryVariables>;
export const StarHistoryRepoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StarHistoryRepo"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"owner"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"owner"},"value":{"kind":"Variable","name":{"kind":"Name","value":"owner"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nameWithOwner"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}},{"kind":"Field","name":{"kind":"Name","value":"gainedThisMonth"}},{"kind":"Field","name":{"kind":"Name","value":"history"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"points"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}}]}},{"kind":"Field","name":{"kind":"Name","value":"current"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}}]}}]}}]}}]}}]} as unknown as DocumentNode<StarHistoryRepoQuery, StarHistoryRepoQueryVariables>;
export const TopLanguagesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TopLanguages"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}},"defaultValue":{"kind":"IntValue","value":"10"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"languageSummary"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"language"}}]}}]}}]} as unknown as DocumentNode<TopLanguagesQuery, TopLanguagesQueryVariables>;