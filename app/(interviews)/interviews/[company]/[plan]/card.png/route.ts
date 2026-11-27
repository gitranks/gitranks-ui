import type { NextRequest } from 'next/server';

import { planCardResponse } from '@/components/interviews/share/card-response';
import { loadCardLogos, loadInterviewPlanShare } from '@/lib/interviews/share.data';

/** The picture a posted link to a plan's page shows. The proxy's gate closes it while closed. */
export async function GET(req: NextRequest, { params }: RouteContext<'/interviews/[company]/[plan]/card.png'>) {
  const { company, plan } = await params;
  return planCardResponse(req.nextUrl.search, () => loadInterviewPlanShare(company, plan), loadCardLogos);
}
