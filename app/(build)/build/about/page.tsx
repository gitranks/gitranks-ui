import { BUILD_COLUMN } from '@/components/build/column';
import { AboutLive } from '@/components/build/home/about-live';
import { loadBuildProjects } from '@/lib/build/projects.data';
import { BUILD_ABOUT_METADATA } from '@/lib/build/seo';

/**
 * "How Build works": the landing, kept reachable for a person with a build at the foot of Build's pages. The same for
 * everyone and prerendered; the main button follows the person's agent, read in the browser.
 */
export const metadata = BUILD_ABOUT_METADATA;

export default async function BuildAboutPage() {
  return (
    <main className={BUILD_COLUMN} data-build-home="about">
      <AboutLive projects={await loadBuildProjects()} />
    </main>
  );
}
