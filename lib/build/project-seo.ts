import type { Metadata } from 'next';

import { buildProjectPath } from './paths';
import type { BuildProjectPage } from './types';
import { pageMetadata } from '@/lib/seo/page-metadata';

/** A project's page for search engines and link previews: its name, its line, its own address. */
export const buildProjectMetadata = (project: Pick<BuildProjectPage, 'slug' | 'name' | 'line'>): Metadata =>
  pageMetadata({ title: project.name, description: project.line, path: buildProjectPath(project.slug) });

/** An address that is no project's: never indexed. */
export const BUILD_PROJECT_MISSING_METADATA: Metadata = {
  title: 'Project not found',
  robots: { index: false, follow: false },
};
