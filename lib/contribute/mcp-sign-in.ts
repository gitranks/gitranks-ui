import { ContributeMcpSignInDocument } from './contribute.documents';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** How long an answer of `contributeMcpSignIn` is reused: a switch reaches every server within a minute. */
const SIGN_IN_TTL_MS = 60_000;
/** After a failed ask, the last answer holds this long before the next try. */
const SIGN_IN_RETRY_MS = 10_000;
let signIn: { value: boolean; at: number } | null = null;
let asking: Promise<boolean> | null = null;

/**
 * Whether agents sign in to the MCP server with GitHub (the API's public `contributeMcpSignIn`): the setup lines then
 * lead with the sign-in, and a token is the fallback. Asked once a minute per server, one ask at a time, like
 * `contributeOpen`. A failed ask keeps the last answer (off when there is none, as an API without the field yet) and
 * tries again 10 seconds later.
 */
export function contributeMcpSignIn(now = Date.now()): Promise<boolean> {
  if (signIn && now - signIn.at < SIGN_IN_TTL_MS) return Promise.resolve(signIn.value);
  asking ??= askSignIn(now).finally(() => {
    asking = null;
  });
  return asking;
}

async function askSignIn(now: number): Promise<boolean> {
  try {
    const { contributeMcpSignIn: value } = await graphqlDirect(ContributeMcpSignInDocument, undefined, {
      source: 'ssr',
    });
    signIn = { value: value === true, at: now };
  } catch {
    signIn = { value: signIn?.value ?? false, at: now - SIGN_IN_TTL_MS + SIGN_IN_RETRY_MS };
  }
  return signIn.value;
}

/** Forgets the cached answer (tests). */
export function resetContributeMcpSignIn(): void {
  signIn = null;
  asking = null;
}
