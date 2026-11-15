import type { NextRequest } from 'next/server';

import { badgeSeenReporterFor } from '@/badge/badge-seen-reporter';
import { parseCanonicalBadgeFile } from '@/badge/canonical-badge';
import { renderCanonicalBadge } from '@/badge/render-canonical-badge';

type Props = { params: Promise<{ login: string; file: string }> };

/**
 * Badge data moves at most daily: a day at the edge in its own header, minutes in the browser and in image proxies.
 */
const BADGE_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=300',
  'Cloudflare-CDN-Cache-Control': 'max-age=86400, stale-while-revalidate=604800',
};

/**
 * Cache misses at the edge too — otherwise every bogus login costs a GraphQL
 * round-trip plus a satori (and resvg) render on origin.
 */
const NOT_FOUND_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=300',
  'Cloudflare-CDN-Cache-Control': 'max-age=86400',
};

function decodeLoginParam(rawLogin: string): string | null {
  try {
    const login = decodeURIComponent(rawLogin);
    return login || null;
  } catch {
    return null;
  }
}

function badgeNotFound(): Response {
  return new Response('Badge not found', {
    status: 404,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      ...NOT_FOUND_CACHE_HEADERS,
    },
  });
}

export async function GET(req: NextRequest, { params }: Props) {
  const { login: rawLogin, file } = await params;
  const login = decodeLoginParam(rawLogin);
  const parsed = parseCanonicalBadgeFile(file);

  if (!parsed || !login) {
    return badgeNotFound();
  }

  const result = await renderCanonicalBadge(login, parsed.variant, parsed.format);
  if (!result) {
    return badgeNotFound();
  }

  badgeSeenReporterFor(req)?.('user', login);

  return new Response(result.body, {
    headers: {
      'Content-Type': result.contentType,
      ...BADGE_CACHE_HEADERS,
    },
  });
}
