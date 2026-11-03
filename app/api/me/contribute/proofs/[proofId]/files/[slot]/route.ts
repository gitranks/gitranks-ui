import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { signedFetch } from '@/lib/signed-fetch';

/** The image types a proof's screenshot may be, as the API checked them. */
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

/** Nothing in the answer may run, be sniffed into something else, or be kept by a cache. */
const HEADERS = {
  'Content-Security-Policy': "default-src 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'private, no-store',
};

const refused = (status: number) => new NextResponse(null, { status, headers: HEADERS });

/**
 * One screenshot of a proof the user's own agent captured, for the proof's card: only to the proof's own user (the API
 * checks), never cached. The bytes pass through as they came.
 */
export const GET = auth(async function GET(req: AuthRequest, { params }) {
  const githubLogin = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  if (!githubLogin) return refused(401);

  const { proofId, slot } = (await params) as { proofId: string; slot: string };
  if (!/^[\w-]{1,64}$/.test(proofId) || !/^[1-9]$/.test(slot)) return refused(404);

  const response = await signedFetch(
    `/contribute/proofs/${encodeURIComponent(proofId)}/files/${slot}`,
    { cache: 'no-store' },
    'client',
    githubLogin,
  ).catch(() => null);
  if (!response) return refused(502);
  if (!response.ok) return refused(response.status === 403 || response.status === 404 ? 404 : 502);

  const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? '';
  if (!IMAGE_TYPES.has(type) || !response.body) return refused(502);
  return new NextResponse(response.body, { status: 200, headers: { ...HEADERS, 'Content-Type': type } });
});
