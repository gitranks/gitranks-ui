import { connection } from 'next/server';

import { loadLearnCourses } from '@/lib/learn/course.data';
import { learnOpenToEveryone } from '@/lib/learn/learn-everyone';
import { readPublicLessons } from '@/lib/learn/public-lessons.data';
import { llmsTxtOf } from '@/lib/seo/llms-txt';
import { contributeOpen } from '@/lib/workspace/preview-gate';

/**
 * The site's llms.txt (llmstxt.org): what GitRanks is and its main pages, the packages' among them, with Contribute's
 * once it is launched, and Learn's with its recent public lessons once its front door is
 * open to visitors (a failed read of the lessons lists Learn's pages alone). The same for every visitor and never per session; asked per request
 * (a build-time answer would fix them as closed).
 */
export async function GET(): Promise<Response> {
  await connection();
  const [contribute, learnOpen] = await Promise.all([contributeOpen(), learnOpenToEveryone()]);
  // Learn's pages, its courses and its lessons are listed only while the switch that opens Learn to everyone is open.
  const [learn, learnCourses] = learnOpen
    ? await Promise.all([readPublicLessons().then((lessons) => lessons ?? []), loadLearnCourses().catch(() => [])])
    : [null, []];
  return new Response(llmsTxtOf({ contribute, learn, learnCourses }), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
