import { connection } from 'next/server';

import { contributeOpen } from '@/lib/contribute/preview-gate';
import { llmsTxtOf } from '@/lib/seo/llms-txt';

/**
 * The site's llms.txt (llmstxt.org): what GitRanks is and its main pages, with Contribute's once it is launched. The
 * same for every visitor and never per session; asked per request (a build-time answer would fix Contribute as closed).
 */
export async function GET(): Promise<Response> {
  await connection();
  return new Response(llmsTxtOf({ contribute: await contributeOpen() }), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
