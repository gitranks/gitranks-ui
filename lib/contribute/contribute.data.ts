import 'server-only';

import { cache } from 'react';

import {
  ContributeActivityDocument,
  ContributeAttemptDocument,
  ContributeAttemptFollowUpFlowDocument,
  ContributeAttemptFollowUpsDocument,
  ContributeAttemptOwnAgentDocument,
  ContributeAttemptSubmitClockDocument,
  ContributeAttemptsDocument,
  ContributeAttemptsFollowUpsDocument,
  ContributeAttemptsInDocument,
  ContributeAttemptsInFollowUpsDocument,
  ContributeAttemptsInOwnAgentDocument,
  ContributeAttemptsInReviewAtDocument,
  ContributeAttemptsOpenDocument,
  ContributeAttemptsOwnAgentDocument,
  ContributeAutopilotDocument,
  ContributeChangesDocument,
  ContributeContributionsDocument,
  ContributeContributionsFollowUpsDocument,
  ContributeContributionsOwnAgentDocument,
  ContributeGrantDocument,
  ContributeImpactDocument,
  ContributeImpactReposDocument,
  ContributeIssuesDocument,
  ContributeOnboardingDocument,
  ContributeOverviewDocument,
  ContributeOwnAgentDocument,
  ContributePausedDocument,
  ContributeProfileLanguagesDocument,
  ContributeProviderInterestsDocument,
  ContributeRepliesWaitingDocument,
  ContributeReplyDraftsDocument,
  ContributeResolveHumansDocument,
  ContributeScheduleCountsDocument,
  ContributeSetDocument,
  type FollowUpFlowRead,
} from './contribute.documents';
import type {
  ContributeActivity,
  ContributeAttempt,
  ContributeAttemptDetail,
  ContributeAttemptState,
  ContributeAutopilot,
  ContributeComingSoonProvider,
  ContributeContributions,
  ContributeImpactTotals,
  ContributeIssuePage,
  ContributeIssuesFilter,
  ContributeMcpToken,
  ContributeOnboardedVia,
  ContributeOwnAgent,
  ContributePaths,
  ContributeReplyDraft,
  ContributeSet,
  ContributeView,
} from './contribute.types';
import { contributeErrorOf } from './errors';
import { isGrantAvailable } from './grant-availability';
import { ISSUES_PAGE_SIZE } from './live-issues';
import { contributeModesShown } from './modes-gate';
import {
  IN_FLIGHT_READ,
  IN_FLIGHT_STATES,
  NEEDS_YOU_READ,
  NEEDS_YOU_STATES,
  type OverviewNeedsRead,
  type OverviewNowRead,
} from './overview';
import { auth } from '@/auth';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/**
 * The signed-in user's GitHub login, for calls made on their behalf; null without a usable session. Read once per
 * request.
 */
export const viewerLogin = cache(async (): Promise<string | null> => {
  const session = await auth();
  return session?.user?.githubLogin && !session.error ? session.user.githubLogin : null;
});

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
 * grant, the pause and the onboarding are read on their own, so an API that does not answer them yet leaves them
 * `undefined` and the rest of the page working. Read once per request: the tabs and the page share it.
 */
export const loadContribute = cache(async (): Promise<ContributeView | null> => {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return null;
  // The poll's baseline before anything the page shows: a change landing meanwhile is named by the first poll.
  await loadContributeVersion();

  const options = { source: 'ssr' as const, githubLogin };
  const [overview, grant, paused, autopilot, ownAgent, onboarding, attemptsOpen] = await Promise.allSettled([
    graphqlDirect(ContributeOverviewDocument, undefined, options),
    graphqlDirect(ContributeGrantDocument, undefined, options),
    graphqlDirect(ContributePausedDocument, undefined, options),
    graphqlDirect(ContributeAutopilotDocument, undefined, options),
    graphqlDirect(ContributeOwnAgentDocument, undefined, options),
    graphqlDirect(ContributeOnboardingDocument, undefined, options),
    graphqlDirect(ContributeAttemptsOpenDocument, undefined, options),
  ]);

  if (overview.status === 'rejected') throw new ContributeUnavailableError();
  const { contribute } = overview.value;
  if (!contribute?.previewAllowed) return null;

  const pausedField = settled(paused)?.contribute?.contributor?.paused;
  const onboardingFields = settled(onboarding)?.contribute;
  const attemptsOpenField = settled(attemptsOpen)?.contribute?.attemptsOpen;
  const { contributor } = contribute;
  const withAutopilot = contributor?.autopilot
    ? {
        ...contributor,
        autopilot: autopilotOf(contributor.autopilot, settled(autopilot)?.contribute?.contributor?.autopilot),
      }
    : contributor;
  return {
    contributor: withAutopilot ? { ...withAutopilot, ...onboardedOf(onboardingFields?.contributor) } : withAutopilot,
    grant: settled(grant)?.contribute?.grant ?? undefined,
    paused: typeof pausedField === 'boolean' ? pausedField : undefined,
    grantAvailable: isGrantAvailable(),
    ownAgent: ownAgentOf(settled(ownAgent)?.contribute),
    ...(typeof attemptsOpenField === 'boolean' ? { attemptsOpen: attemptsOpenField } : {}),
  };
});

/** The onboarding fields the API answered; those it did not are left out, so they read as "not available yet". */
function onboardedOf(
  fields: { onboardedAt: string | null; onboardedVia: ContributeOnboardedVia | null } | null | undefined,
): { onboardedAt?: string | null; onboardedVia?: ContributeOnboardedVia | null } {
  if (!fields) return {};
  return {
    ...(fields.onboardedAt !== undefined ? { onboardedAt: fields.onboardedAt } : {}),
    ...(fields.onboardedVia !== undefined ? { onboardedVia: fields.onboardedVia } : {}),
  };
}

/** The user's own agent as the API answered it; `undefined` when it does not answer it (yet). */
function ownAgentOf(
  contribute: { contributor: { paths: ContributePaths } | null; mcpTokens: ContributeMcpToken[] } | null | undefined,
): ContributeOwnAgent | undefined {
  if (!contribute || !Array.isArray(contribute.mcpTokens)) return undefined;
  return {
    paths: contribute.contributor?.paths ?? { hosted: false, mcp: contribute.mcpTokens.length > 0 },
    tokens: contribute.mcpTokens,
  };
}

/** The languages the matching moment shows. */
export const PROFILE_LANGUAGES_MAX = 4;

/** The signed-in user's strongest languages on their profile, by name; none when it is not answered. */
export async function loadProfileLanguages(): Promise<string[]> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return [];

  try {
    const { user } = await graphqlDirect(
      ContributeProfileLanguagesDocument,
      { login: githubLogin, limit: PROFILE_LANGUAGES_MAX },
      { source: 'ssr', githubLogin },
    );
    return (user?.sLangs ?? []).map(({ name }) => name).filter(Boolean);
  } catch {
    return [];
  }
}

/** The coming-soon providers the signed-in user asked to be told about; none when the API does not answer (yet). */
export async function loadProviderInterests(): Promise<ContributeComingSoonProvider[]> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return [];

  try {
    const { contribute } = await graphqlDirect(ContributeProviderInterestsDocument, undefined, {
      source: 'ssr',
      githubLogin,
    });
    const interests = contribute?.providerInterests;
    return Array.isArray(interests) ? interests.filter((provider) => typeof provider === 'string') : [];
  } catch {
    return [];
  }
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
      { first: ISSUES_PAGE_SIZE, ...(after ? { after } : {}), ...(Object.keys(filter).length ? { filter } : {}) },
      { source: 'ssr', githubLogin },
    );
    return contributeIssues;
  } catch {
    return undefined;
  }
}

/**
 * What the signed-in user works on: the mode, the lists and the ignored repos. Null when the modes are not shown to
 * them (nothing is asked then) or the API hides them; `undefined` when the API does not answer. Read once per request.
 */
export const loadContributeSet = cache(async (): Promise<ContributeSet | null | undefined> => {
  const githubLogin = await viewerLogin();
  if (!contributeModesShown(githubLogin)) return null;

  try {
    const { contributeSet } = await graphqlDirect(ContributeSetDocument, undefined, {
      source: 'ssr',
      githubLogin: githubLogin as string,
    });
    return contributeSet;
  } catch {
    return undefined;
  }
});

/**
 * What the API is working on for the signed-in user (new repos read, the stack worked out). Null when the modes are
 * not shown to them, the API hides it or does not answer: no activity is shown then. Read once per request.
 */
export const loadContributeActivity = cache(async (): Promise<ContributeActivity | null> => {
  const githubLogin = await viewerLogin();
  if (!contributeModesShown(githubLogin)) return null;

  try {
    const { contributeActivity } = await graphqlDirect(ContributeActivityDocument, undefined, {
      source: 'ssr',
      githubLogin: githubLogin as string,
    });
    return contributeActivity;
  } catch {
    return null;
  }
});

/**
 * The version of what the signed-in user sees, as this request reads it: the poll's baseline, so it names only what
 * moves after the page was read. Null when the API hides it or does not answer (the first poll sets the baseline).
 */
export const loadContributeVersion = cache(async (): Promise<string | null> => {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return null;
  try {
    const { contributeChanges } = await graphqlDirect(
      ContributeChangesDocument,
      { since: null },
      { source: 'ssr', githubLogin },
    );
    return contributeChanges?.version ?? null;
  } catch {
    return null;
  }
});

/** The signed-in user's attempts, newest first, optionally in one state; `undefined` when the API does not answer. */
export async function loadAttempts(
  state?: ContributeAttemptState,
  first = 20,
): Promise<ContributeAttempt[] | undefined> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return undefined;

  const variables = { first, ...(state ? { state } : {}) };
  const options = { source: 'ssr' as const, githubLogin };
  return attemptsOf(
    await Promise.allSettled([
      graphqlDirect(ContributeAttemptsDocument, variables, options),
      graphqlDirect(ContributeAttemptsFollowUpsDocument, variables, options),
      graphqlDirect(ContributeAttemptsOwnAgentDocument, variables, options),
    ]),
  );
}

type AttemptRows = { contributeAttempts: ({ attemptId: string } & object)[] | null };

/** The attempts of the first read, with the fields of the others merged in; `undefined` when the first failed. */
function attemptsOf([main, ...extras]: [
  PromiseSettledResult<{ contributeAttempts: ContributeAttempt[] | null }>,
  ...PromiseSettledResult<AttemptRows>[],
]): ContributeAttempt[] | undefined {
  const attempts = settled(main)?.contributeAttempts;
  if (!attempts) return undefined;
  const rows = extras.map((extra) => byAttemptId(settled(extra)?.contributeAttempts));
  return attempts.map((attempt) =>
    rows.reduce((merged, row) => withFields(merged, row.get(attempt.attemptId)), attempt),
  );
}

/**
 * The signed-in user's attempts in any of `states`, newest first, with their follow-up and own-agent fields;
 * `undefined` when the API does not answer (an API that does not take `states` yet among them).
 */
export async function loadAttemptsIn(
  states: ContributeAttemptState[],
  first = 20,
): Promise<ContributeAttempt[] | undefined> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return undefined;

  const variables = { states, first };
  const options = { source: 'ssr' as const, githubLogin };
  return attemptsOf(
    await Promise.allSettled([
      graphqlDirect(ContributeAttemptsInDocument, variables, options),
      graphqlDirect(ContributeAttemptsInFollowUpsDocument, variables, options),
      graphqlDirect(ContributeAttemptsInOwnAgentDocument, variables, options),
    ]),
  );
}

/** Overview's "Needs you": the attempts waiting for the user, and the replies they can approve. */
export async function loadOverviewNeeds(): Promise<OverviewNeedsRead> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { reviews: undefined, replies: undefined };

  const options = { source: 'ssr' as const, githubLogin };
  const variables = { states: NEEDS_YOU_STATES, first: NEEDS_YOU_READ };
  const [attempts, reviewAt, replies] = await Promise.allSettled([
    loadAttemptsIn(NEEDS_YOU_STATES, NEEDS_YOU_READ),
    graphqlDirect(ContributeAttemptsInReviewAtDocument, variables, options),
    graphqlDirect(ContributeRepliesWaitingDocument, undefined, options),
  ]);
  const reviews = settled(attempts);
  const readyAt = byAttemptId(settled(reviewAt)?.contributeAttempts);
  const waiting = settled(replies)?.contributeRepliesWaiting;
  return {
    reviews: reviews?.map((attempt) => withFields(attempt, readyAt.get(attempt.attemptId))),
    replies: Array.isArray(waiting) ? waiting : undefined,
  };
}

/** Overview's "Right now": the attempts in flight, and what the scheduler counts before it starts one. */
export async function loadOverviewNow(): Promise<OverviewNowRead> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { inFlight: undefined, scheduleCounts: undefined };

  const [inFlight, counts] = await Promise.allSettled([
    loadAttemptsIn(IN_FLIGHT_STATES, IN_FLIGHT_READ),
    graphqlDirect(ContributeScheduleCountsDocument, undefined, { source: 'ssr', githubLogin }),
  ]);
  const scheduleCounts = settled(counts)?.contribute?.contributor?.scheduleCounts;
  return {
    inFlight: settled(inFlight),
    scheduleCounts:
      typeof scheduleCounts?.prBound === 'number' && typeof scheduleCounts.queued === 'number'
        ? scheduleCounts
        : undefined,
  };
}

/** Overview's "Your impact": the totals, with `reposHelped` when the API answers it; `undefined` when it does not. */
export async function loadOverviewImpact(): Promise<ContributeImpactTotals | undefined> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return undefined;

  const options = { source: 'ssr' as const, githubLogin };
  const [totals, repos] = await Promise.allSettled([
    graphqlDirect(ContributeImpactDocument, undefined, options),
    graphqlDirect(ContributeImpactReposDocument, undefined, options),
  ]);
  const main = settled(totals)?.contributeContributions?.totals;
  if (!main) return undefined;
  const reposHelped = settled(repos)?.contributeContributions?.totals.reposHelped;
  return { ...main, ...(typeof reposHelped === 'number' ? { reposHelped } : {}) };
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
  const ownAgent = Promise.resolve(graphqlDirect(ContributeAttemptOwnAgentDocument, { id }, options)).catch(
    () => undefined,
  );
  // The submission's step clock, for the stepper's durations; left out when the API does not answer it.
  const clock = Promise.resolve(graphqlDirect(ContributeAttemptSubmitClockDocument, { id }, options)).catch(
    () => undefined,
  );
  // The follow-up flow's fields (the threads, the checks in a word, the rounds); left out when not answered.
  const flow = Promise.resolve(graphqlDirect(ContributeAttemptFollowUpFlowDocument, { id }, options)).catch(
    () => undefined,
  );
  try {
    const { contributeAttempt: read } = await review;
    if (!read) return read;
    const timed = (await clock)?.contributeAttempt;
    const contributeAttempt =
      timed?.attemptId === read.attemptId && read.submit && timed.submit?.step === read.submit.step
        ? { ...read, submit: { ...read.submit, ...timed.submit } }
        : read;
    const extra = (await followUps)?.contributeAttempt;
    const withFollowUps = withFields(
      contributeAttempt,
      extra?.attemptId === contributeAttempt.attemptId ? extra : undefined,
    );
    const flowRead = (await flow)?.contributeAttempt;
    const withFlow = withFollowUpFlow(
      withFollowUps,
      flowRead?.attemptId === contributeAttempt.attemptId ? flowRead : undefined,
    );
    const agent = (await ownAgent)?.contributeAttempt;
    if (agent?.attemptId !== contributeAttempt.attemptId) return withFlow;
    const { result, ...fields } = agent;
    const merged = withFields(withFlow, fields);
    return merged.result && result ? { ...merged, result: { ...merged.result, prTitle: result.prTitle } } : merged;
  } catch (failure) {
    const { error } = contributeErrorOf(failure);
    if (error === 'NOT_FOUND' || error === 'SIGNED_OUT' || error === 'INVALID') return null;
    if (error === 'NOT_AVAILABLE_YET') return undefined;
    throw new ContributeUnavailableError();
  }
}

/**
 * The follow-up flow's fields over the review: the checks in a word, the threads waiting, the round and the rounds,
 * each draft's outcome and each test's `notRun`, matched by id (a draft or test the flow read does not name keeps
 * its own fields only).
 */
export function withFollowUpFlow(
  attempt: ContributeAttemptDetail,
  flow: FollowUpFlowRead | undefined,
): ContributeAttemptDetail {
  if (!flow) return attempt;
  const drafts = new Map((flow.replyDrafts ?? []).map(({ draftId, ...fields }) => [draftId, fields]));
  const notRun = new Map((flow.result?.tests ?? []).map((test) => [test.command, test.notRun]));
  return {
    ...attempt,
    checkStatus: flow.checkStatus,
    reviewFeedback: flow.reviewFeedback,
    round: flow.round,
    followUps: attempt.followUps
      ? { ...attempt.followUps, history: flow.followUps?.history ?? null }
      : attempt.followUps,
    result: attempt.result
      ? {
          ...attempt.result,
          tests: attempt.result.tests.map((test) => ({ ...test, notRun: notRun.get(test.command) ?? null })),
        }
      : attempt.result,
    replyDrafts: attempt.replyDrafts?.map((draft) => ({ ...draft, ...drafts.get(draft.draftId) })),
  };
}

/** Whether the user's follow-ups resolve people's threads too; `undefined` when the API does not answer it. */
export async function loadResolveHumanThreads(): Promise<boolean | undefined> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return undefined;
  try {
    const read = await graphqlDirect(ContributeResolveHumansDocument, undefined, { source: 'ssr', githubLogin });
    const on = read.contribute?.contributor?.settings?.resolveHumanThreads;
    return typeof on === 'boolean' ? on : undefined;
  } catch {
    return undefined;
  }
}

/** My contributions: the user's pull requests and their totals; `undefined` when the API does not answer them. */
export async function loadContributions(first = 50): Promise<ContributeContributions | undefined> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return undefined;

  const options = { source: 'ssr' as const, githubLogin };
  const [main, followUps, ownAgent] = await Promise.allSettled([
    graphqlDirect(ContributeContributionsDocument, { first }, options),
    graphqlDirect(ContributeContributionsFollowUpsDocument, { first }, options),
    graphqlDirect(ContributeContributionsOwnAgentDocument, { first }, options),
  ]);
  const contributions = settled(main)?.contributeContributions;
  if (!contributions) return undefined;
  const extras = byAttemptId(settled(followUps)?.contributeContributions?.items);
  const agents = byAttemptId(settled(ownAgent)?.contributeContributions?.items);
  return {
    ...contributions,
    items: contributions.items.map((item) =>
      withFields(withFields(item, extras.get(item.attemptId)), agents.get(item.attemptId)),
    ),
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
