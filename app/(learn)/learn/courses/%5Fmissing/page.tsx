import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LEARN_MISSING_METADATA } from '@/lib/learn/seo/course';

/** The same title and robots as a course page's own 404. */
export const metadata: Metadata = LEARN_MISSING_METADATA;

/**
 * `/learn/courses/_missing`, where the proxy sends a course that is not there (`lib/learn/course-gate.ts`): a static
 * page that is always the course's 404, so it is prerendered with a 404 status (`check-blocking-routes.mjs` checks it
 * after the build). `_missing` is not a slug's shape, so no course is ever under it. It reads nothing.
 */
export default function CourseMissingPage(): never {
  notFound();
}
