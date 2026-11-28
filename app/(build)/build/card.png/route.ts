import type { NextRequest } from 'next/server';

import { homeCardResponse } from '@/components/build/share/card-response';

/** The picture a posted link to Build's home shows. The proxy's gate closes it while Build is closed. */
export async function GET(req: NextRequest) {
  return homeCardResponse(req.nextUrl.search);
}
