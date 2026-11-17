import { notFound } from 'next/navigation';

/**
 * `/learn/lessons/_missing`, where the proxy sends a lesson or result that is not there (`lib/learn/lesson-gate.ts`): a
 * static page that is always the lesson's 404, so it answers with a 404 status. `_missing` is not a slug's shape, so no
 * lesson is ever under it.
 */
export default function LessonMissingPage(): never {
  notFound();
}
