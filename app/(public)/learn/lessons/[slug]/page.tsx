import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LessonInPlanProvider } from '@/components/interviews/lesson/lesson-in-plan';
import { LessonScreen } from '@/components/learn/lesson/lesson-screen';
import { loadLearnLessonPage } from '@/lib/learn/lesson-page.data';
import { loadMergedFixes } from '@/lib/learn/real-issues.data';
import { learnLessonMetadata } from '@/lib/learn/seo/lesson';

/**
 * A lesson of a course, the same for everyone and cached for hours, its person's side read later in the browser. The
 * page streams, so its own notFound() reaches the browser with a 200: an unknown, paused, removed or moved lesson gets
 * its real status from the proxy, which asks first (`lib/learn/lesson-gate.ts`), and a fix's walkthrough at its old
 * address goes on to the fix's page from there.
 */
export const instant = false;

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<'/learn/lessons/[slug]'>): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const ours = await loadLearnLessonPage(slug);
  // A shared fact's link (`?fact`) shows the fact's own preview.
  return ours ? learnLessonMetadata(ours.lesson, { fact: query.fact !== undefined }) : {};
}

/**
 * A lesson of a course, open to everyone. Its merged fixes ("In the real world") are drawn for everyone, streamed in
 * after the lesson. Opened from an interview plan (`?plan=`), the same page: the browser asks whether the person's plan
 * holds it, and only then do its strip, its main button and the line under the answer follow the plan.
 */
export default async function LessonPage({ params, searchParams }: PageProps<'/learn/lessons/[slug]'>) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  // Started beside the lesson's read and never awaited here: "In the real world" streams in its own boundary, so a slow
  // read of the fixes never holds the lesson. It answers null on any failure.
  const fixes = loadMergedFixes({ lesson: slug });
  const ours = await loadLearnLessonPage(slug);
  if (!ours) notFound();
  const { lesson, group } = ours;
  return (
    <LessonInPlanProvider
      lesson={{ slug: lesson.slug, course: lesson.course.slug, group: lesson.group.slug }}
      titles={group.map(({ slug: one, title }) => ({ slug: one, title }))}
    >
      <LessonScreen page={ours} openFact={query.fact !== undefined} fixes={fixes} />
    </LessonInPlanProvider>
  );
}
