import type { Metadata } from 'next';

import { LessonPageView } from '@/app/learn/components/lesson-page';
import { LessonScreen } from '@/components/learn/lesson/lesson-screen';
import { learnOpenToEveryone } from '@/lib/learn/learn-everyone';
import { learnOpenToEveryoneCached } from '@/lib/learn/learn-everyone-cached';
import { loadLearnLessonPage } from '@/lib/learn/lesson-page.data';
import { loadLessonPage } from '@/lib/learn/lesson-public.data';
import { lessonPageMetadata } from '@/lib/learn/lesson-seo';
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
  if (ours) {
    return learnLessonMetadata(ours.lesson, {
      fact: query.fact !== undefined,
      open: await learnOpenToEveryoneCached(),
    });
  }
  const [answer, frontDoorOpen] = await Promise.all([loadLessonPage(slug), learnOpenToEveryone()]);
  return lessonPageMetadata(answer, { frontDoorOpen });
}

/** A lesson of a course, open to everyone; else a shared lesson of a fix, as before. */
export default async function LessonPage({ params, searchParams }: PageProps<'/learn/lessons/[slug]'>) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const ours = await loadLearnLessonPage(slug);
  if (ours) return <LessonScreen page={ours} openFact={query.fact !== undefined} />;
  return <LessonPageView slug={slug} />;
}
