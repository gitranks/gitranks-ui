import { connection } from 'next/server';

import { loadInterviewsHome } from '@/lib/interviews/home.data';
import { INTERVIEWS_OPEN_TO_EVERYONE } from '@/lib/interviews/interviews-parts';
import { loadLearnCourses } from '@/lib/learn/course.data';
import { llmsTxtOf } from '@/lib/seo/llms-txt';
import { contributeOpen } from '@/lib/workspace/preview-gate';

/**
 * The site's llms.txt (llmstxt.org): what GitRanks is and its main pages, the packages' among them, with Contribute's
 * once it is launched, and Learn's with its courses (a failed read of them lists Learn's pages alone). Interviews'
 * pages only once Interviews is open to everyone: until then nothing of it is read or written. The same for every
 * visitor and never per session; asked per request (a build-time answer would fix Contribute as closed).
 */
export async function GET(): Promise<Response> {
  await connection();
  const [contribute, learnCourses, interviews] = await Promise.all([
    contributeOpen(Date.now()),
    loadLearnCourses().catch(() => []),
    INTERVIEWS_OPEN_TO_EVERYONE ? loadInterviewsHome() : null,
  ]);
  return new Response(llmsTxtOf({ contribute, learnCourses, interviews }), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
