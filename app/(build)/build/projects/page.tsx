import { ProjectsLive } from '@/components/build/projects/projects-live';
import { loadBuildProjects } from '@/lib/build/projects.data';
import { BUILD_PROJECTS_METADATA } from '@/lib/build/seo';

/**
 * All projects: the same for everyone and prerendered, read from the cached list, which never throws; the person's
 * place on each card is read in the browser.
 */
export const metadata = BUILD_PROJECTS_METADATA;

export default async function BuildProjectsPage() {
  return <ProjectsLive projects={await loadBuildProjects()} />;
}
