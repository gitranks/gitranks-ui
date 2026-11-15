import type { NextRequest } from 'next/server';

import { badgeSeenReporterFor } from '@/badge/badge-seen-reporter';
import { badgeCacheHeaders } from '@/badge/cache-headers';
import { parseCanonicalBadgeFile } from '@/badge/canonical-badge';
import { renderCanonicalBadge } from '@/badge/render-canonical-badge';

type Props = { params: Promise<{ login: string; file: string }> };

/** Badge data moves at most daily; keep it long at the edge, short in the browser. */
const BADGE_CACHE_CONTROL = 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800';

/**
 * Cache misses at the edge too — otherwise every bogus login costs a GraphQL
 * round-trip plus a satori (and resvg) render on origin.
 */
const NOT_FOUND_CACHE_CONTROL = 'public, max-age=300, s-maxage=86400';

function decodeLoginParam(rawLogin: string): string | null {
  try {
    const login = decodeURIComponent(rawLogin);
    return login || null;
  } catch {
    return null;
  }
}

function badgeNotFound(search: URLSearchParams): Response {
  return new Response('Badge not found', {
    status: 404,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      ...badgeCacheHeaders(NOT_FOUND_CACHE_CONTROL, search),
    },
  });
}

export async function GET(req: NextRequest, { params }: Props) {
  const { login: rawLogin, file } = await params;
  const search = req.nextUrl.searchParams;
  const login = decodeLoginParam(rawLogin);
  const parsed = parseCanonicalBadgeFile(file);

  if (!parsed || !login) {
    return badgeNotFound(search);
  }

  const result = await renderCanonicalBadge(login, parsed.variant, parsed.format);
  if (!result) {
    return badgeNotFound(search);
  }

  badgeSeenReporterFor(req)?.('user', login);

  return new Response(result.body, {
    headers: {
      'Content-Type': result.contentType,
      ...badgeCacheHeaders(BADGE_CACHE_CONTROL, search),
    },
  });
}
