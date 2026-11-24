import { connection } from 'next/server';

import { loadLearnCourses } from '@/lib/learn/course.data';
import { llmsTxtOf } from '@/lib/seo/llms-txt';
import { contributeOpen } from '@/lib/workspace/preview-gate';

/**
 * The site's llms.txt (llmstxt.org): what GitRanks is and its main pages, the packages' among them, with Contribute's
 * once it is launched, and Learn's with its courses (a failed read of them lists Learn's pages alone). The same for
 * every visitor and never per session; asked per request (a build-time answer
 * would fix Contribute as closed).
 */
export async function GET(): Promise<Response> {
  await connection();
  const [contribute, learnCourses] = await Promise.all([
    contributeOpen(Date.now()),
    loadLearnCourses().catch(() => []),
  ]);
  return new Response(llmsTxtOf({ contribute, learnCourses }), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
