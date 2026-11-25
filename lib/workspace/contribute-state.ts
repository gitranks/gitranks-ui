import type {
  ContributeCredential,
  ContributeFairUseNotice,
  ContributeSettings,
  ContributeView,
} from './contribute.types';

/**
 * What stands between the user and their next attempt, most pressing first. The GitHub grant is not among them: it is
 * asked for on the first review, from its submit button.
 */
export type ContributeNotice =
  | { kind: 'no-key' }
  | { kind: 'key-invalid' }
  | { kind: 'exhausted'; until: string | null }
  | { kind: 'limit-reached'; until: string | null }
  /**
   * Nothing new starts for this account: it can't see or claim issues. `fairUse` when a fair-use rule blocked it, with
   * the block's message (null when it could not be read).
   */
  | { kind: 'suspended'; fairUse?: { block: ContributeFairUseNotice | null } };

/** Contribute is paused for this account by its access level: nothing new starts, no issue is shown. */
export const isSuspended = (view: ContributeView | null | undefined): boolean =>
  view?.contributor?.limits?.level === 'SUSPENDED';

/** The notices of the account's access level: they belong on every page that shows notices. */
export const ACCESS_NOTICE_KINDS = ['suspended'] as const satisfies readonly ContributeNotice['kind'][];

const isAccessKind = (kind: ContributeNotice['kind']) => (ACCESS_NOTICE_KINDS as readonly string[]).includes(kind);

/**
 * The account's access level as a notice: suspended. None at any other level, or while the API does not answer the
 * limits.
 */
export function accessNoticesOf(view: ContributeView): ContributeNotice[] {
  const limits = view.contributor?.limits;
  if (!limits) return [];
  if (limits.level === 'SUSPENDED') {
    return [
      limits.reason === 'FAIR_USE'
        ? { kind: 'suspended', fairUse: { block: view.fairUseBlock ?? null } }
        : { kind: 'suspended' },
    ];
  }
  return [];
}

/** The notices other than the access level's: the key's trouble and the pause. */
export const withoutAccessNotices = (notices: ContributeNotice[]) => notices.filter(({ kind }) => !isAccessKind(kind));

/** The user works with their own agent alone: a live token, no Claude key. */
export const isOwnAgentOnly = (view: ContributeView | null | undefined): boolean =>
  !!view?.ownAgent?.paths.mcp && !claudeKeyOf(view);

/**
 * Nothing connected now: no Claude key, no live connection of their own agent and no token of one (a token waiting for
 * its agent's first call stays on the Agent tab, where it can be revoked). False when their own agent was not read:
 * that is not known, and the Agent tab says the read failed.
 */
export const hasNoAgent = (view: ContributeView | null | undefined): boolean =>
  !!view?.ownAgent && !claudeKeyOf(view) && !view.ownAgent.paths.mcp && !view.ownAgent.tokens.length;

/**
 * The user's spending limits, pacing and agent settings; null with their own agent alone and no plan, where they have
 * nothing to limit: they come with a key.
 */
export const settingsOf = (view: ContributeView): ContributeSettings | null =>
  isOwnAgentOnly(view) && !view.contributor?.plan ? null : (view.contributor?.settings ?? null);

/** The Claude key, the only live provider's. */
export const claudeKeyOf = (view: ContributeView | null | undefined): ContributeCredential | undefined =>
  view?.contributor?.credentials.find((credential) => credential.provider === 'ANTHROPIC');

/**
 * The Claude key when it counts as connected: saved and not refused (`INVALID`). Every reader of "connected" uses it;
 * `claudeKeyOf` still answers a refused key, whose notice says it stopped working.
 */
export const connectedKeyOf = (view: ContributeView | null | undefined): ContributeCredential | undefined => {
  const key = claudeKeyOf(view);
  return key && key.state !== 'INVALID' ? key : undefined;
};

/** Paused: by a refused key, which the key's notice says. */
export const isPaused = (view: ContributeView) => view.contributor?.status === 'PAUSED';

export function contributeNoticesOf(view: ContributeView): ContributeNotice[] {
  // Suspended stops everything new: it comes before what a key would fix.
  const notices: ContributeNotice[] = accessNoticesOf(view);
  const key = claudeKeyOf(view);

  // Without a key, a user who works with their own agent has nothing missing: a key is one of two ways.
  if (!key) {
    if (!view.ownAgent?.paths.mcp) notices.push({ kind: 'no-key' });
  } else if (key.state === 'INVALID') notices.push({ kind: 'key-invalid' });
  else if (key.state === 'EXHAUSTED') notices.push({ kind: 'exhausted', until: key.blockedUntil });
  else if (key.state === 'LIMIT_REACHED') notices.push({ kind: 'limit-reached', until: key.blockedUntil });
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

/** Who reads the landing: its Notify me signs a visitor in first, and toggles for a signed-in user. */
export type LandingViewer = 'visitor' | 'signed-in';

/** What `/contribute` shows. `preview` is a signed-in user seeing the visitor's landing (`?as=visitor`). */
export type ContributeHome = { screen: 'tab' } | { screen: 'landing'; viewer: LandingViewer; preview: boolean };

/**
 * `/contribute` for the signed-in user: the landing until they have entered, then the Contribute tab. `?as=visitor`
 * shows anyone the visitor's landing; how Contribute works has its own page for members (`/contribute/about`).
 */
export function contributeHomeOf(view: ContributeView, params: { as?: string | string[] }): ContributeHome {
  if (isAsVisitor(params.as)) return { screen: 'landing', viewer: 'visitor', preview: true };
  if (!isOnboarded(view)) return { screen: 'landing', viewer: 'signed-in', preview: false };
  return { screen: 'tab' };
}

/** The pages of Contribute that wait for the user: Issues, My contributions, an attempt's review, Settings. */
export type ContributeGatedPage = 'issues' | 'me' | 'runs' | 'attempt' | 'settings';

/**
 * Whether the page is open to the user; one that is not sends them to the landing. Settings is open to any
 * contributor, onboarded or not, so a user mid-setup can revoke a token or delete their data; the rest wait for
 * onboarding.
 */
export function isContributePageOpen(view: ContributeView, page: ContributeGatedPage): boolean {
  if (page === 'settings') return !!view.contributor;
  return isOnboarded(view);
}
