import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LessonInPlanProvider } from '@/components/interviews/lesson/lesson-in-plan';
import { LessonScreen } from '@/components/learn/lesson/lesson-screen';
import { INTERVIEWS_OPEN_TO_EVERYONE } from '@/lib/interviews/interviews-parts';
import { loadInterviewsForCourse } from '@/lib/interviews/learn.data';
import { forCourseGroupOf } from '@/lib/interviews/learn-course';
import { COURSE_NOT_READ, withInterviewsSectionNoindex } from '@/lib/interviews/learn-noindex';
import { loadLearnCourse } from '@/lib/learn/course.data';
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
  if (!ours) return {};
  // A lesson of the section Interviews is not indexed while Interviews is closed: its course says so (not read: not
  // indexed while closed either).
  const course = await loadLearnCourse(ours.lesson.course.slug).catch(() => COURSE_NOT_READ);
  // A shared fact's link (`?fact`) shows the fact's own preview.
  return withInterviewsSectionNoindex(learnLessonMetadata(ours.lesson, { fact: query.fact !== undefined }), course);
}

/**
 * A lesson of a course, open to everyone. Its merged fixes ("In the real world") are drawn for everyone, streamed in
 * after the lesson. Opened from an interview plan (`?plan=`), the same page: the browser asks whether the person's plan
 * holds it, and only then do its strip, its main button and the line under the answer follow the plan. The sentence
 * about its group's topic in interviews is in the page once Interviews is open to everyone; until then a person
 * Interviews is open to reads it in the browser.
 */
export default async function LessonPage({ params, searchParams }: PageProps<'/learn/lessons/[slug]'>) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  // Started beside the lesson's read and never awaited here: "In the real world" streams in its own boundary, so a slow
  // read of the fixes never holds the lesson. It answers null on any failure.
  const fixes = loadMergedFixes({ lesson: slug });
  const ours = await loadLearnLessonPage(slug);
  if (!ours) notFound();
  const { lesson, group } = ours;
  // The public loader never throws: a failed read is an empty answer, and the lesson has no sentence. Only the lesson's
  // group goes to the browser.
  const interviews = INTERVIEWS_OPEN_TO_EVERYONE
    ? forCourseGroupOf(await loadInterviewsForCourse(lesson.course.slug), lesson.group.slug)
    : undefined;
  return (
    <LessonInPlanProvider
      lesson={{ slug: lesson.slug, course: lesson.course.slug, group: lesson.group.slug }}
      titles={group.map(({ slug: one, title }) => ({ slug: one, title }))}
    >
      <LessonScreen
        page={ours}
        openFact={query.fact !== undefined}
        fixes={fixes}
        {...(interviews !== undefined ? { interviews } : {})}
      />
    </LessonInPlanProvider>
  );
}
