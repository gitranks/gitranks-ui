import type { ContributeCredential, ContributeView } from './contribute.types';

/**
 * What stands between the user and their next attempt, most pressing first. `grant-missing` only when the API says so
 * and access can be granted: an API that does not answer the grant yet shows nothing about it.
 */
export type ContributeNotice =
  | { kind: 'no-key' }
  | { kind: 'key-invalid' }
  | { kind: 'exhausted'; until: string | null }
  | { kind: 'limit-reached'; until: string | null }
  | { kind: 'paused' }
  | { kind: 'grant-missing' };

/** The Claude key, the only live provider's. */
export const claudeKeyOf = (view: ContributeView | null | undefined): ContributeCredential | undefined =>
  view?.contributor?.credentials.find((credential) => credential.provider === 'ANTHROPIC');

/** Paused by the user: the dedicated field when the API answers it, else the contributor's status. */
export const isPaused = (view: ContributeView) => view.paused ?? view.contributor?.status === 'PAUSED';

export function contributeNoticesOf(view: ContributeView): ContributeNotice[] {
  const notices: ContributeNotice[] = [];
  const key = claudeKeyOf(view);

  if (!key) notices.push({ kind: 'no-key' });
  else if (key.state === 'INVALID') notices.push({ kind: 'key-invalid' });
  else if (key.state === 'EXHAUSTED') notices.push({ kind: 'exhausted', until: key.blockedUntil });
  else if (key.state === 'LIMIT_REACHED') notices.push({ kind: 'limit-reached', until: key.blockedUntil });

  if (view.contributor && isPaused(view)) notices.push({ kind: 'paused' });
  // Nothing to ask for while access cannot be granted here.
  if (view.grantAvailable && view.grant && !view.grant.connected) notices.push({ kind: 'grant-missing' });
  return notices;
}
