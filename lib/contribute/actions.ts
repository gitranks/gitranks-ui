'use server';

import { ISSUE_STATUS_IDS_MAX, ISSUES_PAGE_SIZE } from '@/lib/contribute/live-issues';
import { ADD_INPUT_MAX, FEEDBACK_MAX } from '@/lib/contribute/set-format';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { accountEmailFor, run } from '@/lib/workspace/action-run';
import { viewerLogin } from '@/lib/workspace/contribute.data';
import {
  AddToContributeSetDocument,
  ContributeIssueStatusDocument,
  ContributeIssuesDocument,
  ContributeIssuesWithRulesDocument,
  IgnoreContributeRepoDocument,
  RemoveFromContributeSetDocument,
  ResolveContributeStackDocument,
  SendContributeFeedbackDocument,
  SetContributeFallbackDocument,
  SetContributeModeDocument,
  SetPreferencesDocument,
  UnignoreContributeRepoDocument,
} from '@/lib/workspace/contribute.documents';
import type {
  ContributeFeedbackContext,
  ContributeFeedbackTopic,
  ContributeIssuePage,
  ContributeIssueStatus,
  ContributeIssuesFilter,
  ContributePreferences,
  ContributePreferencesInput,
  ContributeSet,
  ContributeSetAddResult,
  ContributeSetFallback,
  ContributeSetList,
  ContributeSetListMode,
  ContributeSetMode,
  ContributeSetReason,
} from '@/lib/workspace/contribute.types';
import {
  type ContributeActionResult,
  type ContributeSetActionResult,
  contributeSetErrorOf,
} from '@/lib/workspace/errors';
import { KINDS, LANGUAGES, SIZES } from '@/lib/workspace/format';
import type DocumentNode from '@/types/typed-document-node';

export async function savePreferences(
  preferences: ContributePreferencesInput,
): Promise<ContributeActionResult<ContributePreferences>> {
  return run(SetPreferencesDocument, { preferences }, (data) => data.setPreferences);
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
  const variables = { first, after, ...(Object.keys(filter).length ? { filter } : {}) };
  const read = await run(ContributeIssuesWithRulesDocument, variables, (data) => data.contributeIssues);
  // An API without the repos' rules: the page as it was.
  if (read.ok || read.error !== 'NOT_AVAILABLE_YET') return read;
  return run(ContributeIssuesDocument, variables, (data) => data.contributeIssues);
}

/** What the user works on: the mode, the lists and the ignored repos. */
async function runSet<TData, TVariables extends Record<string, unknown>, T>(
  document: DocumentNode<TData, TVariables>,
  variables: TVariables | undefined,
  pick: (data: TData) => T,
): Promise<ContributeSetActionResult<T>> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { ok: false, error: 'SIGNED_OUT' };
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
  'NO_PERSON_ACTIVITY',
  'LICENSE',
  'LANGUAGE',
  'OUTSIDE_MERGES',
  'OPTED_OUT',
  'CLOSED_NO_AI',
  'HOSTILE_CLOSE',
  'AI_BAN',
  'CONTRIBUTE_OFF',
  'OUTSIDE_PRS_CLOSED',
  'GATED_CONTRIBUTORS',
  'NO_MANIFEST',
];

const oneOf = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (values as readonly string[]).includes(value);

const invalid = (message: string) => ({ ok: false as const, error: 'INVALID' as const, message });

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
