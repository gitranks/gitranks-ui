import type { NextRequest } from 'next/server';

import { interviewsCardResponse } from '@/components/interviews/share/card-response';
import { loadInterviewsHome } from '@/lib/interviews/home.data';
import { loadCardLogos } from '@/lib/interviews/share.data';

/** The picture a posted link to Interviews home, or to How it works, shows. The proxy's gate closes it while closed. */
export async function GET(req: NextRequest) {
  return interviewsCardResponse(req.nextUrl.search, loadInterviewsHome, loadCardLogos);
}
