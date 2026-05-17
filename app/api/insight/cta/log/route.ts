import { type NextRequest, NextResponse } from 'next/server';

import { signedFetch } from '@/lib/signed-fetch';

export async function POST(req: NextRequest) {
  const { shortId } = (await req.json()) as { shortId?: string };
  if (!shortId) {
    return NextResponse.json({ message: 'shortId is required' }, { status: 400 });
  }

  const forwardedFor = req.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || undefined;
  const userAgent = req.headers.get('user-agent') || undefined;
  const referer = req.headers.get('referer') || undefined;

  const response = await signedFetch('/insight/cta/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shortId, ip, userAgent, referer }),
    cache: 'no-store',
  });

  if (!response.ok) {
    return NextResponse.json({ logged: false }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
