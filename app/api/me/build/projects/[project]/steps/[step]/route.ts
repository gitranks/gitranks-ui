import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { buildReadResponse, buildViewerOf } from '@/lib/build/build-route';
import { loadBuildStepMine } from '@/lib/build/step.data';

/**
 * The signed-in person's side of a step, read in the browser after the step's page is up: `{ mine }`, for each of
 * their builds of the project whether the step is done, current or to come. Null signed out (without asking the API),
 * and on any failure. Never kept.
 */
export const GET = auth(async function GET(req: AuthRequest, { params }) {
  const { project, step } = (await params) as { project: string; step: string };
  const viewer = buildViewerOf(req);
  return buildReadResponse('mine', viewer ? await loadBuildStepMine(project, step, viewer) : null);
});
