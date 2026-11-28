import type { MetadataRoute } from 'next';

import {
  BUILD_HOME_PATH,
  BUILD_PROJECTS_PATH,
  buildProjectPath,
  buildStepPath,
  isBuildProjectSlug,
  isBuildStepSlug,
} from '@/lib/build/paths';
import type { BuildProjectPage } from '@/lib/build/types';
import { sitemapEntry } from '@/lib/sitemap/sitemap-url';

/** A live project as the sitemap lists it: its slug, and its base's steps once its page was read. */
export type BuildSitemapProject = { slug: string; base: Pick<BuildProjectPage['base'][number], 'slug'>[] | null };

/**
 * GitRanks Build's pages for search engines: Home and Projects, then each live project and each step
 * of its base. How Build works (its canonical address is Home), a part's steps, the tests and a person's own pages (My builds, the start flow) are left out. A project
 * whose page could not be read keeps its own address, without its steps.
 */
export function buildSitemapEntries(projects: readonly BuildSitemapProject[]): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  const live = projects.filter((project) => {
    if (!isBuildProjectSlug(project.slug) || seen.has(project.slug)) return false;
    seen.add(project.slug);
    return true;
  });
  return [
    sitemapEntry(BUILD_HOME_PATH, { priority: 0.7 }),
    sitemapEntry(BUILD_PROJECTS_PATH, { priority: 0.7 }),
    ...live.flatMap((project) => [
      sitemapEntry(buildProjectPath(project.slug), { priority: 0.7 }),
      ...(project.base ?? [])
        .filter((step) => isBuildStepSlug(step.slug))
        .map((step) => sitemapEntry(buildStepPath(project.slug, step.slug), { priority: 0.6 })),
    ]),
  ];
}
