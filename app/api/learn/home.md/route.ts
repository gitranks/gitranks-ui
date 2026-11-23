import { connection } from 'next/server';

import { loadLearnCourses } from '@/lib/learn/course.data';
import { landingMarkdownResponse } from '@/lib/learn/course-markdown-response';
import { learnOpenToEveryone } from '@/lib/learn/learn-everyone';

/**
 * The Markdown copy of Learn's landing, for agents: the proxy answers `/learn.md` from here. Asked per request, so the
 * switch that opens Learn to everyone is never fixed as closed at build time.
 */
export async function GET() {
  await connection();
  return landingMarkdownResponse(() => learnOpenToEveryone(), loadLearnCourses);
}
