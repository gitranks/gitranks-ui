import 'server-only';

import type { Route } from 'next';

import { learnStartConnectionOf, restartHintOf, startPullRequestPathOf, startYoursOf } from './start-page';
import {
  StartPageAttemptDocument,
  StartPageCurrentDocument,
  StartPageIssueDocument,
  StartPageLimitsDocument,
} from './start-page.documents';
import type {
  StartMode,
  StartPageAttempt,
  StartPageIssueView,
  StartPageLimits,
  StartPageView,
} from './start-page.types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import type { RequestSource } from '@/lib/signed-fetch';
import { effectiveSettingOf } from '@/lib/workspace/access-limits';
import { ContributeUnavailableError, loadOwnAgent, viewerLogin } from '@/lib/workspace/contribute.data';
import { ContributeOnboardingDocument } from '@/lib/workspace/contribute.documents';
import { type ContributeActionResult, contributeErrorOf } from '@/lib/workspace/errors';
import { contributeMcpSignIn } from '@/lib/workspace/mcp-sign-in';

type Reader = { source: RequestSource; githubLogin: string };

const NO_LIMITS: StartPageLimits = { openPrs: null, attempts: null };

/** The limits a `LIMIT_REACHED` names, as the settings, the level's caps and the scheduler's count give them. */
async function limitsOf(reader: Reader): Promise<StartPageLimits> {
  try {
    const { contribute } = await graphqlDirect(StartPageLimitsDocument, undefined, reader);
    const contributor = contribute?.contributor;
    const settings = contributor?.settings;
    const limits = contributor?.limits;
    const held = (field: 'attemptsAtATime' | 'openPrsAtATime') =>
      settings
        ? effectiveSettingOf(settings, limits, field)
        : field === 'openPrsAtATime' && typeof limits?.openPrsEffective === 'number'
          ? limits.openPrsEffective
          : null;
    const prBound = contributor?.scheduleCounts?.prBound;
    const openLimit = held('openPrsAtATime');
    return {
      openPrs:
        typeof openLimit === 'number'
          ? { count: typeof prBound === 'number' ? prBound : openLimit, limit: openLimit }
          : null,
      attempts: held('attemptsAtATime'),
    };
  } catch {
    return NO_LIMITS;
  }
}

/**
 * The Start page's answer for an issue in `mode`, as `githubLogin`: whether it can be started, and what the refusal
 * links (`OWN_IN_PROGRESS`: the lesson in progress) or counts (`LIMIT_REACHED`: the limit), read only then. A failed
 * read of those leaves them null; a failed `startPageIssue` is the error.
 */
export async function startPageViewOf(
  reader: Reader,
  repo: string,
  number: number,
  mode: StartMode,
): Promise<ContributeActionResult<StartPageIssueView>> {
  let start: StartPageIssueView['start'];
  try {
    ({ startPageIssue: start } = await graphqlDirect(
      StartPageIssueDocument,
      { repo, number, mode: mode === 'lesson' ? 'LEARN' : 'FIX' },
      reader,
    ));
  } catch (failure) {
    return { ok: false, ...contributeErrorOf(failure) };
  }
  const [current, limits] = await Promise.all([
    start.refusal === 'OWN_IN_PROGRESS'
      ? graphqlDirect(StartPageCurrentDocument, undefined, reader)
          .then((data) => data.myLearnAttempts?.current ?? null)
          .catch(() => null)
      : null,
    start.refusal === 'LIMIT_REACHED' ? limitsOf(reader) : NO_LIMITS,
  ]);
  return { ok: true, data: { start, current, limits } };
}

/** The viewer's newest live attempt on the issue, any mode, as `githubLogin`; null while there is none. */
export async function startPageAttemptOf(
  reader: Reader,
  repo: string,
  number: number,
): Promise<ContributeActionResult<StartPageAttempt | null>> {
  try {
    const { startPageAttempt } = await graphqlDirect(StartPageAttemptDocument, { repo, number }, reader);
    return { ok: true, data: startPageAttempt ?? null };
  } catch (failure) {
    return { ok: false, ...contributeErrorOf(failure) };
  }
}

/**
 * Whether the viewer was onboarded before this page: their agent's first call is then a token's first use, not the
 * onboarding stamp. Unanswered, taken as onboarded, so a stamp from before can never read as the agent calling now.
 */
export async function startPageOnboarded(reader: Reader): Promise<boolean> {
  try {
    const data = await graphqlDirect(ContributeOnboardingDocument, undefined, reader);
    const contributor = data?.contribute?.contributor;
    return contributor ? !!contributor.onboardedAt : true;
  } catch {
    return true;
  }
}

/** What the Start page renders: its view; the 404 (signed out, or closed to the viewer in this mode); or a move on. */
export type StartPageLoad =
  | { kind: 'view'; view: StartPageView }
  | { kind: 'not-found' }
  | { kind: 'claimed'; href: Route };

/** An issue the API would not take as named: the page says it can't be started here, as for one it won't show. */
const unavailable = (repo: string, number: number): StartPageIssueView => ({
  start: { repo, number, issue: null, refusal: 'UNAVAILABLE', limit: null, attempt: null },
  current: null,
  limits: NO_LIMITS,
});

/**
 * The Start page's reads for the viewer, once per request: the issue in `mode` and what its refusal names, the agent
 * (connected, and step 1's connect steps), and in lesson mode the restart sentence. The viewer's own attempt on the
 * issue moves the page on to its pull request's page (`claimed`), unless it is a Fix attempt in lesson mode, which the
 * page words. A failed read of the issue is the outage the page's error says; `goal` is the caller's (Learn's) read.
 */
export async function loadStartPageView(
  ref: { repo: string; issue: number },
  mode: StartMode,
  goal: string | null,
): Promise<StartPageLoad> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { kind: 'not-found' };
  const reader = { source: 'ssr' as const, githubLogin };
  const [answer, ownAgent, onboarded, signIn] = await Promise.all([
    startPageViewOf(reader, ref.repo, ref.issue, mode),
    loadOwnAgent(),
    startPageOnboarded(reader),
    contributeMcpSignIn(),
  ]);
  if (!answer.ok) {
    // Closed to the viewer in this mode, or an API that doesn't answer it yet: as Learn's other reads do, no page.
    if (answer.error === 'NOT_FOUND' || answer.error === 'SIGNED_OUT' || answer.error === 'NOT_AVAILABLE_YET') {
      return { kind: 'not-found' };
    }
    if (answer.error !== 'INVALID') throw new ContributeUnavailableError();
  }
  const issue = answer.ok ? answer.data : unavailable(ref.repo, ref.issue);
  const claim = startYoursOf(issue, mode);
  if (claim?.kind === 'open') {
    return {
      kind: 'claimed',
      href: startPullRequestPathOf(ref, issue),
    };
  }
  const tokens = ownAgent?.tokens;
  return {
    kind: 'view',
    view: {
      issue,
      connection: learnStartConnectionOf(tokens),
      agent: { onboarded, tokens, signIn },
      goal,
      restartHint: mode === 'lesson' && restartHintOf(tokens),
      openedAt: new Date().toISOString(),
    },
  };
}
