import { parse } from 'graphql';

import type {
  ContributeActivity,
  ContributeAttempt,
  ContributeAttemptDetail,
  ContributeAttemptFollowUpFields,
  ContributeAttemptLive,
  ContributeAttemptState,
  ContributeAttemptSubmit,
  ContributeAutopilot,
  ContributeAutopilotReviewReason,
  ContributeChanges,
  ContributeCheckLimitView,
  ContributeCheckStatusView,
  ContributeComingSoonProvider,
  ContributeConnectKeyResult,
  ContributeConnectLimits,
  ContributeContribution,
  ContributeContributions,
  ContributeDeleteDataResult,
  ContributeFeedbackContext,
  ContributeFeedbackTopic,
  ContributeFollowUpRound,
  ContributeFollowUps,
  ContributeGoNoGo,
  ContributeGrant,
  ContributeHelpedLike,
  ContributeIssue,
  ContributeIssuePage,
  ContributeIssueStatus,
  ContributeIssuesFilter,
  ContributeLimits,
  ContributeMaintainerFacts,
  ContributeMaintainerRepoConfig,
  ContributeMaintainerRepos,
  ContributeMcpToken,
  ContributeMcpTokenCreated,
  ContributeNeedsYou,
  ContributeOnboardedVia,
  ContributeOptOutResult,
  ContributeOwnAgentFields,
  ContributePaths,
  ContributePrAction,
  ContributePrCardView,
  ContributePreferences,
  ContributePreferencesInput,
  ContributePrFeedbackResult,
  ContributePrNote,
  ContributePrNotes,
  ContributeProof,
  ContributeProofBrief,
  ContributeProofSession,
  ContributePrSignalKind,
  ContributePrUndoResult,
  ContributeReplyDraft,
  ContributeReplyDraftFlow,
  ContributeReplyUserDismissReason,
  ContributeReplyWaiting,
  ContributeRepoRules,
  ContributeReportReason,
  ContributeRetry,
  ContributeReviewFeedback,
  ContributeScheduleCounts,
  ContributeSet,
  ContributeSetAddResult,
  ContributeSetFallback,
  ContributeSetList,
  ContributeSetListMode,
  ContributeSetMode,
  ContributeSettings,
  ContributeSettingsInput,
  Contributor,
} from './contribute.types';
import type { ContributeConventionsFields, ContributePrFixKind } from './pr-conventions';
import type DocumentNode from '@/types/typed-document-node';

/**
 * Contribute's operations, written out here rather than in `.gql` files: some of the fields they read are newer than
 * the generated schema, and the pages ask for those in their own operations, so one that is not answered yet leaves
 * the rest working.
 */
const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

const CREDENTIAL = 'provider last4 orgId workspaceId state blockedUntil ready checkedAt lastError';
const SETTINGS = `cycleCapUsd weekCapUsd dayCapUsd attemptCapUsd attemptsAtATime pace sweepDays renewalDay mainModel
  helperModel testModel effort maxChangedLines maxFiles openPrsAtATime dco autopilot`;
const PREFERENCES = 'languages topicIds kinds maxSize';
const ISSUE = 'issueId repositoryId nameWithOwner number url title labels language kind size score rank why';
const PULL_REQUEST = 'prId number url state openedAt mergedAt closedAt reviewDecision checks syncedAt';
const ATTEMPT = `attemptId issueId repositoryId nameWithOwner number title url kind state model budgetUsd costUsd
  endReason endDetail checksPassed approvedAt createdAt updatedAt
  submit { step waitUntil fork branch lastError { reason note at } }
  pullRequest { ${PULL_REQUEST} }`;

// Follow-ups, reply drafts and autopilot: read in operations of their own, so an API without them leaves the rest.
const NEEDS_YOU = 'needsYou { since signals { kind at detail } }';
const FOLLOW_UPS = 'followUps { used autopilotRuns autopilotMax manualRuns recommended currentAttemptId }';
const FOLLOW_UP_FIELDS = `attemptId ${NEEDS_YOU} ${FOLLOW_UPS} followUpOf { attemptId prId number url trigger reason } autosubmitAt autopilot`;
const REPLY_DRAFT = `draftId prId attemptId comment { commentId author path line excerpt } text prefix state posted
  postedAt url commentUrl body lastError { reason note at } canPostAsComment asComment dismissedReason dismissedAt
  createdAt updatedAt`;

type FollowUpFieldsOf<T> = T & { attemptId: string };

// The user's own agent: read in operations of their own too, so an API without them leaves the rest.
const MCP_TOKEN = 'id name last4 createdAt lastUsedAt';
const OWN_AGENT_FIELDS =
  'attemptId runner agent { name model } changesRequested { note at } leaseUntil sendBacksLeft openedBy';
type OwnAgentRow = Partial<ContributeOwnAgentFields> & { attemptId: string };

export const ContributeOwnAgentDocument = doc<{
  contribute: { contributor: { paths: ContributePaths } | null; mcpTokens: ContributeMcpToken[] } | null;
}>(`query ContributeOwnAgent { contribute { contributor { paths { hosted mcp } } mcpTokens { ${MCP_TOKEN} } } }`);

export const CreateMcpTokenDocument = doc<{ createMcpToken: ContributeMcpTokenCreated }, { name: string }>(
  `mutation CreateMcpToken($name: String!) { createMcpToken(name: $name) { token mcpToken { ${MCP_TOKEN} } } }`,
);

export const RevokeMcpTokenDocument = doc<{ revokeMcpToken: boolean }, { id: string }>(
  'mutation RevokeMcpToken($id: ID!) { revokeMcpToken(id: $id) }',
);

export const SendBackToAgentDocument = doc<
  { sendBackToAgent: Pick<ContributeAttempt, 'attemptId' | 'state'> },
  { attemptId: string; note: string }
>(
  `mutation SendBackToAgent($attemptId: ID!, $note: String!) { sendBackToAgent(attemptId: $attemptId, note: $note) { attemptId state } }`,
);

export const ContributeAttemptsOwnAgentDocument = doc<
  { contributeAttempts: OwnAgentRow[] | null },
  { state?: ContributeAttemptState; first?: number }
>(`query ContributeAttemptsOwnAgent($state: ContributeAttemptState, $first: Int) {
  contributeAttempts(state: $state, first: $first) { ${OWN_AGENT_FIELDS} }
}`);

export const ContributeAttemptOwnAgentDocument = doc<
  { contributeAttempt: (OwnAgentRow & { result: { prTitle: string | null } | null }) | null },
  { id: string }
>(`query ContributeAttemptOwnAgent($id: ID!) {
  contributeAttempt(id: $id) { ${OWN_AGENT_FIELDS} result { prTitle } }
}`);

export const ContributeContributionsOwnAgentDocument = doc<
  {
    contributeContributions: {
      items: Pick<OwnAgentRow, 'attemptId' | 'runner' | 'agent' | 'openedBy'>[];
    } | null;
  },
  { first?: number }
>(`query ContributeContributionsOwnAgent($first: Int) {
  contributeContributions(first: $first) { items { attemptId runner agent { name model } openedBy } }
}`);

/** Contribute is launched (`CONTRIBUTE_PREVIEW=true` on the API): open to everyone, signed-out visitors included. */
export const ContributeOpenDocument = doc<{ contributeOpen: boolean }>('query ContributeOpen { contributeOpen }');

export const ContributePreviewDocument = doc<{ contribute: { previewAllowed: boolean } | null }>(
  'query ContributePreview { contribute { previewAllowed } }',
);

export const ContributeOverviewDocument = doc<{
  contribute: { previewAllowed: boolean; contributor: Contributor | null } | null;
}>(`query ContributeOverview {
  contribute {
    previewAllowed
    contributor {
      status login plan step
      credentials { ${CREDENTIAL} }
      settings { ${SETTINGS} }
      preferences { ${PREFERENCES} }
      spend { todayUsd weekUsd cycleUsd cycleStart cycleEnd allowanceUsd nextAttemptAt }
      autopilot { unlocked mergedCount closedUnmergedStreak }
    }
  }
}`);

/** The autopilot record's newer fields, merged into the overview's. */
export const ContributeAutopilotDocument = doc<{
  contribute: {
    contributor: { autopilot: Pick<ContributeAutopilot, 'mergedToUnlock' | 'lockedAt' | 'available'> } | null;
  } | null;
}>('query ContributeAutopilot { contribute { contributor { autopilot { mergedToUnlock lockedAt available } } } }');

/** Where autopilot's emails go: read on its own, so an API without it leaves the rest. */
export const ContributeAutopilotNoticeDocument = doc<{
  contribute: { contributor: { autopilot: Pick<ContributeAutopilot, 'noticeTo'> } | null } | null;
}>('query ContributeAutopilotNotice { contribute { contributor { autopilot { noticeTo } } } }');

/** Why autopilot left an attempt for the review: read on its own, so an API without it leaves the rest. */
export const ContributeAttemptReviewReasonDocument = doc<
  {
    contributeAttempt: { attemptId: string; reviewReason: ContributeAutopilotReviewReason | null } | null;
  },
  { id: string }
>('query ContributeAttemptReviewReason($id: ID!) { contributeAttempt(id: $id) { attemptId reviewReason } }');

/** A hold's source and the issue's first-timers label (autopilot limits): read on their own, like the reason. */
export const ContributeAttemptHoldDocument = doc<
  {
    contributeAttempt: { attemptId: string; reviewReasonSource: string | null; newcomersLabel: string | null } | null;
  },
  { id: string }
>(
  'query ContributeAttemptHold($id: ID!) { contributeAttempt(id: $id) { attemptId reviewReasonSource newcomersLabel } }',
);

/** Whether the user is onboarded: read on its own, so an API without it leaves the rest. */
export const ContributeOnboardingDocument = doc<{
  contribute: {
    contributor: { onboardedAt: string | null; onboardedVia: ContributeOnboardedVia | null } | null;
  } | null;
}>('query ContributeOnboarding { contribute { contributor { onboardedAt onboardedVia } } }');

/** Whether attempts are open: read on its own, so a failed read of it never touches the onboarding. */
export const ContributeAttemptsOpenDocument = doc<{ contribute: { attemptsOpen: boolean | null } | null }>(
  'query ContributeAttemptsOpen { contribute { attemptsOpen } }',
);

export const ContributeGrantDocument = doc<{ contribute: { grant: ContributeGrant } | null }>(
  'query ContributeGrant { contribute { grant { connected login } } }',
);

export const ContributePausedDocument = doc<{ contribute: { contributor: { paused: boolean } | null } | null }>(
  'query ContributePaused { contribute { contributor { paused } } }',
);

/** The account's access level and the limits it sets now: read on its own, so an API without it leaves the rest. */
export const ContributeLimitsDocument = doc<{
  contribute: { contributor: { limits: ContributeLimits } | null } | null;
}>(
  'query ContributeLimits { contribute { contributor { limits { level reason attemptsAtATime openPrsAtATime claimsPerDay revealsPerDay } } } }',
);

export const ContributeIssuesDocument = doc<
  { contributeIssues: ContributeIssuePage | null },
  { first?: number; after?: string; filter?: ContributeIssuesFilter }
>(`query ContributeIssues($first: Int, $after: String, $filter: ContributeIssuesFilter) {
  contributeIssues(first: $first, after: $after, filter: $filter) {
    items { ${ISSUE} tier forNewcomers }
    next total computedAt dailyCap { limit reached }
  }
}`);

// A repo's rules for AI contributions: read with the feed, the attempt and "Your repos", each surface its own fields.
const RULE_SOURCE = 'source { label url }';
const ISSUE_RULES = `repoRules { manualOnly lines { kind text ${RULE_SOURCE} } }`;
const ATTEMPT_RULES = `repoRules {
  manualOnly lines { kind text quote ${RULE_SOURCE} } caps { lines files linesSource filesSource }
}`;
const MAINTAINER_CONFIG = 'config { key value source setBy ignoredRaw fileReadAt }';
const MAINTAINER_RULES = `rules { manualOnly lines { kind text quote setBy ${RULE_SOURCE} } }`;

/** The feed with each issue's repo rules: an API without them answers `ContributeIssuesDocument` instead. */
export const ContributeIssuesWithRulesDocument = doc<
  { contributeIssues: ContributeIssuePage | null },
  { first?: number; after?: string; filter?: ContributeIssuesFilter }
>(`query ContributeIssuesWithRules($first: Int, $after: String, $filter: ContributeIssuesFilter) {
  contributeIssues(first: $first, after: $after, filter: $filter) {
    items { ${ISSUE} tier forNewcomers ${ISSUE_RULES} }
    next total computedAt dailyCap { limit reached }
  }
}`);

/** The attempt's repo rules and the limits it runs under: read on its own, so an API without them leaves the rest. */
export const ContributeAttemptRepoRulesDocument = doc<
  { contributeAttempt: { attemptId: string; repoRules: ContributeRepoRules | null } | null },
  { id: string }
>(`query ContributeAttemptRepoRules($id: ID!) { contributeAttempt(id: $id) { attemptId ${ATTEMPT_RULES} } }`);

/** The shown issues as they are now, in the order asked (1 to 50 ids); null when the API hides it from the user. */
export const ContributeIssueStatusDocument = doc<
  { contributeIssueStatus: ContributeIssueStatus[] | null },
  { issueIds: string[] }
>(`query ContributeIssueStatus($issueIds: [ID!]!) {
  contributeIssueStatus(issueIds: $issueIds) { issueId status attemptId }
}`);

export const ConnectClaudeKeyDocument = doc<
  { connectClaudeKey: ContributeConnectKeyResult },
  { key: string; plan: string; renewalDay: number; confirmedLimit: boolean; cycleCapUsd?: number }
>(`mutation ConnectClaudeKey($key: String!, $plan: ContributeClaudePlan!, $renewalDay: Int!, $confirmedLimit: Boolean!, $cycleCapUsd: Float) {
  connectClaudeKey(key: $key, plan: $plan, renewalDay: $renewalDay, confirmedLimit: $confirmedLimit, cycleCapUsd: $cycleCapUsd) {
    result retryAfterSec credential { ${CREDENTIAL} }
  }
}`);

/**
 * The connect with the limits the user set themselves: an operation of its own, so an API that does not take them yet
 * leaves the connect from a plan working.
 */
export const ConnectClaudeKeyWithLimitsDocument = doc<
  { connectClaudeKey: ContributeConnectKeyResult },
  {
    key: string;
    plan: string;
    renewalDay: number;
    confirmedLimit: boolean;
    cycleCapUsd?: number;
    limits: ContributeConnectLimits;
  }
>(`mutation ConnectClaudeKeyWithLimits($key: String!, $plan: ContributeClaudePlan!, $renewalDay: Int!, $confirmedLimit: Boolean!, $cycleCapUsd: Float, $limits: ContributeConnectLimitsInput!) {
  connectClaudeKey(key: $key, plan: $plan, renewalDay: $renewalDay, confirmedLimit: $confirmedLimit, cycleCapUsd: $cycleCapUsd, limits: $limits) {
    result retryAfterSec credential { ${CREDENTIAL} }
  }
}`);

/** When the user's picks were last computed: what the matching moment after a connect waits for. */
export const ContributeFeedComputedDocument = doc<{ contributeIssues: { computedAt: string | null } | null }>(
  'query ContributeFeedComputed { contributeIssues(first: 1) { computedAt } }',
);

/** The languages of the user's profile, strongest first: the matching moment shows them. */
export const ContributeProfileLanguagesDocument = doc<
  { user: { sLangs: { name: string }[] | null } | null },
  { login: string; limit: number }
>(
  'query ContributeProfileLanguages($login: String!, $limit: Int) { user(login: $login) { sLangs(limit: $limit) { name } } }',
);

export const RemoveLlmKeyDocument = doc<{ removeLlmKey: boolean }>(
  'mutation RemoveLlmKey { removeLlmKey(provider: ANTHROPIC) }',
);

export const SetContributeSettingsDocument = doc<
  { setContributeSettings: ContributeSettings },
  { settings: ContributeSettingsInput }
>(`mutation SetContributeSettings($settings: ContributeSettingsInput!) {
  setContributeSettings(settings: $settings) { ${SETTINGS} }
}`);

export const SetPreferencesDocument = doc<
  { setPreferences: ContributePreferences },
  { preferences: ContributePreferencesInput }
>(`mutation SetPreferences($preferences: ContributePreferencesInput!) {
  setPreferences(preferences: $preferences) { ${PREFERENCES} }
}`);

export const NoteProviderInterestDocument = doc<{ noteProviderInterest: boolean }, { provider: string }>(
  'mutation NoteProviderInterest($provider: ContributeComingSoonProvider!) { noteProviderInterest(provider: $provider) }',
);

export const WithdrawProviderInterestDocument = doc<{ withdrawProviderInterest: boolean }, { provider: string }>(
  'mutation WithdrawProviderInterest($provider: ContributeComingSoonProvider!) { withdrawProviderInterest(provider: $provider) }',
);

/** The coming-soon providers the user asked to be told about, read on its own so an API without it leaves none. */
export const ContributeProviderInterestsDocument = doc<{
  contribute: { providerInterests: ContributeComingSoonProvider[] | null } | null;
}>('query ContributeProviderInterests { contribute { providerInterests } }');

export const DeleteContributeDataDocument = doc<{ deleteContributeData: ContributeDeleteDataResult }>(
  'mutation DeleteContributeData { deleteContributeData { deleted grantRevoked } }',
);

export const RevokeGithubGrantDocument = doc<{ revokeGithubGrant: boolean }>(
  'mutation RevokeGithubGrant { revokeGithubGrant }',
);

export const PauseContributingDocument = doc<{ pauseContributing: boolean }>(
  'mutation PauseContributing { pauseContributing }',
);

export const ResumeContributingDocument = doc<{ resumeContributing: boolean }>(
  'mutation ResumeContributing { resumeContributing }',
);

export const SkipIssueDocument = doc<{ skipIssue: boolean }, { issueId: string }>(
  'mutation SkipIssue($issueId: ID!) { skipIssue(issueId: $issueId) }',
);

export const ContributeAttemptsDocument = doc<
  { contributeAttempts: ContributeAttempt[] | null },
  { state?: ContributeAttemptState; first?: number }
>(`query ContributeAttempts($state: ContributeAttemptState, $first: Int) {
  contributeAttempts(state: $state, first: $first) { ${ATTEMPT} }
}`);

export const ContributeAttemptDocument = doc<{ contributeAttempt: ContributeAttemptDetail | null }, { id: string }>(
  `query ContributeAttempt($id: ID!) {
  contributeAttempt(id: $id) {
    ${ATTEMPT}
    patch
    result { verdict summary tests { command passed output } filesChanged risk riskNotes prBody }
    readiness { install build test toolchain notes }
    checks { name passed detail }
    cost { totalUsd goNoGoUsd workUsd runtimeUsd }
    approval { title body dco at }
    events { state detail at }
  }
}`,
);

// The submission's step clock: read in operations of its own, so an API without it leaves the stepper without durations.
const SUBMIT = 'step waitUntil fork branch lastError { reason note at }';
const SUBMIT_CLOCK = 'steps { step startedAt doneAt } stepStartedAt forkPending retryAt';

export const ContributeAttemptSubmitClockDocument = doc<
  { contributeAttempt: { attemptId: string; submit: ContributeAttemptSubmit | null } | null },
  { id: string }
>(`query ContributeAttemptSubmitClock($id: ID!) {
  contributeAttempt(id: $id) { attemptId submit { ${SUBMIT} ${SUBMIT_CLOCK} } }
}`);

// The repo's PR conventions and the open PR's fixes: read on their own, so an API without them leaves the page as it was.
const CONVENTIONS = `title { hard source types scopes requireScope pattern } titleExamples template { path aiAsks }
  changelog { kind path required source } cla { check signUrl agreement signComment } dco generated notes titlePrefix templateByHuman agentMarker`;
const PR_FIXES =
  'prIssues { kind check message suggestion why steps fields { label value note tick } source { label url } } prTitle prBody prFix { kind state note at }';

export const ContributeAttemptConventionsDocument = doc<
  {
    contributeAttempt:
      | (Required<ContributeConventionsFields> & { attemptId: string; result: { prTitle: string | null } | null })
      | null;
  },
  { id: string }
>(`query ContributeAttemptConventions($id: ID!) {
  contributeAttempt(id: $id) { attemptId conventions { ${CONVENTIONS} } ${PR_FIXES} result { prTitle } }
}`);

export const FixContributePullRequestDocument = doc<
  { fixContributePullRequest: Required<ContributeConventionsFields> & { attemptId: string } },
  { attemptId: string; kind: ContributePrFixKind; title?: string | null; body?: string | null }
>(`mutation FixContributePullRequest($attemptId: ID!, $kind: ContributePrFixKind!, $title: String, $body: String) {
  fixContributePullRequest(attemptId: $attemptId, kind: $kind, title: $title, body: $body) {
    attemptId conventions { ${CONVENTIONS} } ${PR_FIXES}
  }
}`);

/** Whether the repo requires a DCO sign-off: read on its own, so an API without it leaves the review as it was. */
export const ContributeAttemptDcoDocument = doc<
  { contributeAttempt: { attemptId: string; dcoRequired: boolean } | null },
  { id: string }
>(`query ContributeAttemptDco($id: ID!) {
  contributeAttempt(id: $id) { attemptId dcoRequired }
}`);

/** The PR's footer as the API writes it, and whether the commits carry the gitranks co-author: read on its own, too. */
export const ContributeAttemptDisclosureDocument = doc<
  { contributeAttempt: { attemptId: string; prFooter: string; prCoAuthored: boolean | null } | null },
  { id: string }
>(`query ContributeAttemptDisclosure($id: ID!) {
  contributeAttempt(id: $id) { attemptId prFooter prCoAuthored }
}`);

/** A no-go at the check's limit: read on its own, as the field above. */
export const ContributeAttemptCheckStopDocument = doc<
  { contributeAttempt: { attemptId: string; checkLimit: ContributeCheckLimitView | null } | null },
  { id: string }
>(`query ContributeAttemptCheckStop($id: ID!) {
  contributeAttempt(id: $id) { attemptId checkLimit { limit decided } }
}`);

/**
 * Whether the stop can be tried again, and how (a bigger check budget, or work on it anyway), with the no-go's release
 * for the taken warning: read on its own, as the fields above.
 */
export const ContributeAttemptRetryDocument = doc<
  {
    contributeAttempt: {
      attemptId: string;
      retry: ContributeRetry | null;
      goNoGo: Pick<ContributeGoNoGo, 'release'> | null;
    } | null;
  },
  { id: string }
>(`query ContributeAttemptRetry($id: ID!) {
  contributeAttempt(id: $id) { attemptId retry { kind takenBy } goNoGo { release } }
}`);

/** The agent's decisions on the run: its go/no-go and its brief. Read on their own, as the fields above. */
export const ContributeAttemptDecisionsDocument = doc<
  {
    contributeAttempt: {
      attemptId: string;
      goNoGo: ContributeGoNoGo | null;
      brief: string | null;
    } | null;
  },
  { id: string }
>(`query ContributeAttemptDecisions($id: ID!) {
  contributeAttempt(id: $id) { attemptId goNoGo { verdict reason decidedAtLimit at } brief }
}`);

/** What the stepper reads again while the attempt submits: its state, the submission with its clock, the PR. */
export const ContributeAttemptLiveDocument = doc<{ contributeAttempt: ContributeAttemptLive | null }, { id: string }>(
  `query ContributeAttemptLive($id: ID!) {
  contributeAttempt(id: $id) {
    attemptId state updatedAt submit { ${SUBMIT} ${SUBMIT_CLOCK} } pullRequest { ${PULL_REQUEST} }
  }
}`,
);

/** The same, without the clock: for an API that does not answer it yet. */
export const ContributeAttemptLiveBareDocument = doc<
  { contributeAttempt: ContributeAttemptLive | null },
  { id: string }
>(`query ContributeAttemptLiveBare($id: ID!) {
  contributeAttempt(id: $id) { attemptId state updatedAt submit { ${SUBMIT} } pullRequest { ${PULL_REQUEST} } }
}`);

export const ContributeAttemptsFollowUpsDocument = doc<
  { contributeAttempts: FollowUpFieldsOf<ContributeAttemptFollowUpFields>[] | null },
  { state?: ContributeAttemptState; first?: number }
>(`query ContributeAttemptsFollowUps($state: ContributeAttemptState, $first: Int) {
  contributeAttempts(state: $state, first: $first) { ${FOLLOW_UP_FIELDS} }
}`);

export const ContributeAttemptFollowUpsDocument = doc<
  {
    contributeAttempt: FollowUpFieldsOf<
      ContributeAttemptFollowUpFields & { replyDrafts: ContributeReplyDraft[] }
    > | null;
  },
  { id: string }
>(`query ContributeAttemptFollowUps($id: ID!) {
  contributeAttempt(id: $id) { ${FOLLOW_UP_FIELDS} replyDrafts { ${REPLY_DRAFT} } }
}`);

// The follow-up flow (2026-10-31): what each thread came to, the checks in a word, the threads waiting, the rounds.
const ROUND =
  'round attemptId by trigger reason costUsd state endReason pushedSha fixed skipped needsYou replied resolved at';
const FEEDBACK_THREAD = 'threadId commentId author bot path line excerpt url createdAt ignored';

export type FollowUpFlowRead = {
  attemptId: string;
  checkStatus: ContributeCheckStatusView | null;
  reviewFeedback: ContributeReviewFeedback | null;
  round: ContributeFollowUpRound | null;
  followUps: { history: ContributeFollowUpRound[] | null } | null;
  result: { tests: { command: string; notRun: boolean | null }[] } | null;
  replyDrafts: (ContributeReplyDraftFlow & { draftId: string })[];
};

export const ContributeAttemptFollowUpFlowDocument = doc<
  { contributeAttempt: FollowUpFlowRead | null },
  { id: string }
>(
  `query ContributeAttemptFollowUpFlow($id: ID!) {
  contributeAttempt(id: $id) {
    attemptId
    checkStatus { status note }
    reviewFeedback { threads { ${FEEDBACK_THREAD} } readAt }
    round { ${ROUND} }
    followUps { history { ${ROUND} } }
    result { tests { command notRun } }
    replyDrafts { draftId outcome reason bot prefix send resolve resolveState }
  }
}`,
);

/** A follow-up on the threads the user chose to address; the pull request's other waiting threads are ignored. */
export const StartFollowUpOnDocument = doc<
  { startFollowUp: ContributeAttempt },
  { prId: string; commentIds: string[]; reason?: string | null }
>(
  `mutation StartFollowUpOn($prId: ID!, $commentIds: [ID!], $reason: String) {
  startFollowUp(prId: $prId, commentIds: $commentIds, reason: $reason) { ${ATTEMPT} }
}`,
);

/** A follow-up's approval with its replies as edited: the commits are pushed, then the replies sent are posted. */
export const ApproveFollowUpDocument = doc<
  { approveAttempt: ContributeAttempt },
  { id: string; title: string; replies: { draftId: string; text: string; send: boolean }[] }
>(`mutation ApproveFollowUp($id: ID!, $title: String!, $replies: [ContributeReplyInput!]) {
  approveAttempt(id: $id, title: $title, body: "", dco: false, replies: $replies) { ${ATTEMPT} }
}`);

/** Whether a follow-up's replies resolve people's threads too (off: only bots'), read and written on its own. */
export const ContributeResolveHumansDocument = doc<{
  contribute: { contributor: { settings: { resolveHumanThreads: boolean } | null } | null } | null;
}>('query ContributeResolveHumans { contribute { contributor { settings { resolveHumanThreads } } } }');

export const SetResolveHumansDocument = doc<
  { setContributeSettings: { resolveHumanThreads: boolean } },
  { on: boolean }
>(`mutation SetResolveHumans($on: Boolean!) {
  setContributeSettings(settings: { resolveHumanThreads: $on }) { resolveHumanThreads }
}`);

export const ContributeContributionsDocument = doc<
  { contributeContributions: ContributeContributions | null },
  { first?: number }
>(`query ContributeContributions($first: Int) {
  contributeContributions(first: $first) {
    items { attemptId issueId repositoryId nameWithOwner issueNumber title costUsd pullRequest { ${PULL_REQUEST} } }
    totals { open merged closed costUsd }
  }
}`);

export const ContributeContributionsFollowUpsDocument = doc<
  {
    contributeContributions: {
      items: FollowUpFieldsOf<
        Pick<ContributeAttemptFollowUpFields, 'needsYou'> & {
          followUps: NonNullable<ContributeAttemptFollowUpFields['followUps']>;
        }
      >[];
    } | null;
  },
  { first?: number }
>(`query ContributeContributionsFollowUps($first: Int) {
  contributeContributions(first: $first) { items { attemptId ${NEEDS_YOU} ${FOLLOW_UPS} } }
}`);

export const StartFollowUpDocument = doc<
  { startFollowUp: ContributeAttempt },
  { prId: string; reason?: string | null }
>(`mutation StartFollowUp($prId: ID!, $reason: String) { startFollowUp(prId: $prId, reason: $reason) { ${ATTEMPT} } }`);

export const MarkNeedsYouHandledDocument = doc<{ markNeedsYouHandled: ContributeAttempt }, { prId: string }>(
  `mutation MarkNeedsYouHandled($prId: ID!) { markNeedsYouHandled(prId: $prId) { ${ATTEMPT} } }`,
);

/** "Mark as handled" for some of the pull request's signals alone: an operation of its own, as it is newer. */
export const MarkNeedsYouHandledKindsDocument = doc<
  { markNeedsYouHandled: ContributeAttempt },
  { prId: string; kinds: ContributePrSignalKind[] }
>(
  `mutation MarkNeedsYouHandledKinds($prId: ID!, $kinds: [ContributePrSignalKind!]) {
  markNeedsYouHandled(prId: $prId, kinds: $kinds) { ${ATTEMPT} }
}`,
);

// What Needs you reads beyond the follow-up fields (2026-11-03): a run that ended with its number and outcome, when
// the last run ended, a follow-up's round and step in the lists, and the open pull request's fixes and agreement.
// Read in operations of their own, so an API without them leaves the rest.
const NEEDS_YOU_MOVES =
  'needsYou { since signals { kind at detail attemptId round outcome } } followUps { lastEndedAt }';
const RUN_MOVES = `attemptId round { ${ROUND} drafted } checkStatus { status note } followUpStep`;

/** The signals with their run, and when the last run ended, as they merge into what the follow-up fields read. */
export type NeedsYouMovesRow = {
  attemptId: string;
  needsYou: ContributeNeedsYou | null;
  followUps: Pick<ContributeFollowUps, 'lastEndedAt'> | null;
};

/** A follow-up's round, our checks and its step, in a list. */
export type RunMovesRow = Pick<ContributeAttempt, 'attemptId' | 'round' | 'checkStatus' | 'followUpStep'>;

/** The open pull request's last fix, what it fails of the repo's rules, and the agreement to sign. */
export type ContributionFixesRow = Pick<ContributeContribution, 'attemptId' | 'prFix' | 'prIssues' | 'conventions'>;

export const ContributeContributionsMovesDocument = doc<
  { contributeContributions: { items: NeedsYouMovesRow[] } | null },
  { first?: number }
>(`query ContributeContributionsMoves($first: Int) {
  contributeContributions(first: $first) { items { attemptId ${NEEDS_YOU_MOVES} } }
}`);

export const ContributeContributionsFixesDocument = doc<
  { contributeContributions: { items: ContributionFixesRow[] } | null },
  { first?: number }
>(`query ContributeContributionsFixes($first: Int) {
  contributeContributions(first: $first) {
    items { attemptId prFix { kind state note at } prIssues { kind check message suggestion } conventions { cla { check signUrl agreement signComment } } }
  }
}`);

export const ContributeAttemptsMovesDocument = doc<
  { contributeAttempts: RunMovesRow[] | null },
  { state?: ContributeAttemptState; first?: number }
>(`query ContributeAttemptsMoves($state: ContributeAttemptState, $first: Int) {
  contributeAttempts(state: $state, first: $first) { ${RUN_MOVES} }
}`);

export const ContributeAttemptMovesDocument = doc<{ contributeAttempt: NeedsYouMovesRow | null }, { id: string }>(
  `query ContributeAttemptMoves($id: ID!) { contributeAttempt(id: $id) { attemptId ${NEEDS_YOU_MOVES} } }`,
);

export const IgnoreReviewThreadsDocument = doc<
  { ignoreReviewThreads: string[] },
  { prId: string; commentIds: string[]; ignore: boolean }
>(
  `mutation IgnoreReviewThreads($prId: ID!, $commentIds: [ID!]!, $ignore: Boolean!) {
    ignoreReviewThreads(prId: $prId, commentIds: $commentIds, ignore: $ignore)
  }`,
);

export const VetoAutopilotDocument = doc<{ vetoAutopilot: ContributeAttempt }, { attemptId: string }>(
  `mutation VetoAutopilot($attemptId: ID!) { vetoAutopilot(attemptId: $attemptId) { ${ATTEMPT} } }`,
);

export const ApproveReplyDocument = doc<
  { approveReply: ContributeReplyDraft },
  { draftId: string; asComment?: boolean }
>(
  `mutation ApproveReply($draftId: ID!, $asComment: Boolean) {
    approveReply(draftId: $draftId, asComment: $asComment) { ${REPLY_DRAFT} }
  }`,
);

export const DismissReplyDocument = doc<
  { dismissReply: ContributeReplyDraft },
  { draftId: string; reason: ContributeReplyUserDismissReason }
>(
  `mutation DismissReply($draftId: ID!, $reason: ContributeReplyUserDismissReason!) {
    dismissReply(draftId: $draftId, reason: $reason) { ${REPLY_DRAFT} }
  }`,
);

export const ApproveAttemptDocument = doc<
  { approveAttempt: ContributeAttempt },
  { id: string; title: string; body: string; dco: boolean }
>(`mutation ApproveAttempt($id: ID!, $title: String!, $body: String!, $dco: Boolean!) {
  approveAttempt(id: $id, title: $title, body: $body, dco: $dco) { ${ATTEMPT} }
}`);

export const RetryAttemptDocument = doc<{ retryAttempt: ContributeAttempt }, { id: string; note: string | null }>(
  `mutation RetryAttempt($id: ID!, $note: String) { retryAttempt(id: $id, note: $note) { ${ATTEMPT} } }`,
);

export const DiscardAttemptDocument = doc<{ discardAttempt: ContributeAttempt }, { id: string }>(
  `mutation DiscardAttempt($id: ID!) { discardAttempt(id: $id) { ${ATTEMPT} } }`,
);

/** The profile block "Issues for you": empty for anyone but the signed-in owner of the profile. */
export const IssuesForProfileDocument = doc<{ issuesForProfile: ContributeIssue[] | null }, { login: string }>(
  `query IssuesForProfile($login: String!) { issuesForProfile(login: $login) { ${ISSUE} } }`,
);

// The maintainers page. The GitHub token is always a variable, never part of the query's text.
const OPT_OUT_RESULT = 'repoId nameWithOwner optedOut optedOutAt reason';

export const MaintainerReposDocument = doc<{ maintainerRepos: ContributeMaintainerRepos }, { token: string }>(
  `query MaintainerRepos($token: String!) {
  maintainerRepos(token: $token) {
    login truncated
    repos {
      repoId nameWithOwner permission stars isArchived optedOut optedOutAt
      blockedContributors { login since by feedbackId }
      stoppedPrs { number since by feedbackId }
    }
  }
}`,
);

/** "Your repos" with each repo's keys and rules: an API without them answers `MaintainerReposDocument` instead. */
export const MaintainerReposWithRulesDocument = doc<{ maintainerRepos: ContributeMaintainerRepos }, { token: string }>(
  `query MaintainerReposWithRules($token: String!) {
  maintainerRepos(token: $token) {
    login truncated
    repos {
      repoId nameWithOwner permission stars isArchived optedOut optedOutAt
      blockedContributors { login since by feedbackId }
      stoppedPrs { number since by feedbackId }
      ${MAINTAINER_CONFIG}
      ${MAINTAINER_RULES}
    }
  }
}`,
);

/** Sets one key on the page for a repo the token maintains (`value` null clears it): its keys and rules after. */
export const SetContributeMaintainerConfigDocument = doc<
  { setContributeMaintainerConfig: ContributeMaintainerRepoConfig },
  { token: string; repoId: string; key: string; value: string | null }
>(`mutation SetContributeMaintainerConfig($token: String!, $repoId: ID!, $key: String!, $value: String) {
  setContributeMaintainerConfig(token: $token, repoId: $repoId, key: $key, value: $value) {
    repoId ${MAINTAINER_CONFIG} ${MAINTAINER_RULES}
  }
}`);

export const OptOutReposDocument = doc<{ optOutRepos: ContributeOptOutResult[] }, { token: string; repoIds: string[] }>(
  `mutation OptOutRepos($token: String!, $repoIds: [ID!]!) {
  optOutRepos(token: $token, repoIds: $repoIds) { ${OPT_OUT_RESULT} }
}`,
);

export const OptInReposDocument = doc<{ optInRepos: ContributeOptOutResult[] }, { token: string; repoIds: string[] }>(
  `mutation OptInRepos($token: String!, $repoIds: [ID!]!) {
  optInRepos(token: $token, repoIds: $repoIds) { ${OPT_OUT_RESULT} }
}`,
);

// The maintainers page's facts, and the notes on a PR. A GitHub token is always a variable.
const PR_CARD =
  'attemptId repositoryId nameWithOwner number title openedAt contributorLogin reviewed agentPhrase isAuthor';
const PR_FEEDBACK_RESULT = 'feedbackId kind number label added role actions { kind appliedAt undoneAt }';
const PR_NOTE = 'feedbackId login role likes word at hidden';

export const ContributeMaintainerFactsDocument = doc<{ contributeMaintainerFacts: ContributeMaintainerFacts }>(
  `query ContributeMaintainerFacts {
  contributeMaintainerFacts {
    prsPerMonth monthDays pauseStreak pauseDays attemptsPerRepo badgeBoost
    configKeys { key kind values meaning live page min max }
  }
}`,
);

export const ContributePrCardDocument = doc<
  { contributePrCard: ContributePrCardView },
  { from?: string; pr?: string; token?: string }
>(
  `query ContributePrCard($from: ID, $pr: String, $token: String) {
  contributePrCard(from: $from, pr: $pr, token: $token) {
    card { ${PR_CARD} }
    viewer { login role roleConfirmed restrictedOrg replyTo }
  }
}`,
);

export const ReportContributePrDocument = doc<
  { reportContributePr: ContributePrFeedbackResult },
  {
    token: string;
    from: string;
    reasons: ContributeReportReason[];
    details: string | null;
    replyTo: string | null;
    actions: ContributePrAction[];
  }
>(
  `mutation ReportContributePr($token: String!, $from: ID!, $reasons: [ContributeReportReason!]!, $details: String,
  $replyTo: String, $actions: [ContributePrAction!]) {
  reportContributePr(token: $token, from: $from, reasons: $reasons, details: $details, replyTo: $replyTo,
    actions: $actions) { ${PR_FEEDBACK_RESULT} }
}`,
);

export const ContributePrHelpedDocument = doc<
  { contributePrHelped: ContributePrFeedbackResult },
  {
    token: string;
    from: string;
    likes: ContributeHelpedLike[];
    word: string | null;
    mayQuote: boolean;
    replyTo: string | null;
  }
>(
  `mutation ContributePrHelped($token: String!, $from: ID!, $likes: [ContributeHelpedLike!], $word: String,
  $mayQuote: Boolean, $replyTo: String) {
  contributePrHelped(token: $token, from: $from, likes: $likes, word: $word, mayQuote: $mayQuote,
    replyTo: $replyTo) { ${PR_FEEDBACK_RESULT} }
}`,
);

export const UndoContributePrActionDocument = doc<
  { undoContributePrAction: ContributePrUndoResult },
  { token: string; feedbackId: string; repoId: string; kind: ContributePrAction }
>(
  `mutation UndoContributePrAction($token: String!, $feedbackId: ID!, $repoId: ID!, $kind: ContributePrAction!) {
  undoContributePrAction(token: $token, feedbackId: $feedbackId, repoId: $repoId, kind: $kind) {
    feedbackId actions { kind appliedAt undoneAt }
  }
}`,
);

/** The contributor's own view of the notes on their PR: read on its own, so an API without it leaves the page. */
export const ContributePrNotesDocument = doc<{ contributePrNotes: ContributePrNotes | null }, { attemptId: string }>(
  `query ContributePrNotes($attemptId: ID!) {
  contributePrNotes(attemptId: $attemptId) { stopped { login at } notes { ${PR_NOTE} } }
}`,
);

export const HideContributePrNoteDocument = doc<
  { hideContributePrNote: ContributePrNote },
  { feedbackId: string; hidden: boolean }
>(
  `mutation HideContributePrNote($feedbackId: ID!, $hidden: Boolean!) {
  hideContributePrNote(feedbackId: $feedbackId, hidden: $hidden) { ${PR_NOTE} }
}`,
);

// Overview: each operation is new, so an API without one leaves the rest of the page working.
type AttemptStatesVariables = { states: ContributeAttemptState[]; first?: number };

/** The attempts in any of `states`, newest first. */
export const ContributeAttemptsInDocument = doc<
  { contributeAttempts: ContributeAttempt[] | null },
  AttemptStatesVariables
>(`query ContributeAttemptsIn($states: [ContributeAttemptState!], $first: Int) {
  contributeAttempts(states: $states, first: $first) { ${ATTEMPT} }
}`);

export const ContributeAttemptsInFollowUpsDocument = doc<
  { contributeAttempts: FollowUpFieldsOf<ContributeAttemptFollowUpFields>[] | null },
  AttemptStatesVariables
>(`query ContributeAttemptsInFollowUps($states: [ContributeAttemptState!], $first: Int) {
  contributeAttempts(states: $states, first: $first) { ${FOLLOW_UP_FIELDS} }
}`);

export const ContributeAttemptsInOwnAgentDocument = doc<
  { contributeAttempts: OwnAgentRow[] | null },
  AttemptStatesVariables
>(
  `query ContributeAttemptsInOwnAgent($states: [ContributeAttemptState!], $first: Int) {
  contributeAttempts(states: $states, first: $first) { ${OWN_AGENT_FIELDS} }
}`,
);

export const ContributeAttemptsInMovesDocument = doc<
  { contributeAttempts: RunMovesRow[] | null },
  AttemptStatesVariables
>(
  `query ContributeAttemptsInMoves($states: [ContributeAttemptState!], $first: Int) {
  contributeAttempts(states: $states, first: $first) { ${RUN_MOVES} }
}`,
);

/** When each attempt in review became ready, merged into the attempts by id. */
export const ContributeAttemptsInReviewAtDocument = doc<
  { contributeAttempts: { attemptId: string; reviewAt: string | null }[] | null },
  AttemptStatesVariables
>(`query ContributeAttemptsInReviewAt($states: [ContributeAttemptState!], $first: Int) {
  contributeAttempts(states: $states, first: $first) { attemptId reviewAt }
}`);

/** The reply drafts the user can approve now, oldest first. */
export const ContributeRepliesWaitingDocument = doc<{ contributeRepliesWaiting: ContributeReplyWaiting[] | null }>(
  `query ContributeRepliesWaiting { contributeRepliesWaiting { ${REPLY_DRAFT} nameWithOwner prNumber inReview } }`,
);

/** What the scheduler counts before it starts an attempt. */
export const ContributeScheduleCountsDocument = doc<{
  contribute: { contributor: { scheduleCounts: ContributeScheduleCounts | null } | null } | null;
}>('query ContributeScheduleCounts { contribute { contributor { scheduleCounts { prBound queued } } } }');

/** The totals of My contributions, without its list. */
export const ContributeImpactDocument = doc<{
  contributeContributions: { totals: { open: number; merged: number; closed: number } } | null;
}>('query ContributeImpact { contributeContributions(first: 1) { totals { open merged closed } } }');

/** The repos the user's merged pull requests helped. */
export const ContributeImpactReposDocument = doc<{
  contributeContributions: { totals: { reposHelped: number | null } } | null;
}>('query ContributeImpactRepos { contributeContributions(first: 1) { totals { reposHelped } } }');

// What the user works on: the mode, the lists and the ignored repos. Read and written in operations of their own, so
// an API without them leaves the rest of the pages working.
const SET_REPO = 'repositoryId nameWithOwner stars language via { kind login } addedAt status reasons';
const SET = `mode version
  stack { sources { ${SET_REPO} } count fallback
    resolve { state startedAt endedAt packages unlinked targets { ${SET_REPO} usage packages } failed { repositoryId nameWithOwner usage reasons } } }
  repos { repos { ${SET_REPO} } count fallback }
  ignore { repositoryId nameWithOwner at }
  limits { sources repos targets ignore addsPerDay resolvesPerDay feedbackPerDay feedbackMaxChars }`;

export const ContributeSetDocument = doc<{ contributeSet: ContributeSet | null }>(
  `query ContributeSet { contributeSet { ${SET} } }`,
);

export const ContributeActivityDocument = doc<{ contributeActivity: ContributeActivity | null }>(
  `query ContributeActivity { contributeActivity {
    items { kind tabs label done total startedAt expectedAt repos { repositoryId nameWithOwner stage } }
    runs {
      attemptId nameWithOwner number title kind runner state phase label active queuedAt startedAt settledAt
      elapsedSeconds spendUsd budgetUsd latestEvent { state detail at } queuePosition lastCallAt autosubmitAt endReason
      prUrl
    }
    readAt
  } }`,
);

/** What moved for the user since `since`: one cheap read; null when the API hides it. */
export const ContributeChangesDocument = doc<{ contributeChanges: ContributeChanges | null }, { since: string | null }>(
  `query ContributeChanges($since: String) { contributeChanges(since: $since) { version activity changed } }`,
);

export const SetContributeModeDocument = doc<{ setContributeMode: ContributeSet }, { mode: ContributeSetMode }>(
  `mutation SetContributeMode($mode: ContributeSetMode!) { setContributeMode(mode: $mode) { ${SET} } }`,
);

export const SetContributeFallbackDocument = doc<
  { setContributeFallback: ContributeSet },
  { mode: ContributeSetListMode; fallback: ContributeSetFallback }
>(`mutation SetContributeFallback($mode: ContributeSetListMode!, $fallback: ContributeSetFallback!) {
  setContributeFallback(mode: $mode, fallback: $fallback) { ${SET} }
}`);

export const AddToContributeSetDocument = doc<
  { addToContributeSet: ContributeSetAddResult },
  { list: ContributeSetList; input: string }
>(`mutation AddToContributeSet($list: ContributeSetList!, $input: String!) {
  addToContributeSet(list: $list, input: $input) {
    added { ${SET_REPO} } passed considered full
    skipped { ignored duplicate unsupported { ${SET_REPO} } failed { reason count } }
    set { ${SET} }
  }
}`);

export const RemoveFromContributeSetDocument = doc<
  { removeFromContributeSet: ContributeSet },
  { list: ContributeSetList; repositoryIds: string[] }
>(`mutation RemoveFromContributeSet($list: ContributeSetList!, $repositoryIds: [ID!]!) {
  removeFromContributeSet(list: $list, repositoryIds: $repositoryIds) { ${SET} }
}`);

export const IgnoreContributeRepoDocument = doc<{ ignoreContributeRepo: ContributeSet }, { repositoryId: string }>(
  `mutation IgnoreContributeRepo($repositoryId: ID!) { ignoreContributeRepo(repositoryId: $repositoryId) { ${SET} } }`,
);

export const UnignoreContributeRepoDocument = doc<{ unignoreContributeRepo: ContributeSet }, { repositoryId: string }>(
  `mutation UnignoreContributeRepo($repositoryId: ID!) { unignoreContributeRepo(repositoryId: $repositoryId) { ${SET} } }`,
);

export const ResolveContributeStackDocument = doc<{ resolveContributeStack: ContributeSet }>(
  `mutation ResolveContributeStack { resolveContributeStack { ${SET} } }`,
);

export const SendContributeFeedbackDocument = doc<
  { sendContributeFeedback: boolean },
  { topic: ContributeFeedbackTopic; text: string; context?: ContributeFeedbackContext }
>(`mutation SendContributeFeedback($topic: ContributeFeedbackTopic!, $text: String!, $context: ContributeFeedbackContextInput) {
  sendContributeFeedback(topic: $topic, text: $text, context: $context)
}`);

// A review bot's ask for proof and the user's own agent's proof for it (2026-11-03). Read in operations of their own,
// so an API without them leaves the rest, and the card is left out.
const PROOF_SESSION = `id state agent { name model } leaseUntil round startedAt stateAt checkError
  result { outcome summary section { heading markdown } reply note redactions headSha
    files { slot name caption bytes width height } }
  post { step commitSha bodyAt commentUrl error } sendBack { note } endedReason`;
const PROOF = `proof { prHeadSha ask { bot title detail at headSha reReview } session { ${PROOF_SESSION} } }`;
/** What a proof action answers: its id and its new state (the page reads the rest again). */
const PROOF_MOVED = 'id state';
type ProofMoved = Pick<ContributeProofSession, 'id' | 'state'>;
const PROOF_BRIEF = 'proof { ask { bot title at } session { id state stateAt endedReason result { outcome } } }';

export const ContributeAttemptProofDocument = doc<
  { contributeAttempt: { attemptId: string; proof: ContributeProof | null } | null },
  { id: string }
>(`query ContributeAttemptProof($id: ID!) { contributeAttempt(id: $id) { attemptId ${PROOF} } }`);

export const ContributeContributionsProofDocument = doc<
  { contributeContributions: { items: { attemptId: string; proof: ContributeProofBrief | null }[] } | null },
  { first?: number }
>(`query ContributeContributionsProof($first: Int) {
  contributeContributions(first: $first) { items { attemptId ${PROOF_BRIEF} } }
}`);

export const ApproveContributeProofDocument = doc<
  { approveContributeProof: ProofMoved },
  { id: string; checked: boolean }
>(`mutation ApproveContributeProof($id: ID!, $checked: Boolean!) {
  approveContributeProof(id: $id, checked: $checked) { ${PROOF_MOVED} }
}`);

export const SendBackContributeProofDocument = doc<
  { sendBackContributeProof: ProofMoved },
  { id: string; note: string }
>(`mutation SendBackContributeProof($id: ID!, $note: String!) {
  sendBackContributeProof(id: $id, note: $note) { ${PROOF_MOVED} }
}`);

export const DiscardContributeProofDocument = doc<{ discardContributeProof: ProofMoved }, { id: string }>(
  `mutation DiscardContributeProof($id: ID!) { discardContributeProof(id: $id) { ${PROOF_MOVED} } }`,
);

export const TakeBackContributeProofDocument = doc<{ takeBackContributeProof: ProofMoved }, { id: string }>(
  `mutation TakeBackContributeProof($id: ID!) { takeBackContributeProof(id: $id) { ${PROOF_MOVED} } }`,
);

export const PostContributeProofReplyDocument = doc<
  { postContributeProofReply: ProofMoved },
  { id: string; text: string }
>(`mutation PostContributeProofReply($id: ID!, $text: String!) {
  postContributeProofReply(id: $id, text: $text) { ${PROOF_MOVED} }
}`);

export const RetryContributeProofDocument = doc<{ retryContributeProof: ProofMoved }, { id: string }>(
  `mutation RetryContributeProof($id: ID!) { retryContributeProof(id: $id) { ${PROOF_MOVED} } }`,
);
