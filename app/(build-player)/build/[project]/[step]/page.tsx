import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BuildStepLive } from '@/components/build/step/step-live';
import { HeaderLine } from '@/components/workspace/header-line';
import { buildStepPath } from '@/lib/build/paths';
import { stepDescriptionOf } from '@/lib/build/step-page';
import { loadBuildStepView } from '@/lib/build/step-view.data';
import { pageMetadata } from '@/lib/seo/page-metadata';

/**
 * A step of a project, the same for everyone and cached for hours; the person's side (the squares, the row under the
 * title, the language to start at) is read later in the browser. No step is known when the site is built:
 * generateStaticParams lists one no project has, so every real step renders on request as a whole page before the
 * response starts, and a step that is missing or removed answers the site's 404 with its real status.
 */
export const instant = false;

/** Slugs no project and no step can have. */
const NO_STEP = { project: '_none', step: '_none' };

export async function generateStaticParams() {
  return [NO_STEP];
}

export async function generateMetadata({ params }: PageProps<'/build/[project]/[step]'>): Promise<Metadata> {
  const { project, step } = await params;
  const view = await loadBuildStepView(project, step);
  if (!view) return { title: 'GitRanks Build', robots: { index: false, follow: false } };
  const { page } = view;
  return pageMetadata({
    title: `${page.step.title} · ${page.project.name}`,
    description: stepDescriptionOf(page),
    path: buildStepPath(page.project.slug, page.step.slug),
  });
}

export default async function BuildStepPage({ params }: PageProps<'/build/[project]/[step]'>) {
  const { project, step } = await params;
  const view = await loadBuildStepView(project, step);
  if (!view) notFound();
  return (
    <>
      <HeaderLine />
      <BuildStepLive page={view.page} project={view.project} codes={view.codes} questionCodes={view.questionCodes} />
    </>
  );
}
