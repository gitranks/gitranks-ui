import 'server-only';

import type { LearnLesson } from './lesson-page';
import { type LessonShareState, lessonNotServedResponse, lessonUnavailableResponse } from './lesson-share';
import { type LessonCardKind, lessonCardVersionOf } from './lesson-share-card';
import { learnFactCardPath, learnLessonCardPath } from './paths';
import { FactCard, LessonCard } from '@/components/learn/share/lesson-cards';
import { drawSocialCard } from '@/lib/social-card/social-card';

export type { LessonCardKind };

const pathOf: Record<LessonCardKind, (slug: string) => string> = {
  lesson: learnLessonCardPath,
  fact: learnFactCardPath,
};

/**
 * How a picture is kept: drawn, five minutes in a browser and ten in a shared cache, so a lesson paused or removed
 * stops showing soon; its address changes with the lesson, so a changed lesson is drawn again at once.
 */
export const LESSON_CARD_HEADERS = {
  'Content-Type': 'image/png',
  'Cache-Control': 'public, max-age=300',
  'Cloudflare-CDN-Cache-Control': 'max-age=600',
} as const;

/** A picture drawn as a PNG. */
export function drawLessonCard(kind: LessonCardKind, lesson: LearnLesson): Promise<Uint8Array<ArrayBuffer>> {
  return drawSocialCard(
    kind === 'fact' && lesson.fact ? <FactCard lesson={lesson} fact={lesson.fact} /> : <LessonCard lesson={lesson} />,
  );
}

/**
 * A picture's answer, by the lesson's state (`lesson-share.ts`). A live lesson's picture is drawn under exactly
 * `?v=<version>`: any other query is a 308 to its current address, so no query makes it draw again. A fact's picture
 * of a lesson with no fact is not found.
 */
export async function lessonCardResponse(
  kind: LessonCardKind,
  slug: string,
  search: string,
  state: () => Promise<LessonShareState>,
  draw: (kind: LessonCardKind, lesson: LearnLesson) => Promise<Uint8Array<ArrayBuffer>> = drawLessonCard,
): Promise<Response> {
  let found: LessonShareState;
  try {
    found = await state();
  } catch {
    return lessonUnavailableResponse();
  }
  if (found.kind !== 'live') return lessonNotServedResponse(found, pathOf[kind]);
  const { lesson } = found;
  if (kind === 'fact' && !lesson.fact?.text.trim()) return lessonNotServedResponse({ kind: 'missing' }, pathOf[kind]);
  const version = lessonCardVersionOf(kind, lesson);
  if (search !== `?v=${version}`) {
    return new Response(null, {
      status: 308,
      headers: { Location: `${pathOf[kind](slug)}?v=${version}`, 'Cache-Control': 'private, no-store' },
    });
  }
  try {
    return new Response(await draw(kind, lesson), { headers: LESSON_CARD_HEADERS });
  } catch (error) {
    console.error('Error drawing a lesson card:', error);
    return lessonUnavailableResponse();
  }
}
