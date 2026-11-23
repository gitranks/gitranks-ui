import type { Metadata } from 'next';

import { ReviewLive } from '@/components/learn/review/review-live';
import { loadLearnCourse } from '@/lib/learn/course.data';
import { isContentSlug } from '@/lib/learn/paths';
import { LEARN_REVIEW_METADATA } from '@/lib/learn/seo/player';

/**
 * The daily review (page 16): only the person's own, so the page holds no personal data and is never indexed; the set
 * is read in the browser. `?course=<slug>` scopes it to one course, named in the strip from the cached course; any
 * other value, or a course that cannot be read, is every course. Behind Learn's gate: signed in only.
 */
export const instant = false;

export const metadata: Metadata = LEARN_REVIEW_METADATA;

/** The course `?course=` names, as a link for the strip: null for every course. */
async function scopeOf(course: string | string[] | undefined) {
  if (typeof course !== 'string' || !isContentSlug(course)) return null;
  const found = await loadLearnCourse(course).catch(() => null);
  return found ? { slug: found.slug, title: found.name } : null;
}

export default async function ReviewPage({ searchParams }: PageProps<'/learn/review'>) {
  const { course } = await searchParams;
  return <ReviewLive course={await scopeOf(course)} />;
}
