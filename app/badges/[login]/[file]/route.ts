import type { NextRequest } from 'next/server';

import { parseCanonicalBadgeFile } from '@/badge/canonical-badge';
import { renderCanonicalBadge } from '@/badge/render-canonical-badge';

// resvg is a native binding, so this route cannot run on the Edge runtime. Node is already
// the default for route handlers; pinning it makes the deployment requirement explicit and
// stops a future config change from silently breaking every badge URL.
export const runtime = 'nodejs';

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

function badgeNotFound(): Response {
  return new Response('Badge not found', {
    status: 404,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': NOT_FOUND_CACHE_CONTROL,
    },
  });
}

export async function GET(_req: NextRequest, { params }: Props) {
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

  return new Response(result.body, {
    headers: {
      'Content-Type': result.contentType,
      'Cache-Control': BADGE_CACHE_CONTROL,
    },
  });
}
