import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { signedFetch } from '@/lib/signed-fetch';

/** The visitor's own state: never kept by a browser or the edge cache. */
const NO_STORE = { 'Cache-Control': 'private, no-store' };

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

export const notSignedIn = () => json({ message: 'Not authenticated' }, 401);

/** The signed-in visitor, from the session; the API takes them from the signed call, never from a body. */
export const viewerOf = (req: AuthRequest) => req.auth?.user.githubLogin;

export type ApiAnswer<T> = { ok: true; body: T } | { ok: false; status: number };

/**
 * One call to the API's daily updates, signed for the visitor. An answer that is not a JSON object, or a call that
 * throws, reads as a 502.
 */
export async function callDailyUpdates<T>(
  githubLogin: string,
  path: string,
  method: 'GET' | 'POST',
  body?: Record<string, string>,
): Promise<ApiAnswer<T>> {
  const init: RequestInit = body
    ? { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : { method };

  try {
    const response = await signedFetch(path, { ...init, cache: 'no-store' }, 'client', githubLogin);
    if (!response.ok) {
      return { ok: false, status: response.status };
    }

    const answer: unknown = await response.json();
    return answer && typeof answer === 'object' ? { ok: true, body: answer as T } : { ok: false, status: 502 };
  } catch {
    return { ok: false, status: 502 };
  }
}

/** A body here is a login or a repository's owner and name; anything larger is not one. */
export const MAX_BODY = 1_000;

export const tooLarge = () => json({ message: 'Body too large' }, 413);

/**
 * The JSON body of a request: `too-large` past `MAX_BODY` characters (refused by its declared length before it is
 * read), `null` when it has none or it is not an object.
 */
export async function bodyOf(req: Request): Promise<Record<string, unknown> | 'too-large' | null> {
  if (Number(req.headers.get('content-length')) > MAX_BODY) {
    return 'too-large';
  }

  try {
    const text = await req.text();
    if (text.length > MAX_BODY) {
      return 'too-large';
    }
    const body: unknown = JSON.parse(text);
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
