import type { Metadata } from 'next';

import { buildProjectPath, buildStepPath } from './paths';
import { type BuildSharedRow, personCardUrlOf, personPreviewOf, projectCardUrlOf, stepCardUrlOf } from './share-card';
import { stepDescriptionOf } from './step-page';
import type { BuildProjectPage, BuildStepPage } from './types';
import { SOCIAL_CARD_SIZE } from '@/badge/v3/links';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { absoluteUrl } from '@/lib/seo/site';

/** A preview's picture, its words and the title and description posted with it. */
type BuildPreview = { picture: string; alt: string; title?: string; description?: string };

/** A page's metadata with its share picture in the link preview, at 1200 by 630. */
export function withBuildPreview(metadata: Metadata, { picture, alt, title, description }: BuildPreview): Metadata {
  const images = [{ url: absoluteUrl(picture), ...SOCIAL_CARD_SIZE, alt }];
  const words = { ...(title ? { title } : {}), ...(description ? { description } : {}) };
  return {
    ...metadata,
    openGraph: { ...metadata.openGraph, ...words, images },
    twitter: { ...metadata.twitter, ...words, card: 'summary_large_image', images },
  };
}

/** What a project's metadata reads. */
type MetadataProject = Pick<
  BuildProjectPage,
  'slug' | 'name' | 'line' | 'thing' | 'baseSteps' | 'minutes' | 'languages'
>;

/**
 * A project's page for search engines and link previews: its name, its line, its own address, and its picture. Shared
 * as a person's build (`?by=<login>`, with the Built row of their public Skills page for the project), the preview is
 * that build's: "octocat built an MCP server". The canonical is the project's page either way.
 */
export function buildProjectMetadata(
  project: MetadataProject,
  person: { login: string; row: BuildSharedRow } | null = null,
): Metadata {
  const metadata = pageMetadata({
    title: project.name,
    description: project.line,
    path: buildProjectPath(project.slug),
  });
  if (person) {
    return withBuildPreview(metadata, {
      picture: personCardUrlOf(project, person.login, person.row),
      alt: `${person.login} built ${person.row.thing || project.thing}`,
      ...personPreviewOf(project, person.login, person.row),
    });
  }
  return withBuildPreview(metadata, {
    picture: projectCardUrlOf(project),
    alt: project.name,
    title: `${project.name} · GitRanks Build`,
  });
}

/** A step's page: its name and its project's, the first paragraph of what it does, its address and its picture. */
export function buildStepMetadata(page: BuildStepPage): Metadata {
  const title = `${page.step.title} · ${page.project.name}`;
  return withBuildPreview(
    pageMetadata({
      title,
      description: stepDescriptionOf(page),
      path: buildStepPath(page.project.slug, page.step.slug),
    }),
    { picture: stepCardUrlOf(page), alt: title, title: `${title} · GitRanks Build` },
  );
}

/** An address that is no project's: never indexed. */
export const BUILD_PROJECT_MISSING_METADATA: Metadata = {
  title: 'Project not found',
  robots: { index: false, follow: false },
};
