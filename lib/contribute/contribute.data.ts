import 'server-only';

import {
  ContributeAttemptDocument,
  ContributeAttemptFollowUpsDocument,
  ContributeAttemptsDocument,
  ContributeAttemptsFollowUpsDocument,
  ContributeAutopilotDocument,
  ContributeContributionsDocument,
  ContributeContributionsFollowUpsDocument,
  ContributeGrantDocument,
  ContributeIssuesDocument,
  ContributeOverviewDocument,
  ContributePausedDocument,
  ContributeReplyDraftsDocument,
} from './contribute.documents';
import type {
  ContributeAttempt,
  ContributeAttemptDetail,
  ContributeAttemptState,
  ContributeAutopilot,
  ContributeContributions,
  ContributeIssuePage,
  ContributeIssuesFilter,
  ContributeReplyDraft,
  ContributeView,
} from './contribute.types';
import { contributeErrorOf } from './errors';
import { isGrantAvailable } from './grant-availability';
import { auth } from '@/auth';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** The signed-in user's GitHub login, for calls made on their behalf; null without a usable session. */
export async function viewerLogin(): Promise<string | null> {
  const session = await auth();
  return session?.user?.githubLogin && !session.error ? session.user.githubLogin : null;
}

const settled = <T>(result: PromiseSettledResult<T>): T | undefined =>
  result.status === 'fulfilled' ? result.value : undefined;

/** `extra`'s fields over `item`, the ones it does not hold left out, so they read as "not available yet". */
const withFields = <T extends object>(item: T, extra: object | undefined): T => {
  if (!extra) return item;
  const fields = Object.fromEntries(
    Object.entries(extra).filter(([key, value]) => key !== 'attemptId' && value !== undefined),
  );
  return { ...item, ...fields };
};

/** Rows of a second read by attempt id, to merge into the first read's. */
const byAttemptId = <T extends { attemptId: string }>(rows: T[] | null | undefined) =>
  new Map((Array.isArray(rows) ? rows : []).map((row) => [row.attemptId, row]));

/** The autopilot record with the newer fields the API answered; those it did not are left out. */
const autopilotOf = (
  autopilot: ContributeAutopilot,
  extra: Pick<ContributeAutopilot, 'mergedToUnlock' | 'lockedAt' | 'available'> | undefined,
): ContributeAutopilot => ({
  ...autopilot,
  ...(typeof extra?.mergedToUnlock === 'number' ? { mergedToUnlock: extra.mergedToUnlock } : {}),
  ...(extra && extra.lockedAt !== undefined ? { lockedAt: extra.lockedAt } : {}),
  ...(typeof extra?.available === 'boolean' ? { available: extra.available } : {}),
});

/** The API did not answer the overview: the pages show "try again" (`app/contribute/error.tsx`), never a 404. */
export class ContributeUnavailableError extends Error {
  constructor() {
    super('GitRanks Contribute did not load');
    this.name = 'ContributeUnavailableError';
  }
}

/**
 * Everything the Contribute pages show for the signed-in user; null when Contribute is hidden from them (signed out,
 * or not on the preview), which the pages answer with a 404. A failed read throws `ContributeUnavailableError`. The
 * grant and the pause are read on their own, so an API that does not answer them yet leaves them `undefined` and the
 * rest of the page working.
 */
export async function loadContribute(): Promise<ContributeView | null> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return null;

  const options = { source: 'ssr' as const, githubLogin };
  const [overview, grant, paused, autopilot] = await Promise.allSettled([
    graphqlDirect(ContributeOverviewDocument, undefined, options),
    graphqlDirect(ContributeGrantDocument, undefined, options),
    graphqlDirect(ContributePausedDocument, undefined, options),
    graphqlDirect(ContributeAutopilotDocument, undefined, options),
  ]);

  if (overview.status === 'rejected') throw new ContributeUnavailableError();
  const { contribute } = overview.value;
  if (!contribute?.previewAllowed) return null;

  const pausedField = settled(paused)?.contribute?.contributor?.paused;
  const { contributor } = contribute;
  return {
    contributor: contributor?.autopilot
      ? {
          ...contributor,
          autopilot: autopilotOf(contributor.autopilot, settled(autopilot)?.contribute?.contributor?.autopilot),
        }
      : contributor,
    grant: settled(grant)?.contribute?.grant ?? undefined,
    paused: typeof pausedField === 'boolean' ? pausedField : undefined,
    grantAvailable: isGrantAvailable(),
  };
}

/** One page of issues for the signed-in user; `undefined` when the API does not answer the feed (yet). */
export async function loadIssues(
  filter: ContributeIssuesFilter,
  after?: string,
): Promise<ContributeIssuePage | null | undefined> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return undefined;

  try {
    const { contributeIssues } = await graphqlDirect(
      ContributeIssuesDocument,
      { first: 20, ...(after ? { after } : {}), ...(Object.keys(filter).length ? { filter } : {}) },
      { source: 'ssr', githubLogin },
    );
    return contributeIssues;
  } catch {
    return undefined;
  }
}

/** The signed-in user's attempts, newest first, optionally in one state; `undefined` when the API does not answer. */
export async function loadAttempts(
  state?: ContributeAttemptState,
  first = 20,
): Promise<ContributeAttempt[] | undefined> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return undefined;

  const variables = { first, ...(state ? { state } : {}) };
  const options = { source: 'ssr' as const, githubLogin };
  const [main, followUps] = await Promise.allSettled([
    graphqlDirect(ContributeAttemptsDocument, variables, options),
    graphqlDirect(ContributeAttemptsFollowUpsDocument, variables, options),
  ]);
  const attempts = settled(main)?.contributeAttempts;
  if (!attempts) return undefined;
  const extras = byAttemptId(settled(followUps)?.contributeAttempts);
  return attempts.map((attempt) => withFields(attempt, extras.get(attempt.attemptId)));
}

/**
 * One of the signed-in user's attempts, for the review: null when there is none for them (not theirs, signed out or
 * hidden), which the page answers with a 404; `undefined` when the API does not answer the review yet. An outage throws
 * `ContributeUnavailableError`.
 */
export async function loadAttempt(id: string): Promise<ContributeAttemptDetail | null | undefined> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return null;

  const options = { source: 'ssr' as const, githubLogin };
  const review = graphqlDirect(ContributeAttemptDocument, { id }, options);
  // The follow-up fields are read beside the review, and left out when the API does not answer them.
  const followUps = Promise.resolve(graphqlDirect(ContributeAttemptFollowUpsDocument, { id }, options)).catch(
    () => undefined,
  );
  try {
    const { contributeAttempt } = await review;
    if (!contributeAttempt) return contributeAttempt;
    const extra = (await followUps)?.contributeAttempt;
    return withFields(contributeAttempt, extra?.attemptId === contributeAttempt.attemptId ? extra : undefined);
  } catch (failure) {
    const { error } = contributeErrorOf(failure);
    if (error === 'NOT_FOUND' || error === 'SIGNED_OUT' || error === 'INVALID') return null;
    if (error === 'NOT_AVAILABLE_YET') return undefined;
    throw new ContributeUnavailableError();
  }
}

/** My contributions: the user's pull requests and their totals; `undefined` when the API does not answer them. */
export async function loadContributions(first = 50): Promise<ContributeContributions | undefined> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return undefined;

  const options = { source: 'ssr' as const, githubLogin };
  const [main, followUps] = await Promise.allSettled([
    graphqlDirect(ContributeContributionsDocument, { first }, options),
    graphqlDirect(ContributeContributionsFollowUpsDocument, { first }, options),
  ]);
  const contributions = settled(main)?.contributeContributions;
  if (!contributions) return undefined;
  const extras = byAttemptId(settled(followUps)?.contributeContributions?.items);
  return {
    ...contributions,
    items: contributions.items.map((item) => withFields(item, extras.get(item.attemptId))),
  };
}

/** A pull request's reply drafts, oldest first; `undefined` when the API does not answer them. */
export async function loadReplyDrafts(prId: string): Promise<ContributeReplyDraft[] | undefined> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return undefined;

  try {
    const { contributeReplyDrafts } = await graphqlDirect(
      ContributeReplyDraftsDocument,
      { prId },
      { source: 'ssr', githubLogin },
    );
    return contributeReplyDrafts ?? undefined;
  } catch {
    return undefined;
  }
}

/** The open pull requests whose drafts My contributions reads, at most. */
export const DRAFTS_READ_MAX = 10;

/**
 * The reply drafts of each open pull request a follow-up ran on, by its id; `undefined` for one the API does not
 * answer. Only a follow-up drafts replies, so a pull request without one (or whose rounds the API does not answer) is
 * not asked about: most loads ask nothing more.
 */
export async function loadOpenPrDrafts(
  contributions: ContributeContributions | undefined,
): Promise<Record<string, ContributeReplyDraft[] | undefined>> {
  const open = (contributions?.items ?? [])
    .filter(
      ({ pullRequest, followUps }) =>
        pullRequest.state === 'OPEN' && !!followUps && (followUps.used > 0 || !!followUps.currentAttemptId),
    )
    .slice(0, DRAFTS_READ_MAX);
  const lists = await Promise.all(open.map(({ pullRequest }) => loadReplyDrafts(pullRequest.prId)));
  return Object.fromEntries(open.map(({ pullRequest }, index) => [pullRequest.prId, lists[index]]));
}
