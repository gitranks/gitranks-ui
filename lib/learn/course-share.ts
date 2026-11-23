import { type LearnAddress, learnAddressGateFrom } from './address-gate';
import type { LearnCourse } from './course';
import { PAUSED_RETRY_AFTER } from './lesson-share';
import { isContentSlug } from './paths';

/*
 * What a course's Markdown copy and its share picture answer, by the course's state. They follow the page's own gate:
 * a live course is served; a paused one answers 503, a removed one 410, a moved one a permanent redirect to the same
 * thing at its new address, anything else 404. Only a live course's content is ever read.
 */

/** A course as its copy and its picture find it. */
export type CourseShareState =
  | { kind: 'live'; course: LearnCourse }
  | { kind: 'paused' }
  | { kind: 'removed' }
  | { kind: 'moved'; slug: string }
  | { kind: 'missing' };

/**
 * The state from the course as everyone reads it (null when it is not live) and, only then, its address. A move that
 * names no slug of a course's shape is missing.
 */
export async function courseShareStateOf(
  slug: string,
  read: {
    course: (slug: string) => Promise<LearnCourse | null>;
    address: (slug: string) => Promise<Pick<LearnAddress, 'state' | 'movedTo'> | null>;
  },
): Promise<CourseShareState> {
  if (!isContentSlug(slug)) return { kind: 'missing' };
  const course = await read.course(slug);
  if (course) return { kind: 'live', course };
  const address = await read.address(slug);
  if (!address) return { kind: 'missing' };
  const gate = learnAddressGateFrom('course', address);
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

/** The headers every answer that is not the thing itself carries: kept nowhere, so a course coming back shows at once. */
const NOT_SERVED = { 'Cache-Control': 'private, no-store' } as const;

/** The plain answer of a course that is not served, by its state; the moved one's `Location` is given by the caller. */
export function courseNotServedResponse(
  state: Exclude<CourseShareState, { kind: 'live' }>,
  movedTo: (slug: string) => string,
): Response {
  const text = (body: string, status: number, headers: Record<string, string> = {}) =>
    new Response(`${body}\n`, {
      status,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', ...NOT_SERVED, ...headers },
    });
  switch (state.kind) {
    case 'paused':
      return text('This course is paused. It will be back at this address.', 503, {
        'Retry-After': PAUSED_RETRY_AFTER,
      });
    case 'removed':
      return text('This course was removed.', 410);
    case 'moved':
      return new Response(null, { status: 308, headers: { Location: movedTo(state.slug), ...NOT_SERVED } });
    case 'missing':
      return text('Not found', 404);
  }
}

/** The courses could not be read now: asked again in a minute. */
export const courseUnavailableResponse = () =>
  new Response('The course could not be read. Try again in a minute.\n', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...NOT_SERVED, 'Retry-After': '60' },
  });
