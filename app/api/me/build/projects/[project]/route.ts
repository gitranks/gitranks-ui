import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { buildReadResponse, buildViewerOf } from '@/lib/build/build-route';
import { loadBuildProjectMine } from '@/lib/build/project.data';

/**
 * The signed-in person's side of a project, read in the browser after the project's page is up: `{ mine }`, their
 * builds of it, whether an agent of theirs connected, and the sentence to say. Null signed out (without asking the
 * API), and on any failure. Never kept.
 */
export const GET = auth(async function GET(req: AuthRequest, { params }) {
  const { project } = (await params) as { project: string };
  const viewer = buildViewerOf(req);
  return buildReadResponse('mine', viewer ? await loadBuildProjectMine(project, viewer) : null);
});
