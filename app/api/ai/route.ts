import { type NextRequest, NextResponse } from 'next/server';
import type { Session } from 'next-auth';

import { auth } from '@/auth';
import { signedFetch } from '@/lib/signed-fetch';

export type AuthRequest = NextRequest & { auth: Session | null };

export const POST = auth(async function POST(_req: AuthRequest, { params }) {
  const { login } = await params;

  const response = await signedFetch('/user/generate-description', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      { message: 'Failed to generate user description', error: responseData },
      { status: response.status },
    );
  }

  return NextResponse.json(responseData);
});
