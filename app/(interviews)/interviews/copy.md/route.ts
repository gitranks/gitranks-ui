import { connection } from 'next/server';

import { loadInterviewsHome } from '@/lib/interviews/home.data';
import { interviewsHomeMarkdownResponse } from '@/lib/interviews/markdown-response';

/**
 * Interviews home's Markdown copy, for agents: the proxy answers `/interviews.md` from here. Asked per request, so a
 * copy without its companies (a failed read) is never fixed at build time.
 */
export async function GET() {
  await connection();
  return interviewsHomeMarkdownResponse(loadInterviewsHome);
}
