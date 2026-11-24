import 'server-only';

import { cache } from 'react';

import type { ByAttemptRead, IssueAttemptRef } from './by-attempt';
import {
  type CheckNotesRead,
  ContributeActivityDocument,
  ContributeAttemptBodyUpdateDocument,
  ContributeAttemptByIssueDocument,
  ContributeAttemptCheckNotesDocument,
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
  ContributeAttemptLearnDocument,
  ContributeAttemptMovesDocument,
  ContributeAttemptOneCommentFirstDocument,
  ContributeAttemptOwnAgentDocument,
  ContributeAttemptProofDocument,
  ContributeAttemptRefDocument,
  ContributeAttemptRepliesPlanDocument,
  ContributeAttemptRepoRulesDocument,
  ContributeAttemptRetryDocument,
  ContributeAttemptReviewReasonDocument,
  ContributeAttemptSubmitClockDocument,
  ContributeAttemptsDocument,
  ContributeAttemptsFollowUpsDocument,
  ContributeAttemptsLearnDocument,
  ContributeAttemptsMovesDocument,
  ContributeAttemptsOwnAgentDocument,
  ContributeAttemptTimelineDocument,
  ContributeAutopilotDocument,
  ContributeAutopilotNoticeDocument,
  ContributeChangesDocument,
  ContributeEmailSettingsDocument,
  ContributeGrantDocument,
  ContributeLimitsDocument,
  ContributeMcpConnectionsDocument,
  ContributeNeedsYouCountDocument,
  ContributeNeedsYouDocument,
  ContributeOnboardingDocument,
  ContributeOverviewDocument,
  ContributeOwnAgentDocument,
  ContributePrNotesDocument,
  ContributeProfileLanguagesDocument,
  ContributeProviderInterestsDocument,
  ContributePullRequestsDocument,
  ContributeRepliesWaitingDocument,
  ContributeRepliesWaitingPlanDocument,
  ContributeResolveHumansDocument,
  ContributeScheduleCountsDocument,
  ContributeSetDocument,
  ContributeSetupDocument,
  ContributeSidesDocument,
  type FollowUpFlowRead,
  type NeedsYouMovesRow,
} from './contribute.documents';
import type {
  ContributeActivity,
  ContributeAttempt,
  ContributeAttemptDetail,
  ContributeAttemptMode,
  ContributeAttemptState,
  ContributeAutopilot,
  ContributeComingSoonProvider,
  ContributeEmailSettings,
  ContributeFairUseNotice,
  ContributeFairUseNotices,
  ContributeFollowUps,
  ContributeLimits,
  ContributeMcpToken,
  ContributeNeedsYou,
  ContributeNeedsYouAnswer,
  ContributeOnboardedVia,
  ContributeOwnAgent,
  ContributePaths,
  ContributePrNotes,
  ContributePullRequestsPage,
  ContributeReplyWaiting,
  ContributeScheduleCounts,
  ContributeSet,
  ContributeSides,
  ContributeView,
} from './contribute.types';
import { contributeErrorOf } from './errors';
import { fairUseNoticeIdOf } from './fair-use';
import { ContributeFairUseNoticeDocument, ContributeFairUseNoticesDocument } from './fair-use.documents';
import { isGrantAvailable } from './grant-availability';
import { contributeMcpSignIn } from './mcp-sign-in';
import { withRepliesPlanOf, withReplyPlansOf } from './one-comment';
import { PULL_REQUESTS_PAGE_SIZE } from './paths';
import { auth } from '@/auth';
import { accountEmailOf } from '@/lib/account-email';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import type { ContributeConventionsFields } from '@/lib/workspace/pr-conventions';

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
  return session?.error ? undefined : accountEmailOf(session?.user?.email);
});

export const settled = <T>(result: PromiseSettledResult<T>): T | undefined =>
  result.status === 'fulfilled' ? result.value : undefined;

/** `extra`'s fields over `item`, the ones it does not hold left out, so they read as "not available yet". */
export const withFields = <T extends object>(item: T, extra: object | undefined): T => {
  if (!extra) return item;
  const fields = Object.fromEntries(
    Object.entries(extra).filter(([key, value]) => key !== 'attemptId' && value !== undefined),
  );
  return { ...item, ...fields };
};

/** Rows of a second read by attempt id, to merge into the first read's. */
export const byAttemptId = <T extends { attemptId: string }>(rows: T[] | null | undefined) =>
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
 * Whether the viewer's GitRanks account is being set up: a new GitHub account GitRanks is reading for the first time,
 * so Contribute cannot answer for it yet. False signed out and on any failure. Read once per request.
 */
export const loadContributeSetup = cache(async (): Promise<boolean> => {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return false;
  try {
    const { contributeSetup } = await graphqlDirect(ContributeSetupDocument, undefined, { source: 'ssr', githubLogin });
    return contributeSetup === true;
  } catch {
    return false;
  }
});

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
  const [overview, grant, autopilot, autopilotNotice, ownAgent, onboarding, limits, connections, signIn, sides] =
    await Promise.allSettled([
      graphqlDirect(ContributeOverviewDocument, undefined, options),
      graphqlDirect(ContributeGrantDocument, undefined, options),
      graphqlDirect(ContributeAutopilotDocument, undefined, options),
      graphqlDirect(ContributeAutopilotNoticeDocument, undefined, options),
      graphqlDirect(ContributeOwnAgentDocument, undefined, options),
      graphqlDirect(ContributeOnboardingDocument, undefined, options),
      graphqlDirect(ContributeLimitsDocument, undefined, options),
      graphqlDirect(ContributeMcpConnectionsDocument, undefined, options),
      contributeMcpSignIn(),
      graphqlDirect(ContributeSidesDocument, undefined, options),
    ]);

  if (overview.status === 'rejected') throw new ContributeUnavailableError();
  const { contribute } = overview.value;
  if (!contribute?.previewAllowed) return null;

  const onboardingFields = settled(onboarding)?.contribute;
  const limitsField = limitsOf(settled(limits)?.contribute?.contributor?.limits);
  const { contributor } = contribute;
  // The block's message stands in for the access level's own words: read only for an account a rule blocked.
  const fairUseBlock = limitsField?.reason === 'FAIR_USE' ? ((await loadFairUseNotices())?.block ?? null) : undefined;
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
    ...sidesOf(settled(sides)?.contribute?.sides),
    grantAvailable: isGrantAvailable(),
    ownAgent: ownAgentOf(
      settled(ownAgent)?.contribute,
      settled(connections)?.contribute?.mcpTokens,
      settled(signIn) === true,
    ),
    ...(fairUseBlock !== undefined ? { fairUseBlock } : {}),
  };
});

/**
 * What the top of Contribute shows about fair use for the signed-in user: the Terms banner, the open messages, the
 * block's and the list cut's line. Null signed out, when the API hides it or does not answer: nothing is shown then.
 * Read once per request.
 */
export const loadFairUseNotices = cache(async (): Promise<ContributeFairUseNotices | null> => {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return null;
  try {
    const { contributeFairUseNotices } = await graphqlDirect(ContributeFairUseNoticesDocument, undefined, {
      source: 'ssr',
      githubLogin,
    });
    return contributeFairUseNotices ?? null;
  } catch {
    return null;
  }
});

/**
 * One of the signed-in user's messages, for its answer page; null for an id the API never gives, another user's, none,
 * signed out or any failure: the page is not found then.
 */
export async function loadFairUseNotice(noticeId: string): Promise<ContributeFairUseNotice | null> {
  const id = fairUseNoticeIdOf(noticeId);
  const githubLogin = await viewerLogin();
  if (!id || !githubLogin) return null;
  try {
    const { contributeFairUseNotice } = await graphqlDirect(
      ContributeFairUseNoticeDocument,
      { id },
      { source: 'ssr', githubLogin },
    );
    return contributeFairUseNotice ?? null;
  } catch {
    return null;
  }
}

/** The sides as the API answered them; left out when it does not answer them (yet). */
function sidesOf(sides: ContributeSides | null | undefined): { sides?: ContributeSides } {
  return typeof sides?.contribute === 'boolean' && typeof sides.learn === 'boolean' ? { sides } : {};
}

/**
 * The limits as the API answered them; `undefined` when it does not answer them (yet) or answers them partly. Issues
 * newly shown a day may be null: an API that limits only full issues a day no longer counts them.
 */
function limitsOf(limits: ContributeLimits | null | undefined): ContributeLimits | undefined {
  if (!limits || typeof limits.level !== 'string') return undefined;
  const counts = [limits.attemptsAtATime, limits.openPrsAtATime, limits.claimsPerDay];
  const reveals = limits.revealsPerDay === null || typeof limits.revealsPerDay === 'number';
  return reveals && counts.every((count) => typeof count === 'number') ? limits : undefined;
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

/**
 * The user's own agent as the API answered it; `undefined` when it does not answer it (yet). Each connection's kind
 * and where its agent goes back come from their own read (`connections`): a connection it does not name is a token.
 */
export function ownAgentOf(
  contribute: { contributor: { paths: ContributePaths } | null; mcpTokens: ContributeMcpToken[] } | null | undefined,
  connections?: Pick<ContributeMcpToken, 'id' | 'kind' | 'clientWhere'>[] | null,
  signIn = false,
): ContributeOwnAgent | undefined {
  if (!contribute || !Array.isArray(contribute.mcpTokens)) return undefined;
  const byId = new Map((Array.isArray(connections) ? connections : []).map((each) => [each.id, each]));
  return {
    paths: contribute.contributor?.paths ?? { hosted: false, mcp: contribute.mcpTokens.length > 0 },
    tokens: contribute.mcpTokens.map((token) => {
      const known = byId.get(token.id);
      return known ? { ...token, kind: known.kind, clientWhere: known.clientWhere ?? null } : token;
    }),
    signIn,
  };
}

/**
 * The viewer's own agent, as Contribute reads it (its connections and their last calls), read alone, not with the rest
 * of Contribute: the Start page. Undefined signed out or when the API does not answer it.
 */
export const loadOwnAgent = cache(async (): Promise<ContributeOwnAgent | undefined> => {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return undefined;
  const options = { source: 'ssr' as const, githubLogin };
  const [agent, connections] = await Promise.allSettled([
    graphqlDirect(ContributeOwnAgentDocument, undefined, options),
    graphqlDirect(ContributeMcpConnectionsDocument, undefined, options),
  ]);
  if (agent.status === 'rejected') return undefined;
  return ownAgentOf(
    agent.value.contribute,
    connections.status === 'fulfilled' ? connections.value.contribute?.mcpTokens : null,
  );
});

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
 * The Email rows of Settings for the signed-in user. Null when signed out or when the API hides it (Settings leaves the
 * group out then); undefined when the read failed, so the group says so and offers to try again. Read once per request.
 */
export const loadContributeEmailSettings = cache(async (): Promise<ContributeEmailSettings | null | undefined> => {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return null;

  try {
    const { contributeEmailSettings } = await graphqlDirect(ContributeEmailSettingsDocument, undefined, {
      source: 'ssr',
      githubLogin,
    });
    return contributeEmailSettings ?? null;
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
 * What waits on the signed-in user, in order, and the work in progress: the Pull requests tab's lists. Null when the
 * API hides it or does not answer it yet; `undefined` when the read failed. Read once per request.
 */
export const loadNeedsYou = cache(async (): Promise<ContributeNeedsYouAnswer | null | undefined> => {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return null;
  try {
    const { contributeNeedsYou } = await graphqlDirect(ContributeNeedsYouDocument, undefined, {
      source: 'ssr',
      githubLogin,
    });
    return contributeNeedsYou ?? null;
  } catch {
    return undefined;
  }
});

/**
 * The attempt an address by attempt names, as far as it needs: a run or a first attempt, Fix or Learn, its issue and
 * its first attempt. Null signed out, or when the API does not find it for the viewer; `undefined` when the read failed.
 */
export async function loadAttemptRef(attemptId: string): Promise<ByAttemptRead | null | undefined> {
  const githubLogin = await viewerLogin();
  if (!githubLogin || !/^[\w-]{1,64}$/.test(attemptId)) return null;
  try {
    const { contributeAttempt } = await graphqlDirect(
      ContributeAttemptRefDocument,
      { id: attemptId },
      { source: 'ssr', githubLogin },
    );
    return contributeAttempt ? { ...contributeAttempt, mode: contributeAttempt.mode ?? undefined } : null;
  } catch {
    return undefined;
  }
}

/**
 * The viewer's newest first attempt on an issue, by the address's repo and number: its id and side, the repo's current
 * name and the earlier attempts. Null signed out, for an address that names no issue of the viewer's (or a repo name
 * GitHub does not allow); `undefined` when the read failed. Read once per request: the page's layout and its session
 * both ask.
 */
export const loadIssueAttempt = cache(
  async (owner: string, repo: string, number: number): Promise<IssueAttemptRef | null | undefined> => {
    const githubLogin = await viewerLogin();
    if (!githubLogin || !Number.isSafeInteger(number) || number < 1 || number > 2_147_483_647) return null;
    try {
      const { contributeAttemptRef } = await graphqlDirect(
        ContributeAttemptByIssueDocument,
        { owner, repo, number },
        { source: 'ssr', githubLogin },
      );
      return contributeAttemptRef ?? null;
    } catch {
      return undefined;
    }
  },
);

/**
 * One page of the user's pull requests, newest first, under a state chip and a side ("Made with"); `undefined` when
 * the API does not answer.
 */
export async function loadPullRequestsPage({
  page,
  state,
  mode,
}: {
  page: number;
  state: 'OPEN' | 'MERGED' | 'CLOSED' | null;
  mode: ContributeAttemptMode | null;
}): Promise<ContributePullRequestsPage | undefined> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return undefined;
  try {
    const { contributeContributions } = await graphqlDirect(
      ContributePullRequestsDocument,
      { first: PULL_REQUESTS_PAGE_SIZE, offset: (Math.max(1, page) - 1) * PULL_REQUESTS_PAGE_SIZE, state, mode },
      { source: 'ssr', githubLogin },
    );
    return contributeContributions ?? undefined;
  } catch {
    return undefined;
  }
}

/** The scheduler's counts: the pull requests open or on their way (`prBound`); `undefined` when not answered. */
export const loadScheduleCounts = cache(async (): Promise<ContributeScheduleCounts | undefined> => {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return undefined;
  try {
    const { contribute } = await graphqlDirect(ContributeScheduleCountsDocument, undefined, {
      source: 'ssr',
      githubLogin,
    });
    const counts = contribute?.contributor?.scheduleCounts;
    return typeof counts?.prBound === 'number' && typeof counts.queued === 'number' ? counts : undefined;
  } catch {
    return undefined;
  }
});

/**
 * How many things wait on the signed-in user: the Pull requests tab's count. Null when the API hides it, does not
 * answer it yet, or fails: the tab shows no count then. Read once per request.
 */
export const loadNeedsYouCount = cache(async (): Promise<number | null> => {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return null;
  try {
    const { contributeNeedsYou } = await graphqlDirect(ContributeNeedsYouCountDocument, undefined, {
      source: 'ssr',
      githubLogin,
    });
    return contributeNeedsYou?.count ?? null;
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
      graphqlDirect(ContributeAttemptsLearnDocument, variables, options),
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
 * The reply drafts the user can approve now, oldest first; `undefined` when the API does not answer them. Read once per
 * request: a contribution's layout and its page share it.
 */
export const loadRepliesWaiting = cache(async (): Promise<ContributeReplyWaiting[] | undefined> => {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return undefined;
  try {
    const options = { source: 'ssr' as const, githubLogin };
    // Each reply's plan (one comment, the run's first reply, held back): read on its own, left out when not answered.
    const plans = Promise.resolve(graphqlDirect(ContributeRepliesWaitingPlanDocument, undefined, options)).catch(
      () => undefined,
    );
    const { contributeRepliesWaiting } = await graphqlDirect(ContributeRepliesWaitingDocument, undefined, options);
    if (!Array.isArray(contributeRepliesWaiting)) return undefined;
    return withReplyPlansOf(contributeRepliesWaiting, (await plans)?.contributeRepliesWaiting);
  } catch {
    return undefined;
  }
});

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
  // The failing checks that call nobody, and a run's verdicts on the failing checks; left out when not answered.
  const checkNotes = Promise.resolve(graphqlDirect(ContributeAttemptCheckNotesDocument, { id }, options)).catch(
    () => undefined,
  );
  // The run's replies plan (one comment, the org's refusal, the first reply in its thread); left out when not answered.
  const repliesPlan = Promise.resolve(graphqlDirect(ContributeAttemptRepliesPlanDocument, { id }, options)).catch(
    () => undefined,
  );
  // Whether the run's replies go straight to one comment, and why each went as a comment; left out when not answered.
  const oneCommentFirst = Promise.resolve(
    graphqlDirect(ContributeAttemptOneCommentFirstDocument, { id }, options),
  ).catch(() => undefined);
  // A follow-up run's new description for its pull request; left out when not answered.
  const bodyUpdate = Promise.resolve(graphqlDirect(ContributeAttemptBodyUpdateDocument, { id }, options)).catch(
    () => undefined,
  );
  // A first attempt's public timeline and its footer; left out when not answered.
  const timelineRead = Promise.resolve(graphqlDirect(ContributeAttemptTimelineDocument, { id }, options)).catch(
    () => undefined,
  );
  // A Learn attempt's mode and lesson state; left out when not answered.
  const learn = Promise.resolve(graphqlDirect(ContributeAttemptLearnDocument, { id }, options)).catch(() => undefined);
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
    const withFlow = withRepliesPlanOf(
      withRepliesPlanOf(
        withFollowUpFlow(withFollowUps, flowRead?.attemptId === contributeAttempt.attemptId ? flowRead : undefined),
        (await repliesPlan)?.contributeAttempt,
      ),
      (await oneCommentFirst)?.contributeAttempt,
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
    const timelineOwn = (await timelineRead)?.contributeAttempt;
    const withTimeline =
      timelineOwn?.attemptId === contributeAttempt.attemptId
        ? { ...withDisclosure, prFooterTimeline: timelineOwn.prFooterTimeline, timeline: timelineOwn.timeline }
        : withDisclosure;
    const stopRead = (await checkStop)?.contributeAttempt;
    const withStop =
      stopRead?.attemptId === contributeAttempt.attemptId && stopRead.checkLimit !== undefined
        ? { ...withTimeline, checkLimit: stopRead.checkLimit ?? null }
        : withTimeline;
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
    const withNotes = withCheckNotesOf(withSteps, (await checkNotes)?.contributeAttempt);
    const holdRead = (await hold)?.contributeAttempt;
    const withProof =
      holdRead?.attemptId === contributeAttempt.attemptId && holdRead.newcomersLabel !== undefined
        ? {
            ...withNotes,
            reviewReasonSource: holdRead.reviewReasonSource ?? null,
            newcomersLabel: holdRead.newcomersLabel ?? null,
          }
        : withNotes;
    const learnRead = (await learn)?.contributeAttempt;
    const withLearn =
      learnRead?.attemptId === contributeAttempt.attemptId && (learnRead.mode === 'LEARN' || learnRead.mode === 'FIX')
        ? {
            ...withProof,
            mode: learnRead.mode,
            learnActiveAt: learnRead.learnActiveAt ?? null,
            learnGatePassed: learnRead.learnGatePassed ?? null,
          }
        : withProof;
    const bodyRead = (await bodyUpdate)?.contributeAttempt;
    const withBody =
      bodyRead?.attemptId === contributeAttempt.attemptId && bodyRead.prBodyUpdate !== undefined
        ? { ...withLearn, prBodyUpdate: bodyRead.prBodyUpdate ?? null }
        : withLearn;
    const agent = (await ownAgent)?.contributeAttempt;
    if (agent?.attemptId !== contributeAttempt.attemptId) return withBody;
    const { result, ...fields } = agent;
    const merged = withFields(withBody, fields);
    return merged.result && result ? { ...merged, result: { ...merged.result, prTitle: result.prTitle } } : merged;
  } catch (failure) {
    const { error } = contributeErrorOf(failure);
    if (error === 'NOT_FOUND' || error === 'SIGNED_OUT' || error === 'INVALID') return null;
    if (error === 'NOT_AVAILABLE_YET') return undefined;
    throw new ContributeUnavailableError();
  }
}

/**
 * The attempt with its pull request's check notes and its own check verdicts, each as answered (null included).
 * Another attempt's read, or an API that does not answer them, leaves the attempt as it was.
 */
export function withCheckNotesOf(
  attempt: ContributeAttemptDetail,
  read: CheckNotesRead | null | undefined,
): ContributeAttemptDetail {
  if (!read || read.attemptId !== attempt.attemptId) return attempt;
  return {
    ...attempt,
    ...(read.checkNotes !== undefined ? { checkNotes: read.checkNotes } : {}),
    ...(read.checkVerdicts !== undefined ? { checkVerdicts: read.checkVerdicts } : {}),
  };
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
 * the API does not answer it, which leaves the rest of the page. Read once per request and attempt.
 */
export const loadPrNotes = cache(async (attemptId: string): Promise<ContributePrNotes | undefined> => {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return undefined;
  try {
    const read = await graphqlDirect(ContributePrNotesDocument, { attemptId }, { source: 'ssr', githubLogin });
    return read.contributePrNotes ?? undefined;
  } catch {
    return undefined;
  }
});

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
