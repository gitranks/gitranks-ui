'use cache';

import type { MetadataRoute } from 'next';
import { cacheLife } from 'next/cache';

import { loadBuildProject } from '@/lib/build/project.data';
import { loadBuildProjects } from '@/lib/build/projects.data';
import { type BuildSitemapProject, buildSitemapEntries } from '@/lib/sitemap/build-sitemap';

/** Every live project, each with its base's steps; null for the steps of a project whose page could not be read. */
async function readProjects(): Promise<BuildSitemapProject[]> {
  const cards = await loadBuildProjects();
  return Promise.all(
    cards.map(async (card) => {
      const page = await loadBuildProject(card.slug);
      return { slug: card.slug, base: page ? page.base : null };
    }),
  );
}

/**
 * Build's public pages (`buildSitemapEntries`). Kept for hours once it lists every project with its steps; for
 * minutes with no project, or after a failed read, so the next read comes soon.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = await readProjects();
  if (projects.length && projects.every((project) => project.base)) {
    cacheLife('hours');
  } else {
    cacheLife('minutes');
  }
  return buildSitemapEntries(projects);
}
