import { NextResponse } from 'next/server';

import { learnOpenToEveryone } from '@/lib/learn/learn-everyone';

/** How long a browser or a shared cache keeps the answer: the server asks again once a minute anyway. */
const CACHE_CONTROL = 'public, max-age=60, s-maxage=60';

/**
 * Whether GitRanks Learn is open to everyone, for the site menu of a visitor without a session: `{ open }`. The same for
 * everyone, so it reads no cookie and a shared cache may keep it.
 */
export async function GET() {
  return NextResponse.json(
    { open: await learnOpenToEveryone(Date.now()) },
    { headers: { 'Cache-Control': CACHE_CONTROL } },
  );
}
