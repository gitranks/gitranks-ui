import { NextRequest, NextResponse } from 'next/server';

import { request } from '@/lib/graphql/request';
import { appRouteReject } from '@/utils/app-route-reject';

export async function POST(req: NextRequest) {
  if (appRouteReject(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { query, variables } = await req.json();
    const { data, status } = await request(query, variables);

    return NextResponse.json(data, { status });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
