import type { Adapter } from 'next-auth/adapters';
import type { JWT } from 'next-auth/jwt';

import { sealedGrantAccount } from './grant-account';
import { CONTRIBUTE_PROVIDER } from '@/lib/auth-providers';

/** Where GitHub's consent lands when it came from another GitHub account than the signed-in one. */
export const GRANT_REFUSED_PATH = '/contribute/settings?grant=refused';

type ReadSession = () => Promise<JWT | null>;

/**
 * The adapter with the GitHub grant's rows. The grant never finds a user, so each time it is given it is linked to
 * the signed-in user, and its row is replaced: a grant given again (after a revoke on GitHub, say) stores the new
 * token. The row carries the signed-in user's GitHub login, and its token sealed; the token is never written in the
 * clear (sealing throws before anything is written).
 */
export function withContributeGrant(adapter: Adapter, readSession: ReadSession): Adapter {
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
      await adapter.unlinkAccount?.({ provider: CONTRIBUTE_PROVIDER, providerAccountId: row.providerAccountId });
      await adapter.linkAccount?.(row);
    },
  };
}

const sameLogin = (a: unknown, b: unknown) =>
  typeof a === 'string' && typeof b === 'string' && !!a && a.toLowerCase() === b.toLowerCase();

/**
 * Whether GitHub's consent may be linked: only from a signed-in session, and only for the GitHub account it is signed
 * in with. Anything else goes back to Settings with a note; the grant is never a way to sign in.
 */
export async function grantSignInAllowed(
  profile: Record<string, unknown> | undefined,
  readSession: ReadSession,
): Promise<true | string> {
  const session = await readSession();
  return sameLogin(session?.githubLogin, profile?.login) || GRANT_REFUSED_PATH;
}
