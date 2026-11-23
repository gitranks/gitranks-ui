import { type LearnAddress, learnAddressGateFrom } from './address-gate';
import type { LearnLesson } from './lesson-page';
import { isContentSlug } from './paths';

/*
 * What a lesson's Markdown copy and its two share pictures answer, by the lesson's state, and what the pictures say.
 * They follow the page's own gate: a live lesson is served; a paused one answers 503, a removed one 410, a moved one a
 * permanent redirect to the same thing at its new address, anything else 404. Only a live lesson's content is ever
 * read, so nothing of a paused or removed lesson is served. What the pictures say is in `lesson-share-card.ts`.
 */

/** A lesson as its copy and its pictures find it. */
export type LessonShareState =
  | { kind: 'live'; lesson: LearnLesson }
  | { kind: 'paused' }
  | { kind: 'removed' }
  | { kind: 'moved'; slug: string }
  | { kind: 'missing' };

/**
 * The state from the lesson as everyone reads it (null when it is not live) and, only then, its address. A move
 * that names no slug of a lesson's shape is missing.
 */
export async function lessonShareStateOf(
  slug: string,
  read: {
    lesson: (slug: string) => Promise<LearnLesson | null>;
    address: (slug: string) => Promise<Pick<LearnAddress, 'state' | 'movedTo'> | null>;
  },
): Promise<LessonShareState> {
  if (!isContentSlug(slug)) return { kind: 'missing' };
  const lesson = await read.lesson(slug);
  if (lesson) return { kind: 'live', lesson };
  const address = await read.address(slug);
  if (!address) return { kind: 'missing' };
  const gate = learnAddressGateFrom('lesson', address);
  switch (gate.kind) {
    case 'paused':
      return { kind: 'paused' };
    case 'removed':
      return { kind: 'removed' };
    case 'moved':
      return { kind: 'moved', slug: address.movedTo as string };
    default:
      // Live by its address, yet not readable as live: a moment between two deploys. Not found for now.
      return { kind: 'missing' };
  }
}

/** How long search engines and agents wait before asking again for a paused lesson, in seconds: an hour. */
export const PAUSED_RETRY_AFTER = '3600';

/** The headers every answer that is not the thing itself carries: kept nowhere, so a lesson coming back shows at once. */
const NOT_SERVED = { 'Cache-Control': 'private, no-store' } as const;

/** The plain answer of a lesson that is not served, by its state; the moved one's `Location` is given by the caller. */
export function lessonNotServedResponse(
  state: Exclude<LessonShareState, { kind: 'live' }>,
  movedTo: (slug: string) => string,
): Response {
  const text = (body: string, status: number, headers: Record<string, string> = {}) =>
    new Response(`${body}\n`, {
      status,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', ...NOT_SERVED, ...headers },
    });
  switch (state.kind) {
    case 'paused':
      return text('This lesson is paused. It will be back at this address.', 503, {
        'Retry-After': PAUSED_RETRY_AFTER,
      });
    case 'removed':
      return text('This lesson was removed.', 410);
    case 'moved':
      return new Response(null, { status: 308, headers: { Location: movedTo(state.slug), ...NOT_SERVED } });
    case 'missing':
      return text('Not found', 404);
  }
}

/** The lesson could not be read now: asked again in a minute. */
export const lessonUnavailableResponse = () =>
  new Response('The lesson could not be read. Try again in a minute.\n', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...NOT_SERVED, 'Retry-After': '60' },
  });
