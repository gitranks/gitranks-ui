import type { Metadata } from 'next';
import { connection } from 'next/server';

import { BuildStartLive } from '@/components/build/start/build-start-live';
import { isBuildProjectSlug } from '@/lib/build/paths';
import { loadBuildProjects } from '@/lib/build/projects.data';
import { BUILD_START_METADATA, projectOfAddress } from '@/lib/build/start';
import { loadBuildStart } from '@/lib/build/start.data';
import { viewerLogin } from '@/lib/workspace/contribute.data';

/**
 * The start flow, `/build/start` and `/build/start?project=<project>`: what "Connect your agent" opens. The site
 * header, the flow's two steps at the top, no bar, one narrow column. Only the person's own, so it is never indexed or
 * kept, and drawn for each request: the flow's state is read here, on the server, so someone whose agent is already
 * connected lands on step 2 from the first paint. A visitor reads nothing personal and gets the sign-in in step 1.
 * When the API does not know Build yet, the list of projects is empty and the state is unread: the page still draws.
 */
export const instant = false;

export const metadata: Metadata = BUILD_START_METADATA;

export default async function BuildStartPage({ searchParams }: PageProps<'/build/start'>) {
  await connection();
  const { project: given } = await searchParams;
  const raw = Array.isArray(given) ? given[0] : given;
  const slug = raw && isBuildProjectSlug(raw) ? raw : null;
  const login = await viewerLogin();
  const [projects, start] = await Promise.all([loadBuildProjects(), login ? loadBuildStart(login, slug) : null]);
  return (
    <BuildStartLive
      signedIn={login !== null}
      start={start}
      project={projectOfAddress(projects, slug)}
      projects={projects}
      openedAt={new Date().toISOString()}
    />
  );
}
