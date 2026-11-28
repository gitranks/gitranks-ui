import type { NextRequest } from 'next/server';

import { stepCardResponse } from '@/components/build/share/card-response';
import { loadBuildStep } from '@/lib/build/step.data';

/** The picture a posted link to a step shows. */
export async function GET(req: NextRequest, { params }: RouteContext<'/build/[project]/[step]/card.png'>) {
  const { project, step } = await params;
  return stepCardResponse(req.nextUrl.search, () => loadBuildStep(project, step));
}
