import type { Route } from 'next';

import { LEARN_ADDRESS_TIMEOUT_MS, type LearnAddressGate, learnAddressGateOf } from './address-gate';
import { checkPath, learnCourseGonePath } from './paths';

/*
 * A course's page streams: the response starts with a 200 before the page reads the course, so the page's notFound()
 * reaches the browser only as a noindex in the stream. The proxy asks the course's address first, as for a lesson
 * (`lesson-gate.ts`), and answers its state before anything renders.
 */

/**
 * What the proxy does with a course's page: missing, the course's 404 (`LEARN_COURSE_MISSING_PATH`); paused or removed, its page at `path` with a
 * 503 or a 410 (`gone`); moved, a permanent redirect to its new address. Anything else, a failed or a slow ask
 * included, goes on to the page, which reads the course itself.
 */
export type CourseGate =
  | { kind: 'page' }
  | { kind: 'missing' }
  | { kind: 'redirect'; path: Route }
  | { kind: 'gone'; status: 410 | 503; path: Route };

/** A course's page, asked within `timeoutMs`. */
export async function courseGateOf(slug: string, timeoutMs = LEARN_ADDRESS_TIMEOUT_MS): Promise<CourseGate> {
  return courseGateFrom(slug, await learnAddressGateOf('course', slug, timeoutMs));
}

/**
 * A course's check (`/learn/check/<slug>`, and "What you know" at the same address), asked within `timeoutMs`: it
 * streams as the course's page does, so its course is asked first. The course's gate, but a moved course goes on to
 * the new course's check. A course that is there and offers no check is the page's to say.
 */
export async function checkGateOf(slug: string, timeoutMs = LEARN_ADDRESS_TIMEOUT_MS): Promise<CourseGate> {
  const gate = await learnAddressGateOf('course', slug, timeoutMs);
  return gate.kind === 'moved' ? { kind: 'redirect', path: checkPath(gate.slug) } : courseGateFrom(slug, gate);
}

function courseGateFrom(slug: string, gate: LearnAddressGate): CourseGate {
  switch (gate.kind) {
    case 'missing':
      return { kind: 'missing' };
    case 'moved':
      return { kind: 'redirect', path: gate.path };
    case 'paused':
      return { kind: 'gone', status: 503, path: learnCourseGonePath(slug) };
    case 'removed':
      return { kind: 'gone', status: 410, path: learnCourseGonePath(slug) };
    case 'page':
    case 'unknown':
      return { kind: 'page' };
  }
}
