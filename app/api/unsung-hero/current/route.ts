import { type NextRequest, NextResponse } from 'next/server';

import { packagesPublic, requestMaySeePackages } from '@/lib/packages/packages-gate';
import { fetchUnsungHero } from '@/lib/unsung-hero/unsung-hero-read';

/** While the feature is not open to everyone, an answer was decided per viewer: no shared cache keeps it. */
const PRIVATE = 'private, no-store';
/** Once it is, the same answer for everyone: a shared cache keeps it a minute, so a home page view costs the API nothing. */
const PUBLIC = 'public, s-maxage=60';

const answer = (body: unknown, status: number, cacheControl = PRIVATE) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': cacheControl } });

/**
 * This week's Unsung hero, for the home card: `{ hero }`, `null` in a week with none. Only for a visitor who may see
 * package pages; anyone else gets the not-found answer, and nothing is read.
 */
export async function GET(req: NextRequest) {
  if (!(await requestMaySeePackages(req))) {
    return answer({ message: 'Not found' }, 404);
  }
  const isPublic = await packagesPublic();
  try {
    const hero = await fetchUnsungHero();
    return answer({ hero }, 200, isPublic ? PUBLIC : PRIVATE);
  } catch {
    return answer({ message: 'The hero could not be read right now' }, 503);
  }
}
