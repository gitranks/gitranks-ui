import { type NextRequest, NextResponse } from 'next/server';

import { ORIGINAL_USER_AGENT_HEADER } from '@/app/app.consts';
import { auth } from '@/auth';
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

    const originalUserAgent = req.headers.get(ORIGINAL_USER_AGENT_HEADER) ?? req.headers.get('user-agent') ?? undefined;

    // Route handlers have a request scope, so reading the session here is safe -- unlike
    // inside signedFetch, which also runs under "use cache" during page renders.
    const session = await auth();
    const githubLogin = session?.user?.githubLogin && !session.error ? session.user.githubLogin : undefined;

    const { data, status } = await request(query, variables, { originalUserAgent, source: 'client', githubLogin });

    return NextResponse.json(data, { status });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
