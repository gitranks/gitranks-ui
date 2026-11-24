import { headers } from 'next/headers';

import { ContributeOpenDocument, ContributePreviewDocument } from './contribute.documents';
import { sessionTokenOf } from './session-token';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** How long an answer of `contributeOpen` is reused: the launch reaches every server within a minute. */
const OPEN_TTL_MS = 60_000;
/** After a failed ask, the last answer holds this long before the next try. */
const OPEN_RETRY_MS = 10_000;
let open: { value: boolean; at: number } | null = null;
let asking: Promise<boolean> | null = null;

/**
 * Whether Contribute is launched, open to everyone (the API's `contributeOpen`, true once `CONTRIBUTE_PREVIEW=true`):
 * the landing is then shown to visitors without a session too (onboarding design §9.3). Asked once a minute per
 * server, one ask at a time, not per request. A failed ask keeps the last answer (closed when there is none, as an API
 * without the field yet) and tries again 10 seconds later.
 */
export function contributeOpen(now: number): Promise<boolean> {
  if (open && now - open.at < OPEN_TTL_MS) return Promise.resolve(open.value);
  asking ??= askOpen(now).finally(() => {
    asking = null;
  });
  return asking;
}

async function askOpen(now: number): Promise<boolean> {
  try {
    const { contributeOpen: value } = await graphqlDirect(ContributeOpenDocument, undefined, { source: 'ssr' });
    open = { value: value === true, at: now };
  } catch {
    open = { value: open?.value ?? false, at: now - OPEN_TTL_MS + OPEN_RETRY_MS };
  }
  return open.value;
}

/** Forgets the cached `contributeOpen` answer (tests). */
export function resetContributeOpen(): void {
  open = null;
  asking = null;
}

/**
 * Whether Contribute is open to a signed-in user: `allowed`; `setting-up` while their GitRanks account is being set up
 * (a new GitHub account, read for the first time now), which Contribute's home says; `hidden` otherwise (off the
 * preview, no profile, or any failure).
 */
export type ContributeAccess = 'allowed' | 'setting-up' | 'hidden';

/** Whether the API opens Contribute to this GitHub login, or is setting up its account; hidden on any failure. */
export async function contributeAccessOf(githubLogin: string | null | undefined): Promise<ContributeAccess> {
  if (!githubLogin) return 'hidden';
  try {
    const { contribute, contributeSetup } = await graphqlDirect(ContributePreviewDocument, undefined, {
      source: 'ssr',
      githubLogin,
    });
    if (contribute?.previewAllowed === true) return 'allowed';
    return contributeSetup === true ? 'setting-up' : 'hidden';
  } catch {
    return 'hidden';
  }
}

/** Whether the API opens Contribute to this GitHub login (the preview list); false on any failure. */
export async function contributePreviewAllowed(githubLogin: string | null | undefined): Promise<boolean> {
  return (await contributeAccessOf(githubLogin)) === 'allowed';
}

/** The request's signed-in user's `ContributeAccess`; a visitor without a session is always hidden. */
export async function requestContributeAccess(req: { headers: Headers }): Promise<ContributeAccess> {
  const token = await sessionTokenOf(req);
  if (!token?.githubLogin || token.error) return 'hidden';
  return contributeAccessOf(token.githubLogin);
}

/**
 * The request's viewer for the workspace's pages under `/my`: `signed-out` when the request carries no session the
 * server can read (none, or an expired one), which the page answers with its sign-in; else their `ContributeAccess`.
 */
export async function requestWorkspaceAccess(req: { headers: Headers }): Promise<ContributeAccess | 'signed-out'> {
  const token = await sessionTokenOf(req);
  if (!token?.githubLogin || token.error) return 'signed-out';
  return contributeAccessOf(token.githubLogin);
}

/** Whether the request's signed-in user may see Contribute; a visitor without a session never may. */
export async function requestMaySeeContribute(req: { headers: Headers }): Promise<boolean> {
  return (await requestContributeAccess(req)) === 'allowed';
}

/**
 * Whether the current request may see Contribute's pages and blocks for visitors (the Terms section, the links between
 * the public pages): everyone once launched, until then the preview list. Reads the request, so it renders per request.
 */
export async function contributeShown(): Promise<boolean> {
  const requestHeaders = await headers();
  return (await contributeOpen(Date.now())) || requestMaySeeContribute({ headers: requestHeaders });
}
