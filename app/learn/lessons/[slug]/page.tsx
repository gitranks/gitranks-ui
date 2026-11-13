import type { Metadata } from 'next';

import { LessonPageView } from '@/app/learn/components/lesson-page';
import { loadLessonPage } from '@/lib/learn/lesson-public.data';
import { lessonPageMetadata } from '@/lib/learn/lesson-seo';

/**
 * A blocking route: the lesson is read before the page starts, so an unknown lesson answers a real 404. The lesson is
 * the same for everyone and not cached here: the API keeps it a minute and drops it on a take-down.
 */
export const instant = false;

export async function generateMetadata({ params }: PageProps<'/learn/lessons/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  return lessonPageMetadata(await loadLessonPage(slug));
}

/** A shared lesson: open to every visitor, who reads it; a signed-in user Learn is open to takes it. */
export default async function LessonPage({ params }: PageProps<'/learn/lessons/[slug]'>) {
  const { slug } = await params;
  return <LessonPageView slug={slug} />;
}
