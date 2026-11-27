import { connection } from 'next/server';

import { loadInterviewsHome } from '@/lib/interviews/home.data';
import { INTERVIEWS_OPEN_TO_EVERYONE } from '@/lib/interviews/interviews-parts';
import { interviewsSitemapEntries, interviewsSitemapXmlOf } from '@/lib/sitemap/interviews-sitemap';

/**
 * Interviews' public pages (`interviewsSitemapEntries`). While Interviews is not open to everyone the address does
 * not exist, as before: a 404 kept by no one, and nothing is read (the site's index does not list it either). Once
 * open, asked per request from the cached home read, so a build-time answer never fixes it.
 */
export async function GET(): Promise<Response> {
  if (!INTERVIEWS_OPEN_TO_EVERYONE) {
    return new Response('Not found\n', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'private, no-store' },
    });
  }
  await connection();
  const home = await loadInterviewsHome();
  return new Response(interviewsSitemapXmlOf(interviewsSitemapEntries(home)), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
