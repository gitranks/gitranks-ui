'use server';

import { PR_BODY_MAX, PR_TITLE_MAX } from '@/lib/contribute/attempt-format';
import { viewerLogin } from '@/lib/contribute/contribute.data';
import {
  ApproveAttemptDocument,
  ConnectClaudeKeyDocument,
  DeleteContributeDataDocument,
  DiscardAttemptDocument,
  NoteProviderInterestDocument,
  PauseContributingDocument,
  RemoveLlmKeyDocument,
  ResumeContributingDocument,
  RevokeGithubGrantDocument,
  SetContributeSettingsDocument,
  SetPreferencesDocument,
  SkipIssueDocument,
} from '@/lib/contribute/contribute.documents';
import type {
  ContributeAttempt,
  ContributeClaudePlan,
  ContributeComingSoonProvider,
  ContributeConnectKeyResult,
  ContributeDeleteDataResult,
  ContributePreferences,
  ContributePreferencesInput,
  ContributeSettings,
  ContributeSettingsInput,
} from '@/lib/contribute/contribute.types';
import { type ContributeActionResult, contributeErrorOf } from '@/lib/contribute/errors';
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
