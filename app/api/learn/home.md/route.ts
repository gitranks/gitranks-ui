import { connection } from 'next/server';

import { loadLearnCourses } from '@/lib/learn/course.data';
import { landingMarkdownResponse } from '@/lib/learn/course-markdown-response';

/**
 * The Markdown copy of Learn's landing, for agents: the proxy answers `/learn.md` from here. Asked per request, so a
 * copy without its courses (a failed read) is never fixed at build time.
 */
export async function GET() {
  await connection();
  return landingMarkdownResponse(loadLearnCourses);
}
