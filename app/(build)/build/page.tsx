import { HomeLive } from '@/components/build/home/home-live';
import { loadBuildProjects } from '@/lib/build/projects.data';
import { BUILD_HOME_METADATA } from '@/lib/build/seo';

/**
 * `/build`: the landing for a visitor and for a signed-in person with no build, the person's own home once they have
 * one. The page is the same for everyone and prerendered (the projects are read from the cached list, which never
 * throws); the person's side is read in the browser.
 */
export const metadata = BUILD_HOME_METADATA;

export default async function BuildHomePage() {
  return <HomeLive projects={await loadBuildProjects()} />;
}
