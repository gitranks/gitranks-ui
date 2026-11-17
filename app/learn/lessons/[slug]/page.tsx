import type { Metadata } from 'next';

import { LessonPageView } from '@/app/learn/components/lesson-page';
import { loadLessonPage } from '@/lib/learn/lesson-public.data';
import { lessonPageMetadata } from '@/lib/learn/lesson-seo';

/**
 * The lesson is the same for everyone, and not cached here. The page streams, so its own notFound() reaches the browser
 * with a 200: an unknown or hidden lesson gets its real 404 from the proxy, which asks first (`lib/learn/lesson-gate.ts`).
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
