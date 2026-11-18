import type { NextRequest } from 'next/server';

import { json } from '../api-call';
import { isBadgeCheckResult } from '@/app/badge/builder/[[...login]]/utils/badge-check';
import { packageRefOf } from '@/app/badge/builder/[[...login]]/utils/builder-state';
import { accountEmailOf } from '@/lib/account-email';
import { sessionTokenOf } from '@/lib/contribute/session-token';
import { isRepoName } from '@/lib/routing/ranking-routes';
import { signedFetch } from '@/lib/signed-fetch';
import type { BadgeCheckKind, BadgeCheckResult } from '@/types/daily-updates.types';
import { isGithubLogin } from '@/utils/profile-refresh';

/** A check is a kind and a name; anything larger is not one. */
const MAX_BODY = 500;
/** The API reads the README live and gives up after about 12 s: a little more, then the check is unavailable. */
const TIMEOUT_MS = 20_000;
/** The API takes an address up to this long. */
const MAX_ADDRESS = 64;

const UNAVAILABLE: BadgeCheckResult = { status: 'unavailable' };

/**
 * The entity to check, from the body: a profile's login, a repository's `owner/name` or a package's
 * `<registry>/<name>`.
 */
function entityOf(text: string): { kind: BadgeCheckKind; name: string } | null {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }
  const { kind, name } = (body ?? {}) as { kind?: unknown; name?: unknown };
  if (typeof name !== 'string') {
    return null;
  }
  if (kind === 'user') {
    return isGithubLogin(name) ? { kind, name } : null;
  }
  if (kind === 'repo') {
    const [owner, repo, ...rest] = name.split('/');
    // The owner by the profile's own rule, which takes the logins from GitHub's early years that start or end with '-'.
    return rest.length === 0 && repo !== undefined && isGithubLogin(owner) && isRepoName(repo) ? { kind, name } : null;
  }
  if (kind === 'package') {
    return packageRefOf(name) !== null ? { kind, name } : null;
  }
  return null;
}

/**
 * The signed-in visitor, when there is one: their login, and their email when the session holds a valid one. The API
 * shows a package only to those it lets see packages, and decides it by them; a check needs no sign-in otherwise.
 */
async function viewerOf(req: NextRequest): Promise<[githubLogin?: string, accountEmail?: string]> {
  const token = await sessionTokenOf(req);
  if (!token?.githubLogin || token.error) return [];
  const accountEmail = accountEmailOf(token.email);
  return accountEmail ? [token.githubLogin, accountEmail] : [token.githubLogin];
}

/**
 * "Check my badge": asks the API to read the README of a profile or a repository (for a package, of the repository
 * that publishes it) now and say whether a GitRanks badge of it is there. No sign-in; a signed-in visitor is named. The
 * visitor's address goes along only for the API's per-visitor limit; the site neither logs nor keeps it, and the answer
 * sets nothing in the browser. Any failure answers `unavailable`.
 */
export async function POST(req: NextRequest) {
  // Refused by its stated size before it is read, and by its real size after.
  const text = Number(req.headers.get('content-length')) > MAX_BODY ? '' : await req.text().catch(() => '');
  const entity = text.length <= MAX_BODY ? entityOf(text) : null;
  if (!entity) {
    return json({ message: 'Bad request' }, 400);
  }

  const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
  const viewer = await viewerOf(req);

  try {
    const response = await signedFetch(
      '/ui/badge-check',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...entity, ip: ip.slice(0, MAX_ADDRESS) }),
        cache: 'no-store',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
      'client',
      ...viewer,
    );
    if (!response.ok) {
      return json(UNAVAILABLE);
    }
    const answer: unknown = await response.json();
    return json(isBadgeCheckResult(answer) ? answer : UNAVAILABLE);
  } catch {
    return json(UNAVAILABLE);
  }
}
