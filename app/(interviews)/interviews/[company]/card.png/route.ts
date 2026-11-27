import type { NextRequest } from 'next/server';

import { companyCardResponse } from '@/components/interviews/share/card-response';
import { loadCardLogos, loadInterviewCompanyShare } from '@/lib/interviews/share.data';

/** The picture a posted link to a company's page shows. The proxy's gate closes it while closed. */
export async function GET(req: NextRequest, { params }: RouteContext<'/interviews/[company]/card.png'>) {
  const { company } = await params;
  return companyCardResponse(req.nextUrl.search, () => loadInterviewCompanyShare(company), loadCardLogos);
}
