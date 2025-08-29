import type { NextRequest } from 'next/server';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { AvatarByLoginDocument } from '@/types/generated/graphql';

type Props = { params: Promise<{ login: string }> };

export async function GET(req: NextRequest, { params }: Props) {
  const { login } = await params;

  const { user } = await graphqlDirect(AvatarByLoginDocument, { login });

  if (!user?.avatarUrl) {
    return new Response('User not found', { status: 404 });
  }

  const src = user.avatarUrl;

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
    // Let your platform/CDN cache it:
    next: { revalidate: 60 * 60 * 24 }, // 1 day (app-level hint)
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
