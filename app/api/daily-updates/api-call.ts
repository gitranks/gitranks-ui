import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { accountEmailOf } from '@/lib/account-email';
import { signedFetch } from '@/lib/signed-fetch';

/** The visitor's own state: never kept by a browser or the edge cache. */
const NO_STORE = { 'Cache-Control': 'private, no-store' };

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

export const notSignedIn = () => json({ message: 'Not authenticated' }, 401);

/** The signed-in visitor: their login, and their email when the session holds a valid one. */
export type DailyUpdatesCaller = { githubLogin: string; accountEmail?: string };

/**
 * The signed-in visitor, from the session; the API takes them from the signed call, never from a body. `undefined`
 * without a login.
 */
export const viewerOf = (req: AuthRequest): DailyUpdatesCaller | undefined => {
  const githubLogin = req.auth?.user.githubLogin;
  if (!githubLogin) {
    return undefined;
  }
  const accountEmail = accountEmailOf(req.auth?.user.email);
  return accountEmail ? { githubLogin, accountEmail } : { githubLogin };
};

export type ApiAnswer<T> = { ok: true; body: T } | { ok: false; status: number };

/**
 * One call to the API's daily updates, signed for the visitor: their login, and their email beside it when there is
 * one. An answer that is not a JSON object, or a call that throws, reads as a 502.
 */
export async function callDailyUpdates<T>(
  { githubLogin, accountEmail }: DailyUpdatesCaller,
  path: string,
  method: 'GET' | 'POST',
  body?: Record<string, string>,
): Promise<ApiAnswer<T>> {
  const init: RequestInit = body
    ? { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : { method };

  try {
    const signed = { ...init, cache: 'no-store' } as const;
    const response = accountEmail
      ? await signedFetch(path, signed, 'client', githubLogin, accountEmail)
      : await signedFetch(path, signed, 'client', githubLogin);
    if (!response.ok) {
      return { ok: false, status: response.status };
    }

    const answer: unknown = await response.json();
    return answer && typeof answer === 'object' ? { ok: true, body: answer as T } : { ok: false, status: 502 };
  } catch {
    return { ok: false, status: 502 };
  }
}

/** A body here is a login or a pick's kind and name; anything larger is not one. */
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
