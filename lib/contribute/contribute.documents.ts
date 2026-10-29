import { parse } from 'graphql';

import type {
  ContributeAttempt,
  ContributeAttemptDetail,
  ContributeAttemptState,
  ContributeConnectKeyResult,
  ContributeContributions,
  ContributeDeleteDataResult,
  ContributeGrant,
  ContributeIssuePage,
  ContributeIssuesFilter,
  ContributePreferences,
  ContributePreferencesInput,
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
const PULL_REQUEST = 'prId number url state openedAt mergedAt closedAt reviewDecision checks syncedAt';
const ATTEMPT = `attemptId issueId repositoryId nameWithOwner number title url kind state model budgetUsd costUsd
  endReason endDetail checksPassed approvedAt createdAt updatedAt
  submit { step waitUntil fork branch lastError { reason note at } }
  pullRequest { ${PULL_REQUEST} }`;

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
    items { issueId repositoryId nameWithOwner number url title labels language kind size score rank why }
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

export const ContributeContributionsDocument = doc<
  { contributeContributions: ContributeContributions | null },
  { first?: number }
>(`query ContributeContributions($first: Int) {
  contributeContributions(first: $first) {
    items { attemptId issueId repositoryId nameWithOwner issueNumber title costUsd pullRequest { ${PULL_REQUEST} } }
    totals { open merged closed costUsd }
  }
}`);

export const ApproveAttemptDocument = doc<
  { approveAttempt: ContributeAttempt },
  { id: string; title: string; body: string; dco: boolean }
>(`mutation ApproveAttempt($id: ID!, $title: String!, $body: String!, $dco: Boolean!) {
  approveAttempt(id: $id, title: $title, body: $body, dco: $dco) { ${ATTEMPT} }
}`);

export const DiscardAttemptDocument = doc<{ discardAttempt: ContributeAttempt }, { id: string }>(
  `mutation DiscardAttempt($id: ID!) { discardAttempt(id: $id) { ${ATTEMPT} } }`,
);
