import { createHash } from 'node:crypto';

import { AI_CATALOG_TEXT } from '@/lib/contribute/ai-catalog';

/** A strong ETag the way `mcp.gitranks.com` makes it, so both hosts send the same one for the same bytes. */
const ETAG = `"${createHash('sha256').update(AI_CATALOG_TEXT).digest('base64url').slice(0, 27)}"`;

/** Public, read-only metadata: any page may read it (SEP-2127's CORS). */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Access-Control-Allow-Headers': 'Content-Type, If-None-Match',
  'Access-Control-Expose-Headers': 'ETag',
};

/**
 * A constant document, so it reads nothing from the request and is prerendered at build. It answers no 304: that
 * would mean reading `If-None-Match` and rendering per request, for 177 bytes.
 */
export function GET(): Response {
  return new Response(AI_CATALOG_TEXT, {
    headers: {
      ...CORS,
      'Content-Type': 'application/ai-catalog+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      ETag: ETAG,
    },
  });
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Max-Age': '86400' } });
}
