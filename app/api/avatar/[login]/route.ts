import type { NextRequest } from 'next/server';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { AvatarByLoginDocument } from '@/types/generated/graphql';

type Props = { params: Promise<{ login: string }> };

/** A GitHub login: letters, digits and single hyphens, not at either end; up to 39 characters. */
const GITHUB_LOGIN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

/**
 * The width the avatar is fetched at: twice the 288 px pages draw it at, for sharp screens. Pages draw this URL as it
 * is (it is their main image and their structured data names it), so the route asks GitHub for the smaller copy.
 */
const AVATAR_PX = 576;

const CACHE_CONTROL = 'public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400';

/** A miss is kept a day too, so asking for made-up logins again does not reach GitHub again. */
const notFound = (message: string) =>
  new Response(message, { status: 404, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } });

/** A stored avatar URL at `AVATAR_PX`; as it is when it does not parse. */
function sized(url: string): string {
  if (!URL.canParse(url)) return url;
  const sizedUrl = new URL(url);
  sizedUrl.searchParams.set('s', String(AVATAR_PX));
  return sizedUrl.toString();
}

/** A developer's or an organization's stored avatar; `null` when neither is stored or the read fails. */
async function storedAvatar(login: string): Promise<string | null> {
  try {
    const { user, organization } = (await graphqlDirect(AvatarByLoginDocument, { login })) ?? {};
    return user?.avatarUrl ?? organization?.avatarUrl ?? null;
  } catch (error) {
    console.error('Error reading an avatar URL:', error);
    return null;
  }
}

export async function GET(req: NextRequest, { params }: Props) {
  const { login } = await params;

  // Any other GitHub account (a repository owner GitRanks has not read) from GitHub's own avatar link for the login.
  // Some old accounts' logins break today's rules; those are read from the stored avatar alone.
  const stored = await storedAvatar(login);
  const src = stored
    ? sized(stored)
    : GITHUB_LOGIN.test(login)
      ? `https://github.com/${login}.png?size=${AVATAR_PX}`
      : null;

  if (!src) {
    return notFound('Account not found');
  }

  // Forward validators for 304 support
  const etag = req.headers.get('if-none-match') ?? undefined;
  const ims = req.headers.get('if-modified-since') ?? undefined;

  const upstream = await fetch(src, {
    headers: {
      ...(etag ? { 'if-none-match': etag } : {}),
      ...(ims ? { 'if-modified-since': ims } : {}),
      // Optional: set Accept for smaller formats if GH honors it (not guaranteed)
      Accept: req.headers.get('accept') ?? 'image/*',
      // Never forward arbitrary user-provided headers
    },
    // No cache option on purpose. `next.revalidate` would store every avatar in Next's data cache
    // on disk, which is never evicted, and crawlers ask for a new login almost every time.
    // `cache: 'no-store'` would add no-cache headers to the upstream request. With neither, Next
    // skips its data cache at request time. The Cache-Control this route sets below is unaffected.
  });

  // Pass through 304 to leverage browser/CDN cache
  if (upstream.status === 304) {
    return new Response(null, {
      status: 304,
      headers: { 'Cache-Control': CACHE_CONTROL },
    });
  }

  if (!upstream.ok) {
    // if GitHub itself returns 404 → bubble it up
    return notFound('Avatar not found');
  }

  // Stream the body; copy key headers safely
  const resHeaders = new Headers();
  const ct = upstream.headers.get('content-type');
  if (ct) resHeaders.set('Content-Type', ct);

  const lm = upstream.headers.get('last-modified');
  if (lm) resHeaders.set('Last-Modified', lm);

  const et = upstream.headers.get('etag');
  if (et) resHeaders.set('ETag', et);

  // Your cache policy
  resHeaders.set('Cache-Control', CACHE_CONTROL);
  // Optional CSP tightening:
  // resHeaders.set("Cross-Origin-Resource-Policy", "same-site");

  return new Response(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
}
