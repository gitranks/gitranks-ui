import type { Metadata } from 'next';

import { LessonPageView } from '@/app/learn/components/lesson-page';
import { LessonScreen } from '@/components/learn/lesson/lesson-screen';
import { loadLearnLessonPage } from '@/lib/learn/lesson-page.data';
import { loadLessonPage } from '@/lib/learn/lesson-public.data';
import { lessonPageMetadata } from '@/lib/learn/lesson-seo';
import { loadMergedFixes } from '@/lib/learn/real-issues.data';
import { learnLessonMetadata } from '@/lib/learn/seo/lesson';

/**
 * A lesson's address is read as a lesson of a course first, the same for everyone and cached for hours, its person's
 * side read later in the browser; else as the lesson of a fix, which is not cached here. The page streams, so its own
 * notFound() reaches the browser with a 200: an unknown, hidden, paused, removed or moved lesson gets its real status
 * from the proxy, which asks first (`lib/learn/lesson-gate.ts`).
 */
export const instant = false;

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<'/learn/lessons/[slug]'>): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const ours = await loadLearnLessonPage(slug);
  // A shared fact's link (`?fact`) shows the fact's own preview.
  if (ours) return learnLessonMetadata(ours.lesson, { fact: query.fact !== undefined });
  return lessonPageMetadata(await loadLessonPage(slug));
}

/**
 * A lesson of a course, open to everyone; else a shared lesson of a fix, as before. Its merged fixes ("In the real
 * world") are drawn for everyone, streamed in after the lesson.
 */
export default async function LessonPage({ params, searchParams }: PageProps<'/learn/lessons/[slug]'>) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  // Started beside the lesson's read and never awaited here: "In the real world" streams in its own boundary, so a slow
  // read of the fixes never holds the lesson. It answers null on any failure.
  const fixes = loadMergedFixes({ lesson: slug });
  const ours = await loadLearnLessonPage(slug);
  if (ours) return <LessonScreen page={ours} openFact={query.fact !== undefined} fixes={fixes} />;
  return <LessonPageView slug={slug} />;
}
