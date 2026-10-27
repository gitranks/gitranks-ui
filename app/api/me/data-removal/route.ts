import { ObjectId } from 'mongodb';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import mongoClientPromise from '@/lib/mongo-client';
import { signedFetch } from '@/lib/signed-fetch';
import type { DataRemovalResult, DataRemovalStatus } from '@/types/data-removal.types';
import { profileCacheTag } from '@/utils/profile-refresh';

const signedInLogin = (req: AuthRequest) => req.auth?.user.githubLogin;

/** Whether the signed-in user's data was removed. Only ever about the user who asks. */
export const GET = auth(async function GET(req: AuthRequest) {
  const githubLogin = signedInLogin(req);
  if (!githubLogin) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  const response = await signedFetch('/user-removal/status', {}, 'client', githubLogin);
  if (!response.ok) {
    return NextResponse.json({ message: 'Failed to load the removal status' }, { status: response.status });
  }

  return NextResponse.json((await response.json()) as DataRemovalStatus);
});

/**
 * Removes the signed-in user's GitRanks data, confirmed by their login typed into the dialog. Only the session's own
 * account: the login sent on is the session's, never the body's. Then this sign-in's own rows go, and the client
 * signs out.
 */
export const POST = auth(async function POST(req: AuthRequest) {
  const githubLogin = signedInLogin(req);
  if (!githubLogin) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  // JSON only: a cross-site form can't send it, so this irreversible step can't be posted from another page.
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return NextResponse.json({ message: 'Expected JSON' }, { status: 415 });
  }

  const body = await req.json().catch(() => null);
  const confirm: unknown = body?.confirm;
  if (typeof confirm !== 'string' || confirm.trim().toLowerCase() !== githubLogin.toLowerCase()) {
    return NextResponse.json({ message: 'Type your GitHub username to confirm' }, { status: 400 });
  }

  const response = await signedFetch(
    '/user-removal',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: confirm.trim() }),
    },
    'client',
    githubLogin,
  );
  if (!response.ok) {
    return NextResponse.json({ message: 'The removal failed' }, { status: response.status });
  }
  // The removal went through: what follows only tidies up, so its own failure never reports the removal as failed.
  const result = (await response.json().catch(() => null)) as { profile?: boolean; login?: string } | null;

  for (const login of new Set([githubLogin, githubLogin.toLowerCase(), result?.login].filter(Boolean) as string[])) {
    revalidateTag(profileCacheTag(login), { expire: 0 });
  }

  // The server removes the sign-in rows it can find by GitHub id and login; this session's own row goes here too,
  // so it is gone even when GitRanks never held a profile to tell the id from.
  const userId = req.auth?.user.id;
  if (userId && ObjectId.isValid(userId)) {
    try {
      const db = (await mongoClientPromise).db('auth');
      const _id = new ObjectId(userId);
      await db.collection('accounts').deleteMany({ userId: _id });
      await db.collection('users').deleteOne({ _id });
    } catch (error) {
      console.error('data removal: this sign-in was not deleted here; the server removes it too', error);
    }
  }

  return NextResponse.json({ status: 'removed', profile: result?.profile ?? false } satisfies DataRemovalResult);
});
