import type { Metadata } from 'next';

import { LessonResultView } from '@/app/learn/components/lesson-result';
import { loadLessonResult } from '@/lib/learn/lesson-public.data';
import { lessonResultMetadata } from '@/lib/learn/lesson-seo';

/**
 * A blocking route: the result is read before the page starts, so a login with no public pass answers a real 404 and a
 * renamed login a real redirect to the current one.
 */
export const instant = false;

export async function generateMetadata({
  params,
}: PageProps<'/learn/lessons/[slug]/passes/[login]'>): Promise<Metadata> {
  const { slug, login } = await params;
  return lessonResultMetadata(await loadLessonResult(slug, login));
}

/**
 * One login's result on a lesson, the link in the pull request: open to every visitor. `?react=yes|no` is a reaction
 * picked before the GitHub sign-in, stored on the way back.
 */
export default async function LessonResultPage({
  params,
  searchParams,
}: PageProps<'/learn/lessons/[slug]/passes/[login]'>) {
  const [{ slug, login }, { react }] = await Promise.all([params, searchParams]);
  return <LessonResultView slug={slug} login={login} react={react} />;
}
