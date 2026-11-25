import type { Route } from 'next';

import type { ContributeMcpToken, ContributeOAuthClientWhere, ContributeOAuthWaiting } from './contribute.types';
import { AUTHORIZE_PATH } from './paths';

/**
 * An agent's sign-in to the MCP server: the consent page at `/contribute/authorize?request=<id>`. The server holds
 * the request; this page reads it, and Allow answers where the browser goes back to the agent.
 */

/** Whether the connection is an agent that signed in, not a personal token. */
export const isSignedInAgent = (token: Pick<ContributeMcpToken, 'kind'>): boolean => token.kind === 'OAUTH';

/** The personal tokens alone: their cap counts only them. */
export const personalTokensOf = (tokens: ContributeMcpToken[] | undefined): ContributeMcpToken[] =>
  (tokens ?? []).filter((token) => !isSignedInAgent(token));

/** Where the MCP server answers; Cancel goes back through it, so the agent hears the user said no. */
export const MCP_ORIGIN = 'https://mcp.gitranks.com';

/** A request's id: 32 random bytes, base64url. */
const REQUEST_ID = /^[A-Za-z0-9_-]{43}$/;

/** The request id from the page's query, or null for anything the server could not have made. */
export function requestIdOf(value: string | string[] | null | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === 'string' && REQUEST_ID.test(first) ? first : null;
}

/** The consent page of one request: where the sign-in brings the user back. */
export const authorizeHrefOf = (requestId: string): Route =>
  `${AUTHORIZE_PATH}?request=${encodeURIComponent(requestId)}` as Route;

/**
 * The directory reviewers' sign-in: a username and password that connect one review account, with no session here.
 * Shown as a link on the signed-out consent page; the API answers "not available" while no review account is set.
 */
export const REVIEW_SIGN_IN_SHOWN = true;

/** The consent page's review sign-in form for one request. */
export const authorizeReviewHrefOf = (requestId: string): Route =>
  `${AUTHORIZE_PATH}?request=${encodeURIComponent(requestId)}&review=1` as Route;

/** The review sign-in's fields at most (the API checks the same). */
export const REVIEW_USERNAME_MAX = 64;
export const REVIEW_PASSWORD_MAX = 200;

/** Cancel: the MCP server tells the agent the user said no. It works signed out too. */
export const authorizeCancelHrefOf = (requestId: string): string =>
  `${MCP_ORIGIN}/authorize-cancel?request=${encodeURIComponent(requestId)}`;

/** Schemes that are never an app's own (private-use) scheme. */
const NOT_PRIVATE_USE = new Set([
  'http',
  'https',
  'javascript',
  'data',
  'file',
  'blob',
  'vbscript',
  'about',
  'ws',
  'wss',
  'ftp',
  'mailto',
  'intent',
]);
/** Apps that use a short scheme of their own, without a reverse-domain name. */
const NAMED_PRIVATE_USE = new Set(['cursor', 'vscode', 'vscode-insiders']);

/**
 * A native app's own scheme (RFC 8252 §7.1): a reverse-domain one (it holds a `.`), or one of the editors we name;
 * never a web or script scheme. `scheme` is `URL.protocol`, with or without its colon.
 */
export function isPrivateUseScheme(scheme: string): boolean {
  const name = scheme.replace(/:$/, '').toLowerCase();
  if (!/^[a-z][a-z0-9+.-]*$/.test(name) || NOT_PRIVATE_USE.has(name)) return false;
  return name.includes('.') || NAMED_PRIVATE_USE.has(name);
}

const LOOPBACK_HOSTS = new Set(['127.0.0.1', '[::1]', 'localhost']);

/**
 * Whether the browser may go to the agent's redirect: `https:` anywhere, `http:` to this computer only, or an app's own
 * scheme. Never `javascript:`, `data:`, `file:` or anything that does not parse.
 */
export function isSafeRedirect(redirectTo: unknown): redirectTo is string {
  if (typeof redirectTo !== 'string' || !redirectTo) return false;
  let url: URL;
  try {
    url = new URL(redirectTo);
  } catch {
    return false;
  }
  if (url.protocol === 'https:') return true;
  if (url.protocol === 'http:') return LOOPBACK_HOSTS.has(url.hostname.toLowerCase());
  return isPrivateUseScheme(url.protocol);
}

/** Where the page says the browser goes back to, and the warning for a web address we do not know. */
export function clientWhereTextOf(where: ContributeOAuthClientWhere | null | undefined): {
  text: string;
  warning: string | null;
} {
  switch (where?.kind) {
    case 'LOOPBACK':
      return { text: 'an app on this computer', warning: null };
    case 'KNOWN':
      return { text: where.label, warning: null };
    case 'SCHEME':
      return { text: `the app that opens ${where.label} links`, warning: null };
    case 'WEB':
      return { text: where.label, warning: `Only continue if you started this from ${where.label}.` };
    default:
      return { text: 'an app you started this from', warning: null };
  }
}

/**
 * "7 issues are waiting for you."; null when none is. It names no project: issue details stay hidden until the person
 * asks to see an issue.
 */
export function waitingLineOf(waiting: Pick<ContributeOAuthWaiting, 'count'> | null | undefined): string | null {
  const count = waiting?.count ?? 0;
  if (count < 1) return null;
  return count === 1 ? '1 issue is waiting for you.' : `${count.toLocaleString('en-US')} issues are waiting for you.`;
}

/** "How it works", above what the agent can do: each line's first sentence, then the rest. */
export const HOW_IT_WORKS = [
  { lead: 'Your agent fixes open-source issues picked for you.', rest: null },
  { lead: 'You read every change and approve each pull request on GitRanks.', rest: 'It opens in your name.' },
  {
    lead: 'It is free.',
    rest: 'You can see 10 to 70 full issues a day, by your GitRanks tier, and 5 more for each pull request merged through GitRanks, up to 100.',
  },
] as const;

type AuthorizeSigns = { contributeOnboardedAt?: string | null; learnOnboardedAt?: string | null };

/**
 * The signs from the API's answer of the person's Contribute data: not read without that answer; neither set when it
 * names no contributor (a new account has no row until its first write); else the contributor's.
 */
export function authorizeSignsOf(
  contribute: { contributor: AuthorizeSigns | null } | null | undefined,
): AuthorizeSigns | null {
  if (!contribute) return null;
  return contribute.contributor ?? { contributeOnboardedAt: null, learnOnboardedAt: null };
}

/**
 * Whether the person who allows an agent has gone through neither product's onboarding: both signs read, and neither
 * set. A sign that was not read counts as there, so the page says what it said before the signs.
 */
export function authorizeNeedsSetupOf(signs: AuthorizeSigns | null | undefined): boolean {
  return !!signs && signs.contributeOnboardedAt === null && signs.learnOnboardedAt === null;
}

/** What the connected agent can do, as the consent page lists it. */
export const AGENT_CAN = [
  'see the issues picked for you, and take one;',
  'hand back changes for you to review here;',
  'see the issues you took and your pull requests.',
] as const;

/** What it can't. */
export const AGENT_CANNOT =
  "It won't be able to open a pull request, push, or post on GitHub (you approve each pull request here), or see your Claude key, settings or GitHub access.";
