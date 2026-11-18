import { accountEmailOf } from '@/lib/account-email';

/** GitHub's list of the signed-in account's email addresses, each with whether GitHub has verified it. */
export const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';

/**
 * The longest a sign-in waits on that list, so a slow answer delays it by at most this; past it, the session simply
 * carries no verified address.
 */
export const GITHUB_EMAILS_TIMEOUT_MS = 2_000;

type GithubEmail = { email?: unknown; verified?: unknown };

/**
 * The session's email, in lower case, when GitHub marks it verified on the account right now; undefined otherwise.
 * Read at each sign-in with that sign-in's own token (the `user:email` scope it already asks for). A refusal, an error
 * or a late answer is undefined, never a failed sign-in, and nothing about the address or the token is logged.
 */
export async function verifiedEmailOf(
  email: unknown,
  accessToken: unknown,
  fetchImpl: typeof fetch = fetch,
): Promise<string | undefined> {
  const address = accountEmailOf(email)?.toLowerCase();
  if (!address || typeof accessToken !== 'string' || !accessToken) return undefined;

  try {
    const response = await fetchImpl(GITHUB_EMAILS_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'GitRanks',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(GITHUB_EMAILS_TIMEOUT_MS),
    });
    if (!response.ok) return undefined;
    const emails: unknown = await response.json();
    if (!Array.isArray(emails)) return undefined;
    const verified = (emails as GithubEmail[]).some(
      (entry) =>
        typeof entry?.email === 'string' && entry.email.trim().toLowerCase() === address && entry.verified === true,
    );
    return verified ? address : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Whether the email a call names is the one GitHub marked verified at the sign-in. A session whose email changed since,
 * or one from before this was read, is not.
 */
export const isVerifiedAccountEmail = (verifiedEmail: unknown, accountEmail: string | undefined): boolean =>
  !!accountEmail && typeof verifiedEmail === 'string' && verifiedEmail === accountEmail.toLowerCase();
