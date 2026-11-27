import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';

import { INTERVIEWS_ACTION_STATUS, type InterviewsActionResult } from './interviews-action';

/*
 * What Interviews' routes under `/api/me/interviews` share: the session's own person, never one named in the request; answers
 * no shared cache keeps; and a write's answer with the status of its refusal.
 */

/** Every answer of a personal route: never kept, by the browser or a shared cache. */
export const INTERVIEWS_NO_STORE = { 'Cache-Control': 'private, no-store' };

/** The signed-in person's GitHub login; none signed out, and for a session that needs a new sign-in. */
export const interviewsViewerOf = (req: { auth: Session | null }): string | undefined =>
  req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;

/** A read's answer: `{ [key]: value }`, never kept. */
export const interviewsReadResponse = (key: string, value: unknown) =>
  NextResponse.json({ [key]: value }, { headers: INTERVIEWS_NO_STORE });

/**
 * A write's body, JSON only: a cross-site form cannot send it, so no other page can post a write. Null for any other
 * content type, and for a body that is not a JSON object.
 */
export async function interviewsWriteBodyOf(req: Request): Promise<Record<string, unknown> | null> {
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return null;
  const body: unknown = await req.json().catch(() => null);
  return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
}

/** A write's answer: `{ ok: true, data }`, or `{ ok: false, error }` with the refusal's status. Never kept. */
export const interviewsWriteResponse = <T>(result: InterviewsActionResult<T>) =>
  NextResponse.json(result, {
    status: result.ok ? 200 : INTERVIEWS_ACTION_STATUS[result.error],
    headers: INTERVIEWS_NO_STORE,
  });

/**
 * A write's route: the signed-in person and the JSON body, then `write`. Signed out, `SIGNED_OUT` (401) without asking
 * the API; a body that is not JSON, `INVALID` (400).
 */
export async function interviewsWrite<T>(
  req: Request & { auth: Session | null },
  write: (githubLogin: string, body: Record<string, unknown>) => Promise<InterviewsActionResult<T>>,
) {
  const viewer = interviewsViewerOf(req);
  if (!viewer) return interviewsWriteResponse<T>({ ok: false, error: 'SIGNED_OUT' });
  const body = await interviewsWriteBodyOf(req);
  if (!body) return interviewsWriteResponse<T>({ ok: false, error: 'INVALID' });
  return interviewsWriteResponse(await write(viewer, body));
}
