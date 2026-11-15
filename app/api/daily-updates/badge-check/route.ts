import type { NextRequest } from 'next/server';

import { json } from '../api-call';
import { isRepoSlug } from '@/lib/routing/ranking-routes';
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
const STATUSES = new Set<BadgeCheckResult['status']>(['found', 'not_found', 'limit', 'unknown', 'unavailable']);

/** The entity to check, from the body: a profile's login or a repository's `owner/name`. */
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
    return rest.length === 0 && repo !== undefined && isRepoSlug(owner, repo) ? { kind, name } : null;
  }
  return null;
}

const isResult = (value: unknown): value is BadgeCheckResult =>
  !!value && typeof value === 'object' && STATUSES.has((value as BadgeCheckResult).status);

/**
 * "Check my badge": asks the API to read the README of a profile or a repository now and say whether a GitRanks badge
 * of it is there. No sign-in. The visitor's address goes along only for the API's per-visitor limit; the site neither
 * logs nor keeps it, and the answer sets nothing in the browser. Any failure answers `unavailable`.
 */
export async function POST(req: NextRequest) {
  const text = await req.text().catch(() => '');
  const entity = text.length <= MAX_BODY ? entityOf(text) : null;
  if (!entity) {
    return json({ message: 'Bad request' }, 400);
  }

  const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';

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
    );
    if (!response.ok) {
      return json(UNAVAILABLE);
    }
    const answer: unknown = await response.json();
    return json(isResult(answer) ? answer : UNAVAILABLE);
  } catch {
    return json(UNAVAILABLE);
  }
}
