import { connection } from 'next/server';

import { contributeOpen } from '@/lib/contribute/preview-gate';
import { llmsTxtOf } from '@/lib/seo/llms-txt';
import { packagesPublicNow } from '@/lib/sitemap/packages-public';

/**
 * The site's llms.txt (llmstxt.org): what GitRanks is and its main pages, with Contribute's once it is launched and the
 * packages' once their pages are open to everyone. The same for every visitor and never per session; asked per request
 * (a build-time answer would fix both as closed).
 */
export async function GET(): Promise<Response> {
  await connection();
  const [contribute, packages] = await Promise.all([contributeOpen(), packagesPublicNow()]);
  return new Response(llmsTxtOf({ contribute, packages }), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
