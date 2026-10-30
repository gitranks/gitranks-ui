import { parse } from 'graphql';

import type {
  ContributeAttempt,
  ContributeAttemptDetail,
  ContributeAttemptFollowUpFields,
  ContributeAttemptState,
  ContributeAutopilot,
  ContributeConnectKeyResult,
  ContributeContributions,
  ContributeDeleteDataResult,
  ContributeGrant,
  ContributeIssue,
  ContributeIssuePage,
  ContributeIssuesFilter,
  ContributeMaintainerRepos,
  ContributeMcpToken,
  ContributeMcpTokenCreated,
  ContributeOnboardedVia,
  ContributeOptOutResult,
  ContributeOwnAgentFields,
  ContributePaths,
  ContributePreferences,
  ContributePreferencesInput,
  ContributeReplyDraft,
  ContributeSettings,
  ContributeSettingsInput,
  Contributor,
} from './contribute.types';
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
const PREFERENCES = 'languages topicIds reposIn reposOut kinds maxSize';
const ISSUE = 'issueId repositoryId nameWithOwner number url title labels language kind size score rank why';
const PULL_REQUEST = 'prId number url state openedAt mergedAt closedAt reviewDecision checks syncedAt';
const ATTEMPT = `attemptId issueId repositoryId nameWithOwner number title url kind state model budgetUsd costUsd
  endReason endDetail checksPassed approvedAt createdAt updatedAt
  submit { step waitUntil fork branch lastError { reason note at } }
  pullRequest { ${PULL_REQUEST} }`;

// Follow-ups, reply drafts and autopilot: read in operations of their own, so an API without them leaves the rest.
const NEEDS_YOU = 'needsYou { since signals { kind at detail } }';
const FOLLOW_UPS = 'followUps { used left max handedOff handedOffAt currentAttemptId }';
const FOLLOW_UP_FIELDS = `attemptId ${NEEDS_YOU} ${FOLLOW_UPS} followUpOf { attemptId prId number url } autosubmitAt autopilot`;
const REPLY_DRAFT = `draftId prId attemptId comment { commentId author path line excerpt } text state posted postedAt url
  lastError { reason note at } createdAt updatedAt`;

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

/** Whether the user is onboarded, and whether attempts are open: read on their own, so an API without them leaves the rest. */
export const ContributeOnboardingDocument = doc<{
  contribute: {
    attemptsOpen: boolean | null;
    contributor: { onboardedAt: string | null; onboardedVia: ContributeOnboardedVia | null } | null;
  } | null;
}>('query ContributeOnboarding { contribute { attemptsOpen contributor { onboardedAt onboardedVia } } }');

export const ContributeGrantDocument = doc<{ contribute: { grant: ContributeGrant } | null }>(
  'query ContributeGrant { contribute { grant { connected login } } }',
);

export const ContributePausedDocument = doc<{ contribute: { contributor: { paused: boolean } | null } | null }>(
  'query ContributePaused { contribute { contributor { paused } } }',
);

export const ContributeIssuesDocument = doc<
  { contributeIssues: ContributeIssuePage | null },
  { first?: number; after?: string; filter?: ContributeIssuesFilter }
>(`query ContributeIssues($first: Int, $after: String, $filter: ContributeIssuesFilter) {
  contributeIssues(first: $first, after: $after, filter: $filter) {
    items { ${ISSUE} }
    next total computedAt
  }
}`);

export const ConnectClaudeKeyDocument = doc<
  { connectClaudeKey: ContributeConnectKeyResult },
  { key: string; plan: string; renewalDay: number; confirmedLimit: boolean; cycleCapUsd?: number }
>(`mutation ConnectClaudeKey($key: String!, $plan: ContributeClaudePlan!, $renewalDay: Int!, $confirmedLimit: Boolean!, $cycleCapUsd: Float) {
  connectClaudeKey(key: $key, plan: $plan, renewalDay: $renewalDay, confirmedLimit: $confirmedLimit, cycleCapUsd: $cycleCapUsd) {
    result retryAfterSec credential { ${CREDENTIAL} }
  }
}`);

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

/** A pull request's reply drafts, oldest first. */
export const ContributeReplyDraftsDocument = doc<
  { contributeReplyDrafts: ContributeReplyDraft[] | null },
  { prId: string }
>(`query ContributeReplyDrafts($prId: ID!) { contributeReplyDrafts(prId: $prId) { ${REPLY_DRAFT} } }`);

export const StartFollowUpDocument = doc<{ startFollowUp: ContributeAttempt }, { prId: string }>(
  `mutation StartFollowUp($prId: ID!) { startFollowUp(prId: $prId) { ${ATTEMPT} } }`,
);

export const VetoAutopilotDocument = doc<{ vetoAutopilot: ContributeAttempt }, { attemptId: string }>(
  `mutation VetoAutopilot($attemptId: ID!) { vetoAutopilot(attemptId: $attemptId) { ${ATTEMPT} } }`,
);

export const ApproveReplyDocument = doc<{ approveReply: ContributeReplyDraft }, { draftId: string }>(
  `mutation ApproveReply($draftId: ID!) { approveReply(draftId: $draftId) { ${REPLY_DRAFT} } }`,
);

export const ApproveAttemptDocument = doc<
  { approveAttempt: ContributeAttempt },
  { id: string; title: string; body: string; dco: boolean }
>(`mutation ApproveAttempt($id: ID!, $title: String!, $body: String!, $dco: Boolean!) {
  approveAttempt(id: $id, title: $title, body: $body, dco: $dco) { ${ATTEMPT} }
}`);

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
    repos { repoId nameWithOwner permission stars isArchived optedOut optedOutAt }
  }
}`,
);

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
