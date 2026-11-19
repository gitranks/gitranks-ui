import { connection } from 'next/server';

import { learnOpenToEveryone } from '@/lib/learn/learn-everyone';
import { readPublicLessons } from '@/lib/learn/public-lessons.data';
import { llmsTxtOf } from '@/lib/seo/llms-txt';
import { packagesPublicNow } from '@/lib/sitemap/packages-public';
import { contributeOpen } from '@/lib/workspace/preview-gate';

/**
 * The site's llms.txt (llmstxt.org): what GitRanks is and its main pages, with Contribute's once it is launched, the
 * packages' once their pages are open to everyone, and Learn's with its recent public lessons once its front door is
 * open to visitors (a failed read of the lessons lists Learn's pages alone). The same for every visitor and never per session; asked per request
 * (a build-time answer would fix both as closed).
 */
export async function GET(): Promise<Response> {
  await connection();
  const [contribute, packages, learnOpen] = await Promise.all([
    contributeOpen(),
    packagesPublicNow(),
    learnOpenToEveryone(),
  ]);
  const learn = learnOpen ? ((await readPublicLessons()) ?? []) : null;
  return new Response(llmsTxtOf({ contribute, packages, learn }), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
