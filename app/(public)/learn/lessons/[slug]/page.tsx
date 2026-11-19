import type { Metadata } from 'next';

import { LessonPageView } from '@/app/learn/components/lesson-page';
import { learnOpenToEveryone } from '@/lib/learn/learn-everyone';
import { loadLessonPage } from '@/lib/learn/lesson-public.data';
import { lessonPageMetadata } from '@/lib/learn/lesson-seo';

/**
 * The lesson is the same for everyone, and not cached here. The page streams, so its own notFound() reaches the browser
 * with a 200: an unknown or hidden lesson gets its real 404 from the proxy, which asks first (`lib/learn/lesson-gate.ts`).
 */
export const instant = false;

export async function generateMetadata({ params }: PageProps<'/learn/lessons/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const [answer, frontDoorOpen] = await Promise.all([loadLessonPage(slug), learnOpenToEveryone()]);
  return lessonPageMetadata(answer, { frontDoorOpen });
}

/** A shared lesson: open to every visitor, who reads it; a signed-in user Learn is open to takes it. */
export default async function LessonPage({ params }: PageProps<'/learn/lessons/[slug]'>) {
  const { slug } = await params;
  return <LessonPageView slug={slug} />;
}
