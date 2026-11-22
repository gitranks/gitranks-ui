import 'server-only';

import { type NextRequest, NextResponse } from 'next/server';

import type { FollowFailure } from './follow.types';
import type { FollowAnswer, FollowCaller } from './follow-api';
import { isVerifiedAccountEmail } from './verified-email';
import { accountEmailOf } from '@/lib/account-email';
import { sessionTokenOf } from '@/lib/workspace/session-token';
import { rejectWrongOrigin } from '@/utils/reject-wrong-origin';

// What every follow route shares: the origin check, who asks, the body, and the answer. Every answer is per viewer and is
// never kept by any cache.

const NO_STORE = 'private, no-store';

/** The longest network address passed on, as the API takes it. */
const ADDRESS_MAX = 64;

/** The largest body taken: 50 package names of npm's longest (214), with room to spare. */
export const FOLLOW_BODY_MAX = 16_000;

const STATUS: Record<FollowFailure, number> = {
  not_found: 404,
  sign_in: 401,
  invalid: 400,
  unavailable: 503,
  failed: 502,
};

export const followJson = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': NO_STORE } });

export const followFailure = (failure: FollowFailure) => followJson({ error: failure }, STATUS[failure]);

/** The API's answer as the browser gets it: the data, or `{ error }` with its status. */
export const followAnswer = <T>(answer: FollowAnswer<T>, wrap: (data: T) => unknown) =>
  answer.ok ? followJson(wrap(answer.data)) : followFailure(answer.failure);

/**
 * Who asks: the signed-in viewer's login and email from the session (with whether GitHub marked that email verified at
 * the sign-in), and the visitor's network address. None of it comes from the browser's body.
 */
export async function followCallerOf(req: { headers: Headers }): Promise<FollowCaller> {
  const header = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || '';
  const address = header.trim().slice(0, ADDRESS_MAX);
  const visitor = address ? { visitorAddress: address } : {};

  const token = await sessionTokenOf(req);
  if (!token?.githubLogin || token.error) return { accountEmailVerified: false, ...visitor };
  const accountEmail = accountEmailOf(token.email);
  return {
    githubLogin: token.githubLogin,
    ...(accountEmail ? { accountEmail } : {}),
    accountEmailVerified: isVerifiedAccountEmail(token.verifiedEmail, accountEmail),
    ...visitor,
  };
}

/** The refusal a request gets before anything is asked, or null to go on: a change sent from another site. */
export function followRefusalOf(req: NextRequest, { change }: { change: boolean }) {
  if (change && rejectWrongOrigin(req)) return followJson({ error: 'forbidden' }, 403);
  return null;
}

/** The JSON body, refused by its stated size before it is read and by its real size after; undefined when not JSON. */
export async function followBodyOf(req: NextRequest): Promise<unknown> {
  if (Number(req.headers.get('content-length')) > FOLLOW_BODY_MAX) return undefined;
  const text = await req.text().catch(() => '');
  if (!text || text.length > FOLLOW_BODY_MAX) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
