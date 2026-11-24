import 'server-only';

import { ContributeUnavailableError, loadOwnAgent, viewerLogin } from './contribute.data';
import type { ContributeActionResult } from './errors';
import { contributeErrorOf } from './errors';
import type { IssueRules } from './fair-use';
import type { MaskedListReads } from './masked-issue';
import {
  IssueLooksTodayDocument,
  IssueNumbersDocument,
  IssuePageDocument,
  StartPageMaskDocument,
} from './masked-issue.documents';
import type { IssueLooksToday, IssueNumbers, IssuePage } from './masked-issue.types';
import { contributeMcpSignIn } from './mcp-sign-in';
import { issueRules } from './rules-live';
import { learnStartConnectionOf } from './start/start-page';
import { limitsOf, startPageOnboarded } from './start/start-page.data';
import type { LearnStartConnection, StartMode, StartPageAgent, StartPageIssue } from './start/start-page.types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/**
 * The reads of the page of one issue. Each is an operation of its own: an API that does not know a field yet fails
 * that read alone, and the page falls back to what the address answered before (no page: a 404; no numbers: the
 * window's words without them; no mask: today's Start page, read as today).
 */

/** The page of one issue, or none: an id no issue has, a viewer it is not open to, or an API without the page yet. */
export type IssuePageLoad = { kind: 'page'; page: IssuePage } | { kind: 'not-found' };

/**
 * The page of one issue for the viewer, by its mask id. An API that does not know the page yet answers as the address
 * did before it existed: not found. An outage is the page's error, never a 404.
 */
export async function loadIssuePage(id: string): Promise<IssuePageLoad> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { kind: 'not-found' };
  try {
    const { issuePage } = await graphqlDirect(IssuePageDocument, { id }, { source: 'ssr', githubLogin });
    return issuePage ? { kind: 'page', page: issuePage } : { kind: 'not-found' };
  } catch (failure) {
    const { error } = contributeErrorOf(failure);
    if (error === 'NOT_FOUND' || error === 'SIGNED_OUT' || error === 'NOT_AVAILABLE_YET') return { kind: 'not-found' };
    throw new ContributeUnavailableError();
  }
}

/** The numbers of a night, public; null when they cannot be read (the window then says it without them). */
export async function loadIssueNumbers(): Promise<IssueNumbers | null> {
  try {
    const { issueNumbers } = await graphqlDirect(IssueNumbersDocument, undefined, { source: 'ssr', revalidate: 300 });
    return issueNumbers ?? null;
  } catch {
    return null;
  }
}

/**
 * An old Start page address's answer, read once with the issue's mask: `answer` goes on to the Start page as its own
 * read would (an issue it cannot show is its answer too), `maskId` is null when the viewer named the issue's project or
 * holds it. Null when the API does not know the mask yet: the page reads its answer as today. An outage is the page's
 * error, as the Start page's own read is.
 */
export type StartPageWithMask = { answer: ContributeActionResult<StartPageIssue>; maskId: string | null };

export async function loadStartPageWithMask(
  ref: { repo: string; issue: number },
  mode: StartMode,
): Promise<StartPageWithMask | null> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return null;
  try {
    const { startPageIssue } = await graphqlDirect(
      StartPageMaskDocument,
      { repo: ref.repo, number: ref.issue, mode: mode === 'lesson' ? 'LEARN' : 'FIX' },
      { source: 'ssr', githubLogin },
    );
    const { masked, ...start } = startPageIssue;
    return { answer: { ok: true, data: start }, maskId: masked?.id ?? null };
  } catch (failure) {
    const error = contributeErrorOf(failure);
    if (error.error === 'NOT_AVAILABLE_YET') return null;
    if (error.error === 'NOT_FOUND' || error.error === 'SIGNED_OUT' || error.error === 'INVALID') {
      return { answer: { ok: false, ...error }, maskId: null };
    }
    throw new ContributeUnavailableError();
  }
}

/**
 * The viewer's full issues today: a read of its own, as the viewer. Null signed out, and whenever it cannot be read (an
 * API without it yet, or one that does not answer): the lists then show no looks line.
 */
export async function loadIssueLooksToday(): Promise<IssueLooksToday | null> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return null;
  try {
    const { issueLooksToday } = await graphqlDirect(IssueLooksTodayDocument, undefined, { source: 'ssr', githubLogin });
    return issueLooksToday ?? null;
  } catch {
    return null;
  }
}

/**
 * What a list of masked issues shows beside its rows, read beside the list: the rules (the one reader the Terms and the
 * old Start page address use), the numbers of a night for the window, then the viewer's day only once the rules are
 * live. Nothing here holds the list up: each read that fails leaves its part out. Rules the API does not know are
 * today's; rules it did not answer are unknown, and the list says no words about its limits.
 */
export async function loadMaskedListReads(): Promise<MaskedListReads> {
  const [rules, numbers] = await Promise.all([
    issueRules().catch((): IssueRules => ({ state: 'unknown' })),
    loadIssueNumbers(),
  ]);
  const rulesLive = rules.state === 'live';
  const looks = rulesLive ? await loadIssueLooksToday() : null;
  return {
    rulesLive,
    ...(rules.state === 'unknown' ? { rulesUnknown: true } : {}),
    looks,
    numbers: numbers ? { read: numbers.read, kept: numbers.kept } : null,
  };
}

/** What the form "Start fixing it" needs: the agents, the connect steps' reads, and the pull requests that wait. */
export type IssueStartReads = {
  /** The own agent has called: its connection. Null until it has. */
  connection: LearnStartConnection | null;
  /** The connect steps' reads, for someone with no agent yet. */
  agent: StartPageAgent;
  /** Pull requests waiting on maintainers when they are too many to start another; null: room to start. */
  waitingPrs: number | null;
};

/** The start form's reads for the viewer who holds an issue. Each failed read leaves its part as if nothing were there. */
export async function loadIssueStartReads(): Promise<IssueStartReads> {
  const githubLogin = await viewerLogin();
  const reader = { source: 'ssr' as const, githubLogin: githubLogin ?? '' };
  const [ownAgent, onboarded, signIn, limits] = await Promise.all([
    loadOwnAgent(),
    githubLogin ? startPageOnboarded(reader) : true,
    contributeMcpSignIn(),
    githubLogin ? limitsOf(reader) : null,
  ]);
  const open = limits?.openPrs;
  return {
    connection: learnStartConnectionOf(ownAgent?.tokens),
    agent: { onboarded, tokens: ownAgent?.tokens, signIn },
    waitingPrs: open && open.limit > 0 && open.count >= open.limit ? open.count : null,
  };
}
