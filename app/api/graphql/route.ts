import { type NextRequest, NextResponse } from 'next/server';

import { request } from '@/lib/graphql/request';
import { rejectNotAllowedGraphqlOperations } from '@/utils/reject-not-allowed-graphql-operations';
import { rejectWrongOrigin } from '@/utils/reject-wrong-origin';

export async function POST(req: NextRequest) {
  if (rejectWrongOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { query, variables } = await req.json();

    if (rejectNotAllowedGraphqlOperations(query)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, status } = await request(query, variables);

    return NextResponse.json(data, { status });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
