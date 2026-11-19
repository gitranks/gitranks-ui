import type { Adapter } from 'next-auth/adapters';
import type { JWT } from 'next-auth/jwt';

import { sealedGrantAccount } from './grant-account';
import { isGrantAvailable } from './grant-availability';
import { CONTRIBUTE_PROVIDER } from '@/lib/auth-providers';

/** Where GitHub's consent lands when it came from another GitHub account than the signed-in one. */
export const GRANT_REFUSED_PATH = '/contribute/settings/keys?grant=refused';
/** Where it lands when a grant cannot be stored here (the app or its key ring is not configured). */
export const GRANT_UNAVAILABLE_PATH = '/contribute/settings/keys?grant=unavailable';

type ReadSession = () => Promise<JWT | null>;

/** The row the adapter just inserted, as it answers it: its own id and the user's, in the stored form. */
type InsertedRow = { _id?: unknown; userId?: unknown };

/**
 * Deletes the user's rows of `provider` other than `keep`. Ids are passed in their stored form, as the adapter
 * answered them.
 */
export type RemoveOtherGrants = (rows: { provider: string; userId: unknown; keep: unknown }) => Promise<void>;

/**
 * The adapter with the GitHub grant's rows. The grant never finds a user, so each time it is given it is linked to
 * the signed-in user: the new row is inserted first, then the user's older grant rows go, so a grant given again (after
 * a revoke on GitHub, say) keeps the new token, and a failed insert keeps the old row. The row carries the signed-in
 * user's GitHub login, and its token sealed; the token is never written in the clear (sealing throws before anything
 * is written).
 */
export function withContributeGrant(
  adapter: Adapter,
  readSession: ReadSession,
  removeOtherGrants: RemoveOtherGrants,
): Adapter {
  return {
    ...adapter,
    getUserByAccount: async (account) =>
      account.provider === CONTRIBUTE_PROVIDER ? null : ((await adapter.getUserByAccount?.(account)) ?? null),
    linkAccount: async (account) => {
      if (account.provider !== CONTRIBUTE_PROVIDER) {
        await adapter.linkAccount?.(account);
        return;
      }
      const row = sealedGrantAccount(account, { githubLogin: (await readSession())?.githubLogin });
      const inserted = (await adapter.linkAccount?.(row)) as InsertedRow | null | undefined;
      if (inserted?._id && inserted.userId) {
        await removeOtherGrants({ provider: CONTRIBUTE_PROVIDER, userId: inserted.userId, keep: inserted._id });
      }
    },
  };
}

const sameLogin = (a: unknown, b: unknown) =>
  typeof a === 'string' && typeof b === 'string' && !!a && a.toLowerCase() === b.toLowerCase();

/**
 * Whether GitHub's consent may be linked: only when it can be stored, from a signed-in session, and for the GitHub
 * account it is signed in with. Anything else goes back to Settings with a note; the grant is never a way to sign in.
 */
export async function grantSignInAllowed(
  profile: Record<string, unknown> | undefined,
  readSession: ReadSession,
  available: () => boolean = isGrantAvailable,
): Promise<true | string> {
  if (!available()) return GRANT_UNAVAILABLE_PATH;
  const session = await readSession();
  return sameLogin(session?.githubLogin, profile?.login) || GRANT_REFUSED_PATH;
}
