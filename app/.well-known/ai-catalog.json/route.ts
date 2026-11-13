import { AI_CATALOG } from '@/lib/contribute/ai-catalog';

/** Public, read-only metadata: any page may read it (SEP-2127's CORS). */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Access-Control-Allow-Headers': 'Content-Type, If-None-Match',
};

export function GET(): Response {
  return new Response(JSON.stringify(AI_CATALOG), {
    headers: {
      ...CORS,
      'Content-Type': 'application/ai-catalog+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Max-Age': '86400' } });
}
