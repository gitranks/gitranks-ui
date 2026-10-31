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
export function contributeOpen(now = Date.now()): Promise<boolean> {
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

/** Whether the API opens Contribute to this GitHub login (the preview list); false on any failure. */
export async function contributePreviewAllowed(githubLogin: string | null | undefined): Promise<boolean> {
  if (!githubLogin) return false;
  try {
    const { contribute } = await graphqlDirect(ContributePreviewDocument, undefined, { source: 'ssr', githubLogin });
    return contribute?.previewAllowed === true;
  } catch {
    return false;
  }
}

/** Whether the request's signed-in user may see Contribute; a visitor without a session never may. */
export async function requestMaySeeContribute(req: { headers: Headers }): Promise<boolean> {
  const token = await sessionTokenOf(req);
  if (!token?.githubLogin || token.error) return false;
  return contributePreviewAllowed(token.githubLogin);
}
