import { SEAL_KEYS_ENV, sealKeyRingOf } from './grant-seal';

type Env = Record<string, string | undefined>;

/**
 * Whether pull request access can be granted here: the OAuth App is configured (`auth.config.ts` registers the
 * provider only then) and the key ring parses, so a grant can be stored sealed. Read on the server only.
 */
export function isGrantAvailable(env: Env = process.env): boolean {
  if (!env.AUTH_GITHUB_CONTRIBUTE_ID || !env.AUTH_GITHUB_CONTRIBUTE_SECRET) return false;
  try {
    return sealKeyRingOf(env[SEAL_KEYS_ENV]) !== null;
  } catch {
    return false;
  }
}
