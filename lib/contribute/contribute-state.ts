import { isAgentWelcome, welcomeClientOf } from './agent-connect';
import type { ContributeCredential, ContributeSettings, ContributeView } from './contribute.types';
import type { McpClient } from './mcp-setup';

/**
 * What stands between the user and their next attempt, most pressing first. The GitHub grant is not among them: it is
 * asked for on the first review, from its submit button.
 */
export type ContributeNotice =
  | { kind: 'no-key' }
  | { kind: 'key-invalid' }
  | { kind: 'exhausted'; until: string | null }
  | { kind: 'limit-reached'; until: string | null }
  | { kind: 'paused' };

/** The user works with their own agent alone: a live token, no Claude key. */
export const isOwnAgentOnly = (view: ContributeView | null | undefined): boolean =>
  !!view?.ownAgent?.paths.mcp && !claudeKeyOf(view);

/**
 * The user's spending limits, pacing and agent settings; null with their own agent alone and no plan, where they have
 * nothing to limit: they come with a key.
 */
export const settingsOf = (view: ContributeView): ContributeSettings | null =>
  isOwnAgentOnly(view) && !view.contributor?.plan ? null : (view.contributor?.settings ?? null);

/** The Claude key, the only live provider's. */
export const claudeKeyOf = (view: ContributeView | null | undefined): ContributeCredential | undefined =>
  view?.contributor?.credentials.find((credential) => credential.provider === 'ANTHROPIC');

/** Paused by the user: the dedicated field when the API answers it, else the contributor's status. */
export const isPaused = (view: ContributeView) => view.paused ?? view.contributor?.status === 'PAUSED';

export function contributeNoticesOf(view: ContributeView): ContributeNotice[] {
  const notices: ContributeNotice[] = [];
  const key = claudeKeyOf(view);

  // Without a key, a user who works with their own agent has nothing missing: a key is one of two ways.
  if (!key) {
    if (!view.ownAgent?.paths.mcp) notices.push({ kind: 'no-key' });
  } else if (key.state === 'INVALID') notices.push({ kind: 'key-invalid' });
  else if (key.state === 'EXHAUSTED') notices.push({ kind: 'exhausted', until: key.blockedUntil });
  else if (key.state === 'LIMIT_REACHED') notices.push({ kind: 'limit-reached', until: key.blockedUntil });

  if (view.contributor && isPaused(view)) notices.push({ kind: 'paused' });
  return notices;
}

/**
 * Onboarded: a way of contributing worked once, a Claude key stored or the user's own agent's first call. Until then
 * Contribute is the landing alone. Nothing clears it. When the API does not answer it (an older API, or its read
 * failed), it is guessed from what the user set up, so an active user is never sent back to the landing: a Claude key,
 * a plan, or a token their agent used.
 */
export function isOnboarded(view: ContributeView | null | undefined): boolean {
  const contributor = view?.contributor;
  if (!contributor) return false;
  if (contributor.onboardedAt !== undefined) return !!contributor.onboardedAt;
  return !!claudeKeyOf(view) || !!contributor.plan || !!view?.ownAgent?.tokens.some((token) => token.lastUsedAt);
}

/** Mid-setup: a token for the user's own agent is live, and the agent has not connected with it yet. */
export const isMidSetup = (view: ContributeView | null | undefined): boolean =>
  !!view?.contributor && !isOnboarded(view) && !!view.ownAgent?.paths.mcp;

/** `?as=visitor` on `/contribute`: a signed-in user sees the landing as a visitor would. It changes nothing else. */
export const AS_VISITOR = 'visitor';

const firstOf = (value: string | string[] | null | undefined) => (Array.isArray(value) ? value[0] : value);

export const isAsVisitor = (as: string | string[] | null | undefined) => firstOf(as) === AS_VISITOR;

/** Who the landing is for: its buttons sign a visitor in first, and a mid-setup user is offered to carry on. */
export type LandingViewer = 'visitor' | 'signed-in' | 'mid-setup';

/**
 * What `/contribute` shows. `preview` is a signed-in user seeing the visitor's landing (`?as=visitor`): its sign-in
 * goes straight on, as they are signed in already.
 */
export type ContributeHome =
  /** `welcome`: the user's own agent just connected (`?welcome=agent`), with the client they picked. */
  { screen: 'overview'; welcome?: McpClient } | { screen: 'landing'; viewer: LandingViewer; preview: boolean };

/**
 * `/contribute` for the signed-in user: the landing until they are onboarded, then the overview. `?about=1` shows an
 * onboarded user the landing again ("How Contribute works"), and `?as=visitor` shows anyone the visitor's landing.
 * `?welcome=agent&client=…` opens the overview with the welcome of a user whose own agent just connected.
 */
export function contributeHomeOf(
  view: ContributeView,
  params: {
    as?: string | string[];
    about?: string | string[];
    welcome?: string | string[];
    client?: string | string[];
  },
): ContributeHome {
  if (isAsVisitor(params.as)) return { screen: 'landing', viewer: 'visitor', preview: true };
  if (!isOnboarded(view)) {
    return { screen: 'landing', viewer: isMidSetup(view) ? 'mid-setup' : 'signed-in', preview: false };
  }
  if (firstOf(params.about) === '1') return { screen: 'landing', viewer: 'signed-in', preview: false };
  if (isAgentWelcome(params.welcome)) return { screen: 'overview', welcome: welcomeClientOf(params.client) };
  return { screen: 'overview' };
}

/** The pages of Contribute that wait for the user: Issues, My contributions, an attempt's review, Settings. */
export type ContributeGatedPage = 'issues' | 'me' | 'attempt' | 'settings';

/**
 * Whether the page is open to the user; one that is not sends them to the landing. Settings is open to any
 * contributor, onboarded or not, so a user mid-setup can revoke a token or delete their data; the rest wait for
 * onboarding.
 */
export function isContributePageOpen(view: ContributeView, page: ContributeGatedPage): boolean {
  if (page === 'settings') return !!view.contributor;
  return isOnboarded(view);
}
