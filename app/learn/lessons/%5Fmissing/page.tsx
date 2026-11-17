import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

/** The same title and robots as a lesson page's own 404. */
export const metadata: Metadata = { title: 'Lesson not found', robots: { index: false, follow: false } };

/**
 * `/learn/lessons/_missing`, where the proxy sends a lesson or result that is not there (`lib/learn/lesson-gate.ts`): a
 * static page that is always the lesson's 404, so it is prerendered with a 404 status (`check-blocking-routes.mjs`
 * checks it after the build). `_missing` is not a slug's shape, so no lesson is ever under it. It reads nothing.
 */
export default function LessonMissingPage(): never {
  notFound();
}
