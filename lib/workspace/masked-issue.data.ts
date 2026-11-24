import 'server-only';

import { ContributeUnavailableError, loadOwnAgent, viewerLogin } from './contribute.data';
import { contributeErrorOf } from './errors';
import { IssueNumbersDocument, IssuePageDocument, StartPageMaskDocument } from './masked-issue.documents';
import type { IssueNumbers, IssuePage } from './masked-issue.types';
import { contributeMcpSignIn } from './mcp-sign-in';
import { learnStartConnectionOf } from './start/start-page';
import { limitsOf, startPageOnboarded } from './start/start-page.data';
import type { LearnStartConnection, StartMode, StartPageAgent } from './start/start-page.types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/**
 * The reads of the page of one issue. Each is an operation of its own: an API that does not know a field yet fails
 * that read alone, and the page falls back to what the address answered before (no page: a 404; no numbers: the
 * window's words without them; no mask: today's Start page).
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
 * Whether the rules about full issues a day are live (the switch): the site shows their words and the old Start page
 * address stops naming issues nobody uncovered. False whenever the numbers cannot be read: today's words.
 */
export async function loadRulesLive(): Promise<boolean> {
  return (await loadIssueNumbers())?.rulesLive === true;
}

/**
 * The mask of the issue an old Start page address names: null when the viewer named its project or holds it, when no
 * mask is made for it, and whenever it cannot be read (an API without the field: today's Start page).
 */
export async function loadStartPageMask(ref: { repo: string; issue: number }, mode: StartMode): Promise<string | null> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return null;
  try {
    const { startPageIssue } = await graphqlDirect(
      StartPageMaskDocument,
      { repo: ref.repo, number: ref.issue, mode: mode === 'lesson' ? 'LEARN' : 'FIX' },
      { source: 'ssr', githubLogin },
    );
    return startPageIssue?.masked?.id ?? null;
  } catch {
    return null;
  }
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
