'use server';

import { signIn } from '@/auth';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import {
  ContributePrHelpedDocument,
  OptInReposDocument,
  OptOutReposDocument,
  ReportContributePrDocument,
  SetContributeMaintainerConfigDocument,
  UndoContributePrActionDocument,
} from '@/lib/contribute/contribute.documents';
import type {
  ContributeHelpedLike,
  ContributeMaintainerRepoConfig,
  ContributeOptOutResult,
  ContributePrAction,
  ContributePrFeedbackResult,
  ContributePrUndoResult,
  ContributeReportReason,
} from '@/lib/contribute/contribute.types';
import {
  type MaintainerConfigError,
  type MaintainerErrorCode,
  maintainerConfigErrorOf,
  maintainerErrorOf,
  type PrFeedbackErrorCode,
  prFeedbackErrorOf,
} from '@/lib/contribute/errors';
import { currentMaintainerToken, markMaintainerSignIn } from '@/lib/contribute/maintainer-token';
import {
  attemptIdOf,
  HELPED_LIKES,
  hasErrors,
  helpedErrorsOf,
  objectIdOf,
  PR_FEEDBACK_DETAILS_MAX,
  PR_FEEDBACK_REPLY_TO_MAX,
  REPORT_REASONS,
  reportErrorsOf,
  textOrNull,
} from '@/lib/contribute/pr-feedback';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** The API changes at most this many repositories a call; a larger choice goes in turns. */
const IDS_PER_CALL = 100;
/** No more than the page lists. */
const IDS_MAX = 300;
const NODE_ID = /^[A-Za-z0-9_=+/-]{1,100}$/;

/**
 * Each changed repository as the API answered it; on a failure, the turns that went through before it. The GitHub
 * token never comes back: it is read from the session here and sent to the API alone.
 */
export type MaintainerActionResult =
  | { ok: true; data: ContributeOptOutResult[] }
  | { ok: false; error: MaintainerErrorCode; data: ContributeOptOutResult[] };

/** Unique, well-formed node ids, as many as the page lists. */
const repoIdsOf = (repoIds: unknown): string[] =>
  [...new Set(Array.isArray(repoIds) ? repoIds : [])]
    .filter((id): id is string => typeof id === 'string' && NODE_ID.test(id))
    .slice(0, IDS_MAX);

type Variables = { token: string; repoIds: string[] };

async function change(
  ask: (variables: Variables) => Promise<ContributeOptOutResult[]>,
  repoIds: unknown,
): Promise<MaintainerActionResult> {
  const token = await currentMaintainerToken();
  if (!token) return { ok: false, error: 'SIGNED_OUT', data: [] };

  const ids = repoIdsOf(repoIds);
  const data: ContributeOptOutResult[] = [];
  for (let start = 0; start < ids.length; start += IDS_PER_CALL) {
    try {
      data.push(...(await ask({ token, repoIds: ids.slice(start, start + IDS_PER_CALL) })));
    } catch (failure) {
      return { ok: false, error: maintainerErrorOf(failure), data };
    }
  }
  return { ok: true, data };
}

/** Takes the chosen repositories out of Contribute, those the visitor's GitHub account administers or maintains. */
export async function optOutMaintainerRepos(repoIds: string[]): Promise<MaintainerActionResult> {
  return change(
    async (variables) => (await graphqlDirect(OptOutReposDocument, variables, { source: 'client' })).optOutRepos,
    repoIds,
  );
}

/** Lifts the opt-out of the chosen repositories. */
export async function optInMaintainerRepos(repoIds: string[]): Promise<MaintainerActionResult> {
  return change(
    async (variables) => (await graphqlDirect(OptInReposDocument, variables, { source: 'client' })).optInRepos,
    repoIds,
  );
}

/** A key's value saved on "Your repos": the repo's keys and rules after it, or why not. The token never comes back. */
export type MaintainerConfigResult =
  | { ok: true; data: ContributeMaintainerRepoConfig }
  | ({ ok: false } & MaintainerConfigError);

const CONFIG_KEY = /^[a-z][a-z0-9_]{0,39}$/;
/** The longest value a key takes (a contact); the API checks each key's own. */
const CONFIG_VALUE_MAX = 200;

/**
 * Sets one `.github/gitranks.yml` key on the page for a repository the visitor maintains, as they change it (no Save);
 * `value` null clears the page's value. The API checks the role with GitHub on each call.
 */
export async function setMaintainerConfig(input: {
  repoId: string;
  key: string;
  value: string | null;
}): Promise<MaintainerConfigResult> {
  const repoId = typeof input?.repoId === 'string' && NODE_ID.test(input.repoId) ? input.repoId : null;
  const key = typeof input?.key === 'string' && CONFIG_KEY.test(input.key) ? input.key : null;
  const raw = input?.value;
  const value = typeof raw === 'string' ? raw.trim() : null;
  if (!repoId || !key || (raw !== null && typeof raw !== 'string') || (value?.length ?? 0) > CONFIG_VALUE_MAX) {
    return { ok: false, error: 'INVALID' };
  }
  const token = await currentMaintainerToken();
  if (!token) return { ok: false, error: 'SIGNED_OUT' };
  try {
    const variables = { token, repoId, key, value: value || null };
    const { setContributeMaintainerConfig } = await graphqlDirect(SetContributeMaintainerConfigDocument, variables, {
      source: 'client',
    });
    return { ok: true, data: setContributeMaintainerConfig };
  } catch (failure) {
    return { ok: false, ...maintainerConfigErrorOf(failure, token) };
  }
}

/**
 * The light GitHub sign-in, marked as the maintainers page's so its token is kept for the page, and back to the page
 * it started on (the form's `returnTo`): the maintainers page or its report page, with their query; anywhere else is
 * refused for the page itself.
 */
export async function signInAsMaintainer(form?: FormData): Promise<void> {
  const returnTo = form instanceof FormData ? form.get('returnTo') : undefined;
  await signIn(IDENTITY_PROVIDER, { redirectTo: await markMaintainerSignIn(returnTo ?? undefined) });
}

/** A note sent or an action undone, or why not. The GitHub token never comes back. */
export type PrFeedbackActionResult<T> = { ok: true; data: T } | { ok: false; error: PrFeedbackErrorCode };

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const pick = <T extends string>(value: unknown, known: readonly T[]): T[] =>
  [...new Set(strings(value))].filter((item): item is T => (known as readonly string[]).includes(item));
const text = (value: unknown, max: number) => (typeof value === 'string' ? value.slice(0, max + 1) : '');

const REASONS = REPORT_REASONS.map(({ value }) => value);
const LIKES = HELPED_LIKES.map(({ value }) => value);
const ACTIONS: readonly ContributePrAction[] = ['STOP_PR', 'BLOCK_CONTRIBUTOR', 'REPO_OFF'];
const REPO_ID = /^[A-Za-z0-9_=+/-]{1,100}$/;

async function withToken<T>(ask: (token: string) => Promise<T>): Promise<PrFeedbackActionResult<T>> {
  const token = await currentMaintainerToken();
  if (!token) return { ok: false, error: 'SIGNED_OUT' };
  try {
    return { ok: true, data: await ask(token) };
  } catch (failure) {
    return { ok: false, error: prFeedbackErrorOf(failure) };
  }
}

export type PrReportInput = {
  /** The PR's first attempt, from its card. */
  from: string;
  reasons: ContributeReportReason[];
  details: string;
  replyTo: string;
  /** Applied only when GitHub says the visitor maintains the repo at the send. */
  actions: ContributePrAction[];
};

/** Reports one of our PRs, with the visitor's GitHub account; the API checks their role again before any action. */
export async function sendPrReport(input: PrReportInput): Promise<PrFeedbackActionResult<ContributePrFeedbackResult>> {
  const from = attemptIdOf(input?.from);
  const fields = {
    reasons: pick(input?.reasons, REASONS),
    details: text(input?.details, PR_FEEDBACK_DETAILS_MAX),
    replyTo: text(input?.replyTo, PR_FEEDBACK_REPLY_TO_MAX),
  };
  if (!from || hasErrors(reportErrorsOf(fields))) return { ok: false, error: 'INVALID' };
  return withToken(async (token) => {
    const variables = {
      token,
      from,
      reasons: fields.reasons,
      details: textOrNull(fields.details),
      replyTo: textOrNull(fields.replyTo),
      actions: pick(input.actions, ACTIONS),
    };
    return (await graphqlDirect(ReportContributePrDocument, variables, { source: 'client' })).reportContributePr;
  });
}

export type PrHelpedInput = {
  from: string;
  likes: ContributeHelpedLike[];
  word: string;
  mayQuote: boolean;
  replyTo: string;
};

/** Says one of our PRs helped, with the visitor's GitHub account. */
export async function sendPrHelped(input: PrHelpedInput): Promise<PrFeedbackActionResult<ContributePrFeedbackResult>> {
  const from = attemptIdOf(input?.from);
  const fields = {
    word: text(input?.word, PR_FEEDBACK_DETAILS_MAX),
    replyTo: text(input?.replyTo, PR_FEEDBACK_REPLY_TO_MAX),
  };
  if (!from || hasErrors(helpedErrorsOf(fields))) return { ok: false, error: 'INVALID' };
  return withToken(async (token) => {
    const variables = {
      token,
      from,
      likes: pick(input.likes, LIKES),
      word: textOrNull(fields.word),
      mayQuote: input.mayQuote === true,
      replyTo: textOrNull(fields.replyTo),
    };
    return (await graphqlDirect(ContributePrHelpedDocument, variables, { source: 'client' })).contributePrHelped;
  });
}

/** Undoes what a report applied, while it is still that report's; GitHub must say the visitor maintains the repo. */
export async function undoPrAction(input: {
  feedbackId: string;
  repoId: string;
  kind: ContributePrAction;
}): Promise<PrFeedbackActionResult<ContributePrUndoResult>> {
  const feedbackId = objectIdOf(input?.feedbackId);
  const repoId = typeof input?.repoId === 'string' && REPO_ID.test(input.repoId) ? input.repoId : null;
  const [kind] = pick([input?.kind], ACTIONS);
  if (!feedbackId || !repoId || !kind) return { ok: false, error: 'INVALID' };
  return withToken(
    async (token) =>
      (await graphqlDirect(UndoContributePrActionDocument, { token, feedbackId, repoId, kind }, { source: 'client' }))
        .undoContributePrAction,
  );
}
