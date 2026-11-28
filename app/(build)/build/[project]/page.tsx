import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ProjectLive } from '@/components/build/project/project-live';
import { loadBuildProject } from '@/lib/build/project.data';
import { courseRowsOf } from '@/lib/build/project-courses';
import { BUILD_PROJECT_MISSING_METADATA, buildProjectMetadata } from '@/lib/build/project-seo';
import { loadBuildCourseFacts, loadSharedBuilt } from '@/lib/build/share.data';
import { builtRowFor } from '@/lib/build/share-card';
import { isGithubLogin } from '@/utils/profile-refresh';

/**
 * A project's page: the same for everyone, read from the cached project under its tag; the person's side is read
 * later in the browser. An address that is no live project (missing, removed, a draft, or a read that failed) answers
 * the site's not-found page, with a 404.
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

/** Whose build a shared link names (`?by=<login>`): one value of a login's shape, else nobody. */
const byOf = (by: string | string[] | undefined) => (typeof by === 'string' && isGithubLogin(by) ? by : null);

/**
 * The page's metadata. A link shared as a person's build (`?by=<login>`) gets that build's preview only when their
 * public Skills page lists the project as built; otherwise, and on a failed read, the project's own.
 */
export async function generateMetadata({ params, searchParams }: PageProps<'/build/[project]'>): Promise<Metadata> {
  const [{ project: slug }, { by }] = await Promise.all([params, searchParams]);
  const project = await loadBuildProject(slug);
  if (!project) return BUILD_PROJECT_MISSING_METADATA;
  const login = byOf(by);
  const row = login ? builtRowFor((await loadSharedBuilt(login)).value, project.slug) : null;
  return buildProjectMetadata(project, login && row ? { login, row } : null);
}

/**
 * The page waits for the query as its metadata does, so neither is drawn ahead of the request. The Learn courses that
 * help are drawn with their lines and lessons from the list of courses; a course the list does not have keeps its name.
 */
export default async function BuildProjectPage({ params, searchParams }: PageProps<'/build/[project]'>) {
  const [{ project: slug }] = await Promise.all([params, searchParams]);
  const project = await loadBuildProject(slug);
  if (!project) notFound();
  const courses = project.courses.length ? await loadBuildCourseFacts() : [];
  return <ProjectLive project={project} courses={courseRowsOf(project, courses)} />;
}
