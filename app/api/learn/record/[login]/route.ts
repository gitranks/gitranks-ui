import { NextResponse } from 'next/server';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { LearnRecordDocument } from '@/lib/learn/learn.documents';
import { githubLoginOf } from '@/lib/learn/learn-path';
import { type LearnRecordAnswer, learnRecordOf } from '@/lib/learn/learn-promo';

/** The same answer for everyone, kept a minute, as the API keeps it. */
const KEPT = { 'Cache-Control': 'public, max-age=60' };
const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * A login's public Learn record, for the card on their profile: read anonymously, so every reader gets the same answer.
 * `{ record: null }` without a public pass, and on any failure (an API that does not know the field yet included), so
 * the card is left out, never an error.
 */
export async function GET(_request: Request, { params }: RouteContext<'/api/learn/record/[login]'>) {
  const login = githubLoginOf((await params).login);
  if (!login) return NextResponse.json({ record: null } satisfies LearnRecordAnswer, { headers: KEPT });
  try {
    const { learnRecord } = await graphqlDirect(LearnRecordDocument, { login }, { source: 'client' });
    return NextResponse.json({ record: learnRecordOf(learnRecord) } satisfies LearnRecordAnswer, { headers: KEPT });
  } catch {
    return NextResponse.json({ record: null } satisfies LearnRecordAnswer, { headers: NO_STORE });
  }
}
