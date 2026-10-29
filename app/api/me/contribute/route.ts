import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { contributePreviewAllowed } from '@/lib/contribute/preview-gate';

/** Whether the signed-in user sees GitRanks Contribute (the header item). Only ever about the user who asks. */
export const GET = auth(async function GET(req: AuthRequest) {
  const githubLogin = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const previewAllowed = await contributePreviewAllowed(githubLogin);
  return NextResponse.json({ previewAllowed }, { headers: { 'Cache-Control': 'private, no-store' } });
});
