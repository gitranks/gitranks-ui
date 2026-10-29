import type { AdapterAccount } from 'next-auth/adapters';

import { grantAadOf, SEAL_KEYS_ENV, sealGrant, sealKeyRingOf } from './grant-seal';
import { CONTRIBUTE_PROVIDER } from '@/lib/auth-providers';

/** What the grant's account row holds besides Auth.js's own fields. */
export type GrantRowExtras = { githubLogin?: string };

/**
 * The fields of a grant row that carry its token: the token sealed, and what describes it. An OAuth App token has no
 * expiry and no refresh token, so nothing else is kept. Throws when there is no token or no key ring: the row is never
 * written with the token in the clear.
 */
export function sealedGrantFields(
  account: Pick<AdapterAccount, 'providerAccountId' | 'access_token' | 'scope' | 'token_type'>,
  ringValue: string | undefined = process.env[SEAL_KEYS_ENV],
) {
  const ring = sealKeyRingOf(ringValue);
  if (!ring) throw new Error(`${SEAL_KEYS_ENV} is not set: the GitHub grant cannot be stored`);
  if (!account.access_token) throw new Error('The GitHub grant came without a token');

  const providerAccountId = String(account.providerAccountId);
  return {
    provider: CONTRIBUTE_PROVIDER,
    providerAccountId,
    access_token: sealGrant(account.access_token, grantAadOf(providerAccountId), ring),
    ...(account.scope ? { scope: account.scope } : {}),
    ...(account.token_type ? { token_type: account.token_type } : {}),
  };
}

/** The account row Auth.js links for the grant, with its token sealed and the user's GitHub login on it. */
export function sealedGrantAccount(
  account: AdapterAccount,
  extras: GrantRowExtras,
  ringValue?: string,
): AdapterAccount & GrantRowExtras {
  const { access_token, refresh_token, id_token, expires_at, session_state, ...rest } = account;
  const tokenless = Object.fromEntries(
    Object.entries(rest).filter(([key]) => !['expires_in', 'refresh_token_expires_in'].includes(key)),
  ) as Omit<AdapterAccount, 'access_token'>;

  return {
    ...tokenless,
    ...sealedGrantFields(account, ringValue),
    type: account.type,
    userId: account.userId,
    ...(extras.githubLogin ? { githubLogin: extras.githubLogin } : {}),
  };
}
