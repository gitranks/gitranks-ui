import jwt from 'jsonwebtoken';
import { revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

/** The one caller allowed to expire cached data: the API, which names itself in its token. */
const ALLOWED_SOURCE = 'gitranks';

/** A repository's or a profile's cache tag, as `getRepoCacheTag` and `profileCacheTag` write them. */
const TAG = /^(repo|profile):[a-z0-9._/-]{1,140}$/;

const MAX_TAGS = 100;

const NO_STORE = { 'Cache-Control': 'private, no-store' };

const refuse = (status: number, message: string) => NextResponse.json({ message }, { status, headers: NO_STORE });

/** The claims of a bearer token signed with the secret this site signs its own API calls with; `null` otherwise. */
function verifiedClaims(request: NextRequest): Record<string, unknown> | null {
  const secret = process.env.INTERNAL_JWT_SECRET;
  const token = /^Bearer (\S+)$/.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!secret || !token) {
    return null;
  }

  try {
    const claims = jwt.verify(token, secret, { algorithms: ['HS256'] });
    return typeof claims === 'object' ? (claims as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const isTagList = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.length >= 1 &&
  value.length <= MAX_TAGS &&
  value.every((tag) => typeof tag === 'string' && TAG.test(tag));

/**
 * Expires the cached data of repositories and profiles whose data changed: `{ tags }`, 1 to `MAX_TAGS` tags of a
 * repository or a profile. Only a call signed with the internal secret and naming the API as its source is served; a
 * visitor's own refresh goes through `/api/revalidate` instead.
 */
export async function POST(request: NextRequest) {
  const claims = verifiedClaims(request);
  if (!claims) {
    return refuse(401, 'Unauthorized');
  }
  if (claims.source !== ALLOWED_SOURCE) {
    return refuse(403, 'Forbidden');
  }

  const body = await request.json().catch(() => null);
  const tags: unknown = body?.tags;
  if (!isTagList(tags)) {
    return refuse(400, `Expected 1 to ${MAX_TAGS} repository or profile tags`);
  }

  // `expire: 0`: the next read gets the new data, never the stale copy served while a fresh one is made.
  for (const tag of tags) {
    revalidateTag(tag, { expire: 0 });
  }
  return NextResponse.json({ expired: tags.length }, { headers: NO_STORE });
}
