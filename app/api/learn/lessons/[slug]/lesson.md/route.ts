import { lessonMarkdownResponse } from '@/lib/learn/lesson-markdown-response';
import { loadLessonShareState } from '@/lib/learn/lesson-share.data';

/**
 * A lesson's Markdown copy, for agents: the proxy answers `/learn/lessons/<slug>.md` from here, since a page and a
 * route handler cannot share the `[slug]` segment.
 */
export async function GET(_request: Request, { params }: RouteContext<'/api/learn/lessons/[slug]/lesson.md'>) {
  const { slug } = await params;
  return lessonMarkdownResponse(slug, () => loadLessonShareState(slug));
}
