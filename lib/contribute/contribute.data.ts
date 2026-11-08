import 'server-only';

import { cache } from 'react';

import {
  ContributeActivityDocument,
  ContributeAttemptCheckStopDocument,
  ContributeAttemptClaimStepsDocument,
  ContributeAttemptConventionsDocument,
  ContributeAttemptDcoDocument,
  ContributeAttemptDecisionsDocument,
  ContributeAttemptDisclosureDocument,
  ContributeAttemptDocument,
  ContributeAttemptFollowUpFlowDocument,
  ContributeAttemptFollowUpsDocument,
  ContributeAttemptHoldDocument,
  ContributeAttemptMovesDocument,
  ContributeAttemptOwnAgentDocument,
  ContributeAttemptProofDocument,
  ContributeAttemptRepoRulesDocument,
  ContributeAttemptRetryDocument,
  ContributeAttemptReviewReasonDocument,
  ContributeAttemptSubmitClockDocument,
  ContributeAttemptsDocument,
  ContributeAttemptsFollowUpsDocument,
  ContributeAttemptsInDocument,
  ContributeAttemptsInFollowUpsDocument,
  ContributeAttemptsInMovesDocument,
  ContributeAttemptsInOwnAgentDocument,
  ContributeAttemptsInReviewAtDocument,
  ContributeAttemptsMovesDocument,
  ContributeAttemptsOpenDocument,
  ContributeAttemptsOwnAgentDocument,
  ContributeAutopilotDocument,
  ContributeAutopilotNoticeDocument,
  ContributeChangesDocument,
  ContributeContributionsDocument,
  ContributeContributionsFixesDocument,
  ContributeContributionsFollowUpsDocument,
  ContributeContributionsMovesDocument,
  ContributeContributionsOwnAgentDocument,
  ContributeContributionsProofDocument,
  ContributeGrantDocument,
  ContributeImpactDocument,
  ContributeImpactReposDocument,
  ContributeIssuesDocument,
  ContributeIssuesWithRulesDocument,
  ContributeLimitsDocument,
  ContributeOnboardingDocument,
  ContributeOverviewDocument,
  ContributeOwnAgentDocument,
  ContributePausedDocument,
  ContributePrNotesDocument,
  ContributeProfileLanguagesDocument,
  ContributeProviderInterestsDocument,
  ContributeRepliesWaitingDocument,
  ContributeResolveHumansDocument,
  ContributeScheduleCountsDocument,
  ContributeSetDocument,
  type FollowUpFlowRead,
  type NeedsYouMovesRow,
} from './contribute.documents';
import type {
  ContributeActivity,
  ContributeAttempt,
  ContributeAttemptDetail,
  ContributeAttemptState,
  ContributeAutopilot,
  ContributeComingSoonProvider,
  ContributeContributions,
  ContributeFollowUps,
  ContributeImpactTotals,
  ContributeIssuePage,
  ContributeIssuesFilter,
  ContributeLimits,
  ContributeMcpToken,
  ContributeNeedsYou,
  ContributeOnboardedVia,
  ContributeOwnAgent,
  ContributePaths,
  ContributePrNotes,
  ContributeReplyWaiting,
  ContributeSet,
  ContributeView,
} from './contribute.types';
import { contributeErrorOf } from './errors';
import { isGrantAvailable } from './grant-availability';
import { ISSUES_PAGE_SIZE } from './live-issues';
import {
  IN_FLIGHT_READ,
  IN_FLIGHT_STATES,
  NEEDS_YOU_READ,
  NEEDS_YOU_STATES,
  type OverviewNeedsRead,
  type OverviewNowRead,
} from './overview';
import { auth } from '@/auth';
import type { ContributeConventionsFields } from '@/lib/contribute/pr-conventions';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/**
 * The signed-in user's GitHub login, for calls made on their behalf; null without a usable session. Read once per
 * request.
 */
/**
 * The session, read once per request: a second `auth()` would run the token refresh again, and a refresh token is
 * single-use.
 */
const viewerSession = cache(() => auth());

export const viewerLogin = cache(async (): Promise<string | null> => {
  const session = await viewerSession();
  return session?.user?.githubLogin && !session.error ? session.user.githubLogin : null;
});

/**
 * The signed-in user's email, as GitHub gave it at their first sign-in; undefined without one. Sent with Contribute's
 * writes, so the emails a user asks for ("Notify me") have an address.
 */
export const viewerEmail = cache(async (): Promise<string | undefined> => {
  const session = await viewerSession();
  const email = session?.user?.email?.trim();
  return email && !session?.error && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
    ? email
    : undefined;
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
  extra: Pick<ContributeAutopilot, 'mergedToUnlock' | 'lockedAt' | 'available' | 'noticeTo'> | undefined,
): ContributeAutopilot => ({
  ...autopilot,
  ...(typeof extra?.mergedToUnlock === 'number' ? { mergedToUnlock: extra.mergedToUnlock } : {}),
  ...(extra && extra.lockedAt !== undefined ? { lockedAt: extra.lockedAt } : {}),
  ...(typeof extra?.available === 'boolean' ? { available: extra.available } : {}),
  ...(extra && (typeof extra.noticeTo === 'string' || extra.noticeTo === null) ? { noticeTo: extra.noticeTo } : {}),
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
  const [overview, grant, paused, autopilot, autopilotNotice, ownAgent, onboarding, attemptsOpen, limits] =
    await Promise.allSettled([
      graphqlDirect(ContributeOverviewDocument, undefined, options),
      graphqlDirect(ContributeGrantDocument, undefined, options),
      graphqlDirect(ContributePausedDocument, undefined, options),
      graphqlDirect(ContributeAutopilotDocument, undefined, options),
      graphqlDirect(ContributeAutopilotNoticeDocument, undefined, options),
      graphqlDirect(ContributeOwnAgentDocument, undefined, options),
      graphqlDirect(ContributeOnboardingDocument, undefined, options),
      graphqlDirect(ContributeAttemptsOpenDocument, undefined, options),
      graphqlDirect(ContributeLimitsDocument, undefined, options),
    ]);

  if (overview.status === 'rejected') throw new ContributeUnavailableError();
  const { contribute } = overview.value;
  if (!contribute?.previewAllowed) return null;

  const pausedField = settled(paused)?.contribute?.contributor?.paused;
  const onboardingFields = settled(onboarding)?.contribute;
  const attemptsOpenField = settled(attemptsOpen)?.contribute?.attemptsOpen;
  const limitsField = limitsOf(settled(limits)?.contribute?.contributor?.limits);
  const { contributor } = contribute;
  const withAutopilot = contributor?.autopilot
    ? {
        ...contributor,
        autopilot: autopilotOf(contributor.autopilot, {
          ...settled(autopilot)?.contribute?.contributor?.autopilot,
          ...settled(autopilotNotice)?.contribute?.contributor?.autopilot,
        }),
      }
    : contributor;
  return {
    contributor: withAutopilot
      ? {
          ...withAutopilot,
          ...onboardedOf(onboardingFields?.contributor),
          ...(limitsField ? { limits: limitsField } : {}),
        }
      : withAutopilot,
    grant: settled(grant)?.contribute?.grant ?? undefined,
    paused: typeof pausedField === 'boolean' ? pausedField : undefined,
    grantAvailable: isGrantAvailable(),
    ownAgent: ownAgentOf(settled(ownAgent)?.contribute),
    ...(typeof attemptsOpenField === 'boolean' ? { attemptsOpen: attemptsOpenField } : {}),
  };
});

/** The limits as the API answered them; `undefined` when it does not answer them (yet) or answers them partly. */
function limitsOf(limits: ContributeLimits | null | undefined): ContributeLimits | undefined {
  if (!limits || typeof limits.level !== 'string') return undefined;
  const counts = [limits.attemptsAtATime, limits.openPrsAtATime, limits.claimsPerDay, limits.revealsPerDay];
  return counts.every((count) => typeof count === 'number') ? limits : undefined;
}

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

  const variables = {
    first: ISSUES_PAGE_SIZE,
    ...(after ? { after } : {}),
    ...(Object.keys(filter).length ? { filter } : {}),
  };
  const options = { source: 'ssr' as const, githubLogin };
  try {
    return (await graphqlDirect(ContributeIssuesWithRulesDocument, variables, options)).contributeIssues;
  } catch (error) {
    // An API without the repos' rules: the feed as it was.
    if (contributeErrorOf(error).error !== 'NOT_AVAILABLE_YET') return undefined;
  }
  try {
    return (await graphqlDirect(ContributeIssuesDocument, variables, options)).contributeIssues;
  } catch {
    return undefined;
  }
}

/**
 * What the signed-in user works on: the mode, the lists and the ignored repos. Null when signed out (nothing is asked
 * then) or the API hides them; `undefined` when the API does not answer. Read once per request.
 */
export const loadContributeSet = cache(async (): Promise<ContributeSet | null | undefined> => {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return null;

  try {
    const { contributeSet } = await graphqlDirect(ContributeSetDocument, undefined, {
      source: 'ssr',
      githubLogin,
    });
    return contributeSet;
  } catch {
    return undefined;
  }
});

/**
 * What the API is working on for the signed-in user: new repos read, the stack worked out, and their agent runs.
 * Null when the API hides it or does not answer: no activity is shown then. Read once per request.
 */
export const loadContributeActivity = cache(async (): Promise<ContributeActivity | null> => {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return null;

  try {
    const { contributeActivity } = await graphqlDirect(ContributeActivityDocument, undefined, {
      source: 'ssr',
      githubLogin,
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
      graphqlDirect(ContributeAttemptsMovesDocument, variables, options),
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
      graphqlDirect(ContributeAttemptsInMovesDocument, variables, options),
    ]),
  );
}

/** The reply drafts the user can approve now, oldest first; `undefined` when the API does not answer them. */
export async function loadRepliesWaiting(): Promise<ContributeReplyWaiting[] | undefined> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return undefined;
  try {
    const { contributeRepliesWaiting } = await graphqlDirect(ContributeRepliesWaitingDocument, undefined, {
      source: 'ssr',
      githubLogin,
    });
    return Array.isArray(contributeRepliesWaiting) ? contributeRepliesWaiting : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Overview's "Needs you": the attempts waiting for the user, the replies they can approve, the open pull requests,
 * and the runs in flight ("Right now"'s read, once per request).
 */
export async function loadOverviewNeeds(): Promise<OverviewNeedsRead> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { reviews: undefined, replies: undefined, contributions: undefined, runs: undefined };

  const options = { source: 'ssr' as const, githubLogin };
  const variables = { states: NEEDS_YOU_STATES, first: NEEDS_YOU_READ };
  const [attempts, reviewAt, replies, contributions, now] = await Promise.allSettled([
    loadAttemptsIn(NEEDS_YOU_STATES, NEEDS_YOU_READ),
    graphqlDirect(ContributeAttemptsInReviewAtDocument, variables, options),
    loadRepliesWaiting(),
    loadContributions(),
    loadOverviewNow(),
  ]);
  const reviews = settled(attempts);
  const readyAt = byAttemptId(settled(reviewAt)?.contributeAttempts);
  return {
    reviews: reviews?.map((attempt) => withFields(attempt, readyAt.get(attempt.attemptId))),
    replies: settled(replies),
    contributions: settled(contributions)?.items,
    runs: settled(now)?.inFlight,
  };
}

/**
 * Overview's "Right now": the attempts in flight, and what the scheduler counts before it starts one. Read once per
 * request: Needs you shows the runs under way from it too.
 */
export const loadOverviewNow = cache(async (): Promise<OverviewNowRead> => {
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
});

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
 * `ContributeUnavailableError`. Read once a request: the contribution's layout and its page both read it.
 */
export const loadAttempt = cache(readAttempt);

async function readAttempt(id: string): Promise<ContributeAttemptDetail | null | undefined> {
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
  const reviewReason = Promise.resolve(graphqlDirect(ContributeAttemptReviewReasonDocument, { id }, options)).catch(
    () => undefined,
  );
  // A hold's source and the issue's first-timers label (autopilot limits); left out when not answered.
  const hold = Promise.resolve(graphqlDirect(ContributeAttemptHoldDocument, { id }, options)).catch(() => undefined);
  // The submission's step clock, for the stepper's durations; left out when the API does not answer it.
  const clock = Promise.resolve(graphqlDirect(ContributeAttemptSubmitClockDocument, { id }, options)).catch(
    () => undefined,
  );
  // The follow-up flow's fields (the threads, the checks in a word, the rounds); left out when not answered.
  const flow = Promise.resolve(graphqlDirect(ContributeAttemptFollowUpFlowDocument, { id }, options)).catch(
    () => undefined,
  );
  // Whether the repo requires a DCO sign-off; left out when not answered.
  const dco = Promise.resolve(graphqlDirect(ContributeAttemptDcoDocument, { id }, options)).catch(() => undefined);
  // The PR's footer and co-author as the API writes them; left out when not answered.
  const disclosure = Promise.resolve(graphqlDirect(ContributeAttemptDisclosureDocument, { id }, options)).catch(
    () => undefined,
  );
  // Whether the check ran out; left out when not answered.
  const checkStop = Promise.resolve(graphqlDirect(ContributeAttemptCheckStopDocument, { id }, options)).catch(
    () => undefined,
  );
  // Whether the stop can be tried again, and how, with the no-go's release; left out when not answered.
  const retry = Promise.resolve(graphqlDirect(ContributeAttemptRetryDocument, { id }, options)).catch(() => undefined);
  // The agent's go/no-go and its brief; left out when not answered.
  const decisions = Promise.resolve(graphqlDirect(ContributeAttemptDecisionsDocument, { id }, options)).catch(
    () => undefined,
  );
  // The repo's PR conventions, the open PR's fixes, and the agent's proposed title; left out when not answered.
  const conventions = Promise.resolve(graphqlDirect(ContributeAttemptConventionsDocument, { id }, options)).catch(
    () => undefined,
  );
  // A run that ended with its number and outcome, and when the last run ended; left out when not answered.
  const moves = Promise.resolve(graphqlDirect(ContributeAttemptMovesDocument, { id }, options)).catch(() => undefined);
  // A review bot's ask for proof and the user's own agent's proof; left out when not answered.
  const proof = Promise.resolve(graphqlDirect(ContributeAttemptProofDocument, { id }, options)).catch(() => undefined);
  // The repo's rules and the limits the attempt runs under there; left out when not answered.
  const repoRules = Promise.resolve(graphqlDirect(ContributeAttemptRepoRulesDocument, { id }, options)).catch(
    () => undefined,
  );
  // The claim's check, step by step; left out when not answered.
  const claimSteps = Promise.resolve(graphqlDirect(ContributeAttemptClaimStepsDocument, { id }, options)).catch(
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
    const reason = (await reviewReason)?.contributeAttempt;
    const withFollowUps = withFields(
      reason?.attemptId === contributeAttempt.attemptId && reason.reviewReason !== undefined
        ? { ...contributeAttempt, reviewReason: reason.reviewReason }
        : contributeAttempt,
      extra?.attemptId === contributeAttempt.attemptId ? extra : undefined,
    );
    const flowRead = (await flow)?.contributeAttempt;
    const withFlow = withFollowUpFlow(
      withFollowUps,
      flowRead?.attemptId === contributeAttempt.attemptId ? flowRead : undefined,
    );
    const dcoRead = (await dco)?.contributeAttempt;
    const withDco =
      dcoRead?.attemptId === contributeAttempt.attemptId && typeof dcoRead.dcoRequired === 'boolean'
        ? { ...withFlow, dcoRequired: dcoRead.dcoRequired }
        : withFlow;
    const disclosureRead = (await disclosure)?.contributeAttempt;
    const withDisclosure =
      disclosureRead?.attemptId === contributeAttempt.attemptId && typeof disclosureRead.prFooter === 'string'
        ? { ...withDco, prFooter: disclosureRead.prFooter, prCoAuthored: disclosureRead.prCoAuthored ?? null }
        : withDco;
    const stopRead = (await checkStop)?.contributeAttempt;
    const withStop =
      stopRead?.attemptId === contributeAttempt.attemptId && stopRead.checkLimit !== undefined
        ? { ...withDisclosure, checkLimit: stopRead.checkLimit ?? null }
        : withDisclosure;
    const retryRead = (await retry)?.contributeAttempt;
    const retryOwn = retryRead?.attemptId === contributeAttempt.attemptId ? retryRead : undefined;
    const withRetry = retryOwn && retryOwn.retry !== undefined ? { ...withStop, retry: retryOwn.retry } : withStop;
    const decisionsRead = (await decisions)?.contributeAttempt;
    const release = retryOwn?.goNoGo?.release;
    const withDecisions =
      decisionsRead?.attemptId === contributeAttempt.attemptId && decisionsRead.goNoGo !== undefined
        ? {
            ...withRetry,
            goNoGo:
              decisionsRead.goNoGo && release !== undefined
                ? { ...decisionsRead.goNoGo, release }
                : decisionsRead.goNoGo,
            brief: decisionsRead.brief ?? null,
          }
        : withRetry;
    const conventionsRead = (await conventions)?.contributeAttempt;
    const movesRead = (await moves)?.contributeAttempt;
    const withConventions = withMovesOf(
      withConventionsOf(
        withDecisions,
        conventionsRead?.attemptId === contributeAttempt.attemptId ? conventionsRead : undefined,
      ),
      movesRead?.attemptId === contributeAttempt.attemptId ? movesRead : undefined,
    );
    const proofRead = (await proof)?.contributeAttempt;
    const withProofOnly =
      proofRead?.attemptId === contributeAttempt.attemptId && proofRead.proof !== undefined
        ? { ...withConventions, proof: proofRead.proof }
        : withConventions;
    const rulesRead = (await repoRules)?.contributeAttempt;
    const withRules =
      rulesRead?.attemptId === contributeAttempt.attemptId && rulesRead.repoRules !== undefined
        ? { ...withProofOnly, repoRules: rulesRead.repoRules ?? null }
        : withProofOnly;
    const stepsRead = (await claimSteps)?.contributeAttempt;
    const withSteps =
      stepsRead?.attemptId === contributeAttempt.attemptId && Array.isArray(stepsRead.claimSteps)
        ? { ...withRules, claimSteps: stepsRead.claimSteps }
        : withRules;
    const holdRead = (await hold)?.contributeAttempt;
    const withProof =
      holdRead?.attemptId === contributeAttempt.attemptId && holdRead.newcomersLabel !== undefined
        ? {
            ...withSteps,
            reviewReasonSource: holdRead.reviewReasonSource ?? null,
            newcomersLabel: holdRead.newcomersLabel ?? null,
          }
        : withSteps;
    const agent = (await ownAgent)?.contributeAttempt;
    if (agent?.attemptId !== contributeAttempt.attemptId) return withProof;
    const { result, ...fields } = agent;
    const merged = withFields(withProof, fields);
    return merged.result && result ? { ...merged, result: { ...merged.result, prTitle: result.prTitle } } : merged;
  } catch (failure) {
    const { error } = contributeErrorOf(failure);
    if (error === 'NOT_FOUND' || error === 'SIGNED_OUT' || error === 'INVALID') return null;
    if (error === 'NOT_AVAILABLE_YET') return undefined;
    throw new ContributeUnavailableError();
  }
}

/**
 * The signals with their runs (`attemptId`, `round`, `outcome`) over the ones the follow-up fields read, and when the
 * last run ended. An API that does not answer them leaves the row as it was.
 */
export function withMovesOf<T extends { needsYou?: ContributeNeedsYou | null; followUps?: ContributeFollowUps | null }>(
  row: T,
  moves: NeedsYouMovesRow | undefined,
): T {
  if (!moves) return row;
  const lastEndedAt = moves.followUps?.lastEndedAt;
  return {
    ...row,
    ...(moves.needsYou !== undefined ? { needsYou: moves.needsYou } : {}),
    ...(row.followUps && lastEndedAt !== undefined ? { followUps: { ...row.followUps, lastEndedAt } } : {}),
  };
}

/**
 * The attempt with the repo's PR conventions and the open PR's fixes (`ContributeAttemptConventions`), and the agent's
 * proposed title on its result (the form's default). An API that does not answer them leaves the attempt as it was.
 */
export function withConventionsOf(
  attempt: ContributeAttemptDetail,
  read: (Required<ContributeConventionsFields> & { result: { prTitle: string | null } | null }) | undefined,
): ContributeAttemptDetail {
  if (!read) return attempt;
  const { conventions, prIssues, prTitle, prBody, prFix, result } = read;
  const withTitle =
    attempt.result && result?.prTitle && !attempt.result.prTitle
      ? { ...attempt.result, prTitle: result.prTitle }
      : attempt.result;
  return { ...attempt, conventions, prIssues, prTitle, prBody, prFix, result: withTitle };
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

/**
 * The maintainers' say on the user's PR (any attempt of it): a stop, and the "this PR helped" notes; `undefined` when
 * the API does not answer it, which leaves the rest of the page.
 */
export async function loadPrNotes(attemptId: string): Promise<ContributePrNotes | undefined> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return undefined;
  try {
    const read = await graphqlDirect(ContributePrNotesDocument, { attemptId }, { source: 'ssr', githubLogin });
    return read.contributePrNotes ?? undefined;
  } catch {
    return undefined;
  }
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
  const [main, followUps, ownAgent, moves, fixes, proofs] = await Promise.allSettled([
    graphqlDirect(ContributeContributionsDocument, { first }, options),
    graphqlDirect(ContributeContributionsFollowUpsDocument, { first }, options),
    graphqlDirect(ContributeContributionsOwnAgentDocument, { first }, options),
    graphqlDirect(ContributeContributionsMovesDocument, { first }, options),
    graphqlDirect(ContributeContributionsFixesDocument, { first }, options),
    graphqlDirect(ContributeContributionsProofDocument, { first }, options),
  ]);
  const contributions = settled(main)?.contributeContributions;
  if (!contributions) return undefined;
  const extras = byAttemptId(settled(followUps)?.contributeContributions?.items);
  const agents = byAttemptId(settled(ownAgent)?.contributeContributions?.items);
  const runs = byAttemptId(settled(moves)?.contributeContributions?.items);
  const fixed = byAttemptId(settled(fixes)?.contributeContributions?.items);
  const proved = byAttemptId(settled(proofs)?.contributeContributions?.items);
  return {
    ...contributions,
    items: contributions.items.map((item) =>
      withFields(
        withFields(
          withMovesOf(
            withFields(withFields(item, extras.get(item.attemptId)), agents.get(item.attemptId)),
            runs.get(item.attemptId),
          ),
          fixed.get(item.attemptId),
        ),
        proved.get(item.attemptId),
      ),
    ),
  };
}
