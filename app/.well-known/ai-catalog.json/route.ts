import { createHash } from 'node:crypto';

import { connection } from 'next/server';

import { AI_CATALOG, AI_CATALOG_TEXT } from '@/lib/contribute/ai-catalog';
import { interviewsAiCatalogEntriesOf } from '@/lib/interviews/ai-catalog';
import { loadInterviewsHome } from '@/lib/interviews/home.data';
import { INTERVIEWS_OPEN_TO_EVERYONE } from '@/lib/interviews/interviews-parts';

/** A strong ETag the way `mcp.gitranks.com` makes it, so both hosts send the same one for the same bytes. */
const etagOf = (text: string) => `"${createHash('sha256').update(text).digest('base64url').slice(0, 27)}"`;

/** Public, read-only metadata: any page may read it (SEP-2127's CORS). */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Access-Control-Allow-Headers': 'Content-Type, If-None-Match',
  'Access-Control-Expose-Headers': 'ETag',
};

/** The catalog as served. */
const catalogResponse = (text: string) =>
  new Response(text, {
    headers: {
      ...CORS,
      'Content-Type': 'application/ai-catalog+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      ETag: etagOf(text),
    },
  });

/**
 * While Interviews is not open to everyone, a constant document, the same bytes as `mcp.gitranks.com`'s: it reads
 * nothing from the request and is prerendered at build. Once open, Interviews' companies and plans follow the MCP
 * server's entry, read per request from the cached home read (so a build-time answer never fixes them), and this
 * host's document is its own. It answers no 304: that would mean reading `If-None-Match` and rendering per request.
 */
export async function GET(): Promise<Response> {
  if (!INTERVIEWS_OPEN_TO_EVERYONE) return catalogResponse(AI_CATALOG_TEXT);
  await connection();
  const home = await loadInterviewsHome();
  return catalogResponse(
    JSON.stringify({ ...AI_CATALOG, entries: [...AI_CATALOG.entries, ...interviewsAiCatalogEntriesOf(home)] }),
  );
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Max-Age': '86400' } });
}
