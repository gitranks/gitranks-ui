import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ProjectLive } from '@/components/build/project/project-live';
import { loadBuildProject } from '@/lib/build/project.data';
import { BUILD_PROJECT_MISSING_METADATA, buildProjectMetadata } from '@/lib/build/project-seo';

/**
 * A project's page: the same for everyone, read from the cached project under its tag; the person's side is read
 * later in the browser. An address that is no live project (missing, removed, a draft, or a read that failed) answers
 * the site's not-found page, with a 404. The proxy closes every Build address to anyone Build is not open to.
 */
export const instant = false;

/**
 * No project is known when the site is built: one address no project can have is listed, so every real project renders
 * on request as a whole page before the response starts, with no shell, and a missing one answers a real 404. Its
 * slug is not of a project's shape, so building the site asks the API nothing.
 */
export async function generateStaticParams() {
  return [{ project: '_' }];
}

export async function generateMetadata({ params }: PageProps<'/build/[project]'>): Promise<Metadata> {
  const { project: slug } = await params;
  const project = await loadBuildProject(slug);
  return project ? buildProjectMetadata(project) : BUILD_PROJECT_MISSING_METADATA;
}

export default async function BuildProjectPage({ params }: PageProps<'/build/[project]'>) {
  const { project: slug } = await params;
  const project = await loadBuildProject(slug);
  if (!project) notFound();
  return <ProjectLive project={project} />;
}
