import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BuildTestLive } from './build-test-live';
import { loadBuildProject } from '@/lib/build/project.data';
import { TEST_NAMES } from '@/lib/build/test';
import { type BuildLanguage, type BuildTestKind, isBuildLanguage } from '@/lib/build/types';

/*
 * The two tests' pages, `/build/<project>/test` and `/build/<project>/test/gold`: only the person's own, so they hold
 * no personal data on the server and are never indexed. The project's name comes from the cached project; the test is
 * read in the browser. `?language=` names the build when the person has two of the project.
 */

type Params = Promise<{ project: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

/** The build's language the address names; none for a value that is not one. */
export const testLanguageOf = (value: string | string[] | undefined): BuildLanguage | null =>
  isBuildLanguage(value) ? value : null;

/** A test's page is never indexed; its title names the test and the project. */
export async function buildTestMetadata(params: Params, kind: BuildTestKind): Promise<Metadata> {
  const { project: slug } = await params;
  const project = await loadBuildProject(slug);
  return {
    title: project ? `${TEST_NAMES[kind]}: ${project.name}` : TEST_NAMES[kind],
    robots: { index: false, follow: false },
  };
}

/** The page: a project that is not one is not found; the rest is read in the browser. */
export async function BuildTestPage({
  params,
  searchParams,
  kind,
}: {
  params: Params;
  searchParams: Search;
  kind: BuildTestKind;
}) {
  const [{ project: slug }, { language }] = await Promise.all([params, searchParams]);
  const project = await loadBuildProject(slug);
  if (!project) notFound();
  return (
    <BuildTestLive
      project={{ slug: project.slug, name: project.name }}
      kind={kind}
      language={testLanguageOf(language)}
    />
  );
}
