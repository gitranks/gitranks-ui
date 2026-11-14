import type { Metadata } from 'next';

import { LessonPageView } from '@/app/learn/components/lesson-page';
import { loadLessonPage } from '@/lib/learn/lesson-public.data';
import { lessonPageMetadata } from '@/lib/learn/lesson-seo';

/**
 * A blocking route: the lesson is read before the page starts, so an unknown, hidden or private lesson answers a real
 * 404. generateStaticParams lists a slug no lesson can have, so there is no fallback shell (sent with a 200 before the
 * page runs): every real slug renders on request as a whole page. The lesson is the same for everyone, and not cached
 * here.
 */
export const instant = false;

/** A slug no lesson can have (not a slug's shape), so the build renders the not-found page without asking for data. */
const NO_LESSON_SLUG = '_';

export async function generateStaticParams() {
  return [{ slug: NO_LESSON_SLUG }];
}

export async function generateMetadata({ params }: PageProps<'/learn/lessons/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  return lessonPageMetadata(await loadLessonPage(slug));
}

/** A shared lesson: open to every visitor, who reads it; a signed-in user Learn is open to takes it. */
export default async function LessonPage({ params }: PageProps<'/learn/lessons/[slug]'>) {
  const { slug } = await params;
  return <LessonPageView slug={slug} />;
}
