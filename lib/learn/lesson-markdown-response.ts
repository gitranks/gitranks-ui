import { learnLessonMarkdownOf } from './lesson-markdown';
import { type LessonShareState, lessonNotServedResponse, lessonUnavailableResponse } from './lesson-share';
import { learnLessonMarkdownPath, learnLessonPath } from './paths';

/**
 * How a lesson's copy is kept: a minute, in a browser or a shared cache, so a paused or removed lesson stops being
 * served within the minute; the read behind it is cached under the lesson's tag, as the page's is.
 */
export const LESSON_MARKDOWN_HEADERS = {
  'Content-Type': 'text/markdown; charset=utf-8',
  'Cache-Control': 'public, max-age=60, s-maxage=60',
  'X-Content-Type-Options': 'nosniff',
  // Never indexed: the page itself is, and this is its copy for agents.
  'X-Robots-Tag': 'noindex',
} as const;

/** A lesson's copy as Markdown, by the lesson's state (`lesson-share.ts`); a moved one goes to its new copy. */
export async function lessonMarkdownResponse(slug: string, state: () => Promise<LessonShareState>): Promise<Response> {
  let found: LessonShareState;
  try {
    found = await state();
  } catch {
    return lessonUnavailableResponse();
  }
  if (found.kind !== 'live') return lessonNotServedResponse(found, learnLessonMarkdownPath);
  return new Response(learnLessonMarkdownOf(found.lesson), {
    headers: { ...LESSON_MARKDOWN_HEADERS, Link: `<${learnLessonPath(slug)}>; rel="canonical"` },
  });
}
