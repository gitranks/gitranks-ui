import { BUILD_COLUMN } from '@/components/build/column';
import { HomeLanding } from '@/components/build/home/home-landing';
import { loadBuildProjects } from '@/lib/build/projects.data';
import { BUILD_ABOUT_METADATA } from '@/lib/build/seo';

/**
 * "How Build works": the landing, kept reachable for a person with a build at the foot of Build's pages. The same for
 * everyone and prerendered.
 */
export const metadata = BUILD_ABOUT_METADATA;

export default async function BuildAboutPage() {
  return (
    <main className={BUILD_COLUMN} data-build-home="about">
      <HomeLanding projects={await loadBuildProjects()} agentConnected={false} about />
    </main>
  );
}
