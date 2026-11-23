import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CheckLive } from '@/components/learn/check/check-live';
import { loadLearnCourse } from '@/lib/learn/course.data';
import { learnCheckMetadata } from '@/lib/learn/seo/player';

/**
 * A course's check (page 17), and with `?known`, "What you know": only the person's own, so the page holds no
 * personal data and is never indexed; the run and the marks are read in the browser. The course's name and groups come
 * from the cached course. The proxy asks the course's address first (a real 404 for a course that is not, a redirect
 * for a moved one); one the proxy could not ask is not found here. A course that offers no check says so on the page.
 * Behind Learn's gate: signed in only.
 */
export const instant = false;

/** Whether the address asks for "What you know". */
const knownOf = (known: string | string[] | undefined) => known !== undefined;

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<'/learn/check/[course]'>): Promise<Metadata> {
  const [{ course: slug }, { known }] = await Promise.all([params, searchParams]);
  return learnCheckMetadata(await loadLearnCourse(slug), knownOf(known));
}

export default async function CheckPage({ params, searchParams }: PageProps<'/learn/check/[course]'>) {
  const [{ course: slug }, { known }] = await Promise.all([params, searchParams]);
  const course = await loadLearnCourse(slug);
  const mode = knownOf(known) ? 'known' : 'check';
  if (!course) notFound();
  return <CheckLive course={course} mode={mode} />;
}
