import type { ContributeMcpToken, ContributeMcpTokenCreated } from './contribute.types';
import type { ContributeActionResult } from './errors';
import type { McpClient } from './mcp-setup';

/** The own-agent path: the token, the setup, then the agent's first call. */

/** How often the page asks whether the agent has called, while it is shown. */
export const AGENT_POLL_MS = 3_000;
/** Still no call after this: the page says where the variable must be. */
export const AGENT_HINT_MS = 180_000;

/**
 * Another page's own words and parts for the embedded sign-in setup, where signing in is the one way (Build's start
 * flow). Without it the setup is Contribute's and Learn's, as it always was. A connect through it is not counted in
 * Contribute's numbers.
 */
export type AgentConnectVariant = {
  /** The line over the agent buttons while the setup shows. */
  intro: string;
  /** What the agent does once connected, for the agent named: in place of the setup's own paragraph. */
  about: (name: string) => string;
  /** After `ms` with no call, the waiting line says so in its place, with a warning dot. */
  late: { ms: number; title: (name: string) => string; text: (client: McpClient, check: string) => string };
};

/**
 * The live token a user who left mid-setup comes back to: the newest one their agent has not used (an agent that signed
 * in is not one). Making a new one replaces it.
 */
export const unusedTokenOf = (tokens: ContributeMcpToken[] | undefined): ContributeMcpToken | undefined =>
  tokens?.findLast((token) => !token.lastUsedAt && token.kind !== 'OAUTH');

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
