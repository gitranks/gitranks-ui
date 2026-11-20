'use server';

import { revalidateTag } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { run } from '@/lib/workspace/action-run';
import { agentConnectedOf } from '@/lib/workspace/agent-connect';
import { PR_BODY_MAX, PR_TITLE_MAX } from '@/lib/workspace/attempt-format';
import { viewerLogin } from '@/lib/workspace/contribute.data';
import {
  ApproveAttemptDocument,
  ApproveAttemptWithTimelineDocument,
  ApproveContributeOAuthDocument,
  ApproveContributeProofDocument,
  ApproveFollowUpDocument,
  ApproveRepliesAsOneCommentDocument,
  ApproveReplyDocument,
  ConnectClaudeKeyDocument,
  ConnectClaudeKeyWithLimitsDocument,
  ContributeActivityDocument,
  ContributeAttemptLiveBareDocument,
  ContributeAttemptLiveDocument,
  ContributeChangesDocument,
  ContributeFeedComputedDocument,
  ContributeMcpConnectionsUsedDocument,
  ContributeNeedsYouCountDocument,
  ContributeOnboardingDocument,
  ContributeOwnAgentDocument,
  CreateMcpTokenDocument,
  DeleteContributeDataDocument,
  DiscardAttemptDocument,
  DiscardContributeProofDocument,
  DismissReplyDocument,
  FixContributePullRequestDocument,
  HideContributePrNoteDocument,
  IgnoreReviewThreadsDocument,
  MarkNeedsYouHandledDocument,
  MarkNeedsYouHandledKindsDocument,
  NoteProviderInterestDocument,
  PostContributeProofReplyDocument,
  RemoveLlmKeyDocument,
  RetryAttemptDocument,
  RetryContributeProofDocument,
  RevokeGithubGrantDocument,
  RevokeMcpTokenDocument,
  SendBackContributeProofDocument,
  SendBackToAgentDocument,
  SetContributeEmailSettingsDocument,
  SetContributeSettingsDocument,
  SetPrTimelineDocument,
  SetResolveHumansDocument,
  StartFollowUpDocument,
  StartFollowUpOnDocument,
  TakeBackContributeProofDocument,
  VetoAutopilotDocument,
  WithdrawProviderInterestDocument,
} from '@/lib/workspace/contribute.documents';
import type {
  ContributeAttempt,
  ContributeAttemptLive,
  ContributeChangeArea,
  ContributeChanges,
  ContributeChangesRead,
  ContributeClaudePlan,
  ContributeComingSoonProvider,
  ContributeConnectKeyResult,
  ContributeConnectLimits,
  ContributeDeleteDataResult,
  ContributeEmailSettings,
  ContributeEmailSettingsInput,
  ContributeMcpTokenCreated,
  ContributePrNote,
  ContributeProofSession,
  ContributePrSignalKind,
  ContributeRepliesOneComment,
  ContributeReplyDraft,
  ContributeReplyUserDismissReason,
  ContributeSettings,
  ContributeSettingsInput,
} from '@/lib/workspace/contribute.types';
import { emailSettingsInputOf } from '@/lib/workspace/email-settings';
import { type ContributeActionResult, contributeErrorOf } from '@/lib/workspace/errors';
import { FOLLOW_UP_THREADS_MAX } from '@/lib/workspace/follow-up-flow';
import { FOLLOW_UP_NOTE_MAX, PR_SIGNAL_KINDS } from '@/lib/workspace/follow-up-format';
import { MCP_TOKEN_NAME_MAX, SEND_BACK_NOTE_MAX } from '@/lib/workspace/mcp-setup';
import { isSafeRedirect, requestIdOf } from '@/lib/workspace/oauth-consent';
import { isRequestKey, ONE_COMMENT_DRAFTS_MAX } from '@/lib/workspace/one-comment';
import {
  type ContributeConventionsFields,
  type ContributePrFixKind,
  PR_FIX_KINDS,
} from '@/lib/workspace/pr-conventions';
import { objectIdOf, parsePrLink } from '@/lib/workspace/pr-feedback';
import { prTimelineAttemptTagOf, prTimelineTagOf } from '@/lib/workspace/pr-timeline-path';
import { PROOF_NOTE_MAX, PROOF_REPLY_MAX } from '@/lib/workspace/proof';

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

/**
 * Saves the user's Email rows, or (with the time zone alone) notes their browser's zone. Only the fields given, and
 * only well-formed ones, are sent; a call with none is refused here.
 */
export async function setContributeEmailSettings(
  input: ContributeEmailSettingsInput,
): Promise<ContributeActionResult<ContributeEmailSettings>> {
  const variables = emailSettingsInputOf(input);
  if (!Object.keys(variables).length) return { ok: false, error: 'INVALID' };
  return run(SetContributeEmailSettingsDocument, variables, (data) => data.setContributeEmailSettings);
}

export type ApproveAttemptInput = {
  id: string;
  title: string;
  body: string;
  dco: boolean;
  /** The PR timeline's checkbox, only when the form showed it. */
  timeline?: boolean;
};

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
  const approval = { id: String(input.id), title, body, dco: input.dco === true };
  if (typeof input.timeline === 'boolean') {
    return run(
      ApproveAttemptWithTimelineDocument,
      { ...approval, timeline: input.timeline },
      (data) => data.approveAttempt,
    );
  }
  return run(ApproveAttemptDocument, approval, (data) => data.approveAttempt);
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

/**
 * Tries a stop again, once, as its `retry` says: a check that ran out, on twice the budget, or a no-go the user works on
 * anyway. A new attempt, queued. `note`: the user's words to the agent, trimmed; none when empty.
 */
export async function retryAttempt(id: string, note?: string): Promise<ContributeActionResult<ContributeAttempt>> {
  const text = typeof note === 'string' ? note.trim() : '';
  if (text.length > FOLLOW_UP_NOTE_MAX) {
    return {
      ok: false,
      error: 'INVALID',
      message: `A note takes ${FOLLOW_UP_NOTE_MAX.toLocaleString('en-US')} characters at most.`,
    };
  }
  return run(RetryAttemptDocument, { id: String(id), note: text || null }, (data) => data.retryAttempt);
}

/**
 * Shows or hides the public timeline of the viewer's pull request (any attempt of it). A Hide takes the cached page
 * down at once (its tag expires now, not after one more serving); the edge keeps its copy a few minutes more.
 */
export async function setPrTimeline(input: {
  attemptId: string;
  shown: boolean;
  nameWithOwner: string;
  number: number;
}): Promise<ContributeActionResult<{ attemptId: string; shown: boolean }>> {
  const result = await run(
    SetPrTimelineDocument,
    { attemptId: String(input.attemptId), shown: input.shown === true },
    (data) => data.setContributePrTimeline,
  );
  if (result.ok) {
    // The PR's own id, as the API answered it: the page is gone whatever address it was opened at.
    if (result.data?.attemptId) revalidateTag(prTimelineAttemptTagOf(result.data.attemptId), { expire: 0 });
    const pr = parsePrLink(`${input.nameWithOwner}#${input.number}`);
    if (pr) revalidateTag(prTimelineTagOf(pr), { expire: 0 });
  }
  return result;
}

/** Discards an attempt in review (or queued): its issue goes back to the pool. */
export async function discardAttempt(id: string): Promise<ContributeActionResult<ContributeAttempt>> {
  return run(DiscardAttemptDocument, { id: String(id) }, (data) => data.discardAttempt);
}

/**
 * Starts a follow-up run on the user's open pull request (its node id): new commits and drafted replies, for review.
 * With `commentIds`, on those review threads alone; the pull request's other waiting threads are ignored from then on.
 * `reason`: the user's note to the agent, which it puts first.
 */
export async function startFollowUp(
  prId: string,
  commentIds?: string[],
  reason?: string,
): Promise<ContributeActionResult<ContributeAttempt>> {
  const note = typeof reason === 'string' ? reason.trim() : '';
  if (note.length > FOLLOW_UP_NOTE_MAX) {
    return {
      ok: false,
      error: 'INVALID',
      message: `A note takes ${FOLLOW_UP_NOTE_MAX.toLocaleString('en-US')} characters at most.`,
    };
  }
  const ids = Array.isArray(commentIds) ? commentIds.map(String).filter(Boolean) : [];
  if (Array.isArray(commentIds) && !ids.length) {
    return { ok: false, error: 'INVALID', message: 'Choose at least one comment to address.' };
  }
  // Never cut silently: the comments left out would be ignored from then on.
  if (ids.length > FOLLOW_UP_THREADS_MAX) {
    return {
      ok: false,
      error: 'INVALID',
      message: `A run takes ${FOLLOW_UP_THREADS_MAX} comments at most. Ignore the rest for now; you can address them in a later run.`,
    };
  }
  const withNote = note ? { reason: note } : {};
  return ids.length
    ? run(StartFollowUpOnDocument, { prId: String(prId), commentIds: ids, ...withNote }, (data) => data.startFollowUp)
    : run(StartFollowUpDocument, { prId: String(prId), ...withNote }, (data) => data.startFollowUp);
}

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
 * description (the footer kept), CHANGELOG fixes its changelog line in a commit on its branch, SIGN_OFF rewrites our
 * commits with the user's DCO sign-off (the same code, a force-push).
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

/**
 * Clears what the pull request's last reads found: the user took care of it. With `kinds`, only those (one card's "I've
 * done it"); without, all of it. Something new raises it again.
 */
export async function markNeedsYouHandled(
  prId: string,
  kinds?: ContributePrSignalKind[],
): Promise<ContributeActionResult<ContributeAttempt>> {
  const only = (Array.isArray(kinds) ? kinds : []).filter((kind) => SIGNAL_KINDS.has(kind));
  if (Array.isArray(kinds) && !only.length) return { ok: false, error: 'INVALID', message: 'Nothing to mark.' };
  return only.length
    ? run(MarkNeedsYouHandledKindsDocument, { prId: String(prId), kinds: only }, (data) => data.markNeedsYouHandled)
    : run(MarkNeedsYouHandledDocument, { prId: String(prId) }, (data) => data.markNeedsYouHandled);
}

const SIGNAL_KINDS = new Set<string>(PR_SIGNAL_KINDS);

/**
 * Ignores review comments on the user's pull request (`ignore: false` brings them back): never addressed or followed up
 * again until someone comments on them after; a follow-up waiting for the user drops its reply to them.
 */
export async function ignoreReviewThreads(
  prId: string,
  commentIds: string[],
  ignore = true,
): Promise<ContributeActionResult<string[]>> {
  const ids = (Array.isArray(commentIds) ? commentIds : []).map(String).filter(Boolean);
  if (!ids.length) return { ok: false, error: 'INVALID', message: 'Choose a comment first.' };
  return run(
    IgnoreReviewThreadsDocument,
    { prId: String(prId), commentIds: ids, ignore: ignore !== false },
    (data) => data.ignoreReviewThreads,
  );
}

/**
 * Approves a drafted reply: it is posted publicly on GitHub, in the user's name. `asComment`: a reply GitHub refused in
 * its review thread goes as a comment on the pull request instead.
 */
export async function approveReply(
  draftId: string,
  asComment = false,
): Promise<ContributeActionResult<ContributeReplyDraft>> {
  return run(
    ApproveReplyDocument,
    { draftId: String(draftId), ...(asComment === true ? { asComment: true } : {}) },
    (data) => data.approveReply,
  );
}

/**
 * Posts a run's thread replies as one comment on the pull request, in the user's name (`draftIds`: one or more), or
 * tries one failed comment again (`batchId`). Each reply is quoted and linked to its thread. `requestId` is the click's
 * key: the same key never posts twice, so a click whose answer was lost is sent again with it.
 */
export async function approveRepliesAsOneComment(
  attemptId: string,
  target: { draftIds: string[] } | { batchId: string },
  requestId: string,
): Promise<ContributeActionResult<ContributeRepliesOneComment>> {
  const key = String(requestId ?? '');
  const draftIds =
    target && 'draftIds' in target && Array.isArray(target.draftIds) ? target.draftIds.map(String) : null;
  const batchId = target && 'batchId' in target && typeof target.batchId === 'string' ? target.batchId : null;
  if (
    !attemptId ||
    !isRequestKey(key) ||
    (draftIds ? !draftIds.length || draftIds.length > ONE_COMMENT_DRAFTS_MAX || batchId : !batchId)
  ) {
    return { ok: false, error: 'INVALID', message: 'Those replies cannot go as one comment. Reload the page.' };
  }
  return run(
    ApproveRepliesAsOneCommentDocument,
    { attemptId: String(attemptId), requestId: key, ...(draftIds ? { draftIds } : { batchId: String(batchId) }) },
    (data) => data.approveRepliesAsOneComment,
  );
}

/** Dismisses a drafted or failed reply: it is never posted and no longer waits for the user. */
export async function dismissReply(
  draftId: string,
  reason: ContributeReplyUserDismissReason,
): Promise<ContributeActionResult<ContributeReplyDraft>> {
  if (reason !== 'POSTED_BY_HAND' && reason !== 'NOT_NEEDED') {
    return { ok: false, error: 'INVALID', message: 'Choose why first.' };
  }
  return run(DismissReplyDocument, { draftId: String(draftId), reason }, (data) => data.dismissReply);
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

/**
 * Allow, on the consent page of an agent's sign-in: the agent is connected as the session's user, and the answer is
 * where the browser goes back to it. Checked here and again in the browser before it goes: `https:`, `http:` to this
 * computer, or an app's own scheme; never a script or a file.
 */
export async function approveContributeOAuth(
  requestId: string,
): Promise<ContributeActionResult<{ redirectTo: string }>> {
  const id = requestIdOf(String(requestId ?? ''));
  if (!id) return { ok: false, error: 'EXPIRED' };
  const result = await run(ApproveContributeOAuthDocument, { requestId: id }, (data) => data.approveContributeOAuth);
  // Hidden (off the preview) or refused for it: the only refusals Allow has besides EXPIRED.
  if (!result.ok && (result.error === 'NOT_FOUND' || result.error === 'INVALID')) {
    return { ok: false, error: 'NOT_FOUND', message: "Contribute isn't open for your account yet." };
  }
  if (!result.ok) return result;
  const redirectTo = result.data?.redirectTo;
  if (!isSafeRedirect(redirectTo)) {
    return {
      ok: false,
      error: 'FAILED',
      message: "We can't send you back to this app: its address isn't one we allow.",
    };
  }
  return { ok: true, data: { redirectTo } };
}

export type AgentWatch = {
  /** The token the page shows, or the unused one it came back to; null without one. */
  tokenId: string | null;
  /** The user was onboarded when the page opened: the stamp cannot tell this call apart. */
  onboarded: boolean;
  /**
   * No token, an agent signing in: when the page opened (the server's clock). An agent that signed in and was used
   * since is taken as connected, which Allow itself marks: for a user onboarded before, the page goes on at Allow.
   */
  since?: string | null;
};

/** An agent that signed in, used after `since`: its use. Personal tokens and other uses before it don't count. */
const signedInUsedSince = (
  tokens: { kind: 'PERSONAL' | 'OAUTH'; lastUsedAt: string | null }[] | null | undefined,
  since: string,
): string | undefined => {
  const after = Date.parse(since);
  return (
    tokens?.find(({ kind, lastUsedAt }) => kind === 'OAUTH' && !!lastUsedAt && Date.parse(lastUsedAt) > after)
      ?.lastUsedAt ?? undefined
  );
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
  const since =
    !tokenId && typeof watch?.since === 'string' && Number.isFinite(Date.parse(watch.since)) ? watch.since : null;

  let onboardedAt: string | null | undefined;
  if (!onboardedBefore) {
    try {
      const data = await graphqlDirect(ContributeOnboardingDocument, undefined, options);
      onboardedAt = data?.contribute?.contributor?.onboardedAt;
    } catch {
      onboardedAt = undefined;
    }
    if (onboardedAt !== undefined || (!tokenId && !since)) {
      return { ok: true, data: agentConnectedOf({ onboardedBefore, onboardedAt, tokenUsedAt: undefined }) };
    }
  }
  if (!tokenId && !since) return { ok: true, data: false };
  try {
    if (!tokenId) {
      const data = await graphqlDirect(ContributeMcpConnectionsUsedDocument, undefined, options);
      const tokenUsedAt = signedInUsedSince(data?.contribute?.mcpTokens, since ?? '');
      return { ok: true, data: agentConnectedOf({ onboardedBefore, onboardedAt, tokenUsedAt }) };
    }
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

/** A proof as an action answers it: its id and state. */
type ProofMoved = Pick<ContributeProofSession, 'id' | 'state'>;
const proofMoved = (session: ProofMoved): ProofMoved => ({ id: session.id, state: session.state });

/**
 * Posts the proof the user's own agent captured, once the user has checked it: its screenshots go to a branch in their
 * fork, the section to the pull request's description, and the bot is asked to read it again. `checked`: the user ticked
 * that nothing private is left; without it nothing is posted.
 */
export async function approveContributeProof(
  id: string,
  checked: boolean,
): Promise<ContributeActionResult<ProofMoved>> {
  if (checked !== true) return { ok: false, error: 'INVALID', message: 'Tick that nothing private is left first.' };
  return run(ApproveContributeProofDocument, { id: String(id), checked: true }, (data) =>
    proofMoved(data.approveContributeProof),
  );
}

/** Sends the proof back to the user's agent with what to change: the same prompt picks it up again. */
export async function sendBackContributeProof(id: string, note: string): Promise<ContributeActionResult<ProofMoved>> {
  const trimmed = String(note ?? '').trim();
  if (!trimmed) return { ok: false, error: 'INVALID', message: 'Say what your agent should change.' };
  if (trimmed.length > PROOF_NOTE_MAX) {
    return {
      ok: false,
      error: 'INVALID',
      message: `Keep the note to ${PROOF_NOTE_MAX.toLocaleString('en-US')} characters at most.`,
    };
  }
  return run(SendBackContributeProofDocument, { id: String(id), note: trimmed }, (data) =>
    proofMoved(data.sendBackContributeProof),
  );
}

/** Drops the proof: nothing of it is posted. The bot's ask stays, so a new proof may start. */
export async function discardContributeProof(id: string): Promise<ContributeActionResult<ProofMoved>> {
  return run(DiscardContributeProofDocument, { id: String(id) }, (data) => proofMoved(data.discardContributeProof));
}

/** Takes the proof back from an agent that holds it (stuck, or closed): the prompt can be run again. */
export async function takeBackContributeProof(id: string): Promise<ContributeActionResult<ProofMoved>> {
  return run(TakeBackContributeProofDocument, { id: String(id) }, (data) => proofMoved(data.takeBackContributeProof));
}

/** Posts the reply the agent drafted when it could not capture the proof, as the user edited it, on the pull request. */
export async function postContributeProofReply(id: string, text: string): Promise<ContributeActionResult<ProofMoved>> {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return { ok: false, error: 'INVALID', message: 'Write the reply first.' };
  if (trimmed.length > PROOF_REPLY_MAX) {
    return {
      ok: false,
      error: 'INVALID',
      message: `Keep the reply to ${PROOF_REPLY_MAX.toLocaleString('en-US')} characters at most.`,
    };
  }
  return run(PostContributeProofReplyDocument, { id: String(id), text: trimmed }, (data) =>
    proofMoved(data.postContributeProofReply),
  );
}

/** Tries a failed post again, from the step that failed: what was already posted is not posted twice. */
export async function retryContributeProof(id: string): Promise<ContributeActionResult<ProofMoved>> {
  return run(RetryContributeProofDocument, { id: String(id) }, (data) => proofMoved(data.retryContributeProof));
}

const VERSION = /^\d{1,15}\.\d{1,15}$/;

/** The areas whose change may change what needs the user: the count is read again with them. */
const NEEDS_YOU_AREAS: readonly ContributeChangeArea[] = ['ATTEMPTS', 'SETTINGS'];

/**
 * The workspace's one poll: what moved since `since` (a version a previous read answered; null for none). Read in the
 * same call: the work in progress when `ask.activity`, when a long read may run, or when it may have started or ended;
 * the count of what needs the user when `ask.needsYou`, or when an attempt or the settings moved. A failed read of
 * either leaves it out. Null when the API hides Contribute from the user.
 */
export async function readWorkspaceChanges(
  since: string | null,
  ask: { activity: boolean; needsYou: boolean },
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
  const withActivity =
    ask?.activity === true || changes.activity || changes.changed.some((area) => area === 'ACTIVITY' || area === 'SET');
  const withCount = ask?.needsYou === true || changes.changed.some((area) => NEEDS_YOU_AREAS.includes(area));
  const options = { source: 'client' as const, githubLogin };
  const [activity, needsYou] = await Promise.all([
    withActivity
      ? graphqlDirect(ContributeActivityDocument, undefined, options).then(
          ({ contributeActivity }) => contributeActivity,
          () => undefined,
        )
      : undefined,
    withCount ? countOf(githubLogin) : undefined,
  ]);
  return {
    ok: true,
    data: {
      changes,
      ...(activity === undefined ? {} : { activity }),
      ...(needsYou === undefined ? {} : { needsYou }),
    },
  };
}

/** The count of what needs the user; null when the API hides it or does not answer it yet, undefined when it failed. */
async function countOf(githubLogin: string): Promise<number | null | undefined> {
  try {
    const { contributeNeedsYou } = await graphqlDirect(ContributeNeedsYouCountDocument, undefined, {
      source: 'client',
      githubLogin,
    });
    return contributeNeedsYou?.count ?? null;
  } catch {
    return undefined;
  }
}

/**
 * The count of what needs the user alone, for the Pull requests tab after a move to another page: null when the API
 * hides it or does not answer it yet.
 */
export async function readNeedsYouCount(): Promise<ContributeActionResult<number | null>> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { ok: false, error: 'SIGNED_OUT' };
  const count = await countOf(githubLogin);
  return count === undefined ? { ok: false, error: 'FAILED' } : { ok: true, data: count };
}

/** Hides a "this PR helped" note from the user's contribution page, or shows it again. */
export async function hidePrNote(
  feedbackId: string,
  hidden: boolean,
): Promise<ContributeActionResult<ContributePrNote>> {
  const id = objectIdOf(feedbackId);
  if (!id) return { ok: false, error: 'INVALID' };
  return run(
    HideContributePrNoteDocument,
    { feedbackId: id, hidden: hidden === true },
    (data) => data.hideContributePrNote,
  );
}
