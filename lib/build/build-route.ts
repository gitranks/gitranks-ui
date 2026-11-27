import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';

import { BUILD_ACTION_STATUS, type BuildActionResult } from './build-action';

/*
 * What Build's routes under `/api/me/build` share: the session's own person, never one named in the request; answers
 * no shared cache keeps; and a write's answer with the status of its refusal.
 */

/** Every answer of a personal route: never kept, by the browser or a shared cache. */
export const BUILD_NO_STORE = { 'Cache-Control': 'private, no-store' };

/** The signed-in person's GitHub login; none signed out, and for a session that needs a new sign-in. */
export const buildViewerOf = (req: { auth: Session | null }): string | undefined =>
  req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;

/** A read's answer: `{ [key]: value }`, never kept. */
export const buildReadResponse = (key: string, value: unknown) =>
  NextResponse.json({ [key]: value }, { headers: BUILD_NO_STORE });

/**
 * A write's body, JSON only: a cross-site form cannot send it, so no other page can post a write. Null for any other
 * content type, and for a body that is not a JSON object.
 */
export async function buildWriteBodyOf(req: Request): Promise<Record<string, unknown> | null> {
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return null;
  const body: unknown = await req.json().catch(() => null);
  return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
}

/** A write's answer: `{ ok: true, data }`, or `{ ok: false, error }` with the refusal's status. Never kept. */
export const buildWriteResponse = <T>(result: BuildActionResult<T>) =>
  NextResponse.json(result, { status: result.ok ? 200 : BUILD_ACTION_STATUS[result.error], headers: BUILD_NO_STORE });

/**
 * A write's route: the signed-in person and the JSON body, then `write`. Signed out, `SIGNED_OUT` (401) without asking
 * the API; a body that is not JSON, `INVALID` (400).
 */
export async function buildWrite<T>(
  req: Request & { auth: Session | null },
  write: (githubLogin: string, body: Record<string, unknown>) => Promise<BuildActionResult<T>>,
) {
  const viewer = buildViewerOf(req);
  if (!viewer) return buildWriteResponse<T>({ ok: false, error: 'SIGNED_OUT' });
  const body = await buildWriteBodyOf(req);
  if (!body) return buildWriteResponse<T>({ ok: false, error: 'INVALID' });
  return buildWriteResponse(await write(viewer, body));
}
