import type { Route } from 'next';

import type { ContributeMcpToken, ContributeMcpTokenCreated } from './contribute.types';
import type { ContributeActionResult } from './errors';
import { isMcpClient, type McpClient } from './mcp-setup';

/** The own-agent path: the token, the setup, then the agent's first call. */

/** How often the page asks whether the agent has called, while it is shown. */
export const AGENT_POLL_MS = 3_000;
/** Still no call after this: the page says where the variable must be. */
export const AGENT_HINT_MS = 180_000;

/** What the user asks their agent first, to make the call that connects it. */
export const AGENT_HELLO_PROMPT = 'Find me an issue on GitRanks';
/** What they ask it once it is connected, to start on an issue. */
export const AGENT_WORK_PROMPT = 'Pick the best GitRanks issue for me, fix it, run the tests and submit the patch.';

/** `?welcome=agent` on `/contribute`: the agent just connected. */
export const AGENT_WELCOME = 'agent';

const firstOf = (value: string | string[] | null | undefined) => (Array.isArray(value) ? value[0] : value);

export const isAgentWelcome = (welcome: string | string[] | null | undefined) => firstOf(welcome) === AGENT_WELCOME;

/** The client picked on the way in, our guess: the call does not say which client made it. Claude Code otherwise. */
export const welcomeClientOf = (client: string | string[] | null | undefined): McpClient => {
  const value = firstOf(client);
  return isMcpClient(value) ? value : 'claude-code';
};

/** Where the page goes once the agent has called. */
export const agentWelcomeHref = (client: McpClient): Route =>
  `/contribute?welcome=${AGENT_WELCOME}&client=${encodeURIComponent(client)}` as Route;

/** The address without the welcome's parameters, or null when it has none. Path, other parameters and hash stay. */
export function forgetWelcomeOf(href: string): string | null {
  const url = new URL(href);
  if (!url.searchParams.has('welcome') && !url.searchParams.has('client')) return null;
  url.searchParams.delete('welcome');
  url.searchParams.delete('client');
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * The live token a user who left mid-setup comes back to: the newest one their agent has not used. Making a new one
 * replaces it.
 */
export const unusedTokenOf = (tokens: ContributeMcpToken[] | undefined): ContributeMcpToken | undefined =>
  tokens?.findLast((token) => !token.lastUsedAt);

/**
 * Whether the agent has called, from what the page asked: the onboarded stamp for a user not onboarded before, else
 * (and when the API does not answer the stamp) the first use of the token the page watches.
 */
export function agentConnectedOf({
  onboardedBefore,
  onboardedAt,
  tokenUsedAt,
}: {
  onboardedBefore: boolean;
  /** `undefined`: not answered. */
  onboardedAt: string | null | undefined;
  /** `undefined`: not asked, or not answered. */
  tokenUsedAt: string | null | undefined;
}): boolean {
  if (!onboardedBefore && onboardedAt) return true;
  return !!tokenUsedAt;
}

/** The answer of a token replaced: the new token, or where it stopped. */
export type TokenReplaced =
  | { ok: true; created: ContributeMcpTokenCreated }
  /** The old token is still live: nothing changed. */
  | { ok: false; stage: 'revoke'; error: ContributeActionResult<never> & { ok: false } }
  /** The old token is revoked and no new one was made: the user creates one again. */
  | { ok: false; stage: 'create'; error: ContributeActionResult<never> & { ok: false } };

/**
 * "Lost it before saving it? Make a new one": the token shown is revoked first, then another made in its place, so one
 * stays live and the cap of live tokens never stands in the way.
 */
export async function replaceToken(
  shownId: string,
  name: string,
  actions: {
    revoke: (id: string) => Promise<ContributeActionResult<boolean>>;
    create: (name: string) => Promise<ContributeActionResult<ContributeMcpTokenCreated>>;
  },
): Promise<TokenReplaced> {
  const revoked = await actions.revoke(shownId);
  if (!revoked.ok) return { ok: false, stage: 'revoke', error: revoked };
  const created = await actions.create(name);
  if (!created.ok) return { ok: false, stage: 'create', error: created };
  return { ok: true, created: created.data };
}
