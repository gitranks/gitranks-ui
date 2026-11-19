import type { AdapterAccount } from 'next-auth/adapters';

import { grantAadOf, grantRefreshAadOf, SEAL_KEYS_ENV, sealGrant, sealKeyRingOf } from './grant-seal';
import { CONTRIBUTE_PROVIDER } from '@/lib/auth-providers';

/** What the grant's account row holds besides Auth.js's own fields. */
export type GrantRowExtras = { githubLogin?: string };

/**
 * The fields of a grant row that carry its tokens: the access token sealed, the refresh token sealed under its own
 * associated data, the access token's expiry (epoch seconds), and what describes them. The access token expires after
 * 8 hours, and the API renews it with the sealed refresh token. The refresh token is kept only with a valid expiry
 * (epoch seconds): without one the API would never know it is due. An expiry without a refresh token is kept, so the
 * API knows when the grant runs out. Throws when there is no token or no key ring: the row is never written with a
 * token in the clear.
 */
export function sealedGrantFields(
  account: Pick<
    AdapterAccount,
    'providerAccountId' | 'access_token' | 'refresh_token' | 'expires_at' | 'scope' | 'token_type'
  >,
  ringValue: string | undefined = process.env[SEAL_KEYS_ENV],
) {
  const ring = sealKeyRingOf(ringValue);
  if (!ring) throw new Error(`${SEAL_KEYS_ENV} is not set: the GitHub grant cannot be stored`);
  if (!account.access_token) throw new Error('The GitHub grant came without a token');

  const providerAccountId = String(account.providerAccountId);
  const { refresh_token, expires_at } = account;
  const expiry = isEpochSeconds(expires_at) ? expires_at : undefined;
  return {
    provider: CONTRIBUTE_PROVIDER,
    providerAccountId,
    access_token: sealGrant(account.access_token, grantAadOf(providerAccountId), ring),
    ...(expiry !== undefined && typeof refresh_token === 'string' && refresh_token
      ? { refresh_token: sealGrant(refresh_token, grantRefreshAadOf(providerAccountId), ring) }
      : {}),
    ...(expiry !== undefined ? { expires_at: expiry } : {}),
    ...(account.scope ? { scope: account.scope } : {}),
    ...(account.token_type ? { token_type: account.token_type } : {}),
  };
}

/** A positive time in epoch seconds; one in milliseconds (past the year 5138 as seconds) is refused. */
const isEpochSeconds = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 1e11;

/**
 * The account row Auth.js links for the grant, with its tokens sealed and the user's GitHub login on it. The tokens
 * and the expiry come back only through `sealedGrantFields`; nothing else Auth.js passes about them is kept.
 */
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
