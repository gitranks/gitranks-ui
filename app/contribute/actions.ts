'use server';

import { agentConnectedOf } from '@/lib/contribute/agent-connect';
import { anyActive, runsOf } from '@/lib/contribute/agent-runs';
import { PR_BODY_MAX, PR_TITLE_MAX } from '@/lib/contribute/attempt-format';
import { viewerEmail, viewerLogin } from '@/lib/contribute/contribute.data';
import {
  AddToContributeSetDocument,
  ApproveAttemptDocument,
  ApproveFollowUpDocument,
  ApproveReplyDocument,
  ConnectClaudeKeyDocument,
  ConnectClaudeKeyWithLimitsDocument,
  ContributeActivityDocument,
  ContributeAttemptLiveBareDocument,
  ContributeAttemptLiveDocument,
  ContributeChangesDocument,
  ContributeFeedComputedDocument,
  ContributeIssueStatusDocument,
  ContributeIssuesDocument,
  ContributeOnboardingDocument,
  ContributeOwnAgentDocument,
  CreateMcpTokenDocument,
  DeleteContributeDataDocument,
  DiscardAttemptDocument,
  FixContributePullRequestDocument,
  IgnoreContributeRepoDocument,
  MarkNeedsYouHandledDocument,
  NoteProviderInterestDocument,
  PauseContributingDocument,
  RemoveFromContributeSetDocument,
  RemoveLlmKeyDocument,
  ResolveContributeStackDocument,
  ResumeContributingDocument,
  RetryAttemptDocument,
  RevokeGithubGrantDocument,
  RevokeMcpTokenDocument,
  SendBackToAgentDocument,
  SendContributeFeedbackDocument,
  SetContributeFallbackDocument,
  SetContributeModeDocument,
  SetContributeSettingsDocument,
  SetPreferencesDocument,
  SetResolveHumansDocument,
  SkipIssueDocument,
  StartFollowUpDocument,
  StartFollowUpOnDocument,
  UnignoreContributeRepoDocument,
  VetoAutopilotDocument,
  WithdrawProviderInterestDocument,
} from '@/lib/contribute/contribute.documents';
import type {
  ContributeAttempt,
  ContributeAttemptLive,
  ContributeChanges,
  ContributeChangesRead,
  ContributeClaudePlan,
  ContributeComingSoonProvider,
  ContributeConnectKeyResult,
  ContributeConnectLimits,
  ContributeDeleteDataResult,
  ContributeFeedbackContext,
  ContributeFeedbackTopic,
  ContributeIssuePage,
  ContributeIssueStatus,
  ContributeIssuesFilter,
  ContributeMcpTokenCreated,
  ContributePreferences,
  ContributePreferencesInput,
  ContributeReplyDraft,
  ContributeSet,
  ContributeSetAddResult,
  ContributeSetFallback,
  ContributeSetList,
  ContributeSetListMode,
  ContributeSetMode,
  ContributeSetReason,
  ContributeSettings,
  ContributeSettingsInput,
} from '@/lib/contribute/contribute.types';
import {
  type ContributeActionResult,
  type ContributeSetActionResult,
  contributeErrorOf,
  contributeSetErrorOf,
} from '@/lib/contribute/errors';
import { KINDS, LANGUAGES, SIZES } from '@/lib/contribute/format';
import { ISSUE_STATUS_IDS_MAX, ISSUES_PAGE_SIZE } from '@/lib/contribute/live-issues';
import { MCP_TOKEN_NAME_MAX, SEND_BACK_NOTE_MAX } from '@/lib/contribute/mcp-setup';
import { activityFor, contributeModesShown } from '@/lib/contribute/modes-gate';
import {
  type ContributeConventionsFields,
  type ContributePrFixKind,
  PR_FIX_KINDS,
} from '@/lib/contribute/pr-conventions';
import { ADD_INPUT_MAX, FEEDBACK_MAX } from '@/lib/contribute/set-format';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import type DocumentNode from '@/types/typed-document-node';

/** A write (a mutation) carries the session's email, so the emails the user asks for have an address; a read never. */
const isWrite = (document: DocumentNode<unknown, never>) =>
  (document as unknown as { definitions: { kind: string; operation?: string }[] }).definitions.some(
    (definition) => definition.kind === 'OperationDefinition' && definition.operation === 'mutation',
  );

const accountEmailFor = async (document: DocumentNode<unknown, never>) =>
  isWrite(document) ? await viewerEmail() : undefined;

/** Every action runs as the session's user, never one named in its arguments. */
async function run<TData, TVariables extends Record<string, unknown>, T>(
  document: DocumentNode<TData, TVariables>,
  variables: TVariables | undefined,
  pick: (data: TData) => T,
): Promise<ContributeActionResult<T>> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { ok: false, error: 'SIGNED_OUT' };
  try {
    const accountEmail = await accountEmailFor(document as DocumentNode<unknown, never>);
    const data = await graphqlDirect(document, variables, { source: 'client', githubLogin, accountEmail });
    return { ok: true, data: pick(data) };
  } catch (error) {
    return { ok: false, ...contributeErrorOf(error) };
  }
}

export type ConnectKeyInput = {
  key: string;
  plan: ContributeClaudePlan;
  renewalDay: number;
  confirmedLimit: boolean;
  cycleCapUsd?: number;
  /** The limits the user set themselves; left out, the plan's defaults apply. */
  limits?: ContributeConnectLimits;
};

const amountOf = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);

/** The limits as the API takes them: a week or day cap is a number or null (none); anything else is left out. */
function connectLimitsOf(limits: ContributeConnectLimits): ContributeConnectLimits {
  const cap = (value: unknown) => (value === null ? null : amountOf(value));
  const week = cap(limits.weekCapUsd);
  const day = cap(limits.dayCapUsd);
  const attempt = amountOf(limits.attemptCapUsd);
  return {
    ...(week !== undefined ? { weekCapUsd: week } : {}),
    ...(day !== undefined ? { dayCapUsd: day } : {}),
    ...(attempt !== undefined ? { attemptCapUsd: attempt } : {}),
    ...(limits.pace === 'EVEN' || limits.pace === 'FAST' ? { pace: limits.pace } : {}),
  };
}

export async function connectClaudeKey(
  input: ConnectKeyInput,
): Promise<ContributeActionResult<ContributeConnectKeyResult>> {
  const cycleCapUsd = amountOf(input.cycleCapUsd);
  const variables = {
    key: String(input.key ?? '').trim(),
    plan: input.plan,
    renewalDay: Math.trunc(Number(input.renewalDay)),
    confirmedLimit: input.confirmedLimit === true,
    ...(cycleCapUsd !== undefined ? { cycleCapUsd } : {}),
  };
  const pick = (data: { connectClaudeKey: ContributeConnectKeyResult }) => data.connectClaudeKey;
  // Only a connect with the user's own limits asks for them, so one from a plan works on an API without them.
  if (input.limits && typeof input.limits === 'object') {
    return run(ConnectClaudeKeyWithLimitsDocument, { ...variables, limits: connectLimitsOf(input.limits) }, pick);
  }
  return run(ConnectClaudeKeyDocument, variables, pick);
}

/** When the user's picks were last computed; null until the first time. */
export async function readFeedComputedAt(): Promise<ContributeActionResult<string | null>> {
  return run(ContributeFeedComputedDocument, undefined, (data) => data.contributeIssues?.computedAt ?? null);
}

export async function removeClaudeKey(): Promise<ContributeActionResult<boolean>> {
  return run(RemoveLlmKeyDocument, undefined, (data) => data.removeLlmKey);
}

export async function saveContributeSettings(
  settings: ContributeSettingsInput,
): Promise<ContributeActionResult<ContributeSettings>> {
  return run(SetContributeSettingsDocument, { settings }, (data) => data.setContributeSettings);
}

export async function savePreferences(
  preferences: ContributePreferencesInput,
): Promise<ContributeActionResult<ContributePreferences>> {
  return run(SetPreferencesDocument, { preferences }, (data) => data.setPreferences);
}

export async function noteProviderInterest(
  provider: ContributeComingSoonProvider,
): Promise<ContributeActionResult<boolean>> {
  return run(NoteProviderInterestDocument, { provider }, (data) => data.noteProviderInterest);
}

export async function withdrawProviderInterest(
  provider: ContributeComingSoonProvider,
): Promise<ContributeActionResult<boolean>> {
  return run(WithdrawProviderInterestDocument, { provider }, (data) => data.withdrawProviderInterest);
}

export async function deleteContributeData(): Promise<ContributeActionResult<ContributeDeleteDataResult>> {
  return run(DeleteContributeDataDocument, undefined, (data) => data.deleteContributeData);
}

export async function revokeGithubGrant(): Promise<ContributeActionResult<boolean>> {
  return run(RevokeGithubGrantDocument, undefined, (data) => data.revokeGithubGrant);
}

export async function pauseContributing(): Promise<ContributeActionResult<boolean>> {
  return run(PauseContributingDocument, undefined, (data) => data.pauseContributing);
}

export async function resumeContributing(): Promise<ContributeActionResult<boolean>> {
  return run(ResumeContributingDocument, undefined, (data) => data.resumeContributing);
}

export async function skipIssue(issueId: string): Promise<ContributeActionResult<boolean>> {
  return run(SkipIssueDocument, { issueId: String(issueId) }, (data) => data.skipIssue);
}

/**
 * The shown issues as they are now, in the order given: at most the first 50 ids are asked. Null when the API hides
 * it from the user; none for no ids, without a call.
 */
export async function readIssueStatuses(
  issueIds: string[],
): Promise<ContributeActionResult<ContributeIssueStatus[] | null>> {
  const ids = (Array.isArray(issueIds) ? issueIds : [])
    .filter((id) => typeof id === 'string' && id)
    .slice(0, ISSUE_STATUS_IDS_MAX);
  if (!ids.length) return { ok: true, data: [] };
  return run(ContributeIssueStatusDocument, { issueIds: ids }, (data) => data.contributeIssueStatus);
}

export type IssuesPageInput = { filter?: ContributeIssuesFilter; after: string; first: number };

/** The feed's filters, their known values alone. */
function issuesFilterOf(filter: ContributeIssuesFilter | undefined): ContributeIssuesFilter {
  if (!filter || typeof filter !== 'object') return {};
  const known = <T extends string>(values: unknown, allowed: Record<T, unknown>) =>
    (Array.isArray(values) ? values : []).filter(
      (value): value is T => typeof value === 'string' && Object.hasOwn(allowed, value),
    );
  const languages = known(filter.languages, LANGUAGES);
  const kinds = known(filter.kinds, KINDS);
  const maxSize = known([filter.maxSize], SIZES)[0];
  return {
    ...(languages.length ? { languages } : {}),
    ...(kinds.length ? { kinds } : {}),
    ...(maxSize ? { maxSize } : {}),
  };
}

/** More of the feed after a cursor, under the same filters: what fills a page whose issues were taken meanwhile. */
export async function readIssuesPage(
  input: IssuesPageInput,
): Promise<ContributeActionResult<ContributeIssuePage | null>> {
  const after = typeof input?.after === 'string' ? input.after : '';
  if (!after || after.length > 512) return invalid('No more issues to read.');
  const first = Math.min(Math.max(Math.trunc(Number(input.first)) || 1, 1), ISSUES_PAGE_SIZE);
  const filter = issuesFilterOf(input.filter);
  return run(
    ContributeIssuesDocument,
    { first, after, ...(Object.keys(filter).length ? { filter } : {}) },
    (data) => data.contributeIssues,
  );
}

export type ApproveAttemptInput = { id: string; title: string; body: string; dco: boolean };

/** Approves an attempt in review with the pull request's title and body as edited: the submission starts. */
export async function approveAttempt(input: ApproveAttemptInput): Promise<ContributeActionResult<ContributeAttempt>> {
  const title = String(input.title ?? '').trim();
  const body = String(input.body ?? '').trim();
  if (!title) return { ok: false, error: 'INVALID', message: 'Give the pull request a title.' };
  if (title.length > PR_TITLE_MAX) {
    return { ok: false, error: 'INVALID', message: `Keep the title under ${PR_TITLE_MAX} characters.` };
  }
  if (body.length > PR_BODY_MAX) {
    return {
      ok: false,
      error: 'INVALID',
      message: `Keep the description under ${PR_BODY_MAX.toLocaleString('en-US')} characters.`,
    };
  }
  return run(
    ApproveAttemptDocument,
    { id: String(input.id), title, body, dco: input.dco === true },
    (data) => data.approveAttempt,
  );
}

/**
 * The submission's stepper reads the attempt again while it submits: its state, the submission with its steps' clock
 * and the pull request, plus when they were read (to set the elapsed times against our clock). An API that does not
 * answer the clock yet is read without it, and `clock: false` tells the stepper to ask without it from then on.
 */
export async function readAttemptLive(
  id: string,
  withClock = true,
): Promise<ContributeActionResult<{ attempt: ContributeAttemptLive | null; readAt: string; clock: boolean }>> {
  const variables = { id: String(id) };
  const bare = () => run(ContributeAttemptLiveBareDocument, variables, (data) => data.contributeAttempt);
  let clock = withClock !== false;
  let result = clock
    ? await run(ContributeAttemptLiveDocument, variables, (data) => data.contributeAttempt)
    : await bare();
  if (!result.ok && clock && result.error === 'NOT_AVAILABLE_YET') {
    clock = false;
    result = await bare();
  }
  return result.ok ? { ok: true, data: { attempt: result.data, readAt: new Date().toISOString(), clock } } : result;
}

/** Tries again, once, an attempt whose check ran out of budget or time: queued, its check on twice the budget. */
export async function retryAttempt(id: string): Promise<ContributeActionResult<ContributeAttempt>> {
  return run(RetryAttemptDocument, { id: String(id) }, (data) => data.retryAttempt);
}

/** Discards an attempt in review (or queued): its issue goes back to the pool. */
export async function discardAttempt(id: string): Promise<ContributeActionResult<ContributeAttempt>> {
  return run(DiscardAttemptDocument, { id: String(id) }, (data) => data.discardAttempt);
}

/**
 * Starts a follow-up on the user's open pull request (its node id): new commits and drafted replies, for review. With
 * `commentIds`, on those review threads alone; the pull request's other waiting threads are ignored from then on.
 */
export async function startFollowUp(
  prId: string,
  commentIds?: string[],
): Promise<ContributeActionResult<ContributeAttempt>> {
  const ids = Array.isArray(commentIds) ? commentIds.map(String).filter(Boolean) : [];
  if (Array.isArray(commentIds) && !ids.length) {
    return { ok: false, error: 'INVALID', message: 'Choose at least one comment to address.' };
  }
  // Never cut silently: the comments left out would be ignored from then on.
  if (ids.length > FOLLOW_UP_THREADS_MAX) {
    return {
      ok: false,
      error: 'INVALID',
      message: `A round takes ${FOLLOW_UP_THREADS_MAX} comments at most. Ignore the rest for now; you can address them in a later round.`,
    };
  }
  return ids.length
    ? run(StartFollowUpOnDocument, { prId: String(prId), commentIds: ids }, (data) => data.startFollowUp)
    : run(StartFollowUpDocument, { prId: String(prId) }, (data) => data.startFollowUp);
}

/** The most review threads one follow-up addresses (the API's; the review-feedback card keeps to it). */
const FOLLOW_UP_THREADS_MAX = 20;
/** The longest reply GitHub takes from us (the API's). */
const REPLY_MAX = 8_000;

export type FollowUpReplyInput = { draftId: string; text: string; send: boolean };

/**
 * Approves a follow-up in review with its replies as edited: its commits are pushed to the pull request, then each
 * reply sent is posted ("Fixed in <commit>: …"), and a bot's thread is resolved.
 */
export async function approveFollowUp(
  id: string,
  title: string,
  replies: FollowUpReplyInput[],
): Promise<ContributeActionResult<ContributeAttempt>> {
  const list = (Array.isArray(replies) ? replies : []).map((reply) => ({
    draftId: String(reply.draftId),
    text: String(reply.text ?? '').trim(),
    send: reply.send === true,
  }));
  if (list.some((reply) => reply.text.length > REPLY_MAX)) {
    return {
      ok: false,
      error: 'INVALID',
      message: `Keep each reply under ${REPLY_MAX.toLocaleString('en-US')} characters.`,
    };
  }
  if (list.some((reply) => reply.send && !reply.text)) {
    return {
      ok: false,
      error: 'INVALID',
      message: 'A reply you chose to post has no text. Write it, or leave it out.',
    };
  }
  return run(
    ApproveFollowUpDocument,
    { id: String(id), title: String(title || 'Follow-up'), replies: list },
    (data) => data.approveAttempt,
  );
}

/** Whether a follow-up's replies resolve people's threads too (off: only bots'; reviewers resolve their own). */
export async function setResolveHumanThreads(on: boolean): Promise<ContributeActionResult<boolean>> {
  return run(
    SetResolveHumansDocument,
    { on: on === true },
    (data) => data.setContributeSettings?.resolveHumanThreads === true,
  );
}

/** Stops autopilot from submitting an attempt in its hour: it goes to the review instead. */
export async function vetoAutopilot(attemptId: string): Promise<ContributeActionResult<ContributeAttempt>> {
  return run(VetoAutopilotDocument, { attemptId: String(attemptId) }, (data) => data.vetoAutopilot);
}

/**
 * A one-click fix to the user's open pull request, on their GitHub access: TITLE retitles it, BODY sets its
 * description (the footer kept), CHANGELOG fixes its changelog line in a commit on its branch.
 */
export async function fixPullRequest(input: {
  attemptId: string;
  kind: ContributePrFixKind;
  title?: string;
  body?: string;
}): Promise<ContributeActionResult<Required<ContributeConventionsFields>>> {
  const kind = PR_FIX_KINDS.includes(input.kind) ? input.kind : null;
  if (!kind) return { ok: false, error: 'INVALID', message: 'That fix is not one we make.' };
  const title = kind === 'TITLE' ? String(input.title ?? '').trim() : undefined;
  if (kind === 'TITLE' && (!title || title.length > PR_TITLE_MAX)) {
    return {
      ok: false,
      error: 'INVALID',
      message: `Give the pull request a title of ${PR_TITLE_MAX} characters at most.`,
    };
  }
  const body = kind === 'BODY' ? String(input.body ?? '') : undefined;
  if (body !== undefined && body.length > PR_BODY_MAX) {
    return { ok: false, error: 'INVALID', message: `Keep the description to ${PR_BODY_MAX} characters at most.` };
  }
  return run(
    FixContributePullRequestDocument,
    { attemptId: String(input.attemptId), kind, title, body },
    (data) => data.fixContributePullRequest,
  );
}

/** Clears what the pull request's last reads found: the user took care of it. Something new raises it again. */
export async function markNeedsYouHandled(prId: string): Promise<ContributeActionResult<ContributeAttempt>> {
  return run(MarkNeedsYouHandledDocument, { prId: String(prId) }, (data) => data.markNeedsYouHandled);
}

/** Approves a drafted reply: it is posted publicly on GitHub, in the user's name. */
export async function approveReply(draftId: string): Promise<ContributeActionResult<ContributeReplyDraft>> {
  return run(ApproveReplyDocument, { draftId: String(draftId) }, (data) => data.approveReply);
}

/** A token for the user's own agent: the token itself comes back this once. */
export async function createMcpToken(name: string): Promise<ContributeActionResult<ContributeMcpTokenCreated>> {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return { ok: false, error: 'INVALID', message: 'Give the token a name, like "laptop".' };
  if (trimmed.length > MCP_TOKEN_NAME_MAX) {
    return { ok: false, error: 'INVALID', message: `Keep the name to ${MCP_TOKEN_NAME_MAX} characters at most.` };
  }
  return run(CreateMcpTokenDocument, { name: trimmed }, (data) => data.createMcpToken);
}

/** Revokes a token: the agent using it can make no more calls. */
export async function revokeMcpToken(id: string): Promise<ContributeActionResult<boolean>> {
  return run(RevokeMcpTokenDocument, { id: String(id) }, (data) => data.revokeMcpToken);
}

export type AgentWatch = {
  /** The token the page shows, or the unused one it came back to; null without one. */
  tokenId: string | null;
  /** The user was onboarded when the page opened: the stamp cannot tell this call apart. */
  onboarded: boolean;
};

/**
 * Whether the user's own agent has called: the onboarded stamp, read on its own, for a user not onboarded before; else,
 * or when the API does not answer the stamp, the first use of the watched token.
 */
export async function readAgentConnected(watch: AgentWatch): Promise<ContributeActionResult<boolean>> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { ok: false, error: 'SIGNED_OUT' };
  const options = { source: 'client' as const, githubLogin };
  const onboardedBefore = watch?.onboarded === true;
  const tokenId = typeof watch?.tokenId === 'string' && watch.tokenId ? watch.tokenId : null;

  let onboardedAt: string | null | undefined;
  if (!onboardedBefore) {
    try {
      const data = await graphqlDirect(ContributeOnboardingDocument, undefined, options);
      onboardedAt = data?.contribute?.contributor?.onboardedAt;
    } catch {
      onboardedAt = undefined;
    }
    if (onboardedAt !== undefined || !tokenId) {
      return { ok: true, data: agentConnectedOf({ onboardedBefore, onboardedAt, tokenUsedAt: undefined }) };
    }
  }
  if (!tokenId) return { ok: true, data: false };
  try {
    const data = await graphqlDirect(ContributeOwnAgentDocument, undefined, options);
    const tokenUsedAt = data?.contribute?.mcpTokens?.find(({ id }) => id === tokenId)?.lastUsedAt;
    return { ok: true, data: agentConnectedOf({ onboardedBefore, onboardedAt, tokenUsedAt }) };
  } catch (error) {
    return { ok: false, ...contributeErrorOf(error) };
  }
}

/** Sends a change made by the user's own agent back to it, with what to change. */
export async function sendBackToAgent(
  attemptId: string,
  note: string,
): Promise<ContributeActionResult<Pick<ContributeAttempt, 'attemptId' | 'state'>>> {
  const trimmed = String(note ?? '').trim();
  if (!trimmed) return { ok: false, error: 'INVALID', message: 'Say what your agent should change.' };
  if (trimmed.length > SEND_BACK_NOTE_MAX) {
    return {
      ok: false,
      error: 'INVALID',
      message: `Keep the note to ${SEND_BACK_NOTE_MAX.toLocaleString('en-US')} characters at most.`,
    };
  }
  return run(SendBackToAgentDocument, { attemptId: String(attemptId), note: trimmed }, (data) => data.sendBackToAgent);
}

/** What the user works on: shown, and so written, only for the logins the modes are open to. */
async function runSet<TData, TVariables extends Record<string, unknown>, T>(
  document: DocumentNode<TData, TVariables>,
  variables: TVariables | undefined,
  pick: (data: TData) => T,
): Promise<ContributeSetActionResult<T>> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { ok: false, error: 'SIGNED_OUT' };
  if (!contributeModesShown(githubLogin)) return { ok: false, error: 'NOT_FOUND' };
  try {
    const accountEmail = await accountEmailFor(document as DocumentNode<unknown, never>);
    const data = await graphqlDirect(document, variables, { source: 'client', githubLogin, accountEmail });
    return { ok: true, data: pick(data) };
  } catch (error) {
    return { ok: false, ...contributeSetErrorOf(error) };
  }
}

const MODES: ContributeSetMode[] = ['ALL', 'STACK', 'REPOS'];
const LIST_MODES: ContributeSetListMode[] = ['STACK', 'REPOS'];
const LISTS: ContributeSetList[] = ['SOURCES', 'REPOS'];
const FALLBACKS: ContributeSetFallback[] = ['SET_ONLY', 'THEN_ALL'];
const TOPICS: ContributeFeedbackTopic[] = ['GATES', 'MODES', 'OTHER'];
const REASONS: ContributeSetReason[] = [
  'PRIVATE',
  'DELETED',
  'FORK',
  'ARCHIVED',
  'ISSUES_DISABLED',
  'PUSHED',
  'LICENSE',
  'LANGUAGE',
  'OUTSIDE_MERGES',
  'OPTED_OUT',
  'AI_BAN',
  'CONTRIBUTE_OFF',
  'NO_MANIFEST',
];

const oneOf = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (values as readonly string[]).includes(value);

const invalid = (message: string) => ({ ok: false as const, error: 'INVALID' as const, message });

/** What the API is working on for the user now; null when the modes are not shown to them. */
const VERSION = /^\d{1,15}\.\d{1,15}$/;

/**
 * Contribute's one poll: what moved since `since` (a version a previous read answered; null for none). The work in
 * progress is read in the same call when `withActivity`, when a long read may run, or when it may have started or
 * ended; a failed read of it leaves it out. For a login the modes are not shown to, it holds the agent runs alone.
 * Null when the API hides Contribute from the user.
 */
export async function readContributeChanges(
  since: string | null,
  withActivity: boolean,
): Promise<ContributeActionResult<ContributeChangesRead | null>> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { ok: false, error: 'SIGNED_OUT' };
  const variables = { since: typeof since === 'string' && VERSION.test(since) ? since : null };
  let changes: ContributeChanges | null;
  try {
    ({ contributeChanges: changes = null } = await graphqlDirect(ContributeChangesDocument, variables, {
      source: 'client',
      githubLogin,
    }));
  } catch (error) {
    return { ok: false, ...contributeErrorOf(error) };
  }
  if (!changes) return { ok: true, data: null };
  const reads =
    withActivity === true || changes.activity || changes.changed.some((area) => area === 'ACTIVITY' || area === 'SET');
  if (!reads) return { ok: true, data: { changes } };
  try {
    const { contributeActivity } = await graphqlDirect(ContributeActivityDocument, undefined, {
      source: 'client',
      githubLogin,
    });
    // The reads of the modes only for a login they are shown to; the agent runs for everyone. For the others, only an
    // agent at work holds the poll fast: their hidden reads never do.
    const activity = activityFor(githubLogin, contributeActivity);
    if (contributeModesShown(githubLogin)) return { ok: true, data: { changes, activity } };
    return { ok: true, data: { changes: { ...changes, activity: anyActive(runsOf(activity)) }, activity } };
  } catch {
    if (contributeModesShown(githubLogin)) return { ok: true, data: { changes } };
    return { ok: true, data: { changes: { ...changes, activity: false } } };
  }
}

/** Switches where the user's issues come from; each mode keeps its own list. */
export async function setContributeMode(mode: ContributeSetMode): Promise<ContributeSetActionResult<ContributeSet>> {
  if (!oneOf(MODES, mode)) return invalid('Pick one of the three modes.');
  return runSet(SetContributeModeDocument, { mode }, (data) => data.setContributeMode);
}

/** What a mode with a list does when the list has nothing ready. */
export async function setContributeFallback(
  mode: ContributeSetListMode,
  fallback: ContributeSetFallback,
): Promise<ContributeSetActionResult<ContributeSet>> {
  if (!oneOf(LIST_MODES, mode) || !oneOf(FALLBACKS, fallback)) return invalid('Pick one of the two choices.');
  return runSet(SetContributeFallbackDocument, { mode, fallback }, (data) => data.setContributeFallback);
}

/** Adds "@me", a user or org (its repos that pass the rules), or one repo to a list. */
export async function addToContributeSet(
  list: ContributeSetList,
  input: string,
): Promise<ContributeSetActionResult<ContributeSetAddResult>> {
  const trimmed = String(input ?? '').trim();
  if (!oneOf(LISTS, list)) return invalid('Pick a list to add to.');
  if (!trimmed) return invalid('Enter a repo (owner/name), a GitHub link, a user or an org.');
  if (trimmed.length > ADD_INPUT_MAX) return invalid(`Keep it to ${ADD_INPUT_MAX} characters at most.`);
  return runSet(AddToContributeSetDocument, { list, input: trimmed }, (data) => data.addToContributeSet);
}

/** Takes repos off a list, freeing their places. */
export async function removeFromContributeSet(
  list: ContributeSetList,
  repositoryIds: string[],
): Promise<ContributeSetActionResult<ContributeSet>> {
  const ids = (Array.isArray(repositoryIds) ? repositoryIds : []).map(String).filter(Boolean);
  if (!oneOf(LISTS, list) || !ids.length) return invalid('Pick a repo to remove.');
  return runSet(RemoveFromContributeSetDocument, { list, repositoryIds: ids }, (data) => data.removeFromContributeSet);
}

/** Takes a repo off every list and onto the ignored repos: nothing brings it back. */
export async function ignoreContributeRepo(repositoryId: string): Promise<ContributeSetActionResult<ContributeSet>> {
  return runSet(
    IgnoreContributeRepoDocument,
    { repositoryId: String(repositoryId) },
    (data) => data.ignoreContributeRepo,
  );
}

/** Takes a repo off the ignored repos. */
export async function unignoreContributeRepo(repositoryId: string): Promise<ContributeSetActionResult<ContributeSet>> {
  return runSet(
    UnignoreContributeRepoDocument,
    { repositoryId: String(repositoryId) },
    (data) => data.unignoreContributeRepo,
  );
}

/** Works out the libraries of the user's stack again. */
export async function resolveContributeStack(): Promise<ContributeSetActionResult<ContributeSet>> {
  return runSet(ResolveContributeStackDocument, undefined, (data) => data.resolveContributeStack);
}

/** The context sent with a feedback message, its known fields alone. */
function feedbackContextOf(context: ContributeFeedbackContext | undefined): ContributeFeedbackContext | undefined {
  if (!context || typeof context !== 'object') return undefined;
  const repo = typeof context.repo === 'string' ? context.repo.trim().slice(0, ADD_INPUT_MAX) : '';
  const reasons = Array.isArray(context.reasons) ? context.reasons.filter((reason) => oneOf(REASONS, reason)) : [];
  const sent: ContributeFeedbackContext = {
    ...(oneOf(MODES, context.mode) ? { mode: context.mode } : {}),
    ...(repo ? { repo } : {}),
    ...(reasons.length ? { reasons } : {}),
  };
  return Object.keys(sent).length ? sent : undefined;
}

/** Sends the user's message about the rules, the modes or anything else, with where they wrote it. */
export async function sendContributeFeedback(
  topic: ContributeFeedbackTopic,
  text: string,
  context?: ContributeFeedbackContext,
): Promise<ContributeSetActionResult<boolean>> {
  const trimmed = String(text ?? '').trim();
  if (!oneOf(TOPICS, topic)) return invalid('Pick what your message is about.');
  if (!trimmed) return invalid('Write a few words first.');
  if (trimmed.length > FEEDBACK_MAX) {
    return invalid(`Keep it to ${FEEDBACK_MAX.toLocaleString('en-US')} characters at most.`);
  }
  const sent = feedbackContextOf(context);
  return runSet(
    SendContributeFeedbackDocument,
    { topic, text: trimmed, ...(sent ? { context: sent } : {}) },
    (data) => data.sendContributeFeedback,
  );
}
