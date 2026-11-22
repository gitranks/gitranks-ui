import { NextResponse } from 'next/server';

import { fetchUnsungHero } from '@/lib/unsung-hero/unsung-hero-read';

/** A failure: no cache keeps it. */
const PRIVATE = 'private, no-store';
/** The same answer for everyone: a shared cache keeps it a minute, so a home page view costs the API nothing. */
const PUBLIC = 'public, s-maxage=60';

const answer = (body: unknown, status: number, cacheControl = PRIVATE) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': cacheControl } });

/** This week's Unsung hero, for the home card: `{ hero }`, `null` in a week with none. */
export async function GET() {
  try {
    const hero = await fetchUnsungHero();
    return answer({ hero }, 200, PUBLIC);
  } catch {
    return answer({ message: 'The hero could not be read right now' }, 503);
  }
}
