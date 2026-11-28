import type { NextRequest } from 'next/server';

import { projectCardResponse } from '@/components/build/share/card-response';
import { loadBuildProject } from '@/lib/build/project.data';
import { loadSharedBuilt } from '@/lib/build/share.data';

/**
 * The picture a posted link to a project shows; with `?by=<login>`, the picture of that person's build of it, drawn
 * from their public Skills page. The proxy's gate closes it while Build is closed.
 */
export async function GET(req: NextRequest, { params }: RouteContext<'/build/[project]/card.png'>) {
  const { project } = await params;
  return projectCardResponse(
    req.nextUrl.search,
    req.nextUrl.searchParams.get('by'),
    () => loadBuildProject(project),
    loadSharedBuilt,
  );
}
