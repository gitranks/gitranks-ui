'use server';

import { agentConnectedOf } from '@/lib/contribute/agent-connect';
import { PR_BODY_MAX, PR_TITLE_MAX } from '@/lib/contribute/attempt-format';
import { viewerLogin } from '@/lib/contribute/contribute.data';
import {
  ApproveAttemptDocument,
  ApproveReplyDocument,
  ConnectClaudeKeyDocument,
  ConnectClaudeKeyWithLimitsDocument,
  ContributeFeedComputedDocument,
  ContributeOnboardingDocument,
  ContributeOwnAgentDocument,
  CreateMcpTokenDocument,
  DeleteContributeDataDocument,
  DiscardAttemptDocument,
  NoteProviderInterestDocument,
  PauseContributingDocument,
  RemoveLlmKeyDocument,
  ResumeContributingDocument,
  RevokeGithubGrantDocument,
  RevokeMcpTokenDocument,
  SendBackToAgentDocument,
  SetContributeSettingsDocument,
  SetPreferencesDocument,
  SkipIssueDocument,
  StartFollowUpDocument,
  VetoAutopilotDocument,
} from '@/lib/contribute/contribute.documents';
import type {
  ContributeAttempt,
  ContributeClaudePlan,
  ContributeComingSoonProvider,
  ContributeConnectKeyResult,
  ContributeConnectLimits,
  ContributeDeleteDataResult,
  ContributeMcpTokenCreated,
  ContributePreferences,
  ContributePreferencesInput,
  ContributeReplyDraft,
  ContributeSettings,
  ContributeSettingsInput,
} from '@/lib/contribute/contribute.types';
import { type ContributeActionResult, contributeErrorOf } from '@/lib/contribute/errors';
import { MCP_TOKEN_NAME_MAX, SEND_BACK_NOTE_MAX } from '@/lib/contribute/mcp-setup';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import type DocumentNode from '@/types/typed-document-node';

/** Every action runs as the session's user, never one named in its arguments. */
async function run<TData, TVariables extends Record<string, unknown>, T>(
  document: DocumentNode<TData, TVariables>,
  variables: TVariables | undefined,
  pick: (data: TData) => T,
): Promise<ContributeActionResult<T>> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { ok: false, error: 'SIGNED_OUT' };
  try {
    const data = await graphqlDirect(document, variables, { source: 'client', githubLogin });
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

/** Discards an attempt in review (or queued): its issue goes back to the pool. */
export async function discardAttempt(id: string): Promise<ContributeActionResult<ContributeAttempt>> {
  return run(DiscardAttemptDocument, { id: String(id) }, (data) => data.discardAttempt);
}

/** Starts a follow-up on the user's open pull request (its node id): new commits and drafted replies, for review. */
export async function startFollowUp(prId: string): Promise<ContributeActionResult<ContributeAttempt>> {
  return run(StartFollowUpDocument, { prId: String(prId) }, (data) => data.startFollowUp);
}

/** Stops autopilot from submitting an attempt in its hour: it goes to the review instead. */
export async function vetoAutopilot(attemptId: string): Promise<ContributeActionResult<ContributeAttempt>> {
  return run(VetoAutopilotDocument, { attemptId: String(attemptId) }, (data) => data.vetoAutopilot);
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
