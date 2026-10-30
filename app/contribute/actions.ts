'use server';

import { PR_BODY_MAX, PR_TITLE_MAX } from '@/lib/contribute/attempt-format';
import { viewerLogin } from '@/lib/contribute/contribute.data';
import {
  ApproveAttemptDocument,
  ApproveReplyDocument,
  ConnectClaudeKeyDocument,
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
};

export async function connectClaudeKey(
  input: ConnectKeyInput,
): Promise<ContributeActionResult<ContributeConnectKeyResult>> {
  const variables = {
    key: String(input.key ?? '').trim(),
    plan: input.plan,
    renewalDay: Math.trunc(Number(input.renewalDay)),
    confirmedLimit: input.confirmedLimit === true,
    ...(typeof input.cycleCapUsd === 'number' && Number.isFinite(input.cycleCapUsd)
      ? { cycleCapUsd: input.cycleCapUsd }
      : {}),
  };
  return run(ConnectClaudeKeyDocument, variables, (data) => data.connectClaudeKey);
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
