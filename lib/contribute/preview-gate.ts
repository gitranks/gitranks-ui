import { ContributeOpenDocument, ContributePreviewDocument } from './contribute.documents';
import { sessionTokenOf } from './session-token';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** How long an answer of `contributeOpen` is reused: the launch reaches every server within a minute. */
const OPEN_TTL_MS = 60_000;
let open: { value: boolean; at: number } | null = null;

/**
 * Whether Contribute is launched, open to everyone (the API's `contributeOpen`, true once `CONTRIBUTE_PREVIEW=true`):
 * the landing is then shown to visitors without a session too (onboarding design §9.3). Asked once a minute per
 * server, not per request; false on any failure, as during the preview.
 */
export async function contributeOpen(now = Date.now()): Promise<boolean> {
  if (open && now - open.at < OPEN_TTL_MS) return open.value;
  let value = false;
  try {
    value = (await graphqlDirect(ContributeOpenDocument, undefined, { source: 'ssr' })).contributeOpen === true;
  } catch {
    // Not answered (an API without the field yet, or down): closed, asked again after the minute.
  }
  open = { value, at: now };
  return value;
}

/** Forgets the cached `contributeOpen` answer (tests). */
export function resetContributeOpen(): void {
  open = null;
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
