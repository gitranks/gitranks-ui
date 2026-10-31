import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { contributeOpen, contributePreviewAllowed } from '@/lib/contribute/preview-gate';

/**
 * Whether the user sees GitRanks Contribute (the header item): everyone once it is launched, signed in or not, else a
 * signed-in user the API lets in. Only ever about the user who asks.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const githubLogin = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const previewAllowed = (await contributeOpen()) || (await contributePreviewAllowed(githubLogin));
  return NextResponse.json({ previewAllowed }, { headers: { 'Cache-Control': 'private, no-store' } });
});
