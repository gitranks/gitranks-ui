import type { Route } from 'next';

import { attemptActionErrorMessage, type ContributeErrorCode } from './errors';

/**
 * The first pull request asks for the GitHub grant from its submit button: the approval waits in the tab while GitHub
 * asks, and the review page sends it once the user is back with the grant. Kept in `sessionStorage`, so it never
 * leaves the tab, and matched by a nonce, so a link with a `resume` the tab did not store approves nothing.
 */

/** The query the review page comes back with. */
export const RESUME_PARAM = 'resume';

const STORAGE_KEY = 'gitranks:contribute:pending-approval';

/** The approval as the user left it: the title and body they may have edited, and their sign-off. */
export type PendingApproval = { attemptId: string; title: string; body: string; dco: boolean; nonce: string };

type SessionStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * The tab's `sessionStorage`, or null when the browser blocks it: with site data blocked, reading the property itself
 * throws, before any call on it.
 */
export function tabStoreOf(source: { readonly sessionStorage: SessionStore } | undefined): SessionStore | null {
  try {
    return source?.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/** Where GitHub sends the user back: the review, with the nonce. */
export const resumeHrefOf = (attemptId: string, nonce: string) =>
  `/contribute/attempts/${encodeURIComponent(attemptId)}?${RESUME_PARAM}=${encodeURIComponent(nonce)}` as Route;

/** Keeps the approval for the way back; false when the tab cannot keep it (storage off or blocked). */
export function savePendingApproval(store: SessionStore | null, approval: PendingApproval): boolean {
  if (!store) return false;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(approval));
    return true;
  } catch {
    return false;
  }
}

const isPending = (value: unknown): value is PendingApproval => {
  const row = value as Partial<PendingApproval> | null;
  return (
    !!row &&
    typeof row.attemptId === 'string' &&
    typeof row.title === 'string' &&
    typeof row.body === 'string' &&
    typeof row.dco === 'boolean' &&
    typeof row.nonce === 'string' &&
    row.nonce.length > 0
  );
};

/**
 * The approval kept for this attempt under this nonce, taken out of the tab so it is sent once; null, and the tab left
 * as it was, for any other attempt or nonce.
 */
export function takePendingApproval(
  store: SessionStore | null,
  attemptId: string,
  nonce: string | null | undefined,
): PendingApproval | null {
  if (!nonce || !store) return null;
  try {
    const raw = store.getItem(STORAGE_KEY);
    const stored: unknown = raw ? JSON.parse(raw) : null;
    if (!isPending(stored) || stored.attemptId !== attemptId || stored.nonce !== nonce) return null;
    store.removeItem(STORAGE_KEY);
    return stored;
  } catch {
    return null;
  }
}

/**
 * Sends the approval kept for the way back. Never rejects: a failed send (the network, right after GitHub's redirect)
 * is an error message like any refusal, so the form comes back with the title and body the user left.
 */
export async function sendPendingApproval(
  approval: PendingApproval,
  approve: (input: {
    id: string;
    title: string;
    body: string;
    dco: boolean;
  }) => Promise<{ ok: true } | { ok: false; error: ContributeErrorCode; message?: string }>,
): Promise<string | null> {
  try {
    const result = await approve({
      id: approval.attemptId,
      title: approval.title,
      body: approval.body,
      dco: approval.dco,
    });
    return result.ok ? null : attemptActionErrorMessage(result.error, result.message);
  } catch {
    return 'Your PR could not be opened: the connection failed. Your title and description are as you left them. Submit again.';
  }
}

/** A submit bounced for want of the grant: GitHub access is asked again from the review. */
export const GRANT_BOUNCES: ReadonlySet<string> = new Set(['grant_missing', 'grant_revoked']);
