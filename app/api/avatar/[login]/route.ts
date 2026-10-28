import type { NextRequest } from 'next/server';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { AvatarByLoginDocument } from '@/types/generated/graphql';

type Props = { params: Promise<{ login: string }> };

/** A GitHub login: letters, digits and single hyphens, not at either end; up to 39 characters. */
const GITHUB_LOGIN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

export async function GET(req: NextRequest, { params }: Props) {
  const { login } = await params;

  const { user, organization } = (await graphqlDirect(AvatarByLoginDocument, { login })) ?? {};
  // A developer's or an organization's stored avatar; any other GitHub account's (a repository owner GitRanks has not
  // read) from GitHub's own avatar link for the login.
  const src =
    user?.avatarUrl ?? organization?.avatarUrl ?? (GITHUB_LOGIN.test(login) ? `https://github.com/${login}.png` : null);

  if (!src) {
    return new Response('User not found', { status: 404 });
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
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=604800, stale-while-revalidate=86400',
      },
    });
  }

  if (!upstream.ok) {
    // if GitHub itself returns 404 → bubble it up
    return new Response('Avatar not found', { status: 404 });
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
  resHeaders.set('Cache-Control', 'public, max-age=0, s-maxage=604800, stale-while-revalidate=86400');
  // Optional CSP tightening:
  // resHeaders.set("Cross-Origin-Resource-Policy", "same-site");

  return new Response(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
}
